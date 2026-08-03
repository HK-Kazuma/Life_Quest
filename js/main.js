// 初期化・タブ切り替え・全体stateの管理（EXP/レベル/ストリーク計算を含む）。
(function () {
  let state = null;

  function todayStr() {
    const d = new Date();
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
    document.getElementById("book-open").classList.add("hidden");
    document.getElementById("book-closed").classList.remove("hidden");
    document.querySelector(".right-column").classList.remove("hidden");
    localStorage.setItem("adventureBookOpen", "0");
  }

  function switchScreen(name) {
    document.querySelectorAll(".tab-button").forEach((btn) => {
      btn.classList.toggle("active", btn.dataset.screen === name);
    });
    const container = document.getElementById("screen-content");
    container.innerHTML = "";
    if (name === "goal") window.GoalScreen.render(container, state);
    else if (name === "log") window.LogScreen.render(container, state);
    else if (name === "history") window.HistoryScreen.render(container, state);
    else if (name === "reset") window.ResetScreen.render(container, state);
    localStorage.setItem("adventureLogActiveTab", name);
  }

  function init() {
    state = window.Storage.loadState();
    rerenderSidebar();

    const savedTab = localStorage.getItem("adventureLogActiveTab") || "goal";
    switchScreen(savedTab);

    document.querySelectorAll(".tab-button").forEach((btn) => {
      btn.addEventListener("click", () => switchScreen(btn.dataset.screen));
    });

    document.getElementById("book-closed").addEventListener("click", () => openBook(true));
    document.getElementById("close-book-btn").addEventListener("click", closeBook);

    if (localStorage.getItem("adventureBookOpen") === "1") {
      openBook(false);
    }
  }

  window.App = {
    getState,
    persist,
    todayStr,
    daysBetween,
    neededForLevel,
    getTodayEntry,
    getEntryForDate,
    getOrCreateEntryForDate,
    updateStreakOnLog,
    recomputeStreak,
    addExp,
    showLevelUp,
    rerenderSidebar,
    switchScreen,
  };

  document.addEventListener("DOMContentLoaded", init);
})();
