export const CARD_TYPES = {
  CHOSIK: "chosik",   // 초식 (무공 기술 - 공격/방어)
  SIMBEOP: "simbeop", // 심법 (내공/버프)
  BOBEOP: "bobeop",   // 보법 (신법/이동/유틸)
};

// 초식 내 공/수 구분
export const CARD_NATURE = {
  ATTACK: "attack",   // 공(攻) - 공격 초식
  DEFENSE: "defense",  // 수(守) - 방어 초식
  DUAL: "dual",       // 공수(攻守) - 공수 겸용
};

export const RARITY = {
  COMMON: "common",
  UNCOMMON: "uncommon",
  RARE: "rare",
};

// 카드 대상 지정이 필요한지 판별
export function cardNeedsTarget(card) {
  if (card.effects) {
    return card.effects.some(
      (e) =>
        e.type === "damage" ||
        e.type === "finisher" ||
        (e.type === "stanceSwitch" && e.defenseEffect?.type === "aoe"),
    );
  }
  return false;
}

// switchBonus.direction:
//   'def_to_atk' = 방어→공격 전환 시 발동
//   'atk_to_def' = 공격→방어 전환 시 발동
//   'any'        = 어느 방향이든 전환 시 발동

export const BASE_CARDS = [
  // ===== 기초 카드 =====
  {
    id: "taichi_strike",
    name: "태극검",
    type: CARD_TYPES.CHOSIK,
    nature: CARD_NATURE.ATTACK,
    rarity: RARITY.COMMON,
    cost: 1,
    description: "6 피해. 【전환】 방어→공격 시 50% 회피.",
    effects: [{ type: "damage", value: 6, target: "single" }],
    switchBonus: {
      direction: "def_to_atk",
      effects: [{ type: "evasionChance", value: 50 }],
      label: "태극 흐름! → 50% 회피 준비",
    },
  },
  {
    id: "inner_guard",
    name: "태극 방어",
    type: CARD_TYPES.CHOSIK,
    nature: CARD_NATURE.DEFENSE,
    rarity: RARITY.COMMON,
    cost: 1,
    description: "호신강기 5. 【전환】 공격→방어 시 태극 +1.",
    effects: [{ type: "block", value: 5 }],
    switchBonus: {
      direction: "atk_to_def",
      effects: [{ type: "taeguk", value: 1 }],
      label: "공수전환! → 태극 +1",
    },
  },
  {
    id: "cloud_step",
    name: "유운보",
    type: CARD_TYPES.BOBEOP,
    rarity: RARITY.COMMON,
    cost: 0,
    description: "공격 1회 회피. 카드 1장 뽑기.",
    effects: [
      { type: "evasionCount", value: 1 },
      { type: "draw", value: 1 },
    ],
  },
  // ===== 중급 카드 =====
  {
    id: "gather_qi",
    name: "운수행공",
    type: CARD_TYPES.SIMBEOP,
    rarity: RARITY.UNCOMMON,
    cost: 1,
    description:
      "태극 +2. 다음 턴 태극 +1. 【전환】 공격→방어 시 태극 +1 추가.",
    effects: [
      { type: "taeguk", value: 2 },
      { type: "taegukNextTurn", value: 1 },
    ],
    switchBonus: {
      direction: "atk_to_def",
      effects: [{ type: "taeguk", value: 1 }],
      label: "기세 전환! → 태극 +1 추가",
    },
  },
  {
    id: "taichi_counter",
    name: "태극검법 - 반격",
    type: CARD_TYPES.CHOSIK,
    nature: CARD_NATURE.DEFENSE,
    rarity: RARITY.UNCOMMON,
    cost: 2,
    description: "피격 시 8 반사. 【전환】 공격→방어 시 호신강기 +4.",
    effects: [{ type: "counter", value: 8 }],
    switchBonus: {
      direction: "atk_to_def",
      effects: [{ type: "block", value: 4 }],
      label: "공수전환! → 호신강기 +4",
    },
  },
  {
    id: "yin_yang_switch",
    name: "음양전환",
    type: CARD_TYPES.CHOSIK,
    nature: CARD_NATURE.DUAL,
    rarity: RARITY.UNCOMMON,
    cost: 1,
    description: "공격 자세 → 호신강기 12. 방어 자세 → 적 전체 10 피해.",
    effects: [
      {
        type: "stanceSwitch",
        attackEffect: { type: "block", value: 12 },
        defenseEffect: { type: "aoe", value: 10 },
      },
    ],
  },
  {
    id: "qi_explosion",
    name: "진기폭발",
    type: CARD_TYPES.CHOSIK,
    nature: CARD_NATURE.ATTACK,
    rarity: RARITY.RARE,
    cost: 2,
    description: "태극 전부 소모, 태극×5 피해. 【전환】 방어→공격 시 ×7.",
    effects: [{ type: "finisher", multiplier: 5 }],
    switchBonus: {
      direction: "def_to_atk",
      effects: [{ type: "finisherUpgrade", multiplier: 7 }],
      label: "축적 폭발! → 배율 ×7!",
    },
  },
  // ===== 신규 중급 카드 =====
  {
    id: "flow_trigger",
    name: "태극유도",
    type: CARD_TYPES.SIMBEOP,
    rarity: RARITY.UNCOMMON,
    cost: 1,
    description: "즉시 자세 전환. 카드 1장 뽑기. 태극 +1.",
    effects: [
      { type: "forceSwitch" },
      { type: "draw", value: 1 },
      { type: "taeguk", value: 1 },
    ],
  },
  {
    id: "reflect_field",
    name: "태극반진",
    type: CARD_TYPES.CHOSIK,
    nature: CARD_NATURE.DEFENSE,
    rarity: RARITY.UNCOMMON,
    cost: 2,
    description: "현재 호신강기의 50%를 적 전체에 피해.",
    effects: [
      { type: "blockToDamage", ratio: 0.5 },
    ],
  },
  {
    id: "cloud_counter",
    name: "유운반격",
    type: CARD_TYPES.BOBEOP,
    rarity: RARITY.UNCOMMON,
    cost: 1,
    description: "카드 1장 뽑기. 이번 턴 회피 시 10 피해.",
    effects: [
      { type: "draw", value: 1 },
      { type: "buff", buffId: "cloud_counter", name: "유운반격", duration: 1, onEvade: { damage: 10 } },
    ],
  },
  // ===== 신규 고급 카드 =====
  {
    id: "yin_yang_chain",
    name: "음양연환",
    type: CARD_TYPES.CHOSIK,
    nature: CARD_NATURE.DUAL,
    rarity: RARITY.RARE,
    cost: 2,
    description: "즉시 자세 전환. 3턴간 전환 시 적 전체 6 피해.",
    effects: [
      { type: "forceSwitch" },
      { type: "buff", buffId: "yin_yang_chain", name: "음양연환", duration: 3, perSwitch: { aoeDamage: 6 } },
    ],
  },
  {
    id: "reverse_qi",
    name: "천지동수",
    type: CARD_TYPES.SIMBEOP,
    rarity: RARITY.RARE,
    cost: 0,
    description: "태극 전부 소모, 소모량만큼 카드 뽑기. 자해 10.",
    effects: [
      { type: "consumeTaegukDraw", ratio: 1 },
      { type: "selfDamage", value: 10 },
    ],
  },
  {
    id: "taeguk_insight",
    name: "태극심안",
    type: CARD_TYPES.SIMBEOP,
    rarity: RARITY.RARE,
    cost: 2,
    description: "3턴간 공력 +(태극÷2). 태극 유지.",
    effects: [
      { type: "taegukStrength", duration: 3 },
    ],
  },
  // ===== 고급 카드 =====
  {
    id: "taichi_field",
    name: "태극진",
    type: CARD_TYPES.SIMBEOP,
    rarity: RARITY.RARE,
    cost: 3,
    description: "3턴 호신강기+8, 자동반격 5. 【전환】 시 즉시 호신강기 +6.",
    effects: [
      {
        type: "buff",
        buffId: "taichi_field",
        name: "태극진",
        duration: 3,
        perTurn: { block: 8, counter: 5 },
      },
    ],
    switchBonus: {
      direction: "any",
      effects: [{ type: "block", value: 6 }],
      label: "진법 공명! → 호신강기 +6",
    },
  },
  {
    id: "wuji_mind",
    name: "무극심법",
    type: CARD_TYPES.SIMBEOP,
    rarity: RARITY.RARE,
    cost: 2,
    description: "3턴 태극 획득 2배, 피해+20%. 【전환】 시 태극 +2.",
    effects: [
      {
        type: "buff",
        buffId: "wuji_mind",
        name: "무극심법",
        duration: 3,
        taegukMultiplier: 2,
        damageReceiveMultiplier: 1.2,
      },
    ],
    switchBonus: {
      direction: "any",
      effects: [{ type: "taeguk", value: 2 }],
      label: "무극 순환! → 태극 +2",
    },
  },
  {
    id: "void_sword",
    name: "태허검기",
    type: CARD_TYPES.CHOSIK,
    nature: CARD_NATURE.ATTACK,
    rarity: RARITY.RARE,
    cost: 2,
    description:
      "전체 12 피해. 태극5↑ 2배. 【전환】 방어→공격 시 태극 조건 3으로 완화.",
    effects: [
      { type: "aoe", value: 12, taegukThreshold: 5, bonusMultiplier: 2 },
    ],
    switchBonus: {
      direction: "def_to_atk",
      effects: [{ type: "aoeThresholdReduce", newThreshold: 3 }],
      label: "검기 응축! → 태극 3 이상 시 2배!",
    },
  },
];

