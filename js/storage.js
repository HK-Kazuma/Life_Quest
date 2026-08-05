// localStorage への読み書きを担当する。
(function () {
  const STORAGE_KEY = "adventureLogData";

  function createInitialState() {
    const cfg = window.APP_CONFIG || {};
    return {
      character: {
        name: cfg.name || "名もなき冒険者",
        job: cfg.job || "見習い冒険者",
        gender: cfg.gender || "-",
        sport: cfg.sport || "-",
        specialty: cfg.specialty || "-",
        level: 1,
        currentExp: 0,
        totalExp: 0,
        streak: 0,
        longestStreak: 0,
        lastLogDate: null,
      },
      profile: {
        age: cfg.age ?? "-",
        height: cfg.height ?? "-",
        weight: cfg.weight ?? "-",
        booksPerYear: cfg.booksPerYear ?? "-",
        avgSleepHours: cfg.avgSleepHours ?? "-",
        bodyFatPercent: cfg.bodyFatPercent ?? "-",
        toeic: cfg.toeic ?? "-",
        nationalCerts: cfg.nationalCerts ?? 0,
        municipalCerts: cfg.municipalCerts ?? 0,
      },
      todoList: [],
      // history entry: { date, goals: string[], logs: {activity, detail, tags: string[]}[], notice, expGained }
      history: [],
      // tag: { id, name, color }
      tags: [],
      // 日をまたいでも残り続けるデイリークエスト: { id, text, lastClearedDate }
      // lastClearedDateが今日の日付と一致する間だけ「クリア済み」として扱う。
      dailyQuests: [],
    };
  }

  function loadState() {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      try {
        const parsed = JSON.parse(raw);
        if (parsed && parsed.character && parsed.history) {
          if (!parsed.tags) parsed.tags = [];
          if (!parsed.dailyQuests) parsed.dailyQuests = [];
          // 「その日最初の記録だけXPを付与」機能の追加前からある記録には
          // expAwardedフラグが無い。既に活動やnoticeがある日はXP付与済みとみなして補完する。
          let backfilled = false;
          parsed.history.forEach((entry) => {
            if (entry.expAwarded === undefined) {
              entry.expAwarded = (entry.logs && entry.logs.length > 0) || !!entry.notice;
              backfilled = true;
            }
          });
          // デイリークエストが①の目標(entry.goals)に統合されていた旧仕様のデータを、
          // 永続リスト(dailyQuests)に移行する。
          parsed.history.forEach((entry) => {
            if (!entry.goalTypes) return;
            const dailyGoals = entry.goals.filter((g) => entry.goalTypes[g] === "daily");
            if (dailyGoals.length === 0) return;
            dailyGoals.forEach((g) => {
              if (!parsed.dailyQuests.some((q) => q.text === g)) {
                parsed.dailyQuests.push({
                  id: "daily_" + Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
                  text: g,
                  lastClearedDate: null,
                });
              }
              delete entry.goalTypes[g];
            });
            entry.goals = entry.goals.filter((g) => !dailyGoals.includes(g));
            backfilled = true;
          });
          if (backfilled) saveState(parsed);
          return parsed;
        }
      } catch (e) {
        console.error("保存データの読み込みに失敗しました", e);
      }
    }
    return createInitialState();
  }

  function saveState(state) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }

  window.Storage = { loadState, saveState, createInitialState };
})();
