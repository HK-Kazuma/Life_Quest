// localStorage への読み書きを担当する。
(function () {
  const STORAGE_KEY = "adventureLogData";

  function createInitialState() {
    const cfg = window.APP_CONFIG || {};
    return {
      character: {
        name: cfg.name || "名もなき冒険者",
        job: cfg.job || "みならい冒険者",
        gender: cfg.gender || "-",
        sport: cfg.sport || "-",
        specialty: cfg.specialty || "-",
        level: 1,
        currentExp: 0,
        totalExp: 0,
        streak: 0,
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
      // history entry: { date, goals: string[], logs: {activity, detail, linkedGoal?}[], notice, expGained }
      history: [],
    };
  }

  function loadState() {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      try {
        const parsed = JSON.parse(raw);
        if (parsed && parsed.character && parsed.history) {
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
