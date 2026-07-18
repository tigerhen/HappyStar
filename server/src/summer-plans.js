export const SUMMER_GROWTH_PLANS = [
  {
    id: "gp_summer_2026_haolin", childId: "haolin", name: "2026年暑假成长计划",
    startDate: "2026-07-01", endDate: "2026-08-31", status: "active", targetPoints: 500,
    groups: [
      { id: "h_math", name: "数学", emoji: "➗", items: [
        { id: "h_math_book", name: "数学暑假作业", unit: "份", target: 42, completed: 0, weight: 1, optional: false },
        { id: "h_math_oral", name: "口算打卡", unit: "次", target: 42, completed: 0, weight: 0.5, optional: false },
      ]},
      { id: "h_chinese", name: "语文", emoji: "📖", items: [
        { id: "h_copybook", name: "童趣一夏·字帖", unit: "次", target: 32, completed: 0, weight: 0.5, optional: false },
        { id: "h_recite", name: "童趣一夏·诵读古今", unit: "篇", target: 16, completed: 0, weight: 1, optional: false },
        { id: "h_composition", name: "童趣一夏·主题作文", unit: "篇", target: 3, completed: 0, weight: 4, optional: false, scheduleMode: "deadline" },
        { id: "h_reading", name: "每周阅读训练", unit: "篇", target: 24, completed: 0, weight: 1, optional: false },
      ]},
      { id: "h_english", name: "英语", emoji: "🔤", items: [
        { id: "h_textbooks", name: "三、四年级课本背诵默写", unit: "册", target: 4, completed: 0, weight: 4, optional: false },
        { id: "h_preview", name: "五上前三单元预习", unit: "单元", target: 3, completed: 0, weight: 4, optional: false },
        { id: "h_preview_book", name: "《预习知新》第15-32天", unit: "天", target: 18, completed: 0, weight: 1, optional: false },
        { id: "h_english_read", name: "阅读理解或完形填空", unit: "篇", target: 42, completed: 0, weight: 1, optional: false },
        { id: "h_movie", name: "观看一部英语电影", unit: "遍", target: 3, completed: 0, weight: 2, optional: false, scheduleMode: "deadline" },
      ]},
    ],
    deliverables: [
      { id: "h_d_composition", name: "主题作文3篇", done: false },
      { id: "h_d_reading", name: "阅读训练24篇", done: false },
      { id: "h_d_english", name: "英语预习作业", done: false },
      { id: "h_d_review", name: "全部作业家长检查", done: false },
    ],
  },
  {
    id: "gp_summer_2026_zhongxian", childId: "zhongxian", name: "2026年暑假成长计划",
    startDate: "2026-07-01", endDate: "2026-08-31", status: "active", targetPoints: 500,
    groups: [
      { id: "z_chinese", name: "语文", emoji: "📖", items: [
        { id: "z_short_read", name: "阅读短文并摘抄", unit: "篇", target: 16, completed: 0, weight: 1, optional: false },
        { id: "z_crab", name: "《孤独的小螃蟹》阅读与导读单", unit: "阶段", target: 6, completed: 0, weight: 2, optional: false, startDate: "2026-07-04", endDate: "2026-07-24", scheduleMode: "uniform" },
        { id: "z_cat", name: "《一只想飞的猫》阅读与导读单", unit: "阶段", target: 6, completed: 0, weight: 2, optional: false, startDate: "2026-08-01", endDate: "2026-08-20", scheduleMode: "uniform" },
        { id: "z_handwriting", name: "每日练字", unit: "天", target: 42, completed: 0, weight: 0.5, optional: false },
      ]},
      { id: "z_math", name: "数学", emoji: "➗", items: [
        { id: "z_math_practice", name: "薄弱项专项练习", unit: "天", target: 42, completed: 0, weight: 1, optional: false },
        { id: "z_body_ruler", name: "实践作业·认识身体尺", unit: "阶段", target: 3, completed: 0, weight: 2, optional: false, scheduleMode: "deadline" },
        { id: "z_math_read", name: "数学阅读", unit: "项", target: 1, completed: 0, weight: 2, optional: false, scheduleMode: "deadline" },
      ]},
      { id: "z_english", name: "英语", emoji: "🔤", items: [
        { id: "z_letters", name: "26个字母操唱跳练习", unit: "次", target: 42, completed: 0, weight: 0.5, optional: false },
        { id: "z_picture_book_1", name: "英语绘本朗读·第1本", unit: "本", target: 1, completed: 0, weight: 3, optional: false, scheduleMode: "deadline" },
        { id: "z_picture_book_2", name: "英语绘本朗读·第2本", unit: "本", target: 1, completed: 0, weight: 3, optional: true, scheduleMode: "deadline" },
      ]},
      { id: "z_practice", name: "实践与体育", emoji: "🏃", items: [
        { id: "z_art", name: "参观美术展并合影", unit: "次", target: 1, completed: 0, weight: 2, optional: false, scheduleMode: "deadline" },
        { id: "z_rope", name: "跳绳", unit: "次", target: 24, completed: 0, weight: 0.5, optional: false },
        { id: "z_outdoor", name: "全家户外探索", unit: "次", target: 1, completed: 0, weight: 2, optional: false, scheduleMode: "deadline" },
        { id: "z_match", name: "观看一场世界杯比赛", unit: "场", target: 1, completed: 0, weight: 1, optional: false, scheduleMode: "deadline" },
      ]},
    ],
    deliverables: [
      { id: "z_d_excerpt", name: "摘抄本", done: false },
      { id: "z_d_short_read", name: "阅读短文16篇", done: false },
      { id: "z_d_guides", name: "两本书的导读单", done: false },
      { id: "z_d_copybook", name: "字帖", done: false },
    ],
  },
];
