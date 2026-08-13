// 右側ウィジェット：①連続ストリーク ②活動記録カレンダー（達成度ヒートマップ）を描画する。
(function () {
  const CALENDAR_DAYS = 35; // 5週間分

  function escapeHtml(str) {
    return String(str).replace(
      /[&<>"']/g,
      (ch) =>
        ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[ch])
    );
  }

  function toDateStr(d) {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${y}-${m}-${day}`;
  }

  // 月曜始まりの週の開始日を返す。
  function weekStartOf(dateStr) {
    const d = new Date(dateStr + "T00:00:00");
    const day = d.getDay(); // 0=日 ... 6=土
    const diffToMonday = day === 0 ? 6 : day - 1;
    d.setDate(d.getDate() - diffToMonday);
    return toDateStr(d);
  }

  function formatWeekLabel(weekStartStr) {
    const start = new Date(weekStartStr + "T00:00:00");
    const end = new Date(start);
    end.setDate(end.getDate() + 6);
    const fmt = (d) => `${d.getMonth() + 1}/${d.getDate()}`;
    return `${fmt(start)} 〜 ${fmt(end)}`;
  }

  // 過去に受注したメイン/サブクエストを、受注日ごとに1件として並べる（新しい順）。
  function buildQuestOccurrences(state) {
    const occurrences = [];
    state.history.forEach((entry) => {
      if (!entry.goals || !entry.goalTypes) return;
      entry.goals.forEach((text) => {
        const type = entry.goalTypes[text];
        if (type !== "main" && type !== "sub") return;
        const matchedLog = entry.logs.find((log) => log.activity === text);
        const status = !matchedLog ? "none" : window.AchievementUtil.isTouch(matchedLog) ? "touch" : "full";
        occurrences.push({ date: entry.date, text, type, status });
      });
    });
    occurrences.sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0));
    return occurrences;
  }

  // 受注日が属する週（月曜始まり）ごとにグループ化する（新しい週が先頭）。
  function groupOccurrencesByWeek(occurrences) {
    const map = new Map();
    occurrences.forEach((occ) => {
      const weekStart = weekStartOf(occ.date);
      if (!map.has(weekStart)) map.set(weekStart, []);
      map.get(weekStart).push(occ);
    });
    return Array.from(map.entries())
      .sort((a, b) => (a[0] < b[0] ? 1 : -1))
      .map(([weekStart, items]) => ({ weekStart, label: formatWeekLabel(weekStart), items }));
  }

  // その日の達成度を判定する。
  // - ログが無い日: none（未記録）
  // - ログはあるが、紐づく目標が無い/未設定: recorded（薄い青）
  // - 目標の一部がフル達成/接触している: partial（普通の青）
  // - 目標の全部がフル達成している: full（濃い青）
  // 「接触」は「フル達成」と同じ薄い扱いでpartialに含め、未接触だけを区別する
  // （接触を未達成として強調しない）。
  function dayTier(entry) {
    if (!entry || entry.logs.length === 0) return "none";
    if (!entry.goals || entry.goals.length === 0) return "recorded";

    let fullCount = 0;
    let touchedCount = 0;
    entry.goals.forEach((g) => {
      const log = entry.logs.find((l) => l.activity === g);
      if (!log) return;
      if (window.AchievementUtil.isTouch(log)) touchedCount++;
      else fullCount++;
    });

    if (fullCount === entry.goals.length) return "full";
    if (fullCount > 0 || touchedCount > 0) return "partial";
    return "recorded";
  }

  function questHistoryStatusClass(status) {
    if (status === "full") return "cleared";
    if (status === "touch") return "touched";
    return "not-cleared";
  }

  function questHistoryStatusLabel(status) {
    if (status === "full") return "✔ クリア";
    if (status === "touch") return "△ 接触";
    return "未クリア";
  }

  // 今週（月曜始まり）に記録した活動の合計件数。
  function weekActivityCount(historyByDate, todayStr) {
    const weekStart = weekStartOf(todayStr);
    let total = 0;
    for (let i = 0; i < 7; i++) {
      const entry = historyByDate[window.App.shiftDateStr(weekStart, i)];
      if (entry) total += entry.logs.length;
    }
    return total;
  }

  // 直近N日（今日を含む）の1日あたり活動数の移動平均。
  // 前日単体の落ち込みではなく、期間としての傾向で自分を見られるようにする指標。
  function movingAverageActivities(historyByDate, todayStr, days) {
    let total = 0;
    for (let i = 0; i < days; i++) {
      const entry = historyByDate[window.App.shiftDateStr(todayStr, -i)];
      if (entry) total += entry.logs.length;
    }
    return total / days;
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

  // カレンダー本体（統計＋グリッド）のHTMLを組み立てる。右側ウィジェットとポップアップの両方から使う。
  function buildCalendarBodyHtml(state) {
    const historyByDate = {};
    state.history.forEach((entry) => {
      historyByDate[entry.date] = entry;
    });

    const achievementDays = state.history.filter((entry) => dayTier(entry) === "full").length;
    const currentStreak = state.character.streak || 0;
    const longestStreak = state.character.longestStreak || 0;

    // 「今日」の判定はAM4:00までを前日扱いする論理日付(window.App.todayStr)に合わせる。
    const todayStr = window.App.todayStr();
    const weekCount = weekActivityCount(historyByDate, todayStr);
    const avg7 = movingAverageActivities(historyByDate, todayStr, 7);
    const avg30 = movingAverageActivities(historyByDate, todayStr, 30);

    const cells = [];
    const today = new Date();
    for (let i = CALENDAR_DAYS - 1; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(d.getDate() - i);
      const dateStr = toDateStr(d);
      const tier = dayTier(historyByDate[dateStr]);
      cells.push({ dateStr, tier, isToday: dateStr === todayStr });
    }

    return `
      <div class="calendar-widget-stats calendar-widget-stats-primary">
        <div class="calendar-stat">
          <div class="calendar-stat-value">${weekCount}</div>
          <div class="calendar-stat-label">今週の活動数</div>
        </div>
        <div class="calendar-stat">
          <div class="calendar-stat-value">${avg7.toFixed(1)}</div>
          <div class="calendar-stat-label">7日移動平均</div>
        </div>
        <div class="calendar-stat">
          <div class="calendar-stat-value">${avg30.toFixed(1)}</div>
          <div class="calendar-stat-label">30日移動平均</div>
        </div>
      </div>
      <div class="calendar-widget-stats calendar-widget-stats-secondary">
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
  }

  function bindCalendarCells(container, state) {
    container.querySelectorAll(".calendar-cell:not(.is-today)").forEach((cell) => {
      cell.addEventListener("click", () => {
        window.DayDetailModal.open(cell.dataset.date, state);
      });
    });
  }

  function renderCalendarWidget(state) {
    const box = document.getElementById("calendar-widget");
    if (!box) return;
    box.innerHTML = buildCalendarBodyHtml(state);
    bindCalendarCells(box, state);
  }

  // コマンドの「カレンダー」から開く、大きく見やすいカレンダーのポップアップ表示。
  function openCalendarPopup(state) {
    const overlay = document.getElementById("calendar-popup-overlay");
    const box = document.getElementById("calendar-popup-box");
    if (!overlay || !box) return;

    function close() {
      overlay.classList.add("hidden");
      overlay.onclick = null;
    }

    function renderCalendarView() {
      box.innerHTML = `
        <div class="modal-header">
          <h3 class="modal-title">活動記録カレンダー</h3>
          <button type="button" class="modal-close-btn" id="calendar-popup-close">✕</button>
        </div>
        <button type="button" class="secondary-btn" id="calendar-quest-history-btn">📜 クエスト履歴を見る</button>
        ${buildCalendarBodyHtml(state)}
      `;

      document.getElementById("calendar-popup-close").addEventListener("click", close);
      document.getElementById("calendar-quest-history-btn").addEventListener("click", renderQuestHistoryView);
      bindCalendarCells(box, state);
    }

    // メイン/サブクエストの受注履歴を週ごとに表示し、その場で「今日」に再受注できるようにする。
    function renderQuestHistoryView() {
      const weeks = groupOccurrencesByWeek(buildQuestOccurrences(state));

      box.innerHTML = `
        <div class="modal-header">
          <h3 class="modal-title">クエスト履歴</h3>
          <button type="button" class="modal-close-btn" id="calendar-popup-close">✕</button>
        </div>
        <button type="button" class="secondary-btn" id="quest-history-back">← カレンダーに戻る</button>
        <div class="quest-history-body">
          ${
            weeks.length === 0
              ? `<p class="empty-hint">まだメイン/サブクエストの受注記録がありません</p>`
              : weeks
                  .map(
                    (w) => `
                <div class="quest-history-week">
                  <div class="quest-history-week-title">${escapeHtml(w.label)}</div>
                  <ul class="quest-history-list">
                    ${w.items
                      .map(
                        (occ) => `
                      <li class="quest-history-item">
                        <span class="quest-type-badge type-${occ.type}">${escapeHtml(
                          window.QuestBoard.typeShortLabel(occ.type)
                        )}</span>
                        <span class="quest-history-text">${escapeHtml(occ.text)}</span>
                        <span class="quest-history-date">${occ.date}</span>
                        <span class="quest-history-status ${questHistoryStatusClass(
                          occ.status
                        )}">${questHistoryStatusLabel(occ.status)}</span>
                        <button type="button" class="secondary-btn quest-history-accept-btn" data-text="${escapeHtml(
                          occ.text
                        )}" data-type="${occ.type}">受注する</button>
                      </li>
                    `
                      )
                      .join("")}
                  </ul>
                </div>
              `
                  )
                  .join("")
          }
        </div>
      `;

      document.getElementById("calendar-popup-close").addEventListener("click", close);
      document.getElementById("quest-history-back").addEventListener("click", renderCalendarView);

      box.querySelectorAll(".quest-history-accept-btn").forEach((btn) => {
        btn.addEventListener("click", () => {
          const text = btn.dataset.text;
          const type = btn.dataset.type;
          const todayEntry = window.App.getTodayEntry(true);
          todayEntry.goalTypes = todayEntry.goalTypes || {};
          todayEntry.goals.push(text);
          todayEntry.goalTypes[text] = type;
          window.App.persist();
          window.App.rerenderSidebar();
          btn.textContent = "受注しました";
          btn.disabled = true;
        });
      });
    }

    renderCalendarView();
    overlay.classList.remove("hidden");
    overlay.onclick = (e) => {
      if (e.target === overlay) close();
    };
  }

  // データのバックアップ（仮）：個人利用の間、JSONの書き出し・読み込みで保存データを持ち運べるようにする。
  // 右側ウィジェットのスケール・配置に影響しないよう、画面上の小さなボタン→ポップアップで完結させる。
  function initBackupButton() {
    const trigger = document.getElementById("backup-fab-btn");
    const overlay = document.getElementById("backup-overlay");
    const box = document.getElementById("backup-box");
    if (!trigger || !overlay || !box) return;

    function close() {
      overlay.classList.add("hidden");
      overlay.onclick = null;
    }

    function open() {
      box.innerHTML = `
        <div class="modal-header">
          <h3 class="modal-title">データのバックアップ（仮）</h3>
          <button type="button" class="modal-close-btn" id="backup-modal-close">✕</button>
        </div>
        <p>今はこの端末のブラウザ内だけに保存されています。JSONで書き出し・読み込みができます。</p>
        <div class="modal-actions">
          <button type="button" class="secondary-btn" id="backup-download-btn">↓ ダウンロード</button>
          <button type="button" class="secondary-btn" id="backup-upload-btn">↑ アップロード</button>
        </div>
        <input type="file" id="backup-upload-input" accept="application/json" style="display:none" />
      `;

      document.getElementById("backup-modal-close").addEventListener("click", close);
      document.getElementById("backup-download-btn").addEventListener("click", downloadBackup);

      const uploadInput = document.getElementById("backup-upload-input");
      document.getElementById("backup-upload-btn").addEventListener("click", () => uploadInput.click());
      uploadInput.addEventListener("change", () => {
        const file = uploadInput.files[0];
        uploadInput.value = "";
        if (file) uploadBackup(file);
      });

      overlay.classList.remove("hidden");
      overlay.onclick = (e) => {
        if (e.target === overlay) close();
      };
    }

    trigger.addEventListener("click", open);
  }

  function downloadBackup() {
    const json = JSON.stringify(window.App.getState(), null, 2);
    const blob = new Blob([json], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `adventure-log-backup-${window.App.todayStr()}.json`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }

  function uploadBackup(file) {
    const reader = new FileReader();
    reader.onload = () => {
      let parsed;
      try {
        parsed = JSON.parse(reader.result);
      } catch (e) {
        alert("JSONファイルの読み込みに失敗しました。ファイルが壊れている可能性があります。");
        return;
      }
      if (!parsed || !parsed.character || !parsed.history) {
        alert("このアプリのバックアップファイルではないようです。");
        return;
      }
      if (!confirm("現在のデータはすべて上書きされます。よろしいですか？")) return;
      window.Storage.saveState(parsed);
      location.reload();
    };
    reader.readAsText(file);
  }

  // 集中タイマーの実行中バッジ：右カラムのウィジェットとは別に、画面右上に固定表示する小さなボタン。
  // レイアウトの取り合いを避けるため常時ぶんの領域は確保せず、実行中(session有り)の時だけ出す。
  function renderPomodoroWidget(state) {
    const box = document.getElementById("pomodoro-widget");
    if (!box || !window.Pomodoro) return;
    const session = window.Pomodoro.getSession(state);
    if (!session) {
      box.classList.add("hidden");
      box.innerHTML = "";
      return;
    }
    const remainingMs = window.Pomodoro.getRemainingMs(session);
    const phaseLabel = session.phase === "work" ? "🚶 集中中" : "🏕️ 休憩中";

    box.classList.remove("hidden");
    box.innerHTML = `
      <button type="button" class="pomodoro-widget-btn">
        <span class="pomodoro-widget-phase">${phaseLabel}${session.paused ? "（一時停止）" : ""}</span>
        <span class="pomodoro-widget-timer">${window.Pomodoro.formatMs(remainingMs)}</span>
      </button>
    `;
    box.querySelector(".pomodoro-widget-btn").addEventListener("click", () => {
      window.PomodoroModal.open(state);
    });
  }

  function render(state) {
    renderStreakWidget(state);
    renderCalendarWidget(state);
    renderPomodoroWidget(state);
  }

  window.Widgets = {
    render,
    dayTier,
    initBackupButton,
    openCalendarPopup,
    renderPomodoroWidget,
    weekStartOf,
  };
})();
