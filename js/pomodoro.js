// ポモドーロタイマー：データ定義とセッション管理（DOMを持たない）。
// 「冒険に出発→集中→帰還して休憩」というイメージに合わせ、進行はendsAt(絶対時刻)基準で持つ。
// カウントダウンで持たないので、タブを閉じても・PCがスリープしても、次に開いた瞬間に正しい残り時間へ復帰する。
(function () {
  const DEFAULT_PRESETS = [
    { id: "pomo_default_10", label: "10分探索", workMinutes: 10, breakMinutes: 5, isDefault: true },
    { id: "pomo_default_25", label: "25分遠征", workMinutes: 25, breakMinutes: 5, isDefault: true },
  ];

  let clockStarted = false;

  // state.pomodoro.presetsにデフォルトが無ければ追加する（冪等）。main.jsの初期化で呼ぶ。
  function ensureDefaultPresets(state) {
    let added = false;
    DEFAULT_PRESETS.forEach((preset) => {
      if (!state.pomodoro.presets.some((p) => p.id === preset.id)) {
        state.pomodoro.presets.push({ ...preset });
        added = true;
      }
    });
    return added;
  }

  function getPresets(state) {
    return state.pomodoro.presets;
  }

  function addPreset(state, label, workMinutes, breakMinutes) {
    const trimmed = (label || "").trim();
    const w = Number(workMinutes);
    const b = Number(breakMinutes);
    if (!trimmed || !Number.isFinite(w) || w <= 0 || !Number.isFinite(b) || b < 0) return null;
    const preset = {
      id: "pomo_" + Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
      label: trimmed,
      workMinutes: w,
      breakMinutes: b,
      isDefault: false,
    };
    state.pomodoro.presets.push(preset);
    window.App.persist();
    return preset;
  }

  function deletePreset(state, presetId) {
    state.pomodoro.presets = state.pomodoro.presets.filter((p) => p.id !== presetId);
    window.App.persist();
  }

  function getSession(state) {
    return state.pomodoro.session;
  }

  function startSession(state, preset) {
    state.pomodoro.session = {
      presetId: preset.id,
      label: preset.label,
      workMinutes: preset.workMinutes,
      breakMinutes: preset.breakMinutes,
      phase: "work",
      endsAt: Date.now() + preset.workMinutes * 60000,
      paused: false,
      remainingMs: null,
    };
    window.App.persist();
    return state.pomodoro.session;
  }

  function pauseSession(state) {
    const s = state.pomodoro.session;
    if (!s || s.paused) return;
    s.remainingMs = Math.max(0, s.endsAt - Date.now());
    s.paused = true;
    window.App.persist();
  }

  function resumeSession(state) {
    const s = state.pomodoro.session;
    if (!s || !s.paused) return;
    s.endsAt = Date.now() + (s.remainingMs || 0);
    s.paused = false;
    s.remainingMs = null;
    window.App.persist();
  }

  function abandonSession(state) {
    state.pomodoro.session = null;
    window.App.persist();
  }

  function getRemainingMs(session) {
    if (!session) return 0;
    if (session.paused) return session.remainingMs || 0;
    return Math.max(0, session.endsAt - Date.now());
  }

  function formatMs(ms) {
    const totalSec = Math.ceil(ms / 1000);
    const m = Math.floor(totalSec / 60);
    const s = totalSec % 60;
    return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  }

  // work→break→終了、と1フェーズだけ進める。放置していた時間がどれだけ長くても、
  // 次のフェーズは常に「今」からの残り時間で立て直すので、一気に複数フェーズが飛ぶことはない。
  function tick(state) {
    const session = state.pomodoro.session;
    if (!session || session.paused) return { type: "none" };
    if (session.endsAt - Date.now() > 0) return { type: "none" };

    if (session.phase === "work") {
      session.phase = "break";
      session.endsAt = Date.now() + session.breakMinutes * 60000;
      window.App.persist();
      return { type: "workDone" };
    }
    state.pomodoro.session = null;
    window.App.persist();
    return { type: "cycleDone" };
  }

  // 1秒ごとにtickし、常駐バッジ・開いていればモーダルも更新する。アプリ起動時に一度だけ呼ぶ。
  function startClock(state) {
    if (clockStarted) return;
    clockStarted = true;
    setInterval(() => {
      const event = tick(state);
      if (window.Widgets && window.Widgets.renderPomodoroWidget) {
        window.Widgets.renderPomodoroWidget(state);
      }
      if (window.PomodoroModal) {
        window.PomodoroModal.refresh(event);
      }
    }, 1000);
  }

  window.Pomodoro = {
    DEFAULT_PRESETS,
    ensureDefaultPresets,
    getPresets,
    addPreset,
    deletePreset,
    getSession,
    startSession,
    pauseSession,
    resumeSession,
    abandonSession,
    getRemainingMs,
    formatMs,
    tick,
    startClock,
  };
})();
