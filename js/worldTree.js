// 世界樹：長期目標データの管理。冒険の書の①目標(今日の目標)とは別の、
// 「大きな目標→逆算した小さな目標(3つ以上)」を1本のルートとして持つ。
// マイルストーンは根本から順に1つずつ開放していく（順番を飛ばして完了にはできない）。
(function () {
  const MIN_MILESTONES = 3;

  const STAGES = [
    { min: 0, max: 0, label: "苗木" },
    { min: 1, max: 24, label: "少し成長した苗木" },
    { min: 25, max: 49, label: "苗木から育った小さな木" },
    { min: 50, max: 74, label: "葉が茂ってきた木" },
    { min: 75, max: 99, label: "根が太くなった大木" },
    { min: 100, max: 100, label: "満開の世界樹" },
  ];

  function genId(prefix) {
    return prefix + "_" + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
  }

  function getGoals(state) {
    return state.worldTree.goals;
  }

  function getGoal(state, goalId) {
    return state.worldTree.goals.find((g) => g.id === goalId);
  }

  function createGoal(state, title, milestoneTitles) {
    const cleanTitles = milestoneTitles.map((t) => t.trim()).filter((t) => t);
    if (!title.trim() || cleanTitles.length < MIN_MILESTONES) return null;
    const goal = {
      id: genId("wtg"),
      title: title.trim(),
      createdAt: new Date().toISOString(),
      milestones: cleanTitles.map((t) => ({
        id: genId("wtm"),
        title: t,
        done: false,
        completedAt: null,
      })),
    };
    state.worldTree.goals.push(goal);
    return goal;
  }

  function deleteGoal(state, goalId) {
    state.worldTree.goals = state.worldTree.goals.filter((g) => g.id !== goalId);
  }

  function addMilestone(goal, title) {
    const clean = title.trim();
    if (!clean) return null;
    const milestone = { id: genId("wtm"), title: clean, done: false, completedAt: null };
    goal.milestones.push(milestone);
    return milestone;
  }

  function progress(goal) {
    const total = goal.milestones.length;
    const done = goal.milestones.filter((m) => m.done).length;
    const percent = total === 0 ? 0 : Math.round((done / total) * 100);
    return { done, total, percent, complete: total > 0 && done === total };
  }

  function stageFor(percent) {
    return STAGES.find((s) => percent >= s.min && percent <= s.max) || STAGES[0];
  }

  // 次に着手可能な（＝根本から順に見て最初の未完了）マイルストーンのインデックス。全完了なら-1。
  function nextIndex(goal) {
    return goal.milestones.findIndex((m) => !m.done);
  }

  // 最後に完了したマイルストーンのインデックス（取り消し対象）。無ければ-1。
  function lastDoneIndex(goal) {
    for (let i = goal.milestones.length - 1; i >= 0; i--) {
      if (goal.milestones[i].done) return i;
    }
    return -1;
  }

  // 根本から順番通りにしか完了・取り消しができないようにする。
  function toggleMilestone(goal, milestoneId) {
    const idx = goal.milestones.findIndex((m) => m.id === milestoneId);
    if (idx === -1) return false;
    const m = goal.milestones[idx];
    if (!m.done) {
      if (idx !== nextIndex(goal)) return false;
      m.done = true;
      m.completedAt = new Date().toISOString();
    } else {
      if (idx !== lastDoneIndex(goal)) return false;
      m.done = false;
      m.completedAt = null;
    }
    return true;
  }

  window.WorldTree = {
    MIN_MILESTONES,
    STAGES,
    getGoals,
    getGoal,
    createGoal,
    deleteGoal,
    addMilestone,
    progress,
    stageFor,
    nextIndex,
    lastDoneIndex,
    toggleMilestone,
  };
})();
