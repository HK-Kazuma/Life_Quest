// 集中モード：メイン/サブクエストをラウンド(小さな作業単位)に分解し、1ラウンドずつ集中して進める。
// データ層のみを担当（DOMを持たない）。pomodoro.jsと同じく、実行中ラウンドは絶対時刻基準
// (roundStartedAt)で持つので、タブを閉じても・PCがスリープしても正しい経過時間に復帰できる。
(function () {
  const MIN_ROUNDS = 2;
  const MAX_ROUNDS = 4;
  const START_EXP = 5;

  function genId() {
    return "round_" + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
  }

  // 1ラウンドの目安時間(分)からEXPを算出。要件書の例（10分ラウンド→+10EXP）をそのまま一般化。
  function roundExp(round) {
    return Math.max(1, Math.round(round.targetMinutes));
  }

  function getProgress(entry, goalText) {
    return (entry.questProgress || {})[goalText] || null;
  }

  // ラウンド分解フォームからの保存。既存の分解を上書きする（開始前の再編集のみを想定）。
  function saveRounds(entry, goalText, rounds) {
    const cleaned = rounds
      .map((r) => ({
        title: (r.title || "").trim(),
        targetMinutes: Math.max(1, Number(r.targetMinutes) || 1),
      }))
      .filter((r) => r.title !== "")
      .slice(0, MAX_ROUNDS);
    if (cleaned.length < MIN_ROUNDS) return null;

    if (!entry.questProgress) entry.questProgress = {};
    entry.questProgress[goalText] = {
      rounds: cleaned.map((r) => ({
        id: genId(),
        title: r.title,
        targetMinutes: r.targetMinutes,
        status: "pending",
        elapsedSeconds: 0,
        partialExpAwarded: 0,
      })),
      status: "planned",
      startExpAwarded: false,
      totalExpAwarded: 0,
    };
    window.App.persist();
    return entry.questProgress[goalText];
  }

  // EXP付与を一箇所に集約：キャラクターへの加算に加え、その日のexpGainedにも合算する
  // （履歴タブ・宿屋の「本日の獲得EXP」表示と食い違わないように）。
  function awardExp(state, entry, progress, amount) {
    if (amount <= 0) return false;
    entry.expGained = (entry.expGained || 0) + amount;
    progress.totalExpAwarded = (progress.totalExpAwarded || 0) + amount;
    const leveledUp = window.App.addExp(amount);
    window.App.persist();
    window.App.rerenderSidebar();
    return leveledUp;
  }

  function getCurrentRound(state) {
    const session = state.focus.session;
    if (!session) return null;
    const entry = window.App.getEntryForDate(session.date);
    if (!entry) return null;
    const progress = getProgress(entry, session.goalText);
    if (!progress) return null;
    return progress.rounds[session.roundIndex] || null;
  }

  // 実行中セッションのラウンド経過秒数（再生中は現在時刻までの分を加算して返す）。
  function getElapsedSeconds(state) {
    const session = state.focus.session;
    const round = getCurrentRound(state);
    if (!session || !round) return 0;
    let sec = round.elapsedSeconds || 0;
    if (session.roundStartedAt) {
      sec += (Date.now() - session.roundStartedAt) / 1000;
    }
    return sec;
  }

  // 現在時刻までの経過分をラウンドに確定し、タイマーを止める（一時停止・中断・完了の共通処理）。
  function freezeElapsed(state) {
    const session = state.focus.session;
    const round = getCurrentRound(state);
    if (!session || !round || !session.roundStartedAt) return;
    round.elapsedSeconds = (round.elapsedSeconds || 0) + (Date.now() - session.roundStartedAt) / 1000;
    session.roundStartedAt = null;
  }

  // クエストに挑戦開始（初回は+5EXP）。既に同じクエストのセッションが有効ならそれを返す。
  // 別クエストのセッションが動いたままだった場合は、切り替える前にその経過時間を確定させておく
  // （進行中のラウンドの記録を失わないため）。
  function enterSession(state, entry, goalText, questType) {
    const existing = state.focus.session;
    if (existing && existing.date === entry.date && existing.goalText === goalText) {
      return existing;
    }
    if (existing) freezeElapsed(state);

    const progress = getProgress(entry, goalText);
    if (!progress) return null;

    if (!progress.startExpAwarded) {
      awardExp(state, entry, progress, START_EXP);
      progress.startExpAwarded = true;
    }
    progress.status = "active";

    const firstPendingIdx = progress.rounds.findIndex((r) => r.status !== "done");
    state.focus.session = {
      date: entry.date,
      goalText,
      questType,
      roundIndex: firstPendingIdx === -1 ? progress.rounds.length - 1 : firstPendingIdx,
      roundStartedAt: Date.now(),
    };
    window.App.persist();
    return state.focus.session;
  }

  // チェックポイント/一時停止画面から、現在ラウンドのタイマーを再始動する。
  function startRoundClock(state) {
    const session = state.focus.session;
    if (!session) return;
    session.roundStartedAt = Date.now();
    window.App.persist();
  }

  // 「一時中断する」：経過時間比でその時点までのEXPを確定付与し、タイマーを止める。
  // 戻り値のowedExpは今回新たに確定した分（UI表示用）。
  function interruptRound(state) {
    const session = state.focus.session;
    const round = getCurrentRound(state);
    if (!session || !round) return { owedExp: 0 };
    const entry = window.App.getEntryForDate(session.date);
    const progress = getProgress(entry, session.goalText);

    freezeElapsed(state);
    const exp = roundExp(round);
    const targetSeconds = round.targetMinutes * 60;
    const ratio = targetSeconds > 0 ? Math.min(1, round.elapsedSeconds / targetSeconds) : 0;
    const confirmed = Math.round(exp * ratio);
    const owedExp = Math.max(0, confirmed - (round.partialExpAwarded || 0));
    let leveledUp = false;
    if (owedExp > 0) {
      round.partialExpAwarded = (round.partialExpAwarded || 0) + owedExp;
      leveledUp = awardExp(state, entry, progress, owedExp);
    } else {
      window.App.persist();
    }
    return { owedExp, elapsedSeconds: round.elapsedSeconds, targetSeconds, leveledUp };
  }

  // 中断画面から「宿屋にもどる」：セッションだけ終了する。ラウンドの進捗・確定済みEXPはそのまま残り、
  // 次に「出撃する」を選んだときに同じラウンドの続きから再開できる。
  function abandonSession(state) {
    state.focus.session = null;
    window.App.persist();
  }

  // 「ラウンド完了」：残りEXPを満額付与し、次のラウンドへ進む。最終ラウンドならクエスト完了。
  function completeRound(state) {
    const session = state.focus.session;
    const round = getCurrentRound(state);
    if (!session || !round) return null;
    const entry = window.App.getEntryForDate(session.date);
    const progress = getProgress(entry, session.goalText);

    freezeElapsed(state);
    const exp = roundExp(round);
    const owedExp = Math.max(0, exp - (round.partialExpAwarded || 0));
    round.status = "done";
    round.partialExpAwarded = exp;
    const leveledUp = owedExp > 0 ? awardExp(state, entry, progress, owedExp) : false;

    const isLast = !progress.rounds.some((r) => r.status !== "done");
    if (isLast) {
      const totalExp = finishQuest(state, entry, session.goalText);
      return { owedExp, isLast: true, totalExp, leveledUp };
    }

    session.roundIndex = progress.rounds.findIndex((r) => r.status !== "done");
    session.roundStartedAt = null; // 次のラウンドはチェックポイント画面で「次へ」を押すまで停止
    window.App.persist();
    return { owedExp, isLast: false, leveledUp };
  }

  // 全ラウンド完了：クエストを完了扱いにする。①活動記録タブからは消さず、
  // 「クリア済み」として表示され続ける（EXPは既にラウンドで加算済みなので、
  // ①側の行EXPには二重に計上しない＝saveLog側でquestProgress.status==="done"の行を除外する）。
  function finishQuest(state, entry, goalText) {
    const progress = getProgress(entry, goalText);
    if (progress) progress.status = "done";
    state.focus.session = null;

    window.App.persist();
    window.App.rerenderSidebar();
    return progress ? progress.totalExpAwarded : 0;
  }

  window.FocusMode = {
    MIN_ROUNDS,
    MAX_ROUNDS,
    START_EXP,
    roundExp,
    getProgress,
    saveRounds,
    enterSession,
    startRoundClock,
    getCurrentRound,
    getElapsedSeconds,
    interruptRound,
    abandonSession,
    completeRound,
  };
})();
