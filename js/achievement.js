// 活動記録の達成度：フル達成/接触の2段階を表す共通ユーティリティ。
// 「未接触」は行そのものが存在しない（何も記録していない）ことで表現するため、
// ここではフル達成/接触の2値だけを扱う。
(function () {
  const FULL = "full";
  const TOUCH = "touch";

  // 接触は「少しでも手をつけた」ことを評価するため、フル達成の半分程度のEXPにする。
  const ROW_EXP = { [FULL]: 15, [TOUCH]: 8 };

  function normalize(achievement) {
    return achievement === TOUCH ? TOUCH : FULL;
  }

  function isTouch(log) {
    return !!log && log.achievement === TOUCH;
  }

  function rowExp(achievement) {
    return ROW_EXP[normalize(achievement)];
  }

  // 活動行に添える「フル達成／接触」の切り替えボタン。
  function toggleHtml(rowIdx, achievement) {
    const current = normalize(achievement);
    return `
      <div class="achievement-toggle" data-row="${rowIdx}">
        <button type="button" class="achievement-btn${
          current === FULL ? " active" : ""
        }" data-row="${rowIdx}" data-value="${FULL}">フル達成</button>
        <button type="button" class="achievement-btn${
          current === TOUCH ? " active" : ""
        }" data-row="${rowIdx}" data-value="${TOUCH}">接触</button>
      </div>
    `;
  }

  // 履歴・当日サマリーなど読み取り専用の場面で、接触だった活動にだけ添える小さなバッジ。
  function badgeHtml(log) {
    return isTouch(log) ? `<span class="achievement-badge-touch">接触</span>` : "";
  }

  window.AchievementUtil = { FULL, TOUCH, normalize, isTouch, rowExp, toggleHtml, badgeHtml };
})();
