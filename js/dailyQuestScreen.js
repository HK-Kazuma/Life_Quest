// ②デイリークエスト画面：毎日の習慣にしたい小さな行動を管理する。
// クエストボードから受注したデイリークエストは日をまたいでも残り続け、
// クリア状況(lastClearedDate)だけが日付が変わるとリセットされる。
(function () {
  const DAILY_QUEST_EXP = 3;
  const WEEKLY_TICK_EXP = 5;
  let selectedId = null;

  function escapeHtml(str) {
    return String(str).replace(
      /[&<>"']/g,
      (ch) =>
        ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[ch])
    );
  }

  function render(container, state) {
    selectedId = null;

    container.innerHTML = `
      <div class="screen-panel">
        <h2 class="screen-title">② デイリークエスト</h2>
        <p class="screen-desc">毎日の習慣にしたい小さな行動を管理しよう。クリアすると少しだけEXPがもらえる（取り消し不可）。クリア状況は日付が変わるとリセットされる。</p>
        <ul class="daily-quest-list" id="daily-quest-list"></ul>

        <h3 class="screen-subtitle">週間クエスト</h3>
        <p class="screen-desc">1週間のうち何回やるかを決めて記録しよう。達成できなかった週があっても表示は変わらない。2週連続で未達成のときだけ、目標を見直すか静かに提案する。</p>
        <ul class="weekly-quest-list" id="weekly-quest-list"></ul>
      </div>
    `;

    renderList(state);
    renderWeeklyList(state);
  }

  function renderList(state) {
    const list = document.getElementById("daily-quest-list");
    if (!list) return;
    const today = window.App.todayStr();

    if (state.dailyQuests.length === 0) {
      list.innerHTML = `<li class="empty-hint">まだデイリークエストがありません。クエストコマンドから受注しよう。</li>`;
      return;
    }

    list.innerHTML = state.dailyQuests
      .map((q) => {
        const cleared = q.lastClearedDate === today;
        const isSelected = q.id === selectedId;
        return `
        <li class="daily-quest-item${cleared ? " is-cleared" : ""}${
          isSelected ? " is-selected" : ""
        }" data-id="${q.id}">
          <div class="daily-quest-row">
            <span class="daily-quest-text">${escapeHtml(q.text)}</span>
            <button type="button" class="daily-quest-remove-btn" data-id="${q.id}">×</button>
          </div>
          ${
            cleared
              ? `<div class="clear-stamp-group">
                  <div class="clear-stamp">CLEAR</div>
                  <div class="clear-stamp-xp">+${DAILY_QUEST_EXP}XP</div>
                 </div>`
              : ""
          }
          ${
            isSelected && !cleared
              ? `<div class="daily-quest-actions">
                  <button type="button" class="primary-btn daily-quest-complete-btn" data-id="${q.id}">完了する</button>
                 </div>`
              : ""
          }
        </li>`;
      })
      .join("");

    list.querySelectorAll(".daily-quest-row").forEach((row) => {
      row.addEventListener("click", (e) => {
        if (e.target.closest(".daily-quest-remove-btn")) return;
        const item = row.closest(".daily-quest-item");
        if (item.classList.contains("is-cleared")) return;
        const id = item.dataset.id;
        selectedId = selectedId === id ? null : id;
        renderList(state);
      });
    });

    list.querySelectorAll(".daily-quest-remove-btn").forEach((btn) => {
      btn.addEventListener("click", (e) => {
        e.stopPropagation();
        const id = btn.dataset.id;
        state.dailyQuests = state.dailyQuests.filter((q) => q.id !== id);
        if (selectedId === id) selectedId = null;
        window.App.persist();
        renderList(state);
      });
    });

    list.querySelectorAll(".daily-quest-complete-btn").forEach((btn) => {
      btn.addEventListener("click", () => {
        const q = state.dailyQuests.find((qq) => qq.id === btn.dataset.id);
        if (!q) return;
        openCompleteConfirm(q, state);
      });
    });
  }

  // 週(月曜始まり)が変わっていたら、進行中だった週の結果をhistoryに積んでリセットする。
  // データは消さず蓄積するだけ。未達成が続いた回数(missedWeeksStreak)もここで更新する。
  function rolloverIfNeeded(quest, currentWeekStart) {
    if (quest.weekStart === currentWeekStart) return false;
    if (quest.weekStart) {
      quest.history.push({
        weekStart: quest.weekStart,
        doneCount: quest.doneCount,
        targetCount: quest.targetCount,
      });
      if (quest.doneCount < quest.targetCount) quest.missedWeeksStreak += 1;
      else quest.missedWeeksStreak = 0;
    }
    quest.doneCount = 0;
    quest.weekStart = currentWeekStart;
    return true;
  }

  // 直近(最大4週分)の実績平均。目標を見直す提案の根拠として使う。
  function recentAverage(quest) {
    const recent = quest.history.slice(-4);
    if (recent.length === 0) return quest.targetCount;
    return recent.reduce((sum, h) => sum + h.doneCount, 0) / recent.length;
  }

  function renderWeeklyList(state) {
    const list = document.getElementById("weekly-quest-list");
    if (!list) return;
    const currentWeekStart = window.Widgets.weekStartOf(window.App.todayStr());

    let changed = false;
    state.weeklyQuests.forEach((q) => {
      if (rolloverIfNeeded(q, currentWeekStart)) changed = true;
    });
    if (changed) window.App.persist();

    if (state.weeklyQuests.length === 0) {
      list.innerHTML = `<li class="empty-hint">まだ週間クエストがありません。クエストコマンドから受注しよう。</li>`;
      return;
    }

    list.innerHTML = state.weeklyQuests
      .map((q) => {
        const achieved = q.doneCount >= q.targetCount;
        const showReview = q.missedWeeksStreak >= 2 && q.reviewDismissedWeek !== currentWeekStart;
        const avg = recentAverage(q);
        return `
        <li class="weekly-quest-item${achieved ? " is-achieved" : ""}" data-id="${q.id}">
          <div class="weekly-quest-row">
            <span class="weekly-quest-text">${escapeHtml(q.text)}</span>
            <span class="weekly-quest-progress">${q.doneCount} / ${q.targetCount}</span>
            <button type="button" class="secondary-btn weekly-quest-tick-btn" data-id="${q.id}"${
              achieved ? " disabled" : ""
            }>＋1</button>
            <button type="button" class="daily-quest-remove-btn" data-id="${q.id}">×</button>
          </div>
          ${
            showReview
              ? `<div class="weekly-quest-review">
                  <p>「${escapeHtml(q.text)}」が2週連続で目標未達成です。直近の実績は週平均${avg.toFixed(
                    1
                  )}回でした。目標を見直しませんか？</p>
                  <div class="modal-actions">
                    <button type="button" class="secondary-btn weekly-quest-dismiss-btn" data-id="${q.id}">このままでいい</button>
                    <button type="button" class="primary-btn weekly-quest-adjust-btn" data-id="${q.id}" data-avg="${Math.max(
                      1,
                      Math.round(avg)
                    )}">週${Math.max(1, Math.round(avg))}回に修正する</button>
                  </div>
                 </div>`
              : ""
          }
        </li>`;
      })
      .join("");

    list.querySelectorAll(".weekly-quest-tick-btn").forEach((btn) => {
      btn.addEventListener("click", () => tickWeeklyQuest(btn.dataset.id, state));
    });
    list.querySelectorAll(".weekly-quest-item .daily-quest-remove-btn").forEach((btn) => {
      btn.addEventListener("click", () => {
        state.weeklyQuests = state.weeklyQuests.filter((q) => q.id !== btn.dataset.id);
        window.App.persist();
        renderWeeklyList(state);
      });
    });
    list.querySelectorAll(".weekly-quest-dismiss-btn").forEach((btn) => {
      btn.addEventListener("click", () => {
        const q = state.weeklyQuests.find((qq) => qq.id === btn.dataset.id);
        if (!q) return;
        q.reviewDismissedWeek = currentWeekStart;
        window.App.persist();
        renderWeeklyList(state);
      });
    });
    list.querySelectorAll(".weekly-quest-adjust-btn").forEach((btn) => {
      btn.addEventListener("click", () => {
        const q = state.weeklyQuests.find((qq) => qq.id === btn.dataset.id);
        if (!q) return;
        q.targetCount = Number(btn.dataset.avg);
        q.missedWeeksStreak = 0;
        q.reviewDismissedWeek = currentWeekStart;
        window.App.persist();
        renderWeeklyList(state);
      });
    });
  }

  function tickWeeklyQuest(id, state) {
    const q = state.weeklyQuests.find((qq) => qq.id === id);
    if (!q || q.doneCount >= q.targetCount) return;
    q.doneCount += 1;
    const leveledUp = window.App.addExp(WEEKLY_TICK_EXP);
    window.App.persist();
    window.App.rerenderSidebar();
    renderWeeklyList(state);

    if (leveledUp) {
      window.App.showLevelUp(state.character.level);
    }
  }

  // 「完了する」のクッション用ポップアップ。ここでOKを押すまでクリア扱いにしない。
  function openCompleteConfirm(quest, state) {
    const overlay = document.getElementById("daily-quest-confirm-overlay");
    const box = document.getElementById("daily-quest-confirm-box");
    if (!overlay || !box) return;

    box.innerHTML = `
      <div class="modal-header">
        <h3 class="modal-title">クエストを完了しますか？</h3>
        <button type="button" class="modal-close-btn" id="daily-quest-confirm-close">✕</button>
      </div>
      <p>「${escapeHtml(quest.text)}」を完了します。完了すると取り消せません。</p>
      <div class="modal-actions">
        <button type="button" class="secondary-btn" id="daily-quest-confirm-cancel">キャンセル</button>
        <button type="button" class="primary-btn" id="daily-quest-confirm-ok">完了する</button>
      </div>
    `;

    function close() {
      overlay.classList.add("hidden");
      overlay.onclick = null;
    }

    document.getElementById("daily-quest-confirm-close").addEventListener("click", close);
    document.getElementById("daily-quest-confirm-cancel").addEventListener("click", close);
    document.getElementById("daily-quest-confirm-ok").addEventListener("click", () => {
      close();
      completeQuest(quest, state);
    });

    overlay.classList.remove("hidden");
    overlay.onclick = (e) => {
      if (e.target === overlay) close();
    };
  }

  function completeQuest(quest, state) {
    quest.lastClearedDate = window.App.todayStr();
    const leveledUp = window.App.addExp(DAILY_QUEST_EXP);
    window.App.persist();
    window.App.rerenderSidebar();
    renderList(state);
    spawnXpFloat(quest.id);

    if (leveledUp) {
      window.App.showLevelUp(state.character.level);
    }
  }

  // クリア直後、下から浮き上がってフェードアウトするXP獲得表示を1回だけ出す。
  function spawnXpFloat(questId) {
    const item = document.querySelector(`.daily-quest-item[data-id="${questId}"]`);
    if (!item) return;
    const el = document.createElement("div");
    el.className = "xp-float";
    el.textContent = `+${DAILY_QUEST_EXP}XP`;
    el.addEventListener("animationend", () => el.remove());
    item.appendChild(el);
  }

  window.DailyQuestScreen = { render };
})();
