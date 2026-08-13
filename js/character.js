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
    { id: "artistDate", label: "デート" },
    { id: "achievements", label: "実績", placeholder: true },
    { id: "calendar", label: "カレンダー" },
    { id: "inn", label: "宿屋" },
    { id: "pomodoro", label: "集中" },
    { id: "routines", label: "ノルマ" },
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

    renderWorldTree(state);
    renderChallengeQuestBadge(state);
  }

  // コマンド窓とは別枠（world-tree-slot）に世界樹を描画する。
  // コマンド側のスクロール領域と切り離すことで、ホバー拡大時に
  // コマンド側にスクロールバーが出たり他要素へ影響したりしないようにする。
  // クリックすると、長期目標のルートを管理する世界樹画面を開く。
  function renderWorldTree(state) {
    const slot = document.getElementById("world-tree-slot");
    if (!slot) return;

    slot.innerHTML = `
      <img src="assets/image_close.png" data-closed="assets/image_close.png" data-open="assets/image_open.png" alt="世界樹（クリックして目標のルートを開く）" class="world-tree-img" />
    `;

    const worldTreeImg = slot.querySelector(".world-tree-img");
    if (worldTreeImg) {
      worldTreeImg.addEventListener("mouseenter", () => {
        worldTreeImg.src = worldTreeImg.dataset.open;
      });
      worldTreeImg.addEventListener("mouseleave", () => {
        worldTreeImg.src = worldTreeImg.dataset.closed;
      });
      worldTreeImg.addEventListener("click", () => {
        if (window.WorldTreeApp) window.WorldTreeApp.open(state);
      });
    }
  }

  // 世界樹の下に「チャレンジクエスト」であることを明示する表示を置く。
  // 冒険の書に記録するメイン/サブ/デイリークエストとは別物であることが伝わるように、
  // 世界樹＝チャレンジクエストの達成状況（クリア数／挑戦中の数）をここに出す。
  function renderChallengeQuestBadge(state) {
    const slot = document.getElementById("challenge-quest-slot");
    if (!slot || !window.WorldTree) return;

    const goals = window.WorldTree.getGoals(state);
    const cleared = goals.filter((g) => window.WorldTree.progress(g).complete).length;
    const active = goals.length - cleared;

    slot.innerHTML = `
      <button type="button" class="challenge-quest-badge" id="challenge-quest-badge">
        <div class="challenge-quest-badge-title">チャレンジクエスト</div>
        <div class="challenge-quest-badge-stats">達成 ${cleared} 回／挑戦中 ${active} 件</div>
      </button>
    `;

    document.getElementById("challenge-quest-badge").addEventListener("click", () => {
      if (window.WorldTreeApp) window.WorldTreeApp.open(state);
    });
  }

  function runCommand(commandId, state) {
    if (commandId === "quest") {
      window.QuestBoard.open(state);
    } else if (commandId === "status") {
      openStatusPopup(state);
    } else if (commandId === "calendar") {
      window.Widgets.openCalendarPopup(state);
    } else if (commandId === "inn") {
      window.InnModal.open(state);
    } else if (commandId === "artistDate") {
      window.ArtistDateModal.open(state);
    } else if (commandId === "pomodoro") {
      window.PomodoroModal.open(state);
    } else if (commandId === "routines") {
      window.RoutinesModal.open(state);
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
            <li><span class="label">称号</span><span class="value">${titleSelectHtml(state)}</span></li>
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
      <div class="titles-section">
        <div class="todo-title">称号</div>
        ${renderTitlesGrid(state)}
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
    const titleSelect = document.getElementById("equipped-title-select");
    if (titleSelect) {
      titleSelect.addEventListener("change", () => {
        state.character.equippedTitle = titleSelect.value || null;
        window.App.persist();
      });
    }

    overlay.classList.remove("hidden");
    overlay.onclick = (e) => {
      if (e.target === overlay) close();
    };
  }

  // 職業欄の下に置く称号の装備セレクト。獲得済み(unlocked)の称号だけを選択肢にする。
  function titleSelectHtml(state) {
    if (!window.Titles) return "-";
    const unlocked = window.Titles.getUnlockedTitles(state);
    const equipped = state.character.equippedTitle;
    if (unlocked.length === 0) {
      return `<span class="title-equip-empty">未獲得</span>`;
    }
    return `
      <select id="equipped-title-select" class="title-equip-select">
        <option value="">未設定</option>
        ${unlocked
          .map(
            (t) =>
              `<option value="${t.id}"${equipped === t.id ? " selected" : ""}>${escapeHtml(t.name)}</option>`
          )
          .join("")}
      </select>
    `;
  }

  // 称号一覧：未取得は称号名を"????"で伏せ、イメージ(説明文)は常に表示する。
  function renderTitlesGrid(state) {
    if (!window.Titles) return "";
    const categories = window.Titles.getTitlesByCategory(state);

    return `
      <div class="titles-grid">
        ${categories
          .map(
            (cat) => `
          <div class="titles-column">
            <div class="titles-column-title">${escapeHtml(cat.label)}</div>
            <div class="titles-column-current">現在：${cat.currentValue}</div>
            <ul class="titles-list">
              ${cat.titles
                .map(
                  (t) => `
                <li class="title-row ${t.unlocked ? "unlocked" : "locked"}">
                  <div class="title-row-top">
                    <span class="title-req">${escapeHtml(cat.reqLabel(t.threshold))}</span>
                    <span class="title-name">${t.unlocked ? escapeHtml(t.name) : "????"}</span>
                  </div>
                  <div class="title-flavor">${escapeHtml(t.flavor)}</div>
                </li>
              `
                )
                .join("")}
            </ul>
          </div>
        `
          )
          .join("")}
      </div>
    `;
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
