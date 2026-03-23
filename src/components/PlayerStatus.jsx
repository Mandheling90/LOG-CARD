import Tooltip from './Tooltip'

function getBuffIcon(buff) {
  if (buff.invincible) return '🔰'
  if (buff.guaranteedEvade) return '💨'
  if (buff.alwaysTriggerSwitchBonus) return '🌀'
  if (buff.taegukMultiplier) return '☯️'
  if (buff.perSwitch) return '🔄'
  if (buff.perTurn) return '✨'
  if (buff.onEvade) return '⚡'
  if (buff.grantedStrength) return '💪'
  if (buff.overflowBlock) return '🛡️'
  return '✨'
}

function getBuffDescription(buff) {
  const parts = []
  if (buff.perTurn) {
    if (buff.perTurn.block) parts.push(`매 턴 호신강기 +${buff.perTurn.block}`)
    if (buff.perTurn.counter) parts.push(`매 턴 반격 +${buff.perTurn.counter}`)
    if (buff.perTurn.taeguk) parts.push(`매 턴 태극 +${buff.perTurn.taeguk}`)
  }
  if (buff.perSwitch) {
    if (buff.perSwitch.aoeDamage) parts.push(`전환 시 전체 ${buff.perSwitch.aoeDamage} 피해`)
    if (buff.perSwitch.taeguk) parts.push(`전환 시 태극 +${buff.perSwitch.taeguk}`)
    if (buff.perSwitch.draw) parts.push(`전환 시 카드 ${buff.perSwitch.draw}장 뽑기`)
  }
  if (buff.taegukMultiplier) parts.push(`태극 획득 ${buff.taegukMultiplier}배`)
  if (buff.damageReceiveMultiplier && buff.damageReceiveMultiplier > 1) {
    parts.push(`받는 피해 ${Math.round((buff.damageReceiveMultiplier - 1) * 100)}% 증가`)
  }
  if (buff.invincible) parts.push('모든 피해 흡수 (무적)')
  if (buff.guaranteedEvade) parts.push('모든 공격 회피')
  if (buff.onEvade) {
    if (buff.onEvade.damage) parts.push(`회피 시 ${buff.onEvade.damage} 피해`)
    if (buff.onEvade.taeguk) parts.push(`회피 시 태극 +${buff.onEvade.taeguk}`)
  }
  if (buff.alwaysTriggerSwitchBonus) parts.push('모든 전환 보너스 무조건 발동')
  if (buff.grantedStrength) parts.push(`공력 +${buff.grantedStrength} (만료 시 해제)`)
  if (buff.overflowBlock) parts.push(`남은 방어의 ${buff.overflowBlock.ratio * 100}% → 공력`)
  if (buff.storedDamage > 0) parts.push(`흡수한 피해: ${buff.storedDamage} (만료 시 공력 전환)`)
  return parts.length > 0 ? parts.join(' / ') : buff.name
}

