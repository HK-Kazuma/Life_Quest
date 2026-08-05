// ②デイリークエスト画面：毎日の習慣にしたい小さな行動を管理する。
// クエストボードから受注したデイリークエストは日をまたいでも残り続け、
// クリア状況(lastClearedDate)だけが日付が変わるとリセットされる。
(function () {
  const DAILY_QUEST_EXP = 3;
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
