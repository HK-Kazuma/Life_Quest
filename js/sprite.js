// HD-2D風ミニキャラクター描画（assets/minichara.png）。
(function () {
  const TIERS = [
    { min: 0, color: "#8a8a8a" }, // 見習い
    { min: 5, color: "#b5651d" }, // 銅
    { min: 10, color: "#c0c0c0" }, // 銀
    { min: 20, color: "#ffd700" }, // 金
  ];

  function tierColorForLevel(level) {
    let color = TIERS[0].color;
    for (const t of TIERS) {
      if (level >= t.min) color = t.color;
    }
    return color;
  }

  function renderSprite(level) {
    const tierColor = tierColorForLevel(level);
    return `<img src="assets/minichara.png" alt="キャラクター" class="sprite-img" style="border-color:${tierColor}" />`;
  }

  window.Sprite = { renderSprite };
})();
