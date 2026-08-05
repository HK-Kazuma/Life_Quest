// 左側パネル：DQ風コマンドウィンドウ（クエスト/ステータス/マップ/実績/カレンダー）を描画する。
// キャラクター詳細・やりたいリストは「ステータス」コマンドから開くポップアップに移設。
(function () {
  function escapeHtml(str) {
    return String(str).replace(
      /[&<>"']/g,
      (ch) =>
        ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[ch])
    );
  }

  const COMMANDS = [
    { id: "quest", label: "クエスト" },
    { id: "status", label: "ステータス" },
    { id: "map", label: "マップ", placeholder: true },
    { id: "achievements", label: "実績", placeholder: true },
    { id: "calendar", label: "カレンダー" },
  ];

  function render(state) {
    const sidebar = document.getElementById("sidebar");

    sidebar.innerHTML = `
      <div class="dq-command-box">
        <div class="dq-command-title">コマンド</div>
        <div class="dq-command-grid">
          ${COMMANDS.map(
            (cmd) => `
            <button type="button" class="dq-command-item${
              cmd.placeholder ? " is-placeholder" : ""
            }" data-command="${cmd.id}">${escapeHtml(cmd.label)}</button>`
          ).join("")}
        </div>
      </div>
    `;

    document.querySelectorAll(".dq-command-item").forEach((btn) => {
      btn.addEventListener("click", () => runCommand(btn.dataset.command, state));
    });
  }

  function runCommand(commandId, state) {
    if (commandId === "quest") {
      window.QuestBoard.open(state);
    } else if (commandId === "status") {
      openStatusPopup(state);
    } else if (commandId === "calendar") {
      window.Widgets.openCalendarPopup(state);
    } else {
      alert("この機能は準備中です。");
    }
  }

  // 「ステータス」ポップアップ：以前サイドバーに常時表示していたキャラ情報・やりたいリスト。
  // 横に広いレイアウトにまとめ、下スクロール無しで全項目を表示する。
  function openStatusPopup(state) {
    const overlay = document.getElementById("character-status-overlay");
    const box = document.getElementById("character-status-box");
    if (!overlay || !box) return;

    const c = state.character;
    const p = state.profile;
    const needed = window.App.neededForLevel(c.level);
    const pct = Math.min(100, Math.round((c.currentExp / needed) * 100));

    box.innerHTML = `
      <div class="modal-header">
        <h3 class="modal-title">ステータス</h3>
        <button type="button" class="modal-close-btn" id="char-status-close">✕</button>
      </div>
      <div class="character-status-layout">
        <div class="character-status-main">
          <div class="sprite-frame">${window.Sprite.renderSprite(c.level)}</div>
          <div class="char-name">${escapeHtml(c.name)}</div>
          <div class="char-level">Lv. ${c.level}</div>
          <div class="exp-bar">
            <div class="exp-bar-fill" style="width:${pct}%"></div>
            <span class="exp-bar-label">${c.currentExp} / ${needed} EXP</span>
          </div>
          <button id="edit-status-btn" class="edit-status-btn">✎ ステータスを編集する</button>
        </div>
        <div class="character-status-columns">
          <ul class="status-list">
            <li><span class="label">職業</span><span class="value">${escapeHtml(c.job)}</span></li>
            <li><span class="label">性別</span><span class="value">${escapeHtml(c.gender)}</span></li>
            <li><span class="label">年齢</span><span class="value">${escapeHtml(String(p.age))}</span></li>
            <li><span class="label">スポーツ</span><span class="value">${escapeHtml(c.sport)}</span></li>
            <li><span class="label">専門</span><span class="value">${escapeHtml(c.specialty)}</span></li>
          </ul>
          <ul class="status-list">
            <li><span class="label">身長</span><span class="value">${escapeHtml(String(p.height))} cm</span></li>
            <li><span class="label">体重</span><span class="value">${escapeHtml(String(p.weight))} kg</span></li>
            <li><span class="label">年間読書数</span><span class="value">${escapeHtml(String(p.booksPerYear))} 冊</span></li>
            <li><span class="label">平均睡眠時間</span><span class="value">${escapeHtml(String(p.avgSleepHours))} 時間</span></li>
            <li><span class="label">体脂肪率</span><span class="value">${escapeHtml(String(p.bodyFatPercent))}</span></li>
            <li><span class="label">TOEIC</span><span class="value">${escapeHtml(String(p.toeic))}</span></li>
            <li><span class="label">国家資格保有数</span><span class="value">${escapeHtml(String(p.nationalCerts))}</span></li>
            <li><span class="label">民間資格保有数</span><span class="value">${escapeHtml(String(p.municipalCerts))}</span></li>
          </ul>
        </div>
      </div>
      <div class="todo-section character-status-todo">
        <div class="todo-title">やりたいリスト</div>
        <ul class="todo-list" id="todo-list"></ul>
        <div class="todo-add-row">
          <input type="text" id="todo-input" placeholder="やりたいことを追加..." />
          <button id="todo-add-btn">追加</button>
        </div>
      </div>
    `;

    renderTodoList(state);

    function close() {
      overlay.classList.add("hidden");
      overlay.onclick = null;
    }

    document.getElementById("char-status-close").addEventListener("click", close);
    document.getElementById("todo-add-btn").addEventListener("click", () => addTodo(state));
    document.getElementById("todo-input").addEventListener("keydown", (e) => {
      if (e.key === "Enter") addTodo(state);
    });
    document.getElementById("edit-status-btn").addEventListener("click", () => {
      close();
      window.StatusEditModal.open(state);
    });

    overlay.classList.remove("hidden");
    overlay.onclick = (e) => {
      if (e.target === overlay) close();
    };
  }

  function renderTodoList(state) {
    const list = document.getElementById("todo-list");
    if (!list) return;
    list.innerHTML = "";
    if (state.todoList.length === 0) {
      list.innerHTML = `<li class="empty-hint">まだありません</li>`;
    }
    state.todoList.forEach((item, idx) => {
      const li = document.createElement("li");
      li.innerHTML = `<span>${escapeHtml(item)}</span><button class="todo-remove-btn" data-idx="${idx}">×</button>`;
      list.appendChild(li);
    });
    list.querySelectorAll(".todo-remove-btn").forEach((btn) => {
      btn.addEventListener("click", () => {
        const idx = Number(btn.dataset.idx);
        state.todoList.splice(idx, 1);
        window.App.persist();
        renderTodoList(state);
      });
    });
  }

  function addTodo(state) {
    const input = document.getElementById("todo-input");
    const text = input.value.trim();
    if (!text) return;
    state.todoList.push(text);
    window.App.persist();
    input.value = "";
    renderTodoList(state);
  }

  window.CharacterPanel = { render };
})();
