export const NODE_TYPES = {
  BATTLE: 'battle',
  ELITE: 'elite',
  REST: 'rest',
  EVENT: 'event',
  BOSS: 'boss',
  START: 'start',
}

const NODE_INFO = {
  [NODE_TYPES.BATTLE]: { label: '전투', emoji: '⚔️' },
  [NODE_TYPES.ELITE]: { label: '정예', emoji: '💀' },
  [NODE_TYPES.REST]: { label: '휴식', emoji: '🏥' },
  [NODE_TYPES.EVENT]: { label: '기연', emoji: '❓' },
  [NODE_TYPES.BOSS]: { label: '두목', emoji: '👹' },
  [NODE_TYPES.START]: { label: '출발', emoji: '⛩️' },
}

export function getNodeInfo(type) {
  return NODE_INFO[type] || NODE_INFO[NODE_TYPES.BATTLE]
}

function pickNodeType(floor, col, totalFloors) {
  // 마지막 층은 보스
  if (floor === totalFloors) return NODE_TYPES.BOSS
  // 중간 지점에 정예 배치 가능
  const midFloor = Math.ceil(totalFloors / 2)
  if (floor === midFloor && Math.random() < 0.5) return NODE_TYPES.ELITE
  // 나머지는 확률로 배분
  const r = Math.random()
  if (r < 0.50) return NODE_TYPES.BATTLE
  if (r < 0.70) return NODE_TYPES.ELITE
  if (r < 0.85) return NODE_TYPES.REST
  return NODE_TYPES.EVENT
}

export function generateMap(totalFloors = 10) {
  const floors = []

  // 0층: 시작점
  floors.push({
    nodes: [{ id: '0-0', type: NODE_TYPES.START, col: 0, connections: [] }],
  })

  // 1 ~ totalFloors 층
  for (let f = 1; f <= totalFloors; f++) {
    const isBossFloor = f === 5 || f === totalFloors
    const nodeCount = isBossFloor ? 1 : (2 + Math.floor(Math.random() * 2)) // 2~3개
    const nodes = []

    for (let c = 0; c < nodeCount; c++) {
      nodes.push({
        id: `${f}-${c}`,
        type: pickNodeType(f, c, totalFloors),
        col: c,
        connections: [],
      })
    }
    floors.push({ nodes })
  }

  // 연결 생성: 각 층의 노드를 다음 층 노드에 연결
  for (let f = 0; f < floors.length - 1; f++) {
    const current = floors[f].nodes
    const next = floors[f + 1].nodes

    for (const node of current) {
      // 최소 1개 연결 보장
      if (next.length === 1) {
        node.connections.push(next[0].id)
      } else {
        // 가까운 인덱스 위주로 1~2개 연결
        const ratio = current.length > 1 ? node.col / (current.length - 1) : 0.5
        const targetIdx = Math.round(ratio * (next.length - 1))
        node.connections.push(next[targetIdx].id)

        // 추가 연결 (인접 노드)
        if (Math.random() < 0.6) {
          const alt = targetIdx + (Math.random() < 0.5 ? 1 : -1)
          if (alt >= 0 && alt < next.length && !node.connections.includes(next[alt].id)) {
            node.connections.push(next[alt].id)
          }
        }
      }
    }

    // 연결 안 된 다음 층 노드에 최소 1개 연결 보장
    for (const nextNode of next) {
      const hasIncoming = current.some(n => n.connections.includes(nextNode.id))
      if (!hasIncoming) {
        // 가장 가까운 현재 층 노드에서 연결
        const closest = current.reduce((best, n) =>
          Math.abs(n.col - nextNode.col) < Math.abs(best.col - nextNode.col) ? n : best
        )
        closest.connections.push(nextNode.id)
      }
    }
  }

  return floors
}

// 특정 노드 ID에서 floor, col 추출
export function parseNodeId(id) {
  const [floor, col] = id.split('-').map(Number)
  return { floor, col }
}
