// ②活動記録画面（冒険の書）：活動を複数追加し、気づきを添えて記録 → EXP加算・レベルアップ判定。
(function () {
  let draftRows = [{ activity: "", detail: "", tags: [] }];
  let syncedDate = null;

  function escapeHtml(str) {
    return String(str).replace(
      /[&<>"']/g,
      (ch) =>
        ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[ch])
    );
  }

  function render(container, state) {
    const entry = window.App.getTodayEntry(true);

    // 今日はじめて②画面を開いたときは、①で立てた目標をそのまま下書き行に反映し、
    // 同じ内容を再入力しなくて済むようにする。
    if (syncedDate !== entry.date) {
      syncedDate = entry.date;
      const isPristine =
        draftRows.length === 1 &&
        !draftRows[0].activity &&
        !draftRows[0].detail &&
        draftRows[0].tags.length === 0;
      if (isPristine && entry.goals.length > 0 && entry.logs.length === 0) {
        draftRows = entry.goals.map((g) => ({ activity: g, detail: "", tags: [] }));
      }
    }

    container.innerHTML = `
      <div class="screen-panel">
        <h2 class="screen-title">② 冒険の書（活動記録）</h2>
        <p class="screen-desc">今日やったこと・活動を記録しよう。</p>

        <div class="saved-logs" id="saved-logs"></div>

        ${
          entry.goals.length > 0
            ? `<div class="goal-chips-section">
                <div class="goal-chips-label">今日の目標から追加</div>
                <div class="goal-chips" id="goal-chips">
                  ${entry.goals
                    .map(
                      (g, i) =>
                        `<button type="button" class="goal-chip" data-idx="${i}">${escapeHtml(g)}</button>`
                    )
                    .join("")}
                </div>
               </div>`
            : ""
        }

        <div class="draft-logs" id="draft-logs"></div>
        <button id="add-log-row-btn" class="secondary-btn">＋ 活動を追加</button>

        <div class="notice-section">
          <label class="notice-label">本日最大の気づき（1つだけ）</label>
          <textarea id="notice-input" rows="2" placeholder="今日一番の気づきを書こう...">${escapeHtml(
            entry.notice || ""
          )}</textarea>
        </div>

        <button id="save-log-btn" class="primary-btn">記録する</button>
      </div>
    `;

    renderSavedLogs(entry);
    renderDraftRows(entry);

    document.getElementById("add-log-row-btn").addEventListener("click", () => {
      draftRows.push({ activity: "", detail: "", tags: [] });
      renderDraftRows(entry);
    });

    document.querySelectorAll(".goal-chip").forEach((btn) => {
      btn.addEventListener("click", () => {
        const idx = Number(btn.dataset.idx);
        const goalText = entry.goals[idx];
        const emptyRow = draftRows.find((r) => r.activity.trim() === "");
        if (emptyRow) {
          emptyRow.activity = goalText;
        } else {
          draftRows.push({ activity: goalText, detail: "", tags: [] });
        }
        renderDraftRows(entry);
      });
    });

    document.getElementById("save-log-btn").addEventListener("click", () => saveLog(entry, state));
  }

  function renderSavedLogs(entry) {
    const box = document.getElementById("saved-logs");
    if (!box) return;
    if (entry.logs.length === 0) {
      box.innerHTML = "";
      return;
    }
    const tags = window.App.getTags();
    box.innerHTML = `
      <div class="saved-logs-title">記録済みの活動</div>
      <ul class="saved-log-list">
        ${entry.logs
          .map(
            (log) => `
          <li>
            <strong>${escapeHtml(log.activity)}</strong>
            ${window.TagsUtil.renderTagChips(log.tags, tags)}
            ${log.detail ? `<div class="log-detail">${escapeHtml(log.detail)}</div>` : ""}
          </li>`
          )
          .join("")}
      </ul>`;
  }

  function renderDraftRows(entry) {
    const box = document.getElementById("draft-logs");
    if (!box) return;
    const tags = window.App.getTags();
    const tagMap = window.TagsUtil.tagsById(tags);

    box.innerHTML = draftRows
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
          <input type="text" class="draft-activity" placeholder="活動名（例: ランニング）" value="${escapeHtml(
            row.activity
          )}" />
          <input type="text" class="draft-detail" placeholder="詳細：何を強化した？何を学んだ？" value="${escapeHtml(
            row.detail
          )}" />
          ${draftRows.length > 1 ? `<button class="remove-draft-btn" data-idx="${idx}">×</button>` : ""}
          <div class="draft-tags-row">
            ${chipsHtml}
            ${row.tags.length < 3 ? `<button type="button" class="tag-add-btn" data-row="${idx}">＋ タグ</button>` : ""}
          </div>
        </div>`;
      })
      .join("");

    box.querySelectorAll(".draft-activity").forEach((input, i) => {
      input.addEventListener("input", () => (draftRows[i].activity = input.value));
    });
    box.querySelectorAll(".draft-detail").forEach((input, i) => {
      input.addEventListener("input", () => (draftRows[i].detail = input.value));
    });
    box.querySelectorAll(".remove-draft-btn").forEach((btn) => {
      btn.addEventListener("click", () => {
        const idx = Number(btn.dataset.idx);
        draftRows.splice(idx, 1);
        renderDraftRows(entry);
      });
    });
    box.querySelectorAll(".tag-add-btn").forEach((btn) => {
      btn.addEventListener("click", () => {
        const idx = Number(btn.dataset.row);
        window.TagPickerModal.open({
          attachedIds: draftRows[idx].tags,
          onAttach: (tagId) => {
            draftRows[idx].tags.push(tagId);
            renderDraftRows(entry);
          },
          onTagDeleted: (tagId) => {
            draftRows.forEach((r) => (r.tags = r.tags.filter((id) => id !== tagId)));
            renderDraftRows(entry);
          },
        });
      });
    });
    box.querySelectorAll(".tag-chip-remove").forEach((btn) => {
      btn.addEventListener("click", () => {
        const idx = Number(btn.dataset.row);
        const tagId = btn.dataset.tag;
        draftRows[idx].tags = draftRows[idx].tags.filter((id) => id !== tagId);
        renderDraftRows(entry);
      });
    });
  }

  function saveLog(entry, state) {
    const noticeInput = document.getElementById("notice-input");
    const notice = noticeInput.value.trim();
    const validRows = draftRows.filter((r) => r.activity.trim() !== "");

    if (validRows.length === 0 && !notice) {
      alert("活動または気づきを入力してください。");
      return;
    }

    validRows.forEach((row) => {
      entry.logs.push({ activity: row.activity.trim(), detail: row.detail.trim(), tags: row.tags.slice() });
    });

    if (notice) entry.notice = notice;

    window.App.updateStreakOnLog();
    const character = state.character;
    const streakBonus = Math.min(character.streak * 2, 20);
    const expGained = validRows.length * 15 + (notice ? 30 : 0) + streakBonus;

    entry.expGained = (entry.expGained || 0) + expGained;
    const leveledUp = window.App.addExp(expGained);
    window.App.persist();

    draftRows = [{ activity: "", detail: "", tags: [] }];

    window.App.rerenderSidebar();
    render(document.getElementById("screen-content"), state);

    if (leveledUp) {
      window.App.showLevelUp(character.level);
    }
  }

  window.LogScreen = { render };
})();
