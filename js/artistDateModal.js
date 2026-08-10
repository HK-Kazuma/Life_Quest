// アーティストデート図鑑UI：サイドバーの「デート」コマンドから開く。
// 一覧（図鑑グリッド）→ 詳細（編集・削除が可能）、および新規登録フォームの3画面を持つ。
// 「行くだけでOK」の考え方に合わせ、成果や達成条件は問わずワンボタンで登録できるようにしている。
(function () {
  function escapeHtml(str) {
    return String(str).replace(
      /[&<>"']/g,
      (ch) =>
        ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[ch])
    );
  }

  let selectedIcon = null;

  function open(state) {
    const overlay = document.getElementById("artist-date-overlay");
    const box = document.getElementById("artist-date-box");
    if (!overlay || !box) return;

    function close() {
      overlay.classList.add("hidden");
      overlay.onclick = null;
    }

    function renderList() {
      const entries = window.ArtistDate.getEntriesSorted(state);

      box.innerHTML = `
        <div class="modal-header">
          <h3 class="modal-title">🎨 アーティストデート図鑑</h3>
          <button type="button" class="modal-close-btn" id="ad-close">✕</button>
        </div>
        <p class="screen-desc">一人で出かけて、アーティスト脳を遊ばせよう。何かを達成する必要はなく、行くだけでコレクションになります。</p>
        <div class="ad-grid">
          <button type="button" class="ad-card ad-card-add" id="ad-new-btn">
            <div class="ad-add-icon">＋</div>
            <div>図鑑に登録する</div>
          </button>
          ${entries
            .map(
              (e) => `
            <button type="button" class="ad-card" data-entry-id="${e.id}">
              <div class="ad-card-icon">${e.icon}</div>
              <div class="ad-card-text">${escapeHtml(e.text)}</div>
              <div class="ad-card-date">${e.date}</div>
            </button>
          `
            )
            .join("")}
        </div>
        ${
          entries.length === 0
            ? `<p class="empty-hint">まだ図鑑は空です。最初のアーティストデートを登録しよう。</p>`
            : ""
        }
      `;

      document.getElementById("ad-close").addEventListener("click", close);
      document.getElementById("ad-new-btn").addEventListener("click", renderForm);
      box.querySelectorAll(".ad-card[data-entry-id]").forEach((btn) => {
        btn.addEventListener("click", () => renderDetail(btn.dataset.entryId));
      });
    }

    function renderForm() {
      selectedIcon = null;

      box.innerHTML = `
        <div class="modal-header">
          <h3 class="modal-title">図鑑に登録する</h3>
          <button type="button" class="modal-close-btn" id="ad-close">✕</button>
        </div>
        <button type="button" class="secondary-btn" id="ad-back-to-list">← 一覧に戻る</button>
        <div class="ad-form">
          <label class="wt-form-label" for="ad-text-input">行った場所・やったこと</label>
          <input type="text" id="ad-text-input" placeholder="例：知らない街の古本屋をのぞく" maxlength="40" />

          <label class="wt-form-label">アイコンを選ぶ</label>
          <div class="ad-icon-picker" id="ad-icon-picker">
            ${window.ArtistDate.ICON_CATEGORIES.map(
              (cat) => `
              <div class="ad-icon-category">
                <div class="ad-icon-category-label">${escapeHtml(cat.label)}</div>
                <div class="ad-icon-row">
                  ${cat.icons
                    .map(
                      (icon) =>
                        `<button type="button" class="ad-icon-swatch" data-icon="${icon}">${icon}</button>`
                    )
                    .join("")}
                </div>
              </div>
            `
            ).join("")}
          </div>

          <button type="button" class="primary-btn ad-register-btn" id="ad-register-btn">図鑑に登録する</button>
          <p class="wt-form-hint" id="ad-form-hint"></p>
        </div>
      `;

      document.getElementById("ad-close").addEventListener("click", close);
      document.getElementById("ad-back-to-list").addEventListener("click", renderList);

      box.querySelectorAll(".ad-icon-swatch").forEach((btn) => {
        btn.addEventListener("click", () => {
          selectedIcon = btn.dataset.icon;
          box.querySelectorAll(".ad-icon-swatch").forEach((s) => s.classList.remove("selected"));
          btn.classList.add("selected");
        });
      });

      document.getElementById("ad-register-btn").addEventListener("click", () => {
        const input = document.getElementById("ad-text-input");
        const hint = document.getElementById("ad-form-hint");
        const text = input.value;

        if (!text.trim()) {
          hint.textContent = "行った場所・やったことを入力してください。";
          return;
        }
        if (!selectedIcon) {
          hint.textContent = "アイコンを選んでください。";
          return;
        }

        window.ArtistDate.addEntry(state, text, selectedIcon);
        renderList();
      });
    }

    function renderDetail(entryId) {
      const entry = window.ArtistDate.getEntries(state).find((e) => e.id === entryId);
      if (!entry) {
        renderList();
        return;
      }
      const category = window.ArtistDate.findCategoryByIcon(entry.icon);

      box.innerHTML = `
        <div class="modal-header">
          <h3 class="modal-title">${entry.icon} ${escapeHtml(entry.text)}</h3>
          <button type="button" class="modal-close-btn" id="ad-close">✕</button>
        </div>
        <button type="button" class="secondary-btn" id="ad-back-to-list">← 一覧に戻る</button>
        <div class="ad-detail">
          <div class="ad-detail-icon">${entry.icon}</div>
          <div class="ad-detail-text">${escapeHtml(entry.text)}</div>
          <div class="ad-detail-meta">${category ? escapeHtml(category.label) : ""} ／ ${entry.date}</div>
        </div>
        <div class="modal-actions">
          <button type="button" class="secondary-btn" id="ad-edit-btn">アイコン・名前を編集</button>
          <button type="button" class="danger-btn" id="ad-delete-btn">この記録を削除</button>
        </div>
        <p class="wt-form-hint" id="ad-delete-hint"></p>
      `;

      document.getElementById("ad-close").addEventListener("click", close);
      document.getElementById("ad-back-to-list").addEventListener("click", renderList);
      document.getElementById("ad-edit-btn").addEventListener("click", () => renderEditForm(entry));
      document.getElementById("ad-delete-btn").addEventListener("click", () => {
        const btn = document.getElementById("ad-delete-btn");
        const hint = document.getElementById("ad-delete-hint");
        if (btn.dataset.confirming === "1") {
          window.ArtistDate.deleteEntry(state, entry.id);
          renderList();
          return;
        }
        btn.dataset.confirming = "1";
        btn.textContent = "本当に削除しますか？（もう一度押すと削除）";
        hint.textContent = "";
      });
    }

    function renderEditForm(entry) {
      selectedIcon = entry.icon;

      box.innerHTML = `
        <div class="modal-header">
          <h3 class="modal-title">記録を編集する</h3>
          <button type="button" class="modal-close-btn" id="ad-close">✕</button>
        </div>
        <button type="button" class="secondary-btn" id="ad-back-to-detail">← 戻る</button>
        <div class="ad-form">
          <label class="wt-form-label" for="ad-text-input">行った場所・やったこと</label>
          <input type="text" id="ad-text-input" placeholder="例：知らない街の古本屋をのぞく" maxlength="40" value="${escapeHtml(entry.text)}" />

          <label class="wt-form-label">アイコンを選ぶ</label>
          <div class="ad-icon-picker" id="ad-icon-picker">
            ${window.ArtistDate.ICON_CATEGORIES.map(
              (cat) => `
              <div class="ad-icon-category">
                <div class="ad-icon-category-label">${escapeHtml(cat.label)}</div>
                <div class="ad-icon-row">
                  ${cat.icons
                    .map(
                      (icon) =>
                        `<button type="button" class="ad-icon-swatch${icon === entry.icon ? " selected" : ""}" data-icon="${icon}">${icon}</button>`
                    )
                    .join("")}
                </div>
              </div>
            `
            ).join("")}
          </div>

          <button type="button" class="primary-btn ad-register-btn" id="ad-save-btn">保存する</button>
          <p class="wt-form-hint" id="ad-form-hint"></p>
        </div>
      `;

      document.getElementById("ad-close").addEventListener("click", close);
      document.getElementById("ad-back-to-detail").addEventListener("click", () => renderDetail(entry.id));

      box.querySelectorAll(".ad-icon-swatch").forEach((btn) => {
        btn.addEventListener("click", () => {
          selectedIcon = btn.dataset.icon;
          box.querySelectorAll(".ad-icon-swatch").forEach((s) => s.classList.remove("selected"));
          btn.classList.add("selected");
        });
      });

      document.getElementById("ad-save-btn").addEventListener("click", () => {
        const input = document.getElementById("ad-text-input");
        const hint = document.getElementById("ad-form-hint");
        const text = input.value;

        if (!text.trim()) {
          hint.textContent = "行った場所・やったことを入力してください。";
          return;
        }
        if (!selectedIcon) {
          hint.textContent = "アイコンを選んでください。";
          return;
        }

        window.ArtistDate.updateEntry(state, entry.id, { text, icon: selectedIcon });
        renderDetail(entry.id);
      });
    }

    renderList();
    overlay.classList.remove("hidden");
    overlay.onclick = (e) => {
      if (e.target === overlay) close();
    };
  }

  window.ArtistDateModal = { open };
})();
