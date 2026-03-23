import Tooltip from './Tooltip'

export default function EnemyDisplay({ enemy, intent, selectable, onClick }) {
  if (!enemy || enemy.hp <= 0) return null

  const maxHp = enemy.hp + 50
  const hpPercent = Math.max(0, (enemy.hp / maxHp) * 100)

  const intentTip = intent
    ? intent.type === 'attack'
      ? `다음 턴에 ${intent.damage} 피해를 줍니다`
      : `다음 턴에 방어력 ${intent.block}을 얻습니다`
    : ''

  return (
    <button
      onClick={onClick}
      disabled={!selectable}
      className={`
        flex flex-col items-center gap-1 md:gap-2 rounded-xl p-2 md:p-4 transition-all
        ${selectable
          ? 'cursor-pointer hover:bg-red-900/30 hover:scale-105 ring-2 ring-red-500/60 ring-offset-2 ring-offset-gray-950 animate-pulse'
          : 'cursor-default'
        }
      `}
    >
      <div className="text-3xl md:text-5xl">{enemy.emoji}</div>

      <div className="text-white font-bold text-xs md:text-sm">{enemy.name}</div>

      <Tooltip text={`적 체력: ${enemy.hp}`}>
        <div className="flex flex-col items-center gap-0.5">
          <div className="w-20 md:w-28 bg-gray-800 rounded-full h-2 md:h-3 border border-gray-600">
            <div
              className="bg-red-500 h-full rounded-full transition-all duration-300"
              style={{ width: `${hpPercent}%` }}
            />
          </div>
          <div className="text-red-300 text-[10px] md:text-xs">HP: {enemy.hp}</div>
        </div>
      </Tooltip>

      {enemy.block > 0 && (
        <Tooltip text="적 방어: 피해를 먼저 흡수">
          <div className="text-blue-300 text-[10px] md:text-xs">🛡️ {enemy.block}</div>
        </Tooltip>
      )}

      {intent && (
        <Tooltip text={intentTip}>
          <div className={`mt-0.5 px-2 py-0.5 rounded text-[10px] md:text-xs font-medium ${
            intent.type === 'attack'
              ? 'bg-red-900/60 text-red-300 border border-red-700'
              : 'bg-blue-900/60 text-blue-300 border border-blue-700'
          }`}>
            {intent.type === 'attack'
              ? `⚔️ ${intent.damage}`
              : `🛡️ ${intent.block}`
            }
          </div>
        </Tooltip>
      )}

      {/* 디버프 표시 */}
      {enemy.debuffs?.length > 0 && (
        <div className="flex gap-1">
          {enemy.debuffs.includes('stun') && (
            <Tooltip text="기맥차단: 다음 행동 불가">
              <span className="text-[10px] md:text-xs bg-yellow-900/60 text-yellow-300 px-1.5 py-0.5 rounded border border-yellow-700">⚡ 차단</span>
            </Tooltip>
          )}
        </div>
      )}

      {selectable && (
        <div className="text-red-400 text-[10px] font-bold mt-1">대상 선택</div>
      )}
    </button>
  )
}
