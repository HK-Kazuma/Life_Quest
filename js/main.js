// 初期化・タブ切り替え・全体stateの管理（EXP/レベル/ストリーク計算を含む）。
(function () {
  let state = null;

  // 論理上の「今日」。深夜〜AM4:00までは前日の続きとして扱う
  // （記録し忘れではなく、日付をまたいで前日分を記録するケースを想定した宿屋の仕様）。
  function todayStr() {
    const d = new Date();
    if (d.getHours() < 4) {
      d.setDate(d.getDate() - 1);
    }
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${y}-${m}-${day}`;
  }

  function daysBetween(dateStrA, dateStrB) {
    const a = new Date(dateStrA + "T00:00:00");
    const b = new Date(dateStrB + "T00:00:00");
    return Math.round((b - a) / (1000 * 60 * 60 * 24));
  }

  function neededForLevel(level) {
    return level * 20;
  }

  function getState() {
    return state;
  }

  function persist() {
    window.Storage.saveState(state);
  }

  function getEntryForDate(dateStr) {
    return state.history.find((h) => h.date === dateStr);
  }

  function getOrCreateEntryForDate(dateStr) {
    let entry = getEntryForDate(dateStr);
    if (!entry) {
      entry = { date: dateStr, goals: [], logs: [], notice: "", expGained: 0 };
      state.history.push(entry);
    }
    return entry;
  }

  function getTodayEntry(createIfMissing) {
    const today = todayStr();
    let entry = getEntryForDate(today);
    if (!entry && createIfMissing) {
      entry = getOrCreateEntryForDate(today);
      window.App.persist();
    }
    return entry;
  }

  function shiftDateStr(dateStr, deltaDays) {
    const d = new Date(dateStr + "T00:00:00");
    d.setDate(d.getDate() + deltaDays);
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${y}-${m}-${day}`;
  }

  // 過去日の活動記録を直接編集した後などに、履歴データからストリークを実データベースで再計算する。
  function recomputeStreak() {
    const activeDates = new Set(
      state.history.filter((h) => h.logs && h.logs.length > 0).map((h) => h.date)
    );

    let lastLogDate = null;
    activeDates.forEach((d) => {
      if (!lastLogDate || d > lastLogDate) lastLogDate = d;
    });

    let streak = 0;
    if (lastLogDate) {
      let cursor = lastLogDate;
      while (activeDates.has(cursor)) {
        streak++;
        cursor = shiftDateStr(cursor, -1);
      }
    }

    let longestStreak = 0;
    let run = 0;
    let prevDate = null;
    Array.from(activeDates)
      .sort()
      .forEach((d) => {
        run = prevDate && daysBetween(prevDate, d) === 1 ? run + 1 : 1;
        longestStreak = Math.max(longestStreak, run);
        prevDate = d;
      });

    const character = state.character;
    character.streak = streak;
    character.longestStreak = longestStreak;
    character.lastLogDate = lastLogDate;
  }

  function getTags() {
    return state.tags;
  }

  function createTag(name, color) {
    const tag = {
      id: "tag_" + Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
      name,
      color,
    };
    state.tags.push(tag);
    window.App.persist();
    return tag;
  }

  // タグ定義を削除し、過去の活動記録に残る参照も一緒に取り除く。
  function deleteTag(tagId) {
    state.tags = state.tags.filter((t) => t.id !== tagId);
    state.history.forEach((entry) => {
      entry.logs.forEach((log) => {
        if (log.tags) log.tags = log.tags.filter((id) => id !== tagId);
      });
    });
    window.App.persist();
  }

  function updateStreakOnLog() {
    const today = todayStr();
    const character = state.character;
    if (character.lastLogDate === today) {
      // 本日すでに記録済み → ストリーク維持
    } else if (character.lastLogDate === null) {
      character.streak = 1;
    } else {
      const diff = daysBetween(character.lastLogDate, today);
      if (diff === 1) {
        character.streak += 1;
      } else if (diff > 1) {
        character.streak = 1;
      }
    }
    character.lastLogDate = today;
    character.longestStreak = Math.max(character.longestStreak || 0, character.streak);
  }

  function addExp(amount) {
    const character = state.character;
    character.currentExp += amount;
    character.totalExp += amount;
    let leveledUp = false;
    while (character.currentExp >= neededForLevel(character.level)) {
      character.currentExp -= neededForLevel(character.level);
      character.level += 1;
      leveledUp = true;
    }
    return leveledUp;
  }

  function showLevelUp(newLevel) {
    const overlay = document.getElementById("levelup-overlay");
    const detail = document.getElementById("levelup-detail");
    detail.textContent = `Lv.${newLevel} になった！`;
    overlay.classList.remove("hidden");
    setTimeout(() => overlay.classList.add("hidden"), 2200);
  }

  function rerenderSidebar() {
    window.CharacterPanel.render(state);
    window.Widgets.render(state);
  }

  function openBook(animate) {
    const closed = document.getElementById("book-closed");
    const open = document.getElementById("book-open");
    const rightColumn = document.querySelector(".right-column");
    localStorage.setItem("adventureBookOpen", "1");

    if (animate === false) {
      closed.classList.add("hidden");
      open.classList.remove("hidden");
      rightColumn.classList.add("hidden");
      return;
    }

    closed.classList.add("opening");
    setTimeout(() => {
      closed.classList.add("hidden");
      closed.classList.remove("opening");
      rightColumn.classList.add("hidden");

      open.classList.remove("hidden");
      open.classList.add("revealing");
      setTimeout(() => open.classList.remove("revealing"), 400);
    }, 450);
  }

  function closeBook() {
    const closed = document.getElementById("book-closed");
    const open = document.getElementById("book-open");
    const rightColumn = document.querySelector(".right-column");
    localStorage.setItem("adventureBookOpen", "0");

    open.classList.add("concealing");
    setTimeout(() => {
      open.classList.add("hidden");
      open.classList.remove("concealing");
      rightColumn.classList.remove("hidden");

      closed.classList.remove("hidden");
      closed.classList.add("closing");
      setTimeout(() => closed.classList.remove("closing"), 450);
    }, 400);
  }

  function switchScreen(name) {
    document.querySelectorAll(".tab-button").forEach((btn) => {
      btn.classList.toggle("active", btn.dataset.screen === name);
    });
    const container = document.getElementById("screen-content");
    container.innerHTML = "";
    if (name === "log") window.LogScreen.render(container, state);
    else if (name === "history") window.HistoryScreen.render(container, state);
    else if (name === "reset") window.ResetScreen.render(container, state);
    else if (name === "dailyQuest") window.DailyQuestScreen.render(container, state);
    localStorage.setItem("adventureLogActiveTab", name);
  }

  function init() {
    state = window.Storage.loadState();
    if (window.TagsUtil.ensureSystemTags(state)) persist();
    rerenderSidebar();

    const validTabs = ["log", "dailyQuest", "history", "reset"];
    const savedTab = localStorage.getItem("adventureLogActiveTab");
    switchScreen(validTabs.includes(savedTab) ? savedTab : "log");

    document.querySelectorAll(".tab-button").forEach((btn) => {
      btn.addEventListener("click", () => switchScreen(btn.dataset.screen));
    });

    document.getElementById("book-closed").addEventListener("click", () => openBook(true));
    document.getElementById("close-book-btn").addEventListener("click", closeBook);
    window.Widgets.initBackupButton();

    if (localStorage.getItem("adventureBookOpen") === "1") {
      openBook(false);
    }

    if (window.InnModal) window.InnModal.maybeShowMorning(state);
  }

  window.App = {
    getState,
    persist,
    todayStr,
    daysBetween,
    shiftDateStr,
    neededForLevel,
    getTodayEntry,
    getEntryForDate,
    getOrCreateEntryForDate,
    getTags,
    createTag,
    deleteTag,
    updateStreakOnLog,
    recomputeStreak,
    addExp,
    showLevelUp,
    rerenderSidebar,
    switchScreen,
  };

  document.addEventListener("DOMContentLoaded", init);
})();
