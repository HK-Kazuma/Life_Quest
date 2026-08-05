// 称号：努力の成果を視覚化するための実績一覧。
// レベル/継続ストリーク(最長記録)/チャレンジクエスト(世界樹の目標を100%達成した数)の
// 3系統×10段階。状態は保存せず、既存データから毎回計算する（記録が下がっても称号は失われない）。
// チャレンジクエストは冒険の書に記録するメイン/サブ/デイリークエストとは別物で、
// 世界樹に設定した長期目標のこと。
(function () {
  const CATEGORIES = [
    { key: "level", label: "レベル称号", reqLabel: (n) => `Lv.${n}` },
    { key: "streak", label: "継続ストリーク称号", reqLabel: (n) => `${n}日` },
    { key: "quest", label: "チャレンジクエスト称号", reqLabel: (n) => `${n}回` },
  ];

  const TITLES = [
    { category: "level", threshold: 1, name: "駆け出し冒険者", flavor: "旅の始まり" },
    { category: "level", threshold: 5, name: "見習い挑戦者", flavor: "継続できるようになった" },
    { category: "level", threshold: 10, name: "成長する探究者", flavor: "学ぶ習慣がついた" },
    { category: "level", threshold: 20, name: "熟練の修行者", flavor: "努力が当たり前になる" },
    { category: "level", threshold: 35, name: "知識の開拓者", flavor: "新しい分野へ挑戦" },
    { category: "level", threshold: 50, name: "一流の実践者", flavor: "行動で成果を出せる" },
    { category: "level", threshold: 70, name: "道を極めし者", flavor: "高い継続力" },
    { category: "level", threshold: 100, name: "英雄", flavor: "大きな節目" },
    { category: "level", threshold: 150, name: "伝説の探究者", flavor: "多くの経験を積む" },
    { category: "level", threshold: 200, name: "神話の冒険者", flavor: "最終クラスの称号" },

    { category: "streak", threshold: 3, name: "火種", flavor: "習慣が生まれ始める" },
    { category: "streak", threshold: 7, name: "習慣の芽", flavor: "1週間達成" },
    { category: "streak", threshold: 14, name: "不屈の新人", flavor: "継続が安定" },
    { category: "streak", threshold: 30, name: "継続の達人", flavor: "1か月継続" },
    { category: "streak", threshold: 50, name: "意志の剣士", flavor: "意志が強い" },
    { category: "streak", threshold: 100, name: "鋼の精神", flavor: "100日突破" },
    { category: "streak", threshold: 180, name: "止まらぬ旅人", flavor: "半年間継続" },
    { category: "streak", threshold: 365, name: "一年の覇者", flavor: "1年間毎日" },
    { category: "streak", threshold: 730, name: "時を超える冒険者", flavor: "2年間継続" },
    { category: "streak", threshold: 1000, name: "永遠の探究者", flavor: "継続の象徴" },

    { category: "quest", threshold: 1, name: "初陣突破", flavor: "最初の達成" },
    { category: "quest", threshold: 3, name: "挑戦者", flavor: "成功体験が増える" },
    { category: "quest", threshold: 5, name: "試練の踏破者", flavor: "継続して成果を出す" },
    { category: "quest", threshold: 10, name: "クエストハンター", flavor: "達成が習慣化" },
    { category: "quest", threshold: 20, name: "栄光の収集家", flavor: "多くの目標を達成" },
    { category: "quest", threshold: 35, name: "偉業の探究者", flavor: "難しい目標にも挑む" },
    { category: "quest", threshold: 50, name: "英知の冒険者", flavor: "知識と経験が豊富" },
    { category: "quest", threshold: 75, name: "夢の実現者", flavor: "大きな夢を叶える" },
    { category: "quest", threshold: 100, name: "伝説の達成者", flavor: "圧倒的な実績" },
    { category: "quest", threshold: 150, name: "運命を切り拓く者", flavor: "最高峰の称号" },
  ];

  // チャレンジクエストクリア数 = 世界樹に設定した目標(チャレンジクエスト)が100%達成された数。
  function getQuestClearCount(state) {
    if (!state.worldTree || !window.WorldTree) return 0;
    return state.worldTree.goals.filter((g) => window.WorldTree.progress(g).complete).length;
  }

  function getProgressValue(state, category) {
    if (category === "level") return state.character.level;
    if (category === "streak") return state.character.longestStreak || 0;
    if (category === "quest") return getQuestClearCount(state);
    return 0;
  }

  function getTitlesByCategory(state) {
    return CATEGORIES.map((cat) => {
      const currentValue = getProgressValue(state, cat.key);
      const titles = TITLES.filter((t) => t.category === cat.key).map((t) => ({
        ...t,
        unlocked: currentValue >= t.threshold,
      }));
      return { ...cat, currentValue, titles };
    });
  }

  window.Titles = { CATEGORIES, TITLES, getQuestClearCount, getTitlesByCategory };
})();
