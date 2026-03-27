import Tooltip from './Tooltip'

export default function EnemyDisplay({ enemy, intent, selectable, selected, onClick, isActing, actionType, attackDamage = 0 }) {
  if (!enemy || enemy.hp <= 0) return null

  const maxHp = enemy.hp + 50
  const hpPercent = Math.max(0, (enemy.hp / maxHp) * 100)

  const intentTips = {
    attack: `다음 턴에 ${intent?.damage + (enemy.strength || 0)}${intent?.hits > 1 ? `×${intent.hits}` : ''} 피해를 줍니다${intent?.stripBlock ? ' (호신강기 관통!)' : ''}`,
    defend: `다음 턴에 방어력 ${intent?.block}을 얻습니다`,
    begging: intent?.beggingVariant ? {
      money: '💰 돈구걸: 시혜/공격/방치에 따라 다른 결과',
      food: '🍚 밥구걸: 시혜/공격/방치에 따라 다른 결과',
      mercy: '🙏 자비구걸: 시혜/공격/방치에 따라 다른 결과',
      life: '💀 목숨구걸: 시혜/공격/방치에 따라 다른 결과',
    }[intent.beggingVariant] : '구걸',
    exhaustion: '탈력 상태! 받는 피해 2배 (공격 찬스!)',
    buff_strength: `공력 +${intent?.value} 강화`,
    heal: `체력 ${intent?.value} 회복`,
    rage: `${intent?.damage + (enemy.strength || 0)}${intent?.hits > 1 ? `×${intent.hits}` : ''} 공격 + 공력 +${intent?.strengthGain} 강화`,
    debuff_vulnerable: `받는 피해 증가 저주 (${intent?.duration || 2}턴)`,
    buff_armor: `방어 +${intent?.block || 0}, 피해 감소 (${intent?.duration || 2}턴)`,
  }
  const intentTip = intent ? (intentTips[intent.type] || '') : ''

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

      <div className="flex gap-2 justify-center">
        {enemy.block > 0 && (
          <Tooltip text="적 방어: 피해를 먼저 흡수">
            <span className="text-blue-300 text-xs">🛡️{enemy.block}</span>
          </Tooltip>
        )}
        {enemy.strength > 0 && (
          <Tooltip text="적 공력: 공격 시 추가 피해">
            <span className="text-orange-300 text-xs">💪{enemy.strength}</span>
          </Tooltip>
        )}
        {enemy.damageReduction > 0 && (
          <Tooltip text={`피해 감소 ${Math.round(enemy.damageReduction * 100)}% (${enemy.damageReductionTurns}턴)`}>
            <span className="text-cyan-300 text-xs">🔰{Math.round(enemy.damageReduction * 100)}%</span>
          </Tooltip>
        )}
        {enemy.damageReduction < 0 && (
          <Tooltip text="약점 노출! 받는 피해 2배">
            <span className="text-red-400 text-xs animate-pulse">💥×2</span>
          </Tooltip>
        )}
      </div>

      {intent && (
        <Tooltip text={intentTip}>
          <div className={`mt-0.5 px-2.5 py-0.5 rounded text-xs font-medium ${
            intent.type === 'attack' ? 'bg-red-900/60 text-red-300 border border-red-700'
              : intent.type === 'rage' ? 'bg-orange-900/60 text-orange-300 border border-orange-700'
              : intent.type === 'buff_strength' ? 'bg-orange-900/60 text-orange-300 border border-orange-700'
              : intent.type === 'heal' ? 'bg-green-900/60 text-green-300 border border-green-700'
              : intent.type === 'debuff_vulnerable' ? 'bg-purple-900/60 text-purple-300 border border-purple-700'
              : intent.type === 'buff_armor' ? 'bg-cyan-900/60 text-cyan-300 border border-cyan-700'
              : intent.type === 'exhaustion' ? 'bg-amber-900/60 text-amber-300 border border-amber-700 animate-pulse'
              : intent.type === 'begging' ? 'bg-yellow-900/60 text-yellow-300 border border-yellow-700'
              : 'bg-blue-900/60 text-blue-300 border border-blue-700'
          }`}>
            {intent.type === 'attack' ? `${intent.stripBlock ? '💥' : '⚔️'} ${intent.damage + (enemy.strength || 0)}${intent.hits > 1 ? `×${intent.hits}` : ''}${intent.stripBlock ? '!' : ''}`
              : intent.type === 'rage' ? `🔥 ${intent.damage + (enemy.strength || 0)}${intent.hits > 1 ? `×${intent.hits}` : ''}`
              : intent.type === 'buff_strength' ? `💪 +${intent.value}`
              : intent.type === 'heal' ? `💚 +${intent.value}`
              : intent.type === 'debuff_vulnerable' ? '☠️ 저주'
              : intent.type === 'buff_armor' ? `🛡️ 철벽`
              : intent.type === 'exhaustion' ? '😵 탈력!'
              : intent.type === 'begging' ? `${{money:'💰',food:'🍚',mercy:'🙏',life:'💀'}[intent.beggingVariant] || '🙏'} ${{money:'돈구걸',food:'밥구걸',mercy:'자비구걸',life:'목숨구걸'}[intent.beggingVariant] || '구걸'}`
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
