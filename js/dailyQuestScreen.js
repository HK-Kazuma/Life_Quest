// ⑤デイリークエスト画面：毎日の習慣にしたい小さな行動を管理する。
// クエストボードから受注したデイリークエストは日をまたいでも残り続け、
// クリア状況(lastClearedDate)だけが日付が変わるとリセットされる。
(function () {
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
        <h2 class="screen-title">⑤ デイリークエスト</h2>
        <p class="screen-desc">毎日の習慣にしたい小さな行動を管理しよう。クリア状況は日付が変わるとリセットされる。</p>
        <ul class="daily-quest-list" id="daily-quest-list"></ul>
      </div>
    `;

    renderList(state);
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
          ${cleared ? `<div class="clear-stamp">CLEAR</div>` : ""}
          ${
            isSelected
              ? `<div class="daily-quest-actions">
                  ${
                    cleared
                      ? `<button type="button" class="secondary-btn daily-quest-undo-btn" data-id="${q.id}">取り消す</button>`
                      : `<button type="button" class="primary-btn daily-quest-complete-btn" data-id="${q.id}">完了する</button>`
                  }
                 </div>`
              : ""
          }
        </li>`;
      })
      .join("");

    list.querySelectorAll(".daily-quest-row").forEach((row) => {
      row.addEventListener("click", (e) => {
        if (e.target.closest(".daily-quest-remove-btn")) return;
        const id = row.closest(".daily-quest-item").dataset.id;
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
        if (q) q.lastClearedDate = window.App.todayStr();
        window.App.persist();
        renderList(state);
      });
    });

    list.querySelectorAll(".daily-quest-undo-btn").forEach((btn) => {
      btn.addEventListener("click", () => {
        const q = state.dailyQuests.find((qq) => qq.id === btn.dataset.id);
        if (q) q.lastClearedDate = null;
        window.App.persist();
        renderList(state);
      });
    });
  }

  window.DailyQuestScreen = { render };
})();
