// ノルマ設定：「コマンド」の「ノルマ」から開く。活動カテゴリごとに、
// 理想（idealText）とは別に、最低ここまでやればOKとする複数のノルマ（floorOptions）を登録する。
// ここで登録したカテゴリは、①活動記録画面の「今日はどれで行く？」チェックインに反映される。
(function () {
  const WEEKDAYS = [
    { key: "mon", label: "月" },
    { key: "tue", label: "火" },
    { key: "wed", label: "水" },
    { key: "thu", label: "木" },
    { key: "fri", label: "金" },
    { key: "sat", label: "土" },
    { key: "sun", label: "日" },
  ];

  // 各曜日ボタンは なし → 重点 → 軽め → なし… の3値をクリックで循環する。
  function nextWeight(current) {
    if (current === "focus") return "light";
    if (current === "light") return undefined;
    return "focus";
  }

  function weekdayWeightLabel(weight) {
    if (weight === "focus") return "重点";
    if (weight === "light") return "軽め";
    return "";
  }

  function escapeHtml(str) {
    return String(str).replace(
      /[&<>"']/g,
      (ch) =>
        ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[ch])
    );
  }

  function open(state) {
    const overlay = document.getElementById("routines-overlay");
    const box = document.getElementById("routines-box");
    if (!overlay || !box) return;

    function close() {
      overlay.classList.add("hidden");
      overlay.onclick = null;
    }

    function categoryHtml(cat) {
      return `
        <div class="routine-category" data-id="${cat.id}">
          <div class="routine-category-header">
            <strong>${escapeHtml(cat.name)}</strong>
            <button type="button" class="routine-category-remove-btn" data-id="${cat.id}">×</button>
          </div>
          <div class="routine-ideal-line">理想：${escapeHtml(cat.idealText || "-")}</div>
          <ul class="routine-floor-list">
            ${
              cat.floorOptions.length
                ? cat.floorOptions
                    .map(
                      (opt, idx) => `
                <li>
                  <span>${escapeHtml(opt)}</span>
                  <button type="button" class="routine-floor-remove-btn" data-cat="${cat.id}" data-idx="${idx}">×</button>
                </li>`
                    )
                    .join("")
                : `<li class="empty-hint">まだノルマがありません</li>`
            }
          </ul>
          <div class="routine-floor-add-row">
            <input type="text" class="routine-floor-input" data-cat="${cat.id}" placeholder="ノルマ（最低ライン）を入力..." />
            <button type="button" class="secondary-btn routine-floor-add-btn" data-cat="${cat.id}">＋ ノルマを追加</button>
          </div>
          <div class="routine-weekday-row">
            <span class="routine-weekday-hint">曜日テンプレ：</span>
            ${WEEKDAYS.map((wd) => {
              const weight = (cat.weekdayWeights || {})[wd.key];
              return `<button type="button" class="routine-weekday-btn${
                weight ? ` weight-${weight}` : ""
              }" data-cat="${cat.id}" data-day="${wd.key}" title="${wd.label}曜：${
                weekdayWeightLabel(weight) || "指定なし"
              }（クリックで切替）">${wd.label}${weight ? `<span class="routine-weekday-tag">${weekdayWeightLabel(weight)}</span>` : ""}</button>`;
            }).join("")}
          </div>
        </div>`;
    }

    function render() {
      const categories = state.routines.categories;
      box.innerHTML = `
        <div class="modal-header">
          <h3 class="modal-title">ノルマ設定</h3>
          <button type="button" class="modal-close-btn" id="routines-close">✕</button>
        </div>
        <p class="screen-desc">活動ごとに「理想」と、最低ここまでやれば良しとする「ノルマ」を登録しておける。①活動記録の「今日はどれで行く？」でノルマだけ選んでも、達成として記録される。</p>
        <div class="routines-list" id="routines-list">
          ${
            categories.length === 0
              ? `<p class="empty-hint">まだカテゴリがありません</p>`
              : categories.map(categoryHtml).join("")
          }
        </div>
        <div class="routines-add-category">
          <input type="text" id="routine-cat-name-input" placeholder="活動名（例：英語学習）" />
          <input type="text" id="routine-cat-ideal-input" placeholder="理想（例：BBC1本+Anki1周+シャドーイング）" />
          <button type="button" id="routine-cat-add-btn" class="primary-btn">＋ カテゴリを追加</button>
        </div>
      `;

      document.getElementById("routines-close").addEventListener("click", close);
      document.getElementById("routine-cat-add-btn").addEventListener("click", addCategory);

      box.querySelectorAll(".routine-category-remove-btn").forEach((btn) => {
        btn.addEventListener("click", () => {
          state.routines.categories = state.routines.categories.filter((c) => c.id !== btn.dataset.id);
          window.App.persist();
          render();
        });
      });
      box.querySelectorAll(".routine-floor-add-btn").forEach((btn) => {
        btn.addEventListener("click", () => addFloorOption(btn.dataset.cat));
      });
      box.querySelectorAll(".routine-floor-input").forEach((input) => {
        input.addEventListener("keydown", (e) => {
          if (e.key === "Enter") addFloorOption(input.dataset.cat);
        });
      });
      box.querySelectorAll(".routine-floor-remove-btn").forEach((btn) => {
        btn.addEventListener("click", () => {
          const cat = state.routines.categories.find((c) => c.id === btn.dataset.cat);
          if (!cat) return;
          cat.floorOptions.splice(Number(btn.dataset.idx), 1);
          window.App.persist();
          render();
        });
      });
      box.querySelectorAll(".routine-weekday-btn").forEach((btn) => {
        btn.addEventListener("click", () => {
          const cat = state.routines.categories.find((c) => c.id === btn.dataset.cat);
          if (!cat) return;
          if (!cat.weekdayWeights) cat.weekdayWeights = {};
          const next = nextWeight(cat.weekdayWeights[btn.dataset.day]);
          if (next) cat.weekdayWeights[btn.dataset.day] = next;
          else delete cat.weekdayWeights[btn.dataset.day];
          window.App.persist();
          render();
        });
      });
    }

    function addCategory() {
      const nameInput = document.getElementById("routine-cat-name-input");
      const idealInput = document.getElementById("routine-cat-ideal-input");
      const name = nameInput.value.trim();
      if (!name) return;
      state.routines.categories.push({
        id: "routine_" + Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
        name,
        idealText: idealInput.value.trim(),
        floorOptions: [],
        weekdayWeights: {},
      });
      window.App.persist();
      render();
    }

    function addFloorOption(catId) {
      const input = document.querySelector(`.routine-floor-input[data-cat="${catId}"]`);
      const text = input.value.trim();
      if (!text) return;
      const cat = state.routines.categories.find((c) => c.id === catId);
      if (!cat) return;
      cat.floorOptions.push(text);
      window.App.persist();
      render();
    }

    render();
    overlay.classList.remove("hidden");
    overlay.onclick = (e) => {
      if (e.target === overlay) close();
    };
  }

  window.RoutinesModal = { open };
})();
