// 仮の簡易ドット絵キャラクター描画。
// 本格デザインに差し替える際は、このファイルだけを差し替えればよい。
(function () {
  // 8マス幅のドット絵パターン（0=透明, 1=輪郭, 2=肌, 3=装備色, 4=瞳）
  const PIXELS = [
    "01111100",
    "13333310",
    "13111310",
    "01222100",
    "01244210",
    "00122100",
    "01333100",
    "13333310",
    "13111310",
    "01000100",
  ];

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
    const colorMap = {
      0: null,
      1: "#2b2b2b",
      2: "#f2c9a1",
      3: tierColor,
      4: "#1a1a1a",
    };

    const cell = 12;
    const width = PIXELS[0].length * cell;
    const height = PIXELS.length * cell;
    let rects = "";

    PIXELS.forEach((row, y) => {
      for (let x = 0; x < row.length; x++) {
        const color = colorMap[row[x]];
        if (color) {
          rects += `<rect x="${x * cell}" y="${y * cell}" width="${cell}" height="${cell}" fill="${color}" />`;
        }
      }
    });

    return `<svg viewBox="0 0 ${width} ${height}" width="${width}" height="${height}" class="sprite-svg">${rects}</svg>`;
  }

  window.Sprite = { renderSprite };
})();
