// 活動記録の各行にタグを追加するモーダル：保存済みタグから選ぶ、または新規タグ（名前＋16色）を作って追加する。
(function () {
  const MAX_TAGS_PER_ROW = 3;
  let selectedColor = null;

  function escapeHtml(str) {
    return String(str).replace(
      /[&<>"']/g,
      (ch) =>
        ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[ch])
    );
  }

  // attachedIds: この行に既についているタグidの配列
  // onAttach(tagId): タグ（既存 or 新規作成）を行に追加する
  // onTagDeleted(tagId): タグ定義自体を削除した後、呼び出し元のローカル状態からも取り除いてもらう
  function open({ attachedIds, onAttach, onTagDeleted }) {
    const overlay = document.getElementById("tag-picker-overlay");
    const box = document.getElementById("tag-picker-box");
    selectedColor = null;

    function close() {
      overlay.classList.add("hidden");
      overlay.onclick = null;
    }

    function render() {
      const tags = window.App.getTags();
      box.innerHTML = `
        <div class="modal-header">
          <h3 class="modal-title">タグを追加</h3>
          <button type="button" class="modal-close-btn" id="tag-picker-close">✕</button>
        </div>
        <div class="tag-picker-body">
          <div class="tag-picker-section-title">保存済みのタグ</div>
          <div class="tag-picker-list">
            ${
              tags.length
                ? tags
                    .map((t) => {
                      const already = attachedIds.includes(t.id);
                      return `
                      <div class="tag-picker-row">
                        <button type="button" class="tag-pill ${
                          already ? "tag-pill-disabled" : ""
                        }" data-id="${t.id}" style="background:${t.color};color:${window.TagsUtil.contrastColor(
                        t.color
                      )}" ${already ? "disabled" : ""}>${escapeHtml(t.name)}</button>
                        <button type="button" class="tag-delete-btn" data-id="${t.id}" title="このタグを削除">✕</button>
                      </div>`;
                    })
                    .join("")
                : `<p class="empty-hint">まだタグがありません</p>`
            }
          </div>

          <div class="form-divider">新しいタグを作成</div>
          <input type="text" id="tag-new-name" class="tag-new-name-input" placeholder="タグ名（例: 運動）" maxlength="12" />
          <div class="tag-color-grid" id="tag-color-grid">
            ${window.TagsUtil.COLORS.map(
              (c) => `<button type="button" class="tag-color-swatch" data-color="${c}" style="background:${c}"></button>`
            ).join("")}
          </div>
          <button type="button" class="primary-btn tag-create-btn" id="tag-create-btn">作成して追加</button>
        </div>
        <div class="modal-actions">
          <button type="button" class="secondary-btn" id="tag-picker-close-btn">閉じる</button>
        </div>
      `;

      document.getElementById("tag-picker-close").addEventListener("click", close);
      document.getElementById("tag-picker-close-btn").addEventListener("click", close);

      box.querySelectorAll(".tag-pill:not(.tag-pill-disabled)").forEach((btn) => {
        btn.addEventListener("click", () => {
          onAttach(btn.dataset.id);
          close();
        });
      });

      box.querySelectorAll(".tag-delete-btn").forEach((btn) => {
        btn.addEventListener("click", () => {
          const tagId = btn.dataset.id;
          const tag = tags.find((t) => t.id === tagId);
          if (!confirm(`タグ「${tag ? tag.name : ""}」を削除しますか？過去の記録からも削除されます。`)) return;
          window.App.deleteTag(tagId);
          if (onTagDeleted) onTagDeleted(tagId);
          render();
        });
      });

      box.querySelectorAll(".tag-color-swatch").forEach((btn) => {
        btn.addEventListener("click", () => {
          selectedColor = btn.dataset.color;
          box.querySelectorAll(".tag-color-swatch").forEach((s) => s.classList.remove("selected"));
          btn.classList.add("selected");
        });
      });

      document.getElementById("tag-create-btn").addEventListener("click", () => {
        if (attachedIds.length >= MAX_TAGS_PER_ROW) {
          alert("タグは1つの活動につき3つまでです。");
          return;
        }
        const nameInput = document.getElementById("tag-new-name");
        const name = nameInput.value.trim();
        if (!name) {
          alert("タグ名を入力してください。");
          return;
        }
        if (!selectedColor) {
          alert("タグの色を選んでください。");
          return;
        }
        const tag = window.App.createTag(name, selectedColor);
        onAttach(tag.id);
        close();
      });
    }

    render();
    overlay.classList.remove("hidden");
    overlay.onclick = (e) => {
      if (e.target === overlay) close();
    };
  }

  window.TagPickerModal = { open };
})();
