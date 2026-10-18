// 天下三分：地図の拡大・移動（ホイール・ドラッグ・2本指）。SVG の viewBox を動かす
// 城と地名の札（data-x・data-y を持つ要素）は、拡大しても画面の大きさがあまり変わらないように縮め返す
var SG = typeof SG !== 'undefined' ? SG : {};
SG.mapView = function (svg, opt) {
  const size = opt.size;
  let zoom = 1, cx = size / 2, cy = size / 2, dragged = false;
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const box = () => { const r = svg.getBoundingClientRect(); return { w: r.width || 1, h: r.height || 1, left: r.left, top: r.top }; };
  // いま見えている範囲（地図の座標）
  function visible() {
    const b = box(), k = Math.min(b.w, b.h) / size * zoom; // 地図1あたりの画面のピクセル
    const w = b.w / k, h = b.h / k;
    return { x: cx - w / 2, y: cy - h / 2, w, h, k };
  }
  function apply() {
    zoom = clamp(zoom, opt.minZoom, opt.maxZoom);
    let v = visible();
    cx = v.w >= size ? size / 2 : clamp(cx, v.w / 2, size - v.w / 2);
    cy = v.h >= size ? size / 2 : clamp(cy, v.h / 2, size - v.h / 2);
    v = visible();
    svg.setAttribute('viewBox', `${v.x} ${v.y} ${v.w} ${v.h}`);
    const s = Math.pow(zoom, opt.iconGrow - 1);
    for (const e of svg.querySelectorAll('[data-x]')) e.setAttribute('transform', `translate(${e.dataset.x},${e.dataset.y}) scale(${s})`);
    if (opt.onChange) opt.onChange(v);
  }
  // 画面の点 (sx, sy) の下の地図の場所を動かさずに拡大する
  function zoomAt(f, sx, sy) {
    const b = box(), v = visible();
    const mx = v.x + (sx - b.left) / b.w * v.w, my = v.y + (sy - b.top) / b.h * v.h;
    zoom = clamp(zoom * f, opt.minZoom, opt.maxZoom);
    const k = Math.min(b.w, b.h) / size * zoom, w = b.w / k, h = b.h / k;
    cx = mx - (sx - b.left) / b.w * w + w / 2;
    cy = my - (sy - b.top) / b.h * h + h / 2;
    apply();
  }
  function zoomBy(f) { const b = box(); zoomAt(f, b.left + b.w / 2, b.top + b.h / 2); }
  function centerOn(x, y, z) { cx = x; cy = y; if (z) zoom = z; apply(); }

  svg.addEventListener('wheel', e => { e.preventDefault(); zoomAt(e.deltaY < 0 ? opt.wheelStep : 1 / opt.wheelStep, e.clientX, e.clientY); }, { passive: false });
  // ドラッグで移動、2本指で拡大。少しでも動かしたら、そのあとのクリック（都市を選ぶ）は無視する
  const pts = new Map();
  let last = null;
  svg.addEventListener('pointerdown', e => {
    pts.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (pts.size === 1) { dragged = false; last = { x: e.clientX, y: e.clientY }; }
  });
  svg.addEventListener('pointermove', e => {
    if (!pts.has(e.pointerId)) return;
    const prev = pts.get(e.pointerId);
    pts.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (pts.size === 2) {
      const [a, b] = [...pts.values()];
      const other = [...pts.entries()].find(([id]) => id !== e.pointerId)[1];
      const before = Math.hypot(prev.x - other.x, prev.y - other.y), after = Math.hypot(a.x - b.x, a.y - b.y);
      if (before > 0) zoomAt(after / before, (a.x + b.x) / 2, (a.y + b.y) / 2);
      dragged = true;
      return;
    }
    if (Math.hypot(e.clientX - last.x, e.clientY - last.y) > 5) dragged = true;
    if (!dragged) return;
    if (!svg.hasPointerCapture(e.pointerId)) svg.setPointerCapture(e.pointerId);
    const v = visible();
    cx -= (e.clientX - prev.x) / v.k; cy -= (e.clientY - prev.y) / v.k;
    apply();
  });
  const up = e => { pts.delete(e.pointerId); };
  svg.addEventListener('pointerup', up);
  svg.addEventListener('pointercancel', up);
  svg.addEventListener('click', e => { if (dragged) { e.stopPropagation(); dragged = false; } }, true);
  window.addEventListener('resize', apply);
  return { apply, zoomBy, centerOn, visible, get zoom() { return zoom; } };
};