export const DEBUG_CARD = {
  id: "debug_kill",
  name: "천지멸살",
  type: CARD_TYPES.CHOSIK,
  nature: CARD_NATURE.ATTACK,
  rarity: RARITY.RARE,
  cost: 0,
  description: "[디버그] 모든 적을 즉사시킨다.",
  effects: [{ type: "aoe", value: 99999 }],
};

export const STARTER_CARDS = BASE_CARDS.filter(
  (c) => c.rarity === RARITY.COMMON,
);
export const REWARD_POOL = BASE_CARDS.filter((c) => c.rarity !== RARITY.COMMON);

export function createStarterDeck() {
  const taichi = BASE_CARDS.find((c) => c.id === "taichi_strike");
  const guard = BASE_CARDS.find((c) => c.id === "inner_guard");
  const cloud = BASE_CARDS.find((c) => c.id === "cloud_step");
  return [
    ...Array(3)
      .fill(null)
      .map((_, i) => ({ ...taichi, uid: `taichi_strike_${i}` })),
    ...Array(3)
      .fill(null)
      .map((_, i) => ({ ...guard, uid: `inner_guard_${i}` })),
    ...Array(2)
      .fill(null)
      .map((_, i) => ({ ...cloud, uid: `cloud_step_${i}` })),
  ];
}
