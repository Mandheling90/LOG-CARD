import { useGameState, GAME_PHASE } from './hooks/useGameState'
import Card from './components/Card'
import EnemyDisplay from './components/EnemyDisplay'
import PlayerStatus from './components/PlayerStatus'
import BattleLog from './components/BattleLog'
import RewardScreen from './components/RewardScreen'
import RoadMap from './components/RoadMap'
import RestScreen from './components/RestScreen'
import EventScreen from './components/EventScreen'
import BattleEffect from './components/BattleEffect'
import Tooltip from './components/Tooltip'
import { REWARD_POOL, LEGENDARY_POOL } from './data/cards'

function App() {
  const {
    phase, player, energy, hand, drawPile, discardPile,
    enemies, enemyIntents, rewardCards, log, deck,
    selectedEnemyIndex, taeguk, buffs, evasionCount, counter, stance,
    isEnemyTurn, activeEnemyIndex, activeEnemyAction,
    mapFloors, currentFloor, visitedNodes, availableNodes,
    startGame, selectCard, selectEnemy, endTurn,
    selectReward, selectMapNode, resolveNonBattle, spendTaeguk,
    battleEffect, clearBattleEffect, toast,
    getEffectiveCost, canPlayCard,
  } = useGameState()

  // 타이틀
  if (phase === GAME_PHASE.TITLE) {
    return (
      <div className="min-h-screen bg-gray-950 flex flex-col items-center justify-center gap-8">
        <div className="text-7xl">☯️</div>
        <h1 className="text-4xl md:text-6xl font-black text-transparent bg-clip-text bg-gradient-to-r from-sky-400 via-white to-amber-400">
          무당검협전
        </h1>
        <p className="text-gray-400 text-lg">강호에 드리운 마교의 그림자를 걷어라</p>
        <button
          onClick={startGame}
          className="px-8 py-4 bg-gradient-to-r from-sky-700 to-amber-700 hover:from-sky-600 hover:to-amber-600 text-white font-bold text-xl rounded-xl transition-all hover:scale-105 cursor-pointer"
        >
          출사하기
        </button>
      </div>
    )
  }

  // 로드맵
  if (phase === GAME_PHASE.MAP) {
    return (
      <RoadMap
        floors={mapFloors}
        currentFloor={currentFloor}
        visitedNodes={visitedNodes}
        availableNodes={availableNodes}
        onSelectNode={selectMapNode}
      />
    )
  }

  // 휴식
  if (phase === GAME_PHASE.REST) {
    return <RestScreen player={player} onRest={resolveNonBattle} />
  }

  // 기연 이벤트
  if (phase === GAME_PHASE.EVENT) {
    return <EventScreen onResolve={resolveNonBattle} rewardPool={REWARD_POOL} legendaryPool={LEGENDARY_POOL} player={player} />
  }

  // 게임 오버
  if (phase === GAME_PHASE.GAME_OVER) {
    return (
      <div className="min-h-screen bg-gray-950 flex flex-col items-center justify-center gap-6">
        <h1 className="text-5xl font-black text-red-500">패배</h1>
        <p className="text-gray-400 text-lg">{currentFloor}층에서 쓰러졌습니다</p>
        <p className="text-gray-500">비급 수: {deck.length}장</p>
        <button
          onClick={startGame}
          className="px-8 py-3 bg-gray-700 hover:bg-gray-600 text-white font-bold rounded-xl transition cursor-pointer"
        >
          다시 출사하기
        </button>
      </div>
    )
  }

  // 승리
  if (phase === GAME_PHASE.VICTORY) {
    return (
      <div className="min-h-screen bg-gray-950 flex flex-col items-center justify-center gap-6">
        <div className="text-6xl">☯️</div>
        <h1 className="text-5xl font-black text-amber-400">천하제일</h1>
        <p className="text-gray-300 text-lg">마교를 물리치고 강호에 평화를 되찾았습니다!</p>
        <p className="text-gray-500">최종 비급: {deck.length}장 | 체력: {player.hp}/{player.maxHp}</p>
        <button
          onClick={startGame}
          className="px-8 py-3 bg-gradient-to-r from-sky-700 to-amber-700 hover:from-sky-600 hover:to-amber-600 text-white font-bold rounded-xl transition cursor-pointer"
        >
          다시 출사하기
        </button>
      </div>
    )
  }

  // 전투 화면
  return (
    <div className="h-[100dvh] bg-gray-950 flex flex-col overflow-hidden">
      {/* Header */}
      <div className="shrink-0 flex justify-between items-center px-3 md:px-6 py-2 md:py-3 bg-gray-900 border-b border-gray-800">
        <Tooltip text="현재 층수: 10층이 최종 보스">
          <div className="text-amber-400 font-bold text-sm md:text-base">⛩️ {currentFloor}층</div>
        </Tooltip>
        <div className="text-gray-500 text-xs md:text-sm">
          {isEnemyTurn ? (
            <span className="text-red-400 font-bold animate-pulse">적의 턴</span>
          ) : selectedEnemyIndex !== null ? (
            <span className="text-amber-400 font-bold">🎯 {enemies[selectedEnemyIndex]?.name} 지정</span>
          ) : (
            '무당검협전'
          )}
        </div>
        <Tooltip text="보유 중인 전체 카드 수">
          <div className="text-gray-500 text-xs md:text-sm">비급: {deck.length}장</div>
        </Tooltip>
      </div>

      {/* Battle Area */}
      <div className="flex-1 min-h-0 flex flex-col md:flex-row items-stretch md:items-center justify-start md:justify-center gap-1 md:gap-6 px-2 md:px-6 py-1 md:py-2 overflow-y-auto">
        {/* Player (Left) */}
        <div className="shrink-0 md:flex-1 flex justify-center md:justify-end">
          <PlayerStatus
            player={player}
            energy={energy}
            drawPile={drawPile}
            discardPile={discardPile}
            taeguk={taeguk}
            buffs={buffs}
            evasionCount={evasionCount}
            counter={counter}
            stance={stance}
          />
        </div>

        {/* Battle Log (Center) - desktop only */}
        <div className="hidden md:block">
          <BattleLog log={log} />
        </div>

        {/* Enemies + Mobile Log (Right) */}
        <div className="md:flex-1 flex flex-col items-center gap-1">
          <div className="flex justify-center md:justify-start gap-2 md:gap-3">
            {enemies.map((enemy, i) => (
              <EnemyDisplay
                key={enemy.uid}
                enemy={enemy}
                intent={enemyIntents[i]}
                selectable={!isEnemyTurn && enemy.hp > 0}
                selected={selectedEnemyIndex === i}
                onClick={() => !isEnemyTurn && enemy.hp > 0 && selectEnemy(i)}
                isActing={isEnemyTurn && activeEnemyIndex === i}
                actionType={isEnemyTurn && activeEnemyIndex === i ? activeEnemyAction : null}
              />
            ))}
          </div>
          {/* Mobile Battle Log */}
          <div className="md:hidden w-full max-w-xs">
            <BattleLog log={log} mobile />
          </div>
        </div>
      </div>

      {/* Action Bar */}
      <div className="shrink-0 flex justify-between items-center px-3 md:px-6 py-1.5 md:py-2 bg-gray-900/60 border-t border-gray-800">
        <Tooltip text="태극 3 소모하여 기력 +1 획득">
          <button
            onClick={spendTaeguk}
            disabled={taeguk < 3 || isEnemyTurn}
            className={`px-3 md:px-5 py-1.5 md:py-2 text-xs md:text-sm bg-gradient-to-b from-cyan-700 to-cyan-900 text-cyan-200 font-bold rounded-lg border border-cyan-600 transition-all whitespace-nowrap ${
              taeguk >= 3 && !isEnemyTurn
                ? 'hover:from-cyan-600 hover:to-cyan-800 hover:scale-105 cursor-pointer'
                : 'opacity-50 cursor-not-allowed'
            }`}
          >
            ☯ 태극→기력
          </button>
        </Tooltip>

        <Tooltip text="턴을 넘기면 적이 행동합니다">
          <button
            onClick={endTurn}
            disabled={isEnemyTurn}
            className={`px-3 md:px-5 py-1.5 md:py-2 text-xs md:text-sm bg-gradient-to-b from-gray-700 to-gray-900 text-amber-300 font-bold rounded-lg border border-gray-600 transition-all whitespace-nowrap ${
              isEnemyTurn
                ? 'opacity-50 cursor-not-allowed'
                : 'hover:from-gray-600 hover:to-gray-800 hover:scale-105 cursor-pointer'
            }`}
          >
            {isEnemyTurn ? '⏳ 적의 턴...' : '⏭ 턴 종료'}
          </button>
        </Tooltip>
      </div>

      {/* Hand */}
      <div className="shrink-0 bg-gray-900/90 border-t border-gray-800 px-2 md:px-6 py-2 md:py-4">
        <div className="flex items-end justify-start md:justify-center gap-2 md:gap-3 overflow-x-auto pb-2 scrollbar-hide">
          {hand.map((card, i) => (
            <div key={card.uid} className="shrink-0">
              <Card
                card={card}
                effectiveCost={getEffectiveCost(card)}
                onClick={() => !isEnemyTurn && selectCard(i)}
                disabled={!canPlayCard(card) || isEnemyTurn}
                mobile
              />
            </div>
          ))}
        </div>
      </div>

      {/* Battle Effect */}
      <BattleEffect effect={battleEffect} onDone={clearBattleEffect} />

      {/* Toast */}
      {toast && (
        <div className="fixed top-16 left-1/2 -translate-x-1/2 z-50 animate-toast">
          <div className="bg-red-900/90 text-red-200 px-4 py-2 rounded-lg border border-red-700 text-sm font-bold shadow-lg">
            {toast}
          </div>
        </div>
      )}

      {/* Reward Modal */}
      {phase === GAME_PHASE.REWARD && (
        <RewardScreen cards={rewardCards} onSelect={selectReward} />
      )}
    </div>
  )
}

export default App