export default function PlayerStatus({ player, energy, drawPile, discardPile, taeguk, buffs, evasionCount, counter, stance }) {
  const hpPercent = Math.max(0, (player.hp / player.maxHp) * 100)

  const stanceLabel = stance === 'attack' ? '⚔️ 공' : stance === 'defense' ? '🛡️ 방' : '☯️ 중'
  const stanceTip = stance === 'attack' ? '공격 자세: 다음 방어 시 전환 보너스' : stance === 'defense' ? '방어 자세: 다음 공격 시 전환 보너스' : '중립 자세'

  return (
    <div className="flex flex-row md:flex-col items-center gap-2 md:gap-3 bg-gray-800/80 rounded-xl px-2 py-1.5 md:px-6 md:py-5 border border-gray-700">
      {/* 아이콘 + 이름 */}
      <div className="flex flex-col items-center gap-0.5 md:gap-2">
        <div className="text-2xl md:text-6xl">⚔️</div>
        <div className="text-white font-bold text-[10px] md:text-lg leading-tight">협객</div>
      </div>

      {/* HP + 태극 + 자세 */}
      <div className="flex flex-col items-center gap-0.5 md:gap-3">
        <Tooltip text="체력: 0이 되면 패배">
          <div className="flex flex-col items-center gap-0.5">
            <div className="w-20 md:w-40 bg-gray-900 rounded-full h-2 md:h-4 border border-gray-600">
              <div
                className="bg-green-500 h-full rounded-full transition-all duration-300"
                style={{ width: `${hpPercent}%` }}
              />
            </div>
            <div className="text-green-300 text-[10px] md:text-sm">{player.hp}/{player.maxHp}</div>
          </div>
        </Tooltip>
        <div className="flex items-center gap-1">
          <Tooltip text="태극: 카드로 축적, 3 소모하여 기력 +1">
            <span className="text-cyan-400 text-[10px] md:text-sm font-bold">☯{taeguk}</span>
          </Tooltip>
          <Tooltip text={stanceTip}>
            <span className="text-gray-400 text-[10px] md:text-xs">{stanceLabel}</span>
          </Tooltip>
        </div>
      </div>

      {/* 전투 상태 */}
      <div className="flex flex-wrap gap-0.5 md:gap-2 justify-center">
        {player.block > 0 && (
          <Tooltip text="방어: 받는 피해를 먼저 흡수">
            <span className="text-blue-300 text-[10px] md:text-xs bg-blue-900/40 px-1 md:px-1.5 py-0.5 rounded">🛡️{player.block}</span>
          </Tooltip>
        )}
        {player.strength > 0 && (
          <Tooltip text="공력: 공격 시 추가 피해">
            <span className="text-orange-300 text-[10px] md:text-xs bg-orange-900/40 px-1 md:px-1.5 py-0.5 rounded">💪{player.strength}</span>
          </Tooltip>
        )}
        {evasionCount > 0 && (
          <Tooltip text="회피: 다음 공격을 완전히 회피">
            <span className="text-green-300 text-[10px] md:text-xs bg-green-900/40 px-1 md:px-1.5 py-0.5 rounded">💨{evasionCount}</span>
          </Tooltip>
        )}
        {counter > 0 && (
          <Tooltip text="반격: 피격 시 적에게 피해 반사">
            <span className="text-red-300 text-[10px] md:text-xs bg-red-900/40 px-1 md:px-1.5 py-0.5 rounded">🔄{counter}</span>
          </Tooltip>
        )}
      </div>

      {/* 버프 */}
      {buffs.length > 0 && (
        <div className="flex flex-wrap md:flex-col gap-1 w-full justify-center">
          {buffs.map(buff => (
            <Tooltip key={buff.buffId} text={getBuffDescription(buff)}>
              <div className="text-[10px] md:text-xs text-amber-300 bg-amber-900/30 px-1.5 md:px-2 py-0.5 rounded text-center cursor-help">
                {getBuffIcon(buff)} {buff.name} ({buff.duration}턴)
              </div>
            </Tooltip>
          ))}
        </div>
      )}

      {/* 기력 + 덱 정보 */}
      <div className="flex flex-col items-center gap-0.5 md:gap-2">
        <Tooltip text="기력: 카드 사용에 필요한 자원">
          <div className="flex items-center gap-0.5">
            {Array.from({ length: 3 }).map((_, i) => (
              <div
                key={i}
                className={`w-3 h-3 md:w-5 md:h-5 rounded-full border-2 ${
                  i < energy
                    ? 'bg-amber-400 border-amber-300'
                    : 'bg-gray-700 border-gray-600'
                }`}
              />
            ))}
            <span className="text-amber-300 text-[10px] md:text-sm ml-0.5">{energy}/3</span>
          </div>
        </Tooltip>
        <div className="text-gray-400 text-[9px] md:text-xs flex gap-1.5 md:gap-3">
          <Tooltip text="뽑을 패: 남은 카드 수">
            <span>📜{drawPile.length}</span>
          </Tooltip>
          <Tooltip text="버린 패: 뽑을 패 소진 시 재활용">
            <span>♻️{discardPile.length}</span>
          </Tooltip>
        </div>
      </div>
    </div>
  )
}
