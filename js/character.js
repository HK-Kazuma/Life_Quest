// 左側キャラクター・ステータス欄（常時表示 + 詳細トグル + やりたいリスト）を描画する。
(function () {
  function escapeHtml(str) {
    return String(str).replace(
      /[&<>"']/g,
      (ch) =>
        ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[ch])
    );
  }

  function render(state) {
    const sidebar = document.getElementById("sidebar");
    const c = state.character;
    const p = state.profile;
    const needed = window.App.neededForLevel(c.level);
    const pct = Math.min(100, Math.round((c.currentExp / needed) * 100));
    const detailOpen = sidebar.dataset.detailOpen === "true";

    sidebar.innerHTML = `
      <div class="sprite-frame">${window.Sprite.renderSprite(c.level)}</div>
      <div class="char-name">${escapeHtml(c.name)}</div>
      <div class="char-level">Lv. ${c.level}</div>

      <div class="exp-bar">
        <div class="exp-bar-fill" style="width:${pct}%"></div>
        <span class="exp-bar-label">${c.currentExp} / ${needed} EXP</span>
      </div>

      <button id="edit-status-btn" class="edit-status-btn">✎ ステータスを編集する</button>

      <ul class="status-list">
        <li><span class="label">職業</span><span class="value">${escapeHtml(c.job)}</span></li>
        <li><span class="label">性別</span><span class="value">${escapeHtml(c.gender)}</span></li>
        <li><span class="label">年齢</span><span class="value">${escapeHtml(String(p.age))}</span></li>
        <li><span class="label">スポーツ</span><span class="value">${escapeHtml(c.sport)}</span></li>
        <li><span class="label">専門</span><span class="value">${escapeHtml(c.specialty)}</span></li>
      </ul>

      <button id="toggle-detail-btn" class="detail-toggle-btn">${
        detailOpen ? "▲ 詳細を隠す" : "▼ 詳細を見る"
      }</button>

      <div id="detail-panel" class="detail-panel ${detailOpen ? "" : "hidden"}">
        <ul class="status-list detail">
          <li><span class="label">身長</span><span class="value">${escapeHtml(String(p.height))} cm</span></li>
          <li><span class="label">体重</span><span class="value">${escapeHtml(String(p.weight))} kg</span></li>
          <li><span class="label">年間読書数</span><span class="value">${escapeHtml(String(p.booksPerYear))} 冊</span></li>
          <li><span class="label">平均睡眠時間</span><span class="value">${escapeHtml(String(p.avgSleepHours))} 時間</span></li>
          <li><span class="label">体脂肪率</span><span class="value">${escapeHtml(String(p.bodyFatPercent))}</span></li>
          <li><span class="label">TOEIC</span><span class="value">${escapeHtml(String(p.toeic))}</span></li>
          <li><span class="label">国家資格保有数</span><span class="value">${escapeHtml(String(p.nationalCerts))}</span></li>
          <li><span class="label">民間資格保有数</span><span class="value">${escapeHtml(String(p.municipalCerts))}</span></li>
        </ul>

        <div class="todo-section">
          <div class="todo-title">やりたいリスト</div>
          <ul class="todo-list" id="todo-list"></ul>
          <div class="todo-add-row">
            <input type="text" id="todo-input" placeholder="やりたいことを追加..." />
            <button id="todo-add-btn">追加</button>
          </div>
        </div>
      </div>
    `;

    renderTodoList(state);

    document.getElementById("toggle-detail-btn").addEventListener("click", () => {
      const nowOpen = sidebar.dataset.detailOpen === "true";
      sidebar.dataset.detailOpen = String(!nowOpen);
      render(state);
    });

    document.getElementById("todo-add-btn").addEventListener("click", () => addTodo(state));
    document.getElementById("todo-input").addEventListener("keydown", (e) => {
      if (e.key === "Enter") addTodo(state);
    });

    document.getElementById("edit-status-btn").addEventListener("click", () => {
      window.StatusEditModal.open(state);
    });
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
