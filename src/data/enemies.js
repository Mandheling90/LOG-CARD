export const ENEMIES = [
  {
    id: "bandit",
    name: "산적",
    emoji: "🗡️",
    hp: 24,
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
    hp: 32,
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
      {
        type: "attack",
        damage: 9,
        debuff: { name: "독", duration: 3, poisonDamage: 3 },
        label: "독비도",
        log: "독공술사가 독 묻은 비도를 날린다!",
      },
      {
        type: "debuff_vulnerable",
        name: "연막",
        duration: 1,
        drawReduction: 1,
        log: "독공술사가 연막을 뿌린다!",
      },
      {
        type: "attack",
        damage: 6,
        debuff: { name: "마비", duration: 1, energyReduction: 1 },
        label: "마비독",
        log: "독공술사가 마비독을 뿌린다!",
      },
    ],
  },
  {
    id: "dark_elder",
    name: "마교 장로",
    emoji: "👹",
    hp: 65,
    actions: [
      {
        type: "attack",
        damage: 12,
        label: "흑암장",
        log: "마교 장로가 검은 장력을 내뿜는다!",
      },
      {
        type: "buff_strength",
        value: 2,
        block: 8,
        log: "마교 장로가 마공을 운용한다.",
      },
      {
        type: "attack",
        damage: 15,
        stripBlock: 0.5,
        label: "침식마공",
        log: "마교 장로의 마공이 호신강기를 갉아먹는다!",
      },
      {
        type: "rage",
        damage: 5,
        hits: 3,
        strengthGain: 1,
        label: "혈살장",
        log: "마교 장로가 피빛 장력을 연달아 날린다!",
      },
      {
        type: "heal",
        value: 10,
        block: 0,
        log: "마교 장로가 사혈공으로 내공을 축적한다.",
      },
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
              damage: 10,
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
      {
        ...createEnemy({
          id: "sword_ghost",
          name: "멸마검귀 강천",
          emoji: "⚔️",
          hp: 180,
          actions: [
            {
              type: "attack",
              damage: 10,
              label: "멸마검 - 일식",
              log: "검귀가 검을 천천히 뽑아든다.",
            },
            {
              type: "attack",
              damage: 14,
              label: "멸마검 - 이식",
              log: "검귀의 검이 빨라진다!",
            },
            {
              type: "attack",
              damage: 18,
              hits: 2,
              label: "멸마검 - 삼식",
              log: "검귀의 검기가 공간을 가른다!",
            },
            {
              type: "attack",
              damage: 28,
              label: "멸마검 - 사절",
              log: "멸마검귀가 전력을 다해 검을 내려친다!",
            },
            {
              type: "exhaustion",
              log: "멸마검귀가 힘이 빠져 무릎을 꿇는다...",
            },
          ],
        }),
        bossId: "sword_ghost",
        bossPhase: 1,
        exhaustionMissCount: 0,
        phase2: {
          name: "복마검선 강천",
          emoji: "🌊",
          hp: 200,
          actions: [
            {
              type: "attack",
              damage: 12,
              label: "복마검 - 일식",
              log: "강천이 검을 뽑아든다.",
            },
            {
              type: "attack",
              damage: 14,
              label: "복마검 - 이식",
              log: "강천의 검이 빨라진다!",
            },
            {
              type: "rage",
              damage: 7,
              hits: 3,
              strengthGain: 1,
              label: "복마검 - 삼연식",
              log: "강천의 검이 세 번 연속으로 번개처럼 내리친다!",
            },
            {
              type: "heal",
              value: 10,
              block: 10,
              log: '"..." 강천이 잠시 검을 거두고 숨을 고른다.',
            },
            {
              type: "attack",
              damage: 26,
              stripBlock: 0.5,
              label: "복마검 - 파사현정",
              log: "사(邪)를 깨고 정(正)을 드러낸다! 강천의 검이 호신강기를 뚫는다!",
            },
            {
              type: "buff_strength",
              value: 2,
              block: 8,
              log: "강천이 검을 세워 경의를 표한다. 흥미롭지 않나? 살의를 거둘 때 강해지는 검이라니",
            },
          ],
        },
      },
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
