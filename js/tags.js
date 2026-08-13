// タグ機能の共通ユーティリティ：16色パレット・配色に応じた文字色判定・読み取り専用チップの描画。
(function () {
  const COLORS = [
    "#e6194b", "#f58231", "#ffe119", "#bfef45", "#3cb44b", "#42d4f4",
    "#4363d8", "#911eb4", "#f032e6", "#fabed4", "#469990", "#9a6324",
    "#800000", "#808000", "#000075", "#a9a9a9",
  ];

  // クエストボードでメイン/サブクエストを受注した際に自動で付くシステムタグ。
  // 任意作成タグ(16色パレットから選ぶ)と見た目で区別できるよう、
  // 色は16色パレットの外を使い、形とフォントも変えてCSS側で描画する（tag-chip-system-*）。
  const SYSTEM_TAGS = {
    main: { id: "tag_system_main", name: "メイン", system: true, kind: "main" },
    sub: { id: "tag_system_sub", name: "サブ", system: true, kind: "sub" },
    // ノルマ（最低ライン）で記録した活動に自動で付くタグ。「未達成」ではなく
    // 「ノルマ達成」として見せるための目印であり、罪悪感を煽らない色にする。
    floor: { id: "tag_system_floor", name: "ノルマ", system: true, kind: "floor" },
  };

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

  // state.tagsにメイン/サブのシステムタグが無ければ追加する（冪等）。
  // 呼び出し側でwindow.App.persist()すること。
  function ensureSystemTags(state) {
    let added = false;
    Object.values(SYSTEM_TAGS).forEach((sysTag) => {
      if (!state.tags.some((t) => t.id === sysTag.id)) {
        state.tags.push({ ...sysTag });
        added = true;
      }
    });
    return added;
  }

  function tagChipClass(tag) {
    return tag.system ? `tag-chip tag-chip-system tag-chip-system-${tag.kind}` : "tag-chip";
  }

  function tagChipStyle(tag) {
    return tag.system ? "" : `background:${tag.color};color:${contrastColor(tag.color)}`;
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
          `<span class="${tagChipClass(t)}" style="${tagChipStyle(t)}">${escapeHtml(t.name)}</span>`
      )
      .join("");
    return chips ? `<span class="tag-chip-group">${chips}</span>` : "";
  }

  window.TagsUtil = {
    COLORS,
    SYSTEM_TAGS,
    contrastColor,
    tagsById,
    ensureSystemTags,
    tagChipClass,
    tagChipStyle,
    renderTagChips,
  };
})();
