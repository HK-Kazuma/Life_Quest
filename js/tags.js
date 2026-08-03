// タグ機能の共通ユーティリティ：16色パレット・配色に応じた文字色判定・読み取り専用チップの描画。
(function () {
  const COLORS = [
    "#e6194b", "#f58231", "#ffe119", "#bfef45", "#3cb44b", "#42d4f4",
    "#4363d8", "#911eb4", "#f032e6", "#fabed4", "#469990", "#9a6324",
    "#800000", "#808000", "#000075", "#a9a9a9",
  ];

  function escapeHtml(str) {
    return String(str).replace(
      /[&<>"']/g,
      (ch) =>
        ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[ch])
    );
  }

  function contrastColor(hex) {
    const c = hex.replace("#", "");
    const r = parseInt(c.substring(0, 2), 16);
    const g = parseInt(c.substring(2, 4), 16);
    const b = parseInt(c.substring(4, 6), 16);
    const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
    return luminance > 0.6 ? "#111" : "#fff";
  }

  function tagsById(tags) {
    const map = {};
    (tags || []).forEach((t) => (map[t.id] = t));
    return map;
  }

  // 履歴・記録済みリストなど、読み取り専用の場面で使うタグチップ群。
  function renderTagChips(tagIds, tags) {
    if (!tagIds || !tagIds.length) return "";
    const map = tagsById(tags);
    const chips = tagIds
      .map((id) => map[id])
      .filter(Boolean)
      .map(
        (t) =>
          `<span class="tag-chip" style="background:${t.color};color:${contrastColor(
            t.color
          )}">${escapeHtml(t.name)}</span>`
      )
      .join("");
    return chips ? `<span class="tag-chip-group">${chips}</span>` : "";
  }

  window.TagsUtil = { COLORS, contrastColor, tagsById, renderTagChips };
})();
