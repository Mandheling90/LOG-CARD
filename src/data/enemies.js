export const ENEMIES = [
  {
    id: "bandit",
    name: "산적",
    emoji: "🗡️",
    hp: 30,
    actions: [
      { type: "attack", damage: 5 },
      { type: "attack", damage: 8 },
      { type: "defend", block: 4 },
    ],
  },
  {
    id: "dark_disciple",
    name: "사파 제자",
    emoji: "👤",
    hp: 40,
    actions: [
      { type: "attack", damage: 7 },
      { type: "attack", damage: 10 },
      { type: "defend", block: 6 },
    ],
  },
  {
    id: "poison_master",
    name: "독공술사",
    emoji: "🐍",
    hp: 50,
    actions: [
      { type: "attack", damage: 9 },
      { type: "attack", damage: 6 },
      { type: "attack", damage: 12 },
    ],
  },
  {
    id: "dark_elder",
    name: "마교 장로",
    emoji: "👹",
    hp: 65,
    actions: [
      { type: "attack", damage: 12 },
      { type: "attack", damage: 15 },
      { type: "defend", block: 8 },
    ],
  },
  {
    id: "demon_lord",
    name: "천마",
    emoji: "😈",
    hp: 100,
    actions: [
      { type: "attack", damage: 18 },
      { type: "attack", damage: 12 },
      { type: "attack", damage: 25 },
      { type: "defend", block: 10 },
    ],
  },
];

let enemyUidCounter = 0;

function createEnemy(template) {
  return {
    ...template,
    block: 0,
    debuffs: [],
    uid: `enemy_${enemyUidCounter++}`,
  };
}

export function getDebugEnemies() {
  const pool = [...ENEMIES];
  const picked = [];
  for (let i = 0; i < 3 && pool.length > 0; i++) {
    const idx = Math.floor(Math.random() * pool.length);
    picked.push(createEnemy(pool.splice(idx, 1)[0]));
  }
  return picked;
}

export function getBossForChapter(chapter) {
  if (chapter === 1) {
    return [
      {
        ...createEnemy({
          id: "wisungae",
          name: "위선개 장홍",
          emoji: "🧎",
          hp: 120,
          actions: [
            { type: "attack", damage: 8 },
            { type: "defend", block: 12 },
            { type: "attack", damage: 10 },
            { type: "attack", damage: 6 },
            { type: "begging" },
          ],
        }),
        bossId: "wisungae",
        bossPhase: 1,
        sihyeCount: 0,
        phase2: {
          name: "오탁룡 장홍",
          emoji: "🐉",
          hp: 150,
          actions: [
            { type: "attack", damage: 14, label: "타구봉법" },
            { type: "attack", damage: 10 },
            { type: "attack", damage: 24, label: "항룡십팔장" },
            { type: "defend", block: 15 },
            { type: "attack", damage: 18, label: "타구봉법" },
          ],
        },
      },
    ];
  }
  if (chapter === 2) {
    return [
      createEnemy({
        id: "demon_lord_boss",
        name: "천마",
        emoji: "😈",
        hp: 200,
        actions: [
          { type: "attack", damage: 18 },
          { type: "attack", damage: 12 },
          { type: "attack", damage: 25 },
          { type: "defend", block: 15 },
          { type: "attack", damage: 20 },
        ],
      }),
    ];
  }
  return null;
}

export function getEnemiesForFloor(floor) {
  if (floor <= 1) return [createEnemy(ENEMIES[0])];
  if (floor <= 2) return [createEnemy(ENEMIES[0]), createEnemy(ENEMIES[0])];
  if (floor <= 4) {
    const pool = ENEMIES.slice(0, 2);
    return Array.from({ length: 2 }, () =>
      createEnemy(pool[Math.floor(Math.random() * pool.length)]),
    );
  }
  if (floor <= 6) {
    const pool = ENEMIES.slice(1, 3);
    return Array.from({ length: Math.random() < 0.5 ? 2 : 3 }, () =>
      createEnemy(pool[Math.floor(Math.random() * pool.length)]),
    );
  }
  if (floor <= 9) {
    const pool = ENEMIES.slice(2, 4);
    return Array.from({ length: Math.random() < 0.5 ? 2 : 3 }, () =>
      createEnemy(pool[Math.floor(Math.random() * pool.length)]),
    );
  }
  return [createEnemy(ENEMIES[4])];
}
