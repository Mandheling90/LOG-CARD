export default function EnemyDisplay({ enemy, intent, selectable, onClick }) {
  if (!enemy || enemy.hp <= 0) return null

  const maxHp = enemy.hp + 50
  const hpPercent = Math.max(0, (enemy.hp / maxHp) * 100)

  return (
    <button
      onClick={onClick}
      disabled={!selectable}
      className={`
        flex flex-col items-center gap-2 rounded-xl p-4 transition-all
        ${selectable
          ? 'cursor-pointer hover:bg-red-900/30 hover:scale-105 ring-2 ring-red-500/60 ring-offset-2 ring-offset-gray-950 animate-pulse'
          : 'cursor-default'
        }
      `}
    >
      <div className="text-5xl">{enemy.emoji}</div>

      <div className="text-white font-bold text-sm">{enemy.name}</div>

      <div className="w-28 bg-gray-800 rounded-full h-3 border border-gray-600">
        <div
          className="bg-red-500 h-full rounded-full transition-all duration-300"
          style={{ width: `${hpPercent}%` }}
        />
      </div>
      <div className="text-red-300 text-xs">HP: {enemy.hp}</div>

      {enemy.block > 0 && (
        <div className="text-blue-300 text-xs">🛡️ {enemy.block}</div>
      )}

      {intent && (
        <div className={`mt-1 px-2 py-0.5 rounded text-xs font-medium ${
          intent.type === 'attack'
            ? 'bg-red-900/60 text-red-300 border border-red-700'
            : 'bg-blue-900/60 text-blue-300 border border-blue-700'
        }`}>
          {intent.type === 'attack'
            ? `⚔️ ${intent.damage}`
            : `🛡️ ${intent.block}`
          }
        </div>
      )}

      {selectable && (
        <div className="text-red-400 text-[10px] font-bold mt-1">대상 선택</div>
      )}
    </button>
  )
}
