import Tooltip from './Tooltip'

export default function EnemyDisplay({ enemy, intent, selectable, selected, onClick, isActing, actionType, attackDamage = 0 }) {
  if (!enemy || enemy.hp <= 0) return null

  const maxHp = enemy.hp + 50
  const hpPercent = Math.max(0, (enemy.hp / maxHp) * 100)

  const intentTip = intent
    ? intent.type === 'attack'
      ? `다음 턴에 ${intent.damage} 피해를 줍니다`
      : `다음 턴에 방어력 ${intent.block}을 얻습니다`
    : ''

  const actingClass = isActing
    ? actionType === 'attack'
      ? 'ring-2 ring-red-500 bg-red-900/40 animate-enemy-attack'
      : actionType === 'defend'
        ? 'ring-2 ring-blue-500 bg-blue-900/40 animate-pulse'
        : 'ring-2 ring-yellow-500 bg-yellow-900/40'
    : ''

  const selectedClass = selected
    ? 'ring-2 ring-amber-400 ring-offset-2 ring-offset-gray-950 bg-amber-900/20'
    : ''

  // 데미지 기반 찌르기 깊이
  const lunge = actionType === 'attack' && attackDamage > 0
    ? attackDamage <= 5 ? 16 : attackDamage <= 12 ? 24 : attackDamage <= 25 ? 36 : 48
    : 24
  const lungeScale = actionType === 'attack' && attackDamage > 0
    ? attackDamage <= 5 ? 0.08 : attackDamage <= 12 ? 0.15 : attackDamage <= 25 ? 0.2 : 0.28
    : 0.15

  return (
    <button
      onClick={onClick}
      disabled={!selectable}
      className={`
        flex flex-col items-center gap-1 md:gap-2 rounded-xl p-2 md:p-4 transition-all
        ${selectable
          ? 'cursor-pointer hover:bg-red-900/30 hover:scale-105'
          : 'cursor-default'
        }
        ${actingClass}
        ${!isActing ? selectedClass : ''}
      `}
      style={isActing && actionType === 'attack' ? { '--lunge': `${lunge}px`, '--lunge-scale': lungeScale } : undefined}
    >
      <div className={`text-4xl md:text-5xl transition-transform duration-150 ${isActing && actionType === 'attack' ? 'scale-110' : ''}`}>{enemy.emoji}</div>

      <div className="text-white font-bold text-sm md:text-sm">{enemy.name}</div>

      <Tooltip text={`적 체력: ${enemy.hp}`}>
        <div className="flex flex-col items-center gap-0.5">
          <div className="w-24 md:w-28 bg-gray-800 rounded-full h-2.5 md:h-3 border border-gray-600">
            <div
              className="bg-red-500 h-full rounded-full transition-all duration-300"
              style={{ width: `${hpPercent}%` }}
            />
          </div>
          <div className="text-red-300 text-xs">HP: {enemy.hp}</div>
        </div>
      </Tooltip>

      {enemy.block > 0 && (
        <Tooltip text="적 방어: 피해를 먼저 흡수">
          <div className="text-blue-300 text-xs">🛡️ {enemy.block}</div>
        </Tooltip>
      )}

      {intent && (
        <Tooltip text={intentTip}>
          <div className={`mt-0.5 px-2.5 py-0.5 rounded text-xs font-medium ${
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

      {selected && (
        <div className="text-amber-400 text-[10px] font-bold mt-1">🎯 대상</div>
      )}
    </button>
  )
}
