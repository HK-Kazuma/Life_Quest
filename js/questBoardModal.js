// クエストボード：「クエスト」コマンドから開く。メイン/サブ/デイリーの3種類から選び、
// 自由入力したクエストを受注する。
// - メイン/サブ：今日の目標(entry.goals)に統合され、①活動記録タブに自動反映。
//   達成できなかった（＝その日の活動として記録されなかった）ものは、
//   宿屋の「おはよう」処理(innModal.js: carryOverUnfinishedGoals)で翌日に自動で持ち越される。
// - デイリー：state.dailyQuests に永続保存され、冒険の書「デイリークエスト」タブで管理する。
// - ウィークリー：state.weeklyQuests に永続保存され、同じく「デイリークエスト」タブの
//   「週間クエスト」セクションで週ごとの達成回数を管理する。
(function () {
  const QUEST_TYPES = [
    { id: "main", label: "メインクエスト", short: "メイン" },
    { id: "sub", label: "サブクエスト", short: "サブ" },
    { id: "daily", label: "デイリークエスト", short: "デイリー" },
    { id: "weekly", label: "ウィークリークエスト", short: "ウィークリー" },
  ];

  function escapeHtml(str) {
    return String(str).replace(
      /[&<>"']/g,
      (ch) =>
        ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[ch])
    );
  }

  function typeLabel(typeId) {
    const t = QUEST_TYPES.find((q) => q.id === typeId);
    return t ? t.label : "";
  }

  function typeShortLabel(typeId) {
    const t = QUEST_TYPES.find((q) => q.id === typeId);
    return t ? t.short : "";
  }

  function open(state) {
    const overlay = document.getElementById("quest-board-overlay");
    const box = document.getElementById("quest-board-box");
    if (!overlay || !box) return;

    function close() {
      overlay.classList.add("hidden");
      overlay.onclick = null;
    }

    function renderBoard() {
      box.innerHTML = `
        <div class="modal-header quest-board-header">
          <h3 class="modal-title">クエストボード</h3>
          <button type="button" class="modal-close-btn" id="quest-board-close">✕</button>
        </div>
        <div class="quest-board-grid">
          ${QUEST_TYPES.map(
            (t) => `<button type="button" class="quest-board-item" data-type="${t.id}">${escapeHtml(t.label)}</button>`
          ).join("")}
        </div>
      `;

      document.getElementById("quest-board-close").addEventListener("click", close);
      document.querySelectorAll(".quest-board-item").forEach((btn) => {
        btn.addEventListener("click", () => {
          if (btn.dataset.type === "daily") renderDailyView();
          else if (btn.dataset.type === "weekly") renderWeeklyView();
          else renderGoalTypeView(btn.dataset.type);
        });
      });
    }

    // メイン/サブ：今日の目標(entry.goals)に統合するタイプ。
    function renderGoalTypeView(typeId) {
      const entry = window.App.getTodayEntry(true);
      entry.goalTypes = entry.goalTypes || {};
      const label = typeLabel(typeId);
      const accepted = entry.goals
        .map((g, idx) => ({ text: g, idx }))
        .filter((g) => entry.goalTypes[g.text] === typeId);

      box.innerHTML = `
        <div class="modal-header quest-board-header">
          <h3 class="modal-title">${escapeHtml(label)}</h3>
          <button type="button" class="modal-close-btn" id="quest-board-close">✕</button>
        </div>
        <button type="button" class="secondary-btn quest-board-back-btn" id="quest-board-back">← ボードに戻る</button>
        <ul class="goal-list" id="quest-board-list">
          ${
            accepted.length === 0
              ? `<li class="empty-hint">まだ受注していません</li>`
              : accepted
                  .map(
                    (g) => `
                <li data-idx="${g.idx}">
                  <span>${escapeHtml(g.text)}</span>
                  <button class="goal-remove-btn" data-idx="${g.idx}">×</button>
                </li>`
                  )
                  .join("")
          }
        </ul>
        <div class="goal-add-row">
          <input type="text" id="quest-board-input" placeholder="${escapeHtml(label)}の内容を入力..." />
          <button type="button" id="quest-board-accept-btn" class="primary-btn">受注する</button>
        </div>
      `;

      document.getElementById("quest-board-close").addEventListener("click", close);
      document.getElementById("quest-board-back").addEventListener("click", renderBoard);

      document.querySelectorAll("#quest-board-list .goal-remove-btn").forEach((btn) => {
        btn.addEventListener("click", () => {
          const idx = Number(btn.dataset.idx);
          const [removedGoal] = entry.goals.splice(idx, 1);
          delete entry.goalTypes[removedGoal];
          window.App.persist();
          window.App.rerenderSidebar();
          if (window.LogScreen) window.LogScreen.removeGoalFromDrafts(removedGoal);
          renderGoalTypeView(typeId);
        });
      });

      function accept() {
        const input = document.getElementById("quest-board-input");
        const text = input.value.trim();
        if (!text) return;
        entry.goals.push(text);
        entry.goalTypes[text] = typeId;
        window.App.persist();
        window.App.rerenderSidebar();
        renderGoalTypeView(typeId);
      }

      document.getElementById("quest-board-accept-btn").addEventListener("click", accept);
      document.getElementById("quest-board-input").addEventListener("keydown", (e) => {
        if (e.key === "Enter") accept();
      });
      document.getElementById("quest-board-input").focus();
    }

    // デイリー：日をまたいで残り続ける永続リスト(state.dailyQuests)。
    // クリア状況の管理は冒険の書「デイリークエスト」タブで行う。
    function renderDailyView() {
      const label = typeLabel("daily");
      const quests = state.dailyQuests;

      box.innerHTML = `
        <div class="modal-header quest-board-header">
          <h3 class="modal-title">${escapeHtml(label)}</h3>
          <button type="button" class="modal-close-btn" id="quest-board-close">✕</button>
        </div>
        <button type="button" class="secondary-btn quest-board-back-btn" id="quest-board-back">← ボードに戻る</button>
        <p class="quest-board-daily-note">受注したデイリークエストは、冒険の書の「デイリークエスト」タブで毎日クリアできます。</p>
        <ul class="goal-list" id="quest-board-list">
          ${
            quests.length === 0
              ? `<li class="empty-hint">まだ受注していません</li>`
              : quests
                  .map(
                    (q) => `
                <li data-id="${q.id}">
                  <span>${escapeHtml(q.text)}</span>
                  <button class="goal-remove-btn" data-id="${q.id}">×</button>
                </li>`
                  )
                  .join("")
          }
        </ul>
        <div class="goal-add-row">
          <input type="text" id="quest-board-input" placeholder="${escapeHtml(label)}の内容を入力..." />
          <button type="button" id="quest-board-accept-btn" class="primary-btn">受注する</button>
        </div>
      `;

      document.getElementById("quest-board-close").addEventListener("click", close);
      document.getElementById("quest-board-back").addEventListener("click", renderBoard);

      document.querySelectorAll("#quest-board-list .goal-remove-btn").forEach((btn) => {
        btn.addEventListener("click", () => {
          const id = btn.dataset.id;
          state.dailyQuests = state.dailyQuests.filter((q) => q.id !== id);
          window.App.persist();
          renderDailyView();
        });
      });

      function accept() {
        const input = document.getElementById("quest-board-input");
        const text = input.value.trim();
        if (!text) return;
        if (state.dailyQuests.some((q) => q.text === text)) {
          alert("そのデイリークエストはすでに受注済みです。");
          return;
        }
        state.dailyQuests.push({
          id: "daily_" + Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
          text,
          lastClearedDate: null,
        });
        window.App.persist();
        renderDailyView();
      }

      document.getElementById("quest-board-accept-btn").addEventListener("click", accept);
      document.getElementById("quest-board-input").addEventListener("keydown", (e) => {
        if (e.key === "Enter") accept();
      });
      document.getElementById("quest-board-input").focus();
    }

    // ウィークリー：週(月曜始まり)ごとの目標回数(targetCount)をこなす継続クエスト。
    // 達成状況の管理・週の切り替え処理は冒険の書「デイリークエスト」タブで行う。
    function renderWeeklyView() {
      const label = typeLabel("weekly");
      const quests = state.weeklyQuests;

      box.innerHTML = `
        <div class="modal-header quest-board-header">
          <h3 class="modal-title">${escapeHtml(label)}</h3>
          <button type="button" class="modal-close-btn" id="quest-board-close">✕</button>
        </div>
        <button type="button" class="secondary-btn quest-board-back-btn" id="quest-board-back">← ボードに戻る</button>
        <p class="quest-board-daily-note">受注したウィークリークエストは、冒険の書の「デイリークエスト」タブの「週間クエスト」で進捗をカウントできます。</p>
        <ul class="goal-list" id="quest-board-list">
          ${
            quests.length === 0
              ? `<li class="empty-hint">まだ受注していません</li>`
              : quests
                  .map(
                    (q) => `
                <li data-id="${q.id}">
                  <span>${escapeHtml(q.text)}（週${q.targetCount}回）</span>
                  <button class="goal-remove-btn" data-id="${q.id}">×</button>
                </li>`
                  )
                  .join("")
          }
        </ul>
        <div class="goal-add-row">
          <input type="text" id="quest-board-input" placeholder="${escapeHtml(label)}の内容を入力..." />
          <input type="number" id="quest-board-target-input" min="1" max="14" value="3" class="quest-board-target-input" />
          <button type="button" id="quest-board-accept-btn" class="primary-btn">受注する</button>
        </div>
      `;

      document.getElementById("quest-board-close").addEventListener("click", close);
      document.getElementById("quest-board-back").addEventListener("click", renderBoard);

      document.querySelectorAll("#quest-board-list .goal-remove-btn").forEach((btn) => {
        btn.addEventListener("click", () => {
          const id = btn.dataset.id;
          state.weeklyQuests = state.weeklyQuests.filter((q) => q.id !== id);
          window.App.persist();
          renderWeeklyView();
        });
      });

      function accept() {
        const input = document.getElementById("quest-board-input");
        const targetInput = document.getElementById("quest-board-target-input");
        const text = input.value.trim();
        if (!text) return;
        if (state.weeklyQuests.some((q) => q.text === text)) {
          alert("そのウィークリークエストはすでに受注済みです。");
          return;
        }
        const targetCount = Math.max(1, Number(targetInput.value) || 1);
        state.weeklyQuests.push({
          id: "weekly_" + Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
          text,
          targetCount,
          doneCount: 0,
          weekStart: window.Widgets.weekStartOf(window.App.todayStr()),
          missedWeeksStreak: 0,
          reviewDismissedWeek: null,
          history: [],
        });
        window.App.persist();
        renderWeeklyView();
      }

      document.getElementById("quest-board-accept-btn").addEventListener("click", accept);
      document.getElementById("quest-board-input").addEventListener("keydown", (e) => {
        if (e.key === "Enter") accept();
      });
      document.getElementById("quest-board-input").focus();
    }

    renderBoard();
    overlay.classList.remove("hidden");
    overlay.onclick = (e) => {
      if (e.target === overlay) close();
    };
  }

  window.QuestBoard = { open, TYPES: QUEST_TYPES, typeLabel, typeShortLabel };
})();
