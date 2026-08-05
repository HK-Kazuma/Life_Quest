// クエストボード：「クエスト」コマンドから開く。メイン/サブ/デイリーの3種類から選び、
// 自由入力したクエストを受注する。受注したクエストは①の目標(entry.goals)と同じデータに統合される。
(function () {
  const QUEST_TYPES = [
    { id: "main", label: "メインクエスト", short: "メイン" },
    { id: "sub", label: "サブクエスト", short: "サブ" },
    { id: "daily", label: "デイリークエスト", short: "デイリー" },
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
        btn.addEventListener("click", () => renderTypeView(btn.dataset.type));
      });
    }

    function renderTypeView(typeId) {
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
          renderTypeView(typeId);
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
        renderTypeView(typeId);
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
