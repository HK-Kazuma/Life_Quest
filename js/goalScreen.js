// ①目標設定画面：今日の目標を1〜複数件入力する。
(function () {
  function escapeHtml(str) {
    return String(str).replace(
      /[&<>"']/g,
      (ch) =>
        ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[ch])
    );
  }

  function render(container, state) {
    const entry = window.App.getTodayEntry(true);

    container.innerHTML = `
      <div class="screen-panel">
        <h2 class="screen-title">① 今日の目標</h2>
        <p class="screen-desc">今日やりたいこと・目標を1つずつ入力しよう。</p>
        <ul class="goal-list" id="goal-list"></ul>
        <div class="goal-add-row">
          <input type="text" id="goal-input" placeholder="今日の目標を入力..." />
          <button id="goal-add-btn" class="primary-btn">追加</button>
        </div>
      </div>
    `;

    renderGoalList(entry);

    document.getElementById("goal-add-btn").addEventListener("click", () => addGoal(entry));
    document.getElementById("goal-input").addEventListener("keydown", (e) => {
      if (e.key === "Enter") addGoal(entry);
    });
  }

  function renderGoalList(entry) {
    const list = document.getElementById("goal-list");
    if (!list) return;
    list.innerHTML = "";
    if (entry.goals.length === 0) {
      list.innerHTML = `<li class="empty-hint">まだ目標がありません</li>`;
    }
    entry.goals.forEach((goal, idx) => {
      const li = document.createElement("li");
      li.innerHTML = `<span>${escapeHtml(goal)}</span><button class="goal-remove-btn" data-idx="${idx}">×</button>`;
      list.appendChild(li);
    });
    list.querySelectorAll(".goal-remove-btn").forEach((btn) => {
      btn.addEventListener("click", () => {
        const idx = Number(btn.dataset.idx);
        const [removedGoal] = entry.goals.splice(idx, 1);
        window.App.persist();
        renderGoalList(entry);
        window.App.rerenderSidebar();
        if (window.LogScreen) window.LogScreen.removeGoalFromDrafts(removedGoal);
      });
    });
  }

  function addGoal(entry) {
    const input = document.getElementById("goal-input");
    const text = input.value.trim();
    if (!text) return;
    entry.goals.push(text);
    window.App.persist();
    input.value = "";
    renderGoalList(entry);
    window.App.rerenderSidebar();
    input.focus();
  }

  window.GoalScreen = { render };
})();
