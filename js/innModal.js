// 宿屋：一日の終わりと次の日の始まりをつなぐ施設。
// ①今日の成果を見る ②明日のクエストを決める ③一言振り返る ④今日はもう寝ますか？
// 「はい」を選ぶと今日は終了扱いになり、以後の活動記録はカレンダーからの過去日編集になる。
// 翌日アプリを開いたときは「おはよう」画面で、②で決めたメイン/サブクエストをそのまま見せる。
(function () {
  function escapeHtml(str) {
    return String(str).replace(
      /[&<>"']/g,
      (ch) =>
        ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[ch])
    );
  }

  function open(state) {
    const overlay = document.getElementById("inn-overlay");
    const box = document.getElementById("inn-box");
    if (!overlay || !box) return;

    function close() {
      overlay.classList.add("hidden");
      overlay.onclick = null;
    }

    function renderTodaySummaryHtml(entry) {
      if (!entry || entry.logs.length === 0) {
        return `
          <p class="inn-hint">まだ今日の活動を記録していません。冒険の書の「①活動記録」で今日の活動を記録しましょう。</p>
          <button type="button" class="secondary-btn" id="inn-open-book-btn">冒険の書を開く</button>
        `;
      }
      return `
        <ul class="inn-log-list">
          ${entry.logs
            .map(
              (log) =>
                `<li><strong>${escapeHtml(log.activity)}</strong>${window.AchievementUtil.badgeHtml(
                  log
                )}${window.TagsUtil.renderTagChips(
                  log.tags,
                  window.App.getTags()
                )}${log.detail ? `<div class="log-detail">${escapeHtml(log.detail)}</div>` : ""}</li>`
            )
            .join("")}
        </ul>
        ${entry.notice ? `<p class="inn-notice-line">気づき: ${escapeHtml(entry.notice)}</p>` : ""}
        <p class="inn-exp-line">獲得EXP：${entry.expGained || 0}</p>
      `;
    }

    function renderSleepAreaHtml(alreadySlept) {
      if (alreadySlept) {
        return `<p class="inn-sleep-message">今日はもう眠りにつきました。おやすみなさい。</p>`;
      }
      return `
        <div class="inn-sleep-buttons">
          <button type="button" class="primary-btn" id="inn-sleep-yes-btn">はい</button>
          <button type="button" class="secondary-btn" id="inn-sleep-no-btn">いいえ</button>
        </div>
        <p class="inn-sleep-result" id="inn-sleep-result"></p>
      `;
    }

    function questColHtml(label, type, items, inputId, addBtnId, addBtnClass) {
      return `
        <div class="inn-quest-col">
          <div class="inn-quest-col-label">${escapeHtml(label)}</div>
          <ul class="goal-list">
            ${
              items.length
                ? items
                    .map(
                      (g) =>
                        `<li><span>${escapeHtml(g)}</span><button type="button" class="goal-remove-btn" data-type="${type}" data-text="${escapeHtml(
                          g
                        )}">×</button></li>`
                    )
                    .join("")
                : `<li class="empty-hint">まだ決めていません</li>`
            }
          </ul>
          <div class="goal-add-row">
            <input type="text" id="${inputId}" placeholder="明日の${escapeHtml(label)}を入力..." />
            <button type="button" class="${addBtnClass}" id="${addBtnId}">受注する</button>
          </div>
        </div>
      `;
    }

    function render() {
      const todayStr = window.App.todayStr();
      const tomorrowStr = window.App.shiftDateStr(todayStr, 1);
      const todayEntry = window.App.getEntryForDate(todayStr);
      const tomorrowEntry = window.App.getEntryForDate(tomorrowStr);
      const tomorrowGoals = tomorrowEntry ? tomorrowEntry.goals : [];
      const tomorrowGoalTypes = (tomorrowEntry && tomorrowEntry.goalTypes) || {};
      const alreadySlept = state.character.lastSleepDate === todayStr;

      const mainQuests = tomorrowGoals.filter((g) => tomorrowGoalTypes[g] === "main");
      const subQuests = tomorrowGoals.filter((g) => tomorrowGoalTypes[g] === "sub");

      box.innerHTML = `
        <div class="modal-header">
          <h3 class="modal-title">🏨 宿屋</h3>
          <button type="button" class="modal-close-btn" id="inn-close">✕</button>
        </div>
        <div class="inn-body">
          <section class="inn-section">
            <div class="inn-section-title">① 今日の成果を見る</div>
            ${renderTodaySummaryHtml(todayEntry)}
          </section>

          <section class="inn-section">
            <div class="inn-section-title">② 明日のクエストを決める</div>
            <p class="screen-desc">ここで受注したクエストは、翌日のメイン/サブクエストとして最初から反映されます。</p>
            <div class="inn-quest-cols">
              ${questColHtml("メインクエスト", "main", mainQuests, "inn-main-input", "inn-main-add-btn", "primary-btn")}
              ${questColHtml("サブクエスト", "sub", subQuests, "inn-sub-input", "inn-sub-add-btn", "secondary-btn")}
            </div>
          </section>

          <section class="inn-section">
            <div class="inn-section-title">③ 一言振り返る</div>
            <textarea id="inn-notice-input" rows="2" placeholder="今日一日を一言でふりかえろう...">${escapeHtml(
              (todayEntry && todayEntry.notice) || ""
            )}</textarea>
          </section>

          <section class="inn-section">
            <div class="inn-section-title">④ 今日はもう寝ますか？</div>
            ${renderSleepAreaHtml(alreadySlept)}
          </section>
        </div>
      `;

      document.getElementById("inn-close").addEventListener("click", close);

      const openBookBtn = document.getElementById("inn-open-book-btn");
      if (openBookBtn) {
        openBookBtn.addEventListener("click", () => {
          close();
          const bookClosed = document.getElementById("book-closed");
          if (bookClosed && !bookClosed.classList.contains("hidden")) bookClosed.click();
          window.App.switchScreen("log");
        });
      }

      document.getElementById("inn-main-add-btn").addEventListener("click", () => addTomorrowQuest("main"));
      document.getElementById("inn-main-input").addEventListener("keydown", (e) => {
        if (e.key === "Enter") addTomorrowQuest("main");
      });
      document.getElementById("inn-sub-add-btn").addEventListener("click", () => addTomorrowQuest("sub"));
      document.getElementById("inn-sub-input").addEventListener("keydown", (e) => {
        if (e.key === "Enter") addTomorrowQuest("sub");
      });
      box.querySelectorAll(".goal-remove-btn").forEach((btn) => {
        btn.addEventListener("click", () => removeTomorrowQuest(btn.dataset.type, btn.dataset.text));
      });

      const noticeInput = document.getElementById("inn-notice-input");
      noticeInput.addEventListener("change", () => {
        const entry = window.App.getOrCreateEntryForDate(todayStr);
        entry.notice = noticeInput.value.trim();
        window.App.persist();
      });

      if (!alreadySlept) {
        document.getElementById("inn-sleep-yes-btn").addEventListener("click", sleepYes);
        document.getElementById("inn-sleep-no-btn").addEventListener("click", sleepNo);
      }
    }

    function addTomorrowQuest(type) {
      const input = document.getElementById(type === "main" ? "inn-main-input" : "inn-sub-input");
      const text = input.value.trim();
      if (!text) return;
      const tomorrowStr = window.App.shiftDateStr(window.App.todayStr(), 1);
      const entry = window.App.getOrCreateEntryForDate(tomorrowStr);
      entry.goalTypes = entry.goalTypes || {};
      entry.goals.push(text);
      entry.goalTypes[text] = type;
      window.App.persist();
      render();
    }

    function removeTomorrowQuest(type, text) {
      const tomorrowStr = window.App.shiftDateStr(window.App.todayStr(), 1);
      const entry = window.App.getEntryForDate(tomorrowStr);
      if (!entry) return;
      const idx = entry.goals.indexOf(text);
      if (idx === -1) return;
      entry.goals.splice(idx, 1);
      if (entry.goalTypes) delete entry.goalTypes[text];
      window.App.persist();
      render();
    }

    function sleepYes() {
      state.character.lastSleepDate = window.App.todayStr();
      window.App.persist();
      const result = document.getElementById("inn-sleep-result");
      if (result) result.textContent = "おやすみなさい。";
      const btnRow = box.querySelector(".inn-sleep-buttons");
      if (btnRow) btnRow.remove();
    }

    function sleepNo() {
      const result = document.getElementById("inn-sleep-result");
      if (result) result.textContent = "最後まで頑張って！";
    }

    render();
    overlay.classList.remove("hidden");
    overlay.onclick = (e) => {
      if (e.target === overlay) close();
    };
  }

  // 前日に受注したメイン/サブクエストのうち、実際の活動として記録されなかった
  // （＝達成できなかった）ものを、今日のクエストとして自動的に持ち越す。
  // 前日側の記録はそのまま残し、今日の目標としてコピーするだけなので、
  // 履歴（過去日の記録）は変化しない。
  function carryOverUnfinishedGoals(todayStr, yesterdayStr) {
    const yesterdayEntry = window.App.getEntryForDate(yesterdayStr);
    if (!yesterdayEntry || !yesterdayEntry.goals || yesterdayEntry.goals.length === 0) return;

    const loggedActivities = new Set((yesterdayEntry.logs || []).map((log) => log.activity));
    const yesterdayGoalTypes = yesterdayEntry.goalTypes || {};
    const unfinishedGoals = yesterdayEntry.goals.filter((g) => {
      const type = yesterdayGoalTypes[g];
      return (type === "main" || type === "sub") && !loggedActivities.has(g);
    });
    if (unfinishedGoals.length === 0) return;

    const todayEntry = window.App.getOrCreateEntryForDate(todayStr);
    todayEntry.goalTypes = todayEntry.goalTypes || {};
    let changed = false;
    unfinishedGoals.forEach((g) => {
      if (!todayEntry.goals.includes(g)) {
        todayEntry.goals.push(g);
        todayEntry.goalTypes[g] = yesterdayGoalTypes[g];
        changed = true;
      }
    });
    if (changed) window.App.persist();
  }

  // アプリ起動時、まだその日の「おはよう」画面を見せていなければ表示する。
  // 前夜に宿屋で眠っていれば、翌日決めたメイン/サブクエストをそのまま見せる。
  function maybeShowMorning(state) {
    const overlay = document.getElementById("inn-morning-overlay");
    const box = document.getElementById("inn-morning-box");
    if (!overlay || !box) return;

    const todayStr = window.App.todayStr();

    // 初回起動時（まだ一度も日付の基準を持っていない）は、AM4:00をまたいだかどうか
    // 判定できないので、おはよう画面を出さずに基準日だけ記録しておく。
    // 次に論理日が変わった（＝AM4:00以降に初めて開いた）タイミングから表示され始める。
    if (state.inn.lastMorningShownDate === null) {
      state.inn.lastMorningShownDate = todayStr;
      window.App.persist();
      return;
    }

    if (state.inn.lastMorningShownDate === todayStr) return;

    const yesterdayStr = window.App.shiftDateStr(todayStr, -1);
    const sleptLastNight = state.character.lastSleepDate === yesterdayStr;

    carryOverUnfinishedGoals(todayStr, yesterdayStr);

    const todayEntry = window.App.getEntryForDate(todayStr);
    const goals = (todayEntry && todayEntry.goals) || [];
    const goalTypes = (todayEntry && todayEntry.goalTypes) || {};
    const mainQuests = goals.filter((g) => goalTypes[g] === "main");
    const subQuests = goals.filter((g) => goalTypes[g] === "sub");

    box.innerHTML = `
      <div class="inn-morning-greeting">🌅 おはよう！</div>
      <p class="inn-morning-line">${
        sleptLastNight ? "昨日はよく眠れました！" : "今日も一日がんばろう！"
      }</p>
      <div class="inn-morning-divider"></div>
      <div class="inn-morning-quest-block">
        <div class="inn-morning-quest-title">今日のメインクエスト</div>
        ${
          mainQuests.length
            ? mainQuests.map((g) => `<div class="inn-morning-quest-item">${escapeHtml(g)}</div>`).join("")
            : `<div class="inn-morning-quest-empty">まだ決めていません</div>`
        }
      </div>
      <div class="inn-morning-divider"></div>
      <div class="inn-morning-quest-block">
        <div class="inn-morning-quest-title">サブクエスト</div>
        ${
          subQuests.length
            ? `<ul class="inn-morning-sub-list">${subQuests
                .map((g) => `<li>・${escapeHtml(g)}</li>`)
                .join("")}</ul>`
            : `<div class="inn-morning-quest-empty">まだ決めていません</div>`
        }
      </div>
      <button type="button" class="primary-btn inn-morning-close-btn" id="inn-morning-close-btn">今日も頑張るぞ！</button>
    `;

    document.getElementById("inn-morning-close-btn").addEventListener("click", () => {
      overlay.classList.add("hidden");
    });

    state.inn.lastMorningShownDate = todayStr;
    window.App.persist();

    overlay.classList.remove("hidden");
  }

  window.InnModal = { open, maybeShowMorning };
})();
