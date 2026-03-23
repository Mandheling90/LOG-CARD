import { getNodeInfo, parseNodeId } from '../data/mapGenerator'

const NODE_COLORS = {
  battle: 'bg-red-900 border-red-600 hover:bg-red-800',
  elite: 'bg-purple-900 border-purple-600 hover:bg-purple-800',
  rest: 'bg-green-900 border-green-600 hover:bg-green-800',
  event: 'bg-amber-900 border-amber-600 hover:bg-amber-800',
  boss: 'bg-red-950 border-red-500 hover:bg-red-900',
  start: 'bg-gray-700 border-gray-500',
}

export default function RoadMap({ floors, currentFloor, visitedNodes, availableNodes, onSelectNode }) {
  // 표시할 층 범위 (현재 기준 앞뒤)
  const visibleFloors = floors

  // 노드 위치 계산
  const totalWidth = 600
  const floorHeight = 70

  function getNodePos(floor, col, nodeCount) {
    const spacing = totalWidth / (nodeCount + 1)
    return {
      x: spacing * (col + 1),
      y: (floors.length - floor) * floorHeight + 40,
    }
  }

  // 연결선 그리기 데이터
  const lines = []
  for (let f = 0; f < floors.length - 1; f++) {
    for (const node of floors[f].nodes) {
      const from = getNodePos(f, node.col, floors[f].nodes.length)
      for (const connId of node.connections) {
        const { floor: tf, col: tc } = parseNodeId(connId)
        const to = getNodePos(tf, tc, floors[tf].nodes.length)
        const isVisited = visitedNodes.includes(node.id) && visitedNodes.includes(connId)
        const isAvailable = visitedNodes.includes(node.id) && availableNodes.includes(connId)
        lines.push({ from, to, isVisited, isAvailable, key: `${node.id}-${connId}` })
      }
    }
  }

  const svgHeight = (floors.length + 1) * floorHeight

  return (
    <div className="h-screen bg-gray-950 flex flex-col items-center overflow-hidden">
      <div className="py-3 md:py-4 shrink-0">
        <h2 className="text-xl md:text-2xl font-bold text-amber-400 text-center">☯️ 강호 여정</h2>
        <p className="text-gray-500 text-xs md:text-sm text-center mt-1">다음 행선지를 선택하시오</p>
      </div>

      <div className="flex-1 w-full max-w-2xl px-2 md:px-4 pb-4 min-h-0 overflow-y-auto">
        <svg
          viewBox={`0 0 ${totalWidth} ${svgHeight}`}
          className="w-full h-full"
          preserveAspectRatio="xMidYMid meet"
        >
          {/* 연결선 */}
          {lines.map(({ from, to, isVisited, isAvailable, key }) => (
            <line
              key={key}
              x1={from.x} y1={from.y}
              x2={to.x} y2={to.y}
              stroke={isVisited ? '#d97706' : isAvailable ? '#6b7280' : '#1f2937'}
              strokeWidth={isVisited ? 3 : 2}
              strokeDasharray={isAvailable ? '6 4' : isVisited ? '' : '2 4'}
              opacity={isVisited ? 1 : isAvailable ? 0.8 : 0.3}
            />
          ))}

          {/* 층 라벨 */}
          {floors.map((floor, f) => (
            <text
              key={`label-${f}`}
              x={16}
              y={(floors.length - f) * floorHeight + 44}
              fill="#4b5563"
              fontSize={11}
              fontFamily="monospace"
            >
              {f === 0 ? '' : `${f}층`}
            </text>
          ))}

          {/* 노드 */}
          {floors.map((floor, f) =>
            floor.nodes.map((node) => {
              const pos = getNodePos(f, node.col, floor.nodes.length)
              const info = getNodeInfo(node.type)
              const isVisited = visitedNodes.includes(node.id)
              const isAvailable = availableNodes.includes(node.id)
              const isCurrent = f === currentFloor

              return (
                <g key={node.id}>
                  {/* 선택 가능 표시 */}
                  {isAvailable && (
                    <circle
                      cx={pos.x} cy={pos.y} r={24}
                      fill="none"
                      stroke="#d97706"
                      strokeWidth={2}
                      opacity={0.6}
                    >
                      <animate attributeName="r" values="24;28;24" dur="1.5s" repeatCount="indefinite" />
                      <animate attributeName="opacity" values="0.6;0.2;0.6" dur="1.5s" repeatCount="indefinite" />
                    </circle>
                  )}

                  {/* 노드 원 */}
                  <circle
                    cx={pos.x} cy={pos.y} r={20}
                    fill={isVisited ? '#1c1917' : isAvailable ? '#292524' : '#111827'}
                    stroke={isVisited ? '#d97706' : isAvailable ? '#78716c' : '#1f2937'}
                    strokeWidth={isVisited ? 3 : 2}
                    opacity={isVisited || isAvailable ? 1 : 0.4}
                    className={isAvailable ? 'cursor-pointer' : ''}
                    onClick={() => isAvailable && onSelectNode(node)}
                  />

                  {/* 이모지 */}
                  <text
                    x={pos.x} y={pos.y + 5}
                    textAnchor="middle"
                    fontSize={16}
                    className={isAvailable ? 'cursor-pointer' : ''}
                    opacity={isVisited || isAvailable ? 1 : 0.4}
                    onClick={() => isAvailable && onSelectNode(node)}
                  >
                    {isVisited ? '✓' : info.emoji}
                  </text>

                  {/* 라벨 */}
                  {(isAvailable || isVisited || isCurrent) && (
                    <text
                      x={pos.x} y={pos.y + 35}
                      textAnchor="middle"
                      fill={isAvailable ? '#d4d4d8' : '#6b7280'}
                      fontSize={10}
                    >
                      {info.label}
                    </text>
                  )}
                </g>
              )
            })
          )}
        </svg>
      </div>
    </div>
  )
}
