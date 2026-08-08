// ①活動記録画面（冒険の書）：活動を複数追加し、気づきを添えて記録 → EXP加算・レベルアップ判定。
(function () {
  let draftRows = [{ activity: "", detail: "", tags: [] }];
  let syncedDate = null;
  let syncedGoals = new Set();

  function escapeHtml(str) {
    return String(str).replace(
      /[&<>"']/g,
      (ch) =>
        ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[ch])
    );
  }

  function render(container, state) {
    const todayStr = window.App.todayStr();
    // 宿屋で「今日はもう寝る」を選んだ後は、記録はカレンダー（過去日編集）から行う。
    if (state.character.lastSleepDate === todayStr) {
      renderSleepGate(container, state, todayStr);
      return;
    }

    const entry = window.App.getTodayEntry(true);

    // 日付が変わったら、その日にすでに保存済みの活動を下書きとして読み込み直す。
    // 同日中はこの下書きがそのまま編集対象になるので、記録済みの内容もここから修正できる。
    if (syncedDate !== entry.date) {
      syncedDate = entry.date;
      draftRows =
        entry.logs.length > 0
          ? entry.logs.map((log) => ({
              activity: log.activity,
              detail: log.detail || "",
              tags: log.tags ? log.tags.slice() : [],
            }))
          : [{ activity: "", detail: "", tags: [] }];
      syncedGoals = new Set(entry.goals.filter((g) => draftRows.some((r) => r.activity === g)));
    }

    // クエストボードで受注した目標(メイン/サブ)は、その都度自動的に活動名として下書き行に反映する。
    // 2件以上あれば、その分だけ活動行も自動で追加される。
    // メイン/サブで受注したものには、対応するシステムタグ（メイン/サブ）を自動で付ける。
    const autoTagByType = {
      main: window.TagsUtil.SYSTEM_TAGS.main.id,
      sub: window.TagsUtil.SYSTEM_TAGS.sub.id,
    };
    entry.goals.forEach((goal) => {
      if (syncedGoals.has(goal)) return;
      // 一度手動で下書きから消したクエストは、リロードしても自動で復元しない。
      if (entry.removedGoalDrafts && entry.removedGoalDrafts.includes(goal)) return;
      syncedGoals.add(goal);
      const goalType = entry.goalTypes && entry.goalTypes[goal];
      const autoTagId = autoTagByType[goalType];
      const emptyRow = draftRows.find(
        (r) => !r.activity && !r.detail && r.tags.length === 0
      );
      if (emptyRow) {
        emptyRow.activity = goal;
        if (autoTagId) emptyRow.tags = [autoTagId];
      } else {
        draftRows.push({ activity: goal, detail: "", tags: autoTagId ? [autoTagId] : [] });
      }
    });

    container.innerHTML = `
      <div class="screen-panel">
        <h2 class="screen-title">① 冒険の書（活動記録）</h2>
        <p class="screen-desc">${
          entry.expAwarded
            ? "今日の記録は修正できます（2回目以降の保存にXPはつきません）。"
            : "今日やったこと・活動を記録しよう。"
        }</p>

        <div class="notice-section premortem-section">
          <label class="notice-label">🔮 事前検死（プレモーダル）</label>
          <p class="premortem-hint">今日の計画が崩れるとしたら何が原因か？　例：面談前に難易度の高いクエストを終わらせる／外出中はできないクエストを先に片付ける、など。</p>
          <textarea id="premortem-input" rows="3" placeholder="今日、計画が崩れるとしたら何が原因になりそうか。それを踏まえてどう動くか...">${escapeHtml(
            entry.premortem || ""
          )}</textarea>
        </div>

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

    renderDraftRows(entry);

    document.getElementById("premortem-input").addEventListener("change", (e) => {
      entry.premortem = e.target.value.trim();
      window.App.persist();
    });

    document.getElementById("add-log-row-btn").addEventListener("click", () => {
      draftRows.push({ activity: "", detail: "", tags: [] });
      renderDraftRows(entry);
    });

    document.getElementById("save-log-btn").addEventListener("click", () => saveLog(entry, state));
  }

  function renderSleepGate(container, state, todayStr) {
    const entry = window.App.getEntryForDate(todayStr);
    container.innerHTML = `
      <div class="screen-panel">
        <h2 class="screen-title">① 冒険の書（活動記録）</h2>
        <p class="screen-desc">宿屋で今日はもう眠りにつきました。今日の記録を追加・修正する場合はカレンダーから編集してください。</p>
        <button type="button" class="secondary-btn" id="log-open-calendar-btn">カレンダーを開く</button>
        ${
          entry && entry.logs.length
            ? `<div class="history-section"><div class="history-section-title">今日すでに記録した活動</div><ul>${entry.logs
                .map(
                  (log) =>
                    `<li><strong>${escapeHtml(log.activity)}</strong>${window.TagsUtil.renderTagChips(
                      log.tags,
                      window.App.getTags()
                    )}${log.detail ? `<div class="log-detail">${escapeHtml(log.detail)}</div>` : ""}</li>`
                )
                .join("")}</ul></div>`
            : ""
        }
      </div>
    `;
    document.getElementById("log-open-calendar-btn").addEventListener("click", () => {
      window.Widgets.openCalendarPopup(state);
    });
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
            return `<span class="${window.TagsUtil.tagChipClass(t)}" style="${window.TagsUtil.tagChipStyle(
              t
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
        const removedActivity = draftRows[idx].activity;
        // ここで目標側(entry.goals)は変更しない。目標と実際の活動記録の差分を
        // あとから把握できるよう、活動記録側だけを消す。
        draftRows.splice(idx, 1);
        // クエストボード由来の下書き行を消した場合は、リロード後も復元されないよう記録しておく。
        if (removedActivity && entry.goals.includes(removedActivity)) {
          entry.removedGoalDrafts = entry.removedGoalDrafts || [];
          if (!entry.removedGoalDrafts.includes(removedActivity)) {
            entry.removedGoalDrafts.push(removedActivity);
          }
          window.App.persist();
        }
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

  // クエストボードで目標が削除されたとき、自動反映しただけの下書き行を追随して消す。
  function removeGoalFromDrafts(goalText) {
    syncedGoals.delete(goalText);
    const idx = draftRows.findIndex((r) => r.activity === goalText);
    if (idx === -1) return;
    draftRows.splice(idx, 1);
    if (draftRows.length === 0) draftRows.push({ activity: "", detail: "", tags: [] });
    if (document.getElementById("draft-logs")) {
      renderDraftRows(window.App.getTodayEntry(true));
    }
  }

  function saveLog(entry, state) {
    const noticeInput = document.getElementById("notice-input");
    const notice = noticeInput.value.trim();
    const validRows = draftRows.filter((r) => r.activity.trim() !== "");

    if (validRows.length === 0 && !notice) {
      alert("活動または気づきを入力してください。");
      return;
    }

    // その日の記録は下書きの内容でまるごと置き換える＝再修正できる。
    entry.logs = validRows.map((row) => ({
      activity: row.activity.trim(),
      detail: row.detail.trim(),
      tags: row.tags.slice(),
    }));
    entry.notice = notice;

    window.App.updateStreakOnLog();

    // XPが付くのはその日最初の「記録する」だけ。2回目以降の修正はXP無し。
    let leveledUp = false;
    if (!entry.expAwarded) {
      const character = state.character;
      const streakBonus = Math.min(character.streak * 2, 20);
      const expGained = validRows.length * 15 + (notice ? 30 : 0) + streakBonus;

      entry.expGained = (entry.expGained || 0) + expGained;
      leveledUp = window.App.addExp(expGained);
      entry.expAwarded = true;
    }

    window.App.persist();

    window.App.rerenderSidebar();
    render(document.getElementById("screen-content"), state);

    if (leveledUp) {
      window.App.showLevelUp(state.character.level);
    }
  }

  window.LogScreen = { render, removeGoalFromDrafts };
})();
