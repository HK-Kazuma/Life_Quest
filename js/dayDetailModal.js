// カレンダーの日付マス目をクリックしたときに表示する、その日の活動記録ポップアップ。
// 2日前までの記録は編集可能（記録忘れの救済用）。3日以上前は閲覧のみ。
(function () {
  const EDIT_WINDOW_DAYS = 2;

  function escapeHtml(str) {
    return String(str).replace(
      /[&<>"']/g,
      (ch) =>
        ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[ch])
    );
  }

  let draftRows = [];

  function isEditableDate(dateStr) {
    const diff = window.App.daysBetween(dateStr, window.App.todayStr());
    return diff >= 1 && diff <= EDIT_WINDOW_DAYS;
  }

  function open(dateStr) {
    const overlay = document.getElementById("day-detail-overlay");
    const box = document.getElementById("day-detail-box");
    const entry = window.App.getEntryForDate(dateStr);
    const editable = isEditableDate(dateStr);
    // 保存時にEXPを付与するのは、このモーダルを開いた時点でまだ無かった活動・気づきの分だけ
    // （同じ内容を何度保存し直してもEXPが増え続けないようにするため）。
    const initialLogCount = entry ? entry.logs.length : 0;
    const initialHadNotice = !!(entry && entry.notice);

    draftRows =
      entry && entry.logs.length > 0
        ? entry.logs.map((log) => ({
            activity: log.activity,
            detail: log.detail || "",
            tags: log.tags ? log.tags.slice() : [],
          }))
        : [{ activity: "", detail: "", tags: [] }];

    function close() {
      overlay.classList.add("hidden");
      overlay.onclick = null;
    }

    function renderReadonly() {
      const goals = (entry && entry.goals) || [];
      const logs = (entry && entry.logs) || [];
      box.innerHTML = `
        <div class="modal-header">
          <h3 class="modal-title">${dateStr} の活動記録</h3>
          <button type="button" class="modal-close-btn" id="day-detail-close">✕</button>
        </div>
        <div class="day-detail-body">
          <p class="day-detail-note">この日の記録は閲覧のみです（編集できるのは2日前までの記録です）</p>
          ${
            goals.length
              ? `<div class="history-section"><div class="history-section-title">目標</div><ul>${goals
                  .map((g) => `<li>${escapeHtml(g)}</li>`)
                  .join("")}</ul></div>`
              : ""
          }
          ${
            logs.length
              ? `<div class="history-section"><div class="history-section-title">活動</div><ul>${logs
                  .map(
                    (log) => `<li><strong>${escapeHtml(log.activity)}</strong>${window.TagsUtil.renderTagChips(
                      log.tags,
                      window.App.getTags()
                    )}${log.detail ? `<div class="log-detail">${escapeHtml(log.detail)}</div>` : ""}</li>`
                  )
                  .join("")}</ul></div>`
              : ""
          }
          ${
            entry && entry.notice
              ? `<div class="history-section"><div class="history-section-title">気づき</div><p>${escapeHtml(
                  entry.notice
                )}</p></div>`
              : ""
          }
          ${
            !entry || (!goals.length && !logs.length && !entry.notice)
              ? `<p class="empty-hint">この日の記録はありません</p>`
              : ""
          }
        </div>
        <div class="modal-actions">
          <button type="button" class="secondary-btn" id="day-detail-close-btn">閉じる</button>
        </div>
      `;
      document.getElementById("day-detail-close").addEventListener("click", close);
      document.getElementById("day-detail-close-btn").addEventListener("click", close);
    }

    function renderDraftRows() {
      const rowsBox = document.getElementById("day-detail-draft-logs");
      if (!rowsBox) return;
      const tags = window.App.getTags();
      const tagMap = window.TagsUtil.tagsById(tags);

      rowsBox.innerHTML = draftRows
        .map((row, idx) => {
          const chipsHtml = row.tags
            .map((tagId) => {
              const t = tagMap[tagId];
              if (!t) return "";
              return `<span class="tag-chip" style="background:${t.color};color:${window.TagsUtil.contrastColor(
                t.color
              )}">${escapeHtml(t.name)}<button type="button" class="tag-chip-remove" data-row="${idx}" data-tag="${tagId}">✕</button></span>`;
            })
            .join("");
          return `
          <div class="draft-log-row" data-idx="${idx}">
            <input type="text" class="dd-draft-activity" placeholder="活動名（例: ランニング）" value="${escapeHtml(
              row.activity
            )}" />
            <input type="text" class="dd-draft-detail" placeholder="詳細：何を強化した？何を学んだ？" value="${escapeHtml(
              row.detail
            )}" />
            ${
              draftRows.length > 1
                ? `<button type="button" class="remove-draft-btn" data-idx="${idx}">×</button>`
                : ""
            }
            <div class="draft-tags-row">
              ${chipsHtml}
              ${row.tags.length < 3 ? `<button type="button" class="tag-add-btn" data-row="${idx}">＋ タグ</button>` : ""}
            </div>
          </div>`;
        })
        .join("");

      rowsBox.querySelectorAll(".dd-draft-activity").forEach((input, i) => {
        input.addEventListener("input", () => (draftRows[i].activity = input.value));
      });
      rowsBox.querySelectorAll(".dd-draft-detail").forEach((input, i) => {
        input.addEventListener("input", () => (draftRows[i].detail = input.value));
      });
      rowsBox.querySelectorAll(".remove-draft-btn").forEach((btn) => {
        btn.addEventListener("click", () => {
          const idx = Number(btn.dataset.idx);
          draftRows.splice(idx, 1);
          renderDraftRows();
        });
      });
      rowsBox.querySelectorAll(".tag-add-btn").forEach((btn) => {
        btn.addEventListener("click", () => {
          const idx = Number(btn.dataset.row);
          window.TagPickerModal.open({
            attachedIds: draftRows[idx].tags,
            onAttach: (tagId) => {
              draftRows[idx].tags.push(tagId);
              renderDraftRows();
            },
            onTagDeleted: (tagId) => {
              draftRows.forEach((r) => (r.tags = r.tags.filter((id) => id !== tagId)));
              renderDraftRows();
            },
          });
        });
      });
      rowsBox.querySelectorAll(".tag-chip-remove").forEach((btn) => {
        btn.addEventListener("click", () => {
          const idx = Number(btn.dataset.row);
          const tagId = btn.dataset.tag;
          draftRows[idx].tags = draftRows[idx].tags.filter((id) => id !== tagId);
          renderDraftRows();
        });
      });
    }

    function save() {
      const noticeInput = document.getElementById("day-detail-notice-input");
      const notice = noticeInput.value.trim();
      const validRows = draftRows.filter((r) => r.activity.trim() !== "");

      const liveEntry = window.App.getOrCreateEntryForDate(dateStr);
      liveEntry.logs = validRows.map((row) => ({
        activity: row.activity.trim(),
        detail: row.detail.trim(),
        tags: row.tags.slice(),
      }));
      liveEntry.notice = notice;

      window.App.recomputeStreak();

      // 新しく増えた活動・気づきの分だけ、当日記録時の半分のEXPを付与する。
      const newRowsCount = Math.max(0, validRows.length - initialLogCount);
      const noticeBonusEligible = notice !== "" && !initialHadNotice;
      const character = window.App.getState().character;
      let leveledUp = false;

      if (newRowsCount > 0 || noticeBonusEligible) {
        const streakBonus = Math.min(character.streak * 2, 20);
        const fullExpGained = newRowsCount * 15 + (noticeBonusEligible ? 30 : 0) + streakBonus;
        const pastDayExpGained = Math.floor(fullExpGained / 2);
        if (pastDayExpGained > 0) {
          liveEntry.expGained = (liveEntry.expGained || 0) + pastDayExpGained;
          leveledUp = window.App.addExp(pastDayExpGained);
        }
      }

      window.App.persist();
      window.App.rerenderSidebar();
      close();

      if (leveledUp) {
        window.App.showLevelUp(character.level);
      }
    }

    function renderEditable() {
      const workingEntry = entry || { date: dateStr, goals: [], logs: [], notice: "" };
      const goals = workingEntry.goals || [];

      box.innerHTML = `
        <div class="modal-header">
          <h3 class="modal-title">${dateStr} の活動記録を編集</h3>
          <button type="button" class="modal-close-btn" id="day-detail-close">✕</button>
        </div>
        <div class="day-detail-body">
          <p class="day-detail-note">記録を忘れた日の活動を追記できます。連続日数にも反映されます。獲得EXPは当日に記録した場合の半分になります。</p>
          ${
            goals.length
              ? `<div class="history-section"><div class="history-section-title">目標</div><ul>${goals
                  .map((g) => `<li>${escapeHtml(g)}</li>`)
                  .join("")}</ul></div>`
              : ""
          }
          <div class="draft-logs" id="day-detail-draft-logs"></div>
          <button type="button" id="day-detail-add-row-btn" class="secondary-btn">＋ 活動を追加</button>
          <div class="notice-section">
            <label class="notice-label">この日の気づき</label>
            <textarea id="day-detail-notice-input" rows="2" placeholder="この日の気づきを書こう...">${escapeHtml(
              workingEntry.notice || ""
            )}</textarea>
          </div>
        </div>
        <div class="modal-actions">
          <button type="button" class="secondary-btn" id="day-detail-cancel">キャンセル</button>
          <button type="button" class="primary-btn" id="day-detail-save">保存する</button>
        </div>
      `;

      renderDraftRows();

      document.getElementById("day-detail-close").addEventListener("click", close);
      document.getElementById("day-detail-cancel").addEventListener("click", close);
      document.getElementById("day-detail-add-row-btn").addEventListener("click", () => {
        draftRows.push({ activity: "", detail: "", tags: [] });
        renderDraftRows();
      });
      document.getElementById("day-detail-save").addEventListener("click", save);
    }

    if (editable) renderEditable();
    else renderReadonly();

    overlay.classList.remove("hidden");
    overlay.onclick = (e) => {
      if (e.target === overlay) close();
    };
  }

  window.DayDetailModal = { open };
})();
