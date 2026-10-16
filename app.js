// Image Resizer — resize and crop images in batches (ratio, width, format), in the browser.
(() => {
  const QUALITY = 0.85;
  const EXT = { "image/jpeg": "jpg", "image/webp": "webp", "image/png": "png" };

  const TEXT = {
    vi: {
      title: "Đổi kích thước ảnh",
      drop: "Kéo thả ảnh vào đây hoặc bấm để chọn",
      dropHint: "JPG, PNG, WEBP, AVIF, GIF, BMP — chọn được nhiều ảnh, hoặc dán bằng Ctrl/Cmd + V.",
      ratio: "Tỉ lệ khung", original: "Giữ nguyên", cover: "Cắt cho vừa khung", contain: "Giữ trọn ảnh, thêm nền",
      width: "Chiều rộng", custom: "Tự nhập", format: "Định dạng", keep: "Giữ nguyên",
      hintCover: "Cắt phần thừa quanh tâm ảnh để vừa khung.",
      hintContain: "Giữ toàn bộ ảnh, phần trống được tô nền trắng.",
      hintNone: "Giữ tỉ lệ gốc, chỉ đổi chiều rộng.",
      noUpscale: "Ảnh nhỏ hơn chiều rộng đã chọn sẽ giữ kích thước gốc.",
      downloadZip: "Tải tất cả (ZIP)", clear: "Xóa hết", download: "Tải", remove: "Xóa",
      preview: "Xem lớn", processing: "Đang xử lý…", run: "Đổi kích thước", pending: "Chờ xử lý", readyHint: "chọn tùy chọn rồi bấm Đổi kích thước", error: "Không đọc được ảnh này", files: "ảnh",
      footer: "Làm bởi", switchTo: "EN", switchTitle: "English", zipName: "anh-da-doi-kich-thuoc",
    },
    en: {
      title: "Image resizer",
      drop: "Drop images here or click to choose",
      dropHint: "JPG, PNG, WEBP, AVIF, GIF, BMP — pick several, or paste with Ctrl/Cmd + V.",
      ratio: "Frame ratio", original: "Original", cover: "Crop to fill", contain: "Fit whole image",
      width: "Width", custom: "Custom", format: "Format", keep: "Keep",
      hintCover: "Trims the edges around the center to fill the frame.",
      hintContain: "Keeps the whole image; empty space is filled with white.",
      hintNone: "Keeps the original ratio and only changes the width.",
      noUpscale: "Images narrower than the chosen width keep their size.",
      downloadZip: "Download all (ZIP)", clear: "Clear", download: "Download", remove: "Remove",
      preview: "Preview", processing: "Processing…", run: "Resize", pending: "Ready", readyHint: "pick options, then click Resize", error: "Could not read this image", files: "images",
      footer: "Made by", switchTo: "VI", switchTitle: "Tiếng Việt", zipName: "resized-images",
    },
  };

  const $ = (id) => document.getElementById(id);
  const store = {
    get: (k) => { try { return localStorage.getItem(k); } catch { return null; } },
    set: (k, v) => { try { localStorage.setItem(k, v); } catch {} },
  };
  const state = {
    lang: store.get("ir-lang") || (navigator.language.startsWith("vi") ? "vi" : "en"),
    ratio: 0,
    fit: "cover",
    width: 0,
    format: "keep",
    items: [],
    run: 0,
  };
  const t = (k) => TEXT[state.lang][k];
  const formatBytes = (n) =>
    n < 1024 ? `${n} B` : n < 1048576 ? `${(n / 1024).toFixed(1)} KB` : `${(n / 1048576).toFixed(2)} MB`;
  const base = (name) => name.replace(/\.[^.]+$/, "");

  // "16/9" -> 1.777…, "0" -> 0 (original)
  const parseRatio = (v) => {
    const [a, b] = String(v).split("/").map(Number);
    return b ? a / b : a;
  };

  const outMime = (file) => {
    if (state.format !== "keep") return state.format;
    return EXT[file.type] ? file.type : "image/jpeg";
  };

  const loadImage = (url) =>
    new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = reject;
      img.src = url;
    });

  async function resize(item) {
    const img = await loadImage(item.srcUrl);
    const iw = img.naturalWidth;
    const ih = img.naturalHeight;
    // Source crop (cover) or full image (contain / original)
    let sx = 0, sy = 0, sw = iw, sh = ih;
    const r = state.ratio || iw / ih;
    if (state.ratio && state.fit === "cover") {
      if (iw / ih > r) { sw = Math.round(ih * r); sx = Math.round((iw - sw) / 2); }
      else { sh = Math.round(iw / r); sy = Math.round((ih - sh) / 2); }
    }
    // Output size: frame of ratio r, width from the setting (never upscale)
    const naturalW = state.ratio && state.fit === "contain" ? Math.max(iw, Math.round(ih * r)) : sw;
    const w = Math.max(1, Math.round(state.width ? Math.min(state.width, naturalW) : naturalW));
    const h = Math.max(1, Math.round(w / r));

    const canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext("2d");
    ctx.imageSmoothingQuality = "high";
    const mime = outMime(item.file);
    if (mime === "image/jpeg" || (state.ratio && state.fit === "contain")) {
      ctx.fillStyle = "#fff";
      ctx.fillRect(0, 0, w, h);
    }
    if (state.ratio && state.fit === "contain") {
      const s = Math.min(w / iw, h / ih);
      const dw = iw * s;
      const dh = ih * s;
      ctx.drawImage(img, (w - dw) / 2, (h - dh) / 2, dw, dh);
    } else {
      ctx.drawImage(img, sx, sy, sw, sh, 0, 0, w, h);
    }
    const blob = await new Promise((res, rej) => canvas.toBlob((b) => (b ? res(b) : rej(new Error("encode"))), mime, QUALITY));
    return { blob, url: URL.createObjectURL(blob), w, h, name: `${base(item.file.name)}-${w}x${h}.${EXT[mime]}` };
  }

  function clearOutputs() {
    state.items.forEach((i) => {
      if (i.out) URL.revokeObjectURL(i.out.url);
      i.out = undefined;
      i.error = undefined;
    });
  }

  // Options and new files only mark results as stale; work starts on the Resize button
  function invalidate() {
    state.run++;
    state.running = false;
    clearOutputs();
    render();
  }

  async function process() {
    const run = ++state.run;
    state.running = true;
    clearOutputs();
    render();
    for (const item of state.items) {
      try {
        const out = await resize(item);
        if (run !== state.run) return URL.revokeObjectURL(out.url);
        item.out = out;
      } catch {
        if (run !== state.run) return;
        item.error = t("error");
      }
      render();
    }
    state.running = false;
    render();
  }

  function render() {
    const { items } = state;
    $("result").hidden = items.length === 0;
    const done = items.filter((i) => i.out || i.error).length;
    const busy = state.running && done < items.length;
    const pending = !state.running && done < items.length;
    const totalIn = items.reduce((s, i) => s + i.file.size, 0);
    const totalOut = items.reduce((s, i) => s + (i.out ? i.out.blob.size : 0), 0);
    $("summary").innerHTML = busy
      ? `${t("processing")} ${done}/${items.length}`
      : pending
        ? `${items.length} ${t("files")} · ${t("readyHint")}`
        : `${items.length} ${t("files")} · ${formatBytes(totalIn)} → <b>${formatBytes(totalOut)}</b>`;
    $("zip").disabled = busy || pending;
    $("run").disabled = busy || !items.length;
    $("run").textContent = busy ? t("processing") : t("run");
    $("list").replaceChildren(
      ...items.map((item) => {
        const li = document.createElement("li");
        const img = document.createElement("img");
        img.alt = "";
        img.src = item.out ? item.out.url : item.srcUrl;
        img.className = "zoomable";
        img.title = t("preview");
        // Click anywhere on the row (except its buttons) to preview
        li.classList.add("zoomable");
        li.onclick = (e) => {
          if (e.target.closest("button")) return;
          const shown = state.items.map((i) => ({ src: i.out ? i.out.url : i.srcUrl, caption: i.out ? `${i.out.name} · ${i.out.w}×${i.out.h}` : i.file.name }));
          openPreview(shown, state.items.indexOf(item));
        };
        const info = document.createElement("div");
        info.className = "info";
        const name = document.createElement("div");
        name.className = "name";
        name.textContent = item.out ? item.out.name : item.file.name;
        const meta = document.createElement("div");
        meta.className = "meta";
        meta.textContent =
          item.error ||
          (item.out
            ? `${item.w0}×${item.h0} → ${item.out.w}×${item.out.h} · ${formatBytes(item.file.size)} → ${formatBytes(item.out.blob.size)}`
            : state.running ? t("processing") : t("pending"));
        info.append(name, meta);
        const btns = document.createElement("div");
        btns.className = "row-actions";
        const dl = document.createElement("button");
        dl.type = "button";
        dl.className = "btn-sm";
        dl.title = t("download");
        dl.innerHTML = `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 3v12"/><path d="m7 10 5 5 5-5"/><path d="M5 21h14"/></svg><span></span>`;
        dl.querySelector("span").textContent = t("download");
        dl.disabled = !item.out;
        dl.onclick = () => item.out && saveBlob(item.out.blob, item.out.name);
        const rm = document.createElement("button");
        rm.type = "button";
        rm.className = "btn-sm btn-icon";
        rm.textContent = "✕";
        rm.title = t("remove");
        rm.onclick = () => {
          URL.revokeObjectURL(item.srcUrl);
          if (item.out) URL.revokeObjectURL(item.out.url);
          state.items = state.items.filter((i) => i !== item);
          render();
        };
        btns.append(dl, rm);
        li.append(img, info, btns);
        return li;
      })
    );
  }

  function saveBlob(blob, name) {
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = name;
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 10000);
  }

  async function downloadZip() {
    const used = new Set();
    const files = state.items.filter((i) => i.out).map((i) => {
      let n = i.out.name;
      let k = 1;
      while (used.has(n)) n = i.out.name.replace(/(\.[^.]+)$/, `-${k++}$1`);
      used.add(n);
      return { name: n, blob: i.out.blob };
    });
    if (files.length) saveBlob(await window.makeZip(files), `${t("zipName")}.zip`);
  }

  async function addFiles(files) {
    const next = [...files].filter((f) => f.type.startsWith("image/")).map((file) => ({ file, srcUrl: URL.createObjectURL(file) }));
    if (!next.length) return;
    for (const item of next) {
      try {
        const img = await loadImage(item.srcUrl);
        item.w0 = img.naturalWidth;
        item.h0 = img.naturalHeight;
      } catch {}
    }
    state.items.push(...next);
    invalidate();
  }

  function sync() {
    const pick = (id, attr, val) => [...$(id).children].forEach((b) => b.classList.toggle("active", b.dataset[attr] === String(val)));
    [...$("ratio").children].forEach((b) => b.classList.toggle("active", parseRatio(b.dataset.ratio) === state.ratio));
    pick("fit", "fit", state.fit);
    [...$("width").children].forEach((b) => b.classList.toggle("active", Number(b.dataset.w) === state.width && !$("customW").value));
    pick("format", "f", state.format);
    $("fit").hidden = !state.ratio;
    const hint = !state.ratio ? t("hintNone") : state.fit === "cover" ? t("hintCover") : t("hintContain");
    $("hint").textContent = `${hint} ${state.width ? t("noUpscale") : ""}`;
  }

  function applyLang() {
    document.documentElement.lang = state.lang;
    document.querySelectorAll("[data-i18n]").forEach((el) => (el.textContent = t(el.dataset.i18n)));
    document.querySelectorAll("[data-i18n-ph]").forEach((el) => (el.placeholder = t(el.dataset.i18nPh)));
    $("lang").textContent = t("switchTo");
    $("lang").title = t("switchTitle");
    sync();
    render();
  }

  // Events
  $("drop").onclick = () => $("file").click();
  $("file").onchange = (e) => {
    addFiles(e.target.files);
    e.target.value = "";
  };
  $("drop").ondragover = (e) => { e.preventDefault(); $("drop").classList.add("over"); };
  $("drop").ondragleave = () => $("drop").classList.remove("over");
  $("drop").ondrop = (e) => {
    e.preventDefault();
    $("drop").classList.remove("over");
    addFiles(e.dataTransfer.files);
  };
  window.addEventListener("paste", (e) => addFiles([...(e.clipboardData?.files || [])]));
  const onSeg = (id, fn) => ($(id).onclick = (e) => {
    const b = e.target.closest("button");
    if (!b) return;
    fn(b);
    sync();
    invalidate();
  });
  onSeg("ratio", (b) => (state.ratio = parseRatio(b.dataset.ratio)));
  onSeg("fit", (b) => (state.fit = b.dataset.fit));
  onSeg("width", (b) => { state.width = Number(b.dataset.w); $("customW").value = ""; });
  onSeg("format", (b) => (state.format = b.dataset.f));
  $("customW").oninput = (e) => {
    const v = Number(e.target.value);
    state.width = v >= 16 ? Math.min(8000, Math.round(v)) : 0;
    sync();
    invalidate();
  };
  $("run").onclick = () => process();
  $("zip").onclick = downloadZip;
  $("clear").onclick = () => {
    state.run++;
    state.items.forEach((i) => {
      URL.revokeObjectURL(i.srcUrl);
      if (i.out) URL.revokeObjectURL(i.out.url);
    });
    state.items = [];
    render();
  };
  $("lang").onclick = () => {
    state.lang = state.lang === "vi" ? "en" : "vi";
    store.set("ir-lang", state.lang);
    applyLang();
  };

  applyLang();
})();
