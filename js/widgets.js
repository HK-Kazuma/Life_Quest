// 右側ウィジェット：①連続ストリーク ②活動記録カレンダー（達成度ヒートマップ）を描画する。
(function () {
  const CALENDAR_DAYS = 35; // 5週間分

  function toDateStr(d) {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${y}-${m}-${day}`;
  }

  // その日の達成度を判定する。
  // - ログが無い日: none（未記録）
  // - ログはあるが、紐づく目標が無い/未設定: recorded（薄い青）
  // - 目標の一部がログと紐づいている: partial（普通の青）
  // - 目標の全部がログと紐づいている: full（濃い青）
  function dayTier(entry) {
    if (!entry || entry.logs.length === 0) return "none";
    if (!entry.goals || entry.goals.length === 0) return "recorded";

    const achievedCount = entry.goals.filter((g) =>
      entry.logs.some((log) => log.linkedGoal === g)
    ).length;

    if (achievedCount === entry.goals.length) return "full";
    if (achievedCount > 0) return "partial";
    return "recorded";
  }

  function renderStreakWidget(state) {
    const box = document.getElementById("streak-widget");
    if (!box) return;
    const streak = state.character.streak || 0;

    box.innerHTML = `
      <div class="streak-watermark" style="background-image: url('assets/loto-emblem.png');"></div>
      <div class="streak-widget-content">
        <div class="streak-widget-label">連続ストリーク</div>
        <div class="streak-widget-number">${streak}<span class="streak-widget-unit">日</span></div>
      </div>
    `;
  }

  function renderCalendarWidget(state) {
    const box = document.getElementById("calendar-widget");
    if (!box) return;

    const historyByDate = {};
    state.history.forEach((entry) => {
      historyByDate[entry.date] = entry;
    });

    const achievementDays = state.history.filter((entry) => dayTier(entry) === "full").length;
    const currentStreak = state.character.streak || 0;
    const longestStreak = state.character.longestStreak || 0;

    const todayStr = toDateStr(new Date());
    const cells = [];
    const today = new Date();
    for (let i = CALENDAR_DAYS - 1; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(d.getDate() - i);
      const dateStr = toDateStr(d);
      const tier = dayTier(historyByDate[dateStr]);
      cells.push({ dateStr, tier, isToday: dateStr === todayStr });
    }

    box.innerHTML = `
      <div class="calendar-widget-stats">
        <div class="calendar-stat">
          <div class="calendar-stat-value">${achievementDays}</div>
          <div class="calendar-stat-label">達成日数</div>
        </div>
        <div class="calendar-stat">
          <div class="calendar-stat-value">${currentStreak}</div>
          <div class="calendar-stat-label">現在連続</div>
        </div>
        <div class="calendar-stat">
          <div class="calendar-stat-value">${longestStreak}</div>
          <div class="calendar-stat-label">最長連続</div>
        </div>
      </div>
      <div class="calendar-grid">
        ${cells
          .map(
            (c) =>
              `<div class="calendar-cell tier-${c.tier}${
                c.isToday ? " is-today" : ""
              }" data-date="${c.dateStr}" title="${c.dateStr}"></div>`
          )
          .join("")}
      </div>
    `;

    box.querySelectorAll(".calendar-cell:not(.is-today)").forEach((cell) => {
      cell.addEventListener("click", () => {
        window.DayDetailModal.open(cell.dataset.date, state);
      });
    });
  }

  function render(state) {
    renderStreakWidget(state);
    renderCalendarWidget(state);
  }

  window.Widgets = { render, dayTier };
})();
