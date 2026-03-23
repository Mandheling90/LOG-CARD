export default function PlayerStatus({ player, energy, drawPile, discardPile, taeguk, buffs, evasionCount, counter, stance }) {
  const hpPercent = Math.max(0, (player.hp / player.maxHp) * 100)

  const stanceLabel = stance === 'attack' ? '⚔️ 공격' : stance === 'defense' ? '🛡️ 방어' : '☯️ 중립'

  return (
    <div className="flex flex-col items-center gap-3 bg-gray-800/80 rounded-xl px-6 py-5 border border-gray-700 min-w-48">
      <div className="text-6xl">⚔️</div>
      <div className="text-white font-bold text-lg">무당 협객</div>

      {/* HP */}
      <div className="w-40 bg-gray-900 rounded-full h-4 border border-gray-600">
        <div
          className="bg-green-500 h-full rounded-full transition-all duration-300"
          style={{ width: `${hpPercent}%` }}
        />
      </div>
      <div className="text-green-300 text-sm">체력: {player.hp}/{player.maxHp}</div>

      {/* 태극 게이지 */}
      <div className="flex items-center gap-2">
        <span className="text-cyan-400 text-sm font-bold">☯️ 태극: {taeguk}</span>
        {taeguk >= 5 && <span className="text-yellow-400 text-xs animate-pulse">충만!</span>}
      </div>

      {/* 자세 */}
      <div className="text-xs text-gray-400">{stanceLabel} 자세</div>

      {/* 전투 상태 */}
      <div className="flex flex-wrap gap-2 justify-center">
        {player.block > 0 && (
          <span className="text-blue-300 text-xs bg-blue-900/40 px-2 py-0.5 rounded">🛡️ {player.block}</span>
        )}
        {player.strength > 0 && (
          <span className="text-orange-300 text-xs bg-orange-900/40 px-2 py-0.5 rounded">💪 {player.strength}</span>
        )}
        {evasionCount > 0 && (
          <span className="text-green-300 text-xs bg-green-900/40 px-2 py-0.5 rounded">💨 회피 {evasionCount}</span>
        )}
        {counter > 0 && (
          <span className="text-red-300 text-xs bg-red-900/40 px-2 py-0.5 rounded">🔄 반격 {counter}</span>
        )}
      </div>

      {/* 버프 */}
      {buffs.length > 0 && (
        <div className="flex flex-col gap-1 w-full">
          {buffs.map(buff => (
            <div key={buff.buffId} className="text-[10px] text-amber-300 bg-amber-900/30 px-2 py-0.5 rounded text-center">
              ✨ {buff.name} ({buff.duration}턴)
            </div>
          ))}
        </div>
      )}

      {/* 기력 */}
      <div className="flex items-center gap-1">
        {Array.from({ length: 3 }).map((_, i) => (
          <div
            key={i}
            className={`w-5 h-5 rounded-full border-2 ${
              i < energy
                ? 'bg-amber-400 border-amber-300'
                : 'bg-gray-700 border-gray-600'
            }`}
          />
        ))}
        <span className="text-amber-300 text-sm ml-1">기력 {energy}/3</span>
      </div>

      <div className="text-gray-400 text-xs flex gap-3">
        <span>📜 {drawPile.length}</span>
        <span>♻️ {discardPile.length}</span>
      </div>
    </div>
  )
}
