// アーティストデート図鑑：データ定義とCRUD。
// アーティストデートは「行くこと自体が目的」で成果を求めないため、EXPやストリークとは連動させない。
// アイコンは絵文字をカテゴリ分けして提供し、画像素材を用意しなくても済むようにしている。
(function () {
  const ICON_CATEGORIES = [
    {
      id: "childhood",
      label: "子どもの頃の夢",
      icons: ["🚀", "✈️", "🎤", "⚽", "🎻", "🚒", "👑", "🦸"],
    },
    {
      id: "nostalgia",
      label: "なつかしい場所",
      icons: ["🏫", "🏠", "🎡", "🍡", "🛝", "📺", "🧸", "🚲"],
    },
    {
      id: "unknown",
      label: "未知への冒険",
      icons: ["🧭", "🗺️", "🚪", "🎫", "🛶", "🏔️", "🕵️", "🔭"],
    },
    {
      id: "senses",
      label: "五感を刺激する",
      icons: ["🎨", "🎶", "🍽️", "🌿", "🖼️", "🎭", "🍶", "🌸"],
    },
    {
      id: "learning",
      label: "学び・つくる",
      icons: ["📚", "🛠️", "🧵", "🧑‍🍳", "🧪", "🖌️", "📷", "🪴"],
    },
    {
      id: "shopping",
      label: "お店をめぐる",
      icons: ["🛍️", "📦", "🕶️", "👗", "📿", "🧦", "🎁", "🛒"],
    },
    {
      id: "body",
      label: "からだを動かす",
      icons: ["🏃", "🧘", "⛳", "🏊", "🎳", "🚴", "🏹", "🥾"],
    },
    {
      id: "other",
      label: "その他",
      icons: ["✨", "🎲", "🌙", "☕", "🎪", "🃏", "🐾", "🌈"
        ,"🧑‍⚖️", "🧑‍🚀", "🧑‍🎨", "🧑‍🔬", "🧑‍🏫", "🧑‍💻", "🧑‍🍳", "🧑‍🎤","🤡"
        ,"🎃","🚙"
      ],
    },
  ];

  function getEntries(state) {
    return state.artistDates.entries;
  }

  // 新しい順に並べた一覧。図鑑の表示に使う。
  function getEntriesSorted(state) {
    return getEntries(state)
      .slice()
      .sort((a, b) => b.createdAt - a.createdAt);
  }

  function findCategoryByIcon(icon) {
    return ICON_CATEGORIES.find((cat) => cat.icons.includes(icon)) || null;
  }

  function addEntry(state, text, icon) {
    const trimmed = text.trim();
    if (!trimmed || !icon) return null;
    const category = findCategoryByIcon(icon);
    const entry = {
      id: "adate_" + Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
      text: trimmed,
      icon,
      categoryId: category ? category.id : "other",
      date: window.App.todayStr(),
      createdAt: Date.now(),
    };
    state.artistDates.entries.push(entry);
    window.App.persist();
    return entry;
  }

  function deleteEntry(state, entryId) {
    state.artistDates.entries = state.artistDates.entries.filter((e) => e.id !== entryId);
    window.App.persist();
  }

  // 登録後でもアイコン・名前・日付を編集できるようにする。
  function updateEntry(state, entryId, { text, icon, date }) {
    const entry = getEntries(state).find((e) => e.id === entryId);
    if (!entry) return null;
    const trimmed = text.trim();
    if (!trimmed || !icon) return null;
    const category = findCategoryByIcon(icon);
    entry.text = trimmed;
    entry.icon = icon;
    entry.categoryId = category ? category.id : "other";
    if (date) entry.date = date;
    window.App.persist();
    return entry;
  }

  window.ArtistDate = {
    ICON_CATEGORIES,
    getEntries,
    getEntriesSorted,
    findCategoryByIcon,
    addEntry,
    updateEntry,
    deleteEntry,
  };
})();
