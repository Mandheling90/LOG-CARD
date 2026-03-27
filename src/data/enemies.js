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
    strength: 0,
    damageReduction: 0,
    damageReductionTurns: 0,
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
            {
              type: "attack",
              damage: 8,
              label: "몽둥이휘두르기",
              log: "장홍이 몽둥이를 휘두른다!",
            },
            {
              type: "heal",
              value: 10,
              block: 8,
              log: "장홍이 술을 벌컥벌컥 들이킨다!",
            },
            {
              type: "attack",
              damage: 10,
              label: "몽둥이휘두르기",
              log: "장홍이 몽둥이를 크게 휘두른다!",
            },
            { type: "begging" },
            {
              type: "rage",
              damage: 5,
              hits: 3,
              strengthGain: 2,
              label: "분노난타",
              log: "장홍이 버럭 화를 내며 몽둥이를 마구 휘두른다!",
            },
            {
              type: "attack",
              damage: 4,
              hits: 3,
              label: "몽둥이난타",
              log: "장홍이 몽둥이를 연달아 휘두른다!",
            },
            {
              type: "heal",
              value: 8,
              block: 6,
              log: "장홍이 술을 한 모금 마신다.",
            },
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
            {
              type: "buff_strength",
              value: 2,
              block: 10,
              log: "구걸은 이제 됐네, 이미 받은 게 많거든 - 장홍이 내공을 운용하며 자세를 잡는다.",
            },
            {
              type: "attack",
              damage: 12,
              label: "타구봉법 - 당두봉갈",
              log: "장홍이 봉을 수직으로 내리찍는다!",
            },
            {
              type: "rage",
              damage: 4,
              hits: 4,
              strengthGain: 1,
              label: "타구봉법 - 봉타쌍견",
              log: "장홍이 봉을 사방으로 마구 휘두른다!",
            },
            {
              type: "heal",
              value: 15,
              block: 12,
              log: "장홍이 호흡을 가다듬으며 기를 모은다.",
            },
            {
              type: "attack",
              damage: 7,
              hits: 2,
              stripBlock: true,
              label: "타구봉법 - 천하무구",
              log: "천하에 개가 없다!",
            },
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
