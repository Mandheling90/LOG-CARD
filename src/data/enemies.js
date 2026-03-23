export const ENEMIES = [
  {
    id: 'bandit',
    name: '산적',
    emoji: '🗡️',
    hp: 30,
    actions: [
      { type: 'attack', damage: 5 },
      { type: 'attack', damage: 8 },
      { type: 'defend', block: 4 },
    ],
  },
  {
    id: 'dark_disciple',
    name: '사파 제자',
    emoji: '👤',
    hp: 40,
    actions: [
      { type: 'attack', damage: 7 },
      { type: 'attack', damage: 10 },
      { type: 'defend', block: 6 },
    ],
  },
  {
    id: 'poison_master',
    name: '독공술사',
    emoji: '🐍',
    hp: 50,
    actions: [
      { type: 'attack', damage: 9 },
      { type: 'attack', damage: 6 },
      { type: 'attack', damage: 12 },
    ],
  },
  {
    id: 'dark_elder',
    name: '마교 장로',
    emoji: '👹',
    hp: 65,
    actions: [
      { type: 'attack', damage: 12 },
      { type: 'attack', damage: 15 },
      { type: 'defend', block: 8 },
    ],
  },
  {
    id: 'demon_lord',
    name: '천마',
    emoji: '😈',
    hp: 100,
    actions: [
      { type: 'attack', damage: 18 },
      { type: 'attack', damage: 12 },
      { type: 'attack', damage: 25 },
      { type: 'defend', block: 10 },
    ],
  },
]

let enemyUidCounter = 0

function createEnemy(template) {
  return { ...template, block: 0, debuffs: [], uid: `enemy_${enemyUidCounter++}` }
}

export function getEnemiesForFloor(floor) {
  if (floor <= 1) return [createEnemy(ENEMIES[0])]
  if (floor <= 2) return [createEnemy(ENEMIES[0]), createEnemy(ENEMIES[0])]
  if (floor <= 4) {
    const pool = ENEMIES.slice(0, 2)
    return Array.from({ length: 2 }, () => createEnemy(pool[Math.floor(Math.random() * pool.length)]))
  }
  if (floor <= 6) {
    const pool = ENEMIES.slice(1, 3)
    return Array.from({ length: Math.random() < 0.5 ? 2 : 3 }, () =>
      createEnemy(pool[Math.floor(Math.random() * pool.length)])
    )
  }
  if (floor <= 9) {
    const pool = ENEMIES.slice(2, 4)
    return Array.from({ length: Math.random() < 0.5 ? 2 : 3 }, () =>
      createEnemy(pool[Math.floor(Math.random() * pool.length)])
    )
  }
  return [createEnemy(ENEMIES[4])]
}
