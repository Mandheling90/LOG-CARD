import { useState, useCallback } from 'react'
import { createStarterDeck, REWARD_POOL, cardNeedsTarget, DEBUG_CARD, BASE_CARDS } from '../data/cards'
import { getEnemiesForFloor } from '../data/enemies'
import { generateMap, NODE_TYPES, parseNodeId } from '../data/mapGenerator'
import {
  shuffleArray,
  drawCards,
  getEnemyIntent,
  processCardEffects,
  processEnemyAttack,
  applyBuffsOnTurnStart,
} from '../utils/gameLogic'

const INITIAL_HP = 70
const MAX_ENERGY = 3
const HAND_SIZE = 5
const IS_DEBUG = import.meta.env.VITE_DEBUG_MODE === 'true'

export const GAME_PHASE = {
  TITLE: 'title',
  MAP: 'map',
  BATTLE: 'battle',
  REWARD: 'reward',
  REST: 'rest',
  EVENT: 'event',
  GAME_OVER: 'game_over',
  VICTORY: 'victory',
}

function initialPlayerState() {
  return { hp: INITIAL_HP, maxHp: INITIAL_HP, block: 0, strength: 0 }
}

export function useGameState() {
  const [phase, setPhase] = useState(GAME_PHASE.TITLE)
  const [player, setPlayer] = useState(initialPlayerState())
  const [energy, setEnergy] = useState(MAX_ENERGY)
  const [deck, setDeck] = useState([])
  const [drawPile, setDrawPile] = useState([])
  const [hand, setHand] = useState([])
  const [discardPile, setDiscardPile] = useState([])
  const [enemies, setEnemies] = useState([])
  const [enemyIntents, setEnemyIntents] = useState([])
  const [turn, setTurn] = useState(0)
  const [rewardCards, setRewardCards] = useState([])
  const [log, setLog] = useState([])
  const [selectedCardIndex, setSelectedCardIndex] = useState(null)

  // 전투 상태
  const [taeguk, setTaeguk] = useState(0)
  const [buffs, setBuffs] = useState([])
  const [evasionCount, setEvasionCount] = useState(0)
  const [evasionChance, setEvasionChance] = useState(0)
  const [counter, setCounter] = useState(0)
  const [stance, setStance] = useState(null)
  const [battleEffect, setBattleEffect] = useState(null)

  // 맵 상태
  const [mapFloors, setMapFloors] = useState([])
  const [currentFloor, setCurrentFloor] = useState(0)
  const [visitedNodes, setVisitedNodes] = useState([])
  const [currentNodeId, setCurrentNodeId] = useState(null)

  const addLog = useCallback((msg) => {
    setLog(prev => [...prev.slice(-29), msg])
  }, [])

  const addLogs = useCallback((msgs) => {
    setLog(prev => [...prev, ...msgs].slice(-30))
  }, [])

  // 전투 상태 초기화
  const resetBattleState = useCallback(() => {
    setTaeguk(0)
    setBuffs([])
    setEvasionCount(0)
    setEvasionChance(0)
    setCounter(0)
    setStance(null)
    setSelectedCardIndex(null)
  }, [])

  // 선택 가능한 다음 노드 계산
  function getAvailableNodes(floors, visited, curNodeId) {
    if (!curNodeId) {
      // 게임 시작: 1층 노드 전부
      return floors[1]?.nodes.map(n => n.id) || []
    }
    const { floor } = parseNodeId(curNodeId)
    const currentFloorNodes = floors[floor].nodes
    const currentNode = currentFloorNodes.find(n => n.id === curNodeId)
    return currentNode ? currentNode.connections : []
  }

  const startGame = useCallback(() => {
    const starterDeck = createStarterDeck()
    const map = generateMap(10)

    setDeck(starterDeck)
    setPlayer(initialPlayerState())
    setEnergy(MAX_ENERGY)
    setDrawPile([])
    setHand([])
    setDiscardPile([])
    setLog([])
    resetBattleState()

    // 맵 초기화
    setMapFloors(map)
    setCurrentFloor(0)
    setVisitedNodes(['0-0'])
    setCurrentNodeId('0-0')

    setPhase(GAME_PHASE.MAP)
    addLog('강호로 출사한다!')
  }, [addLog, resetBattleState])

  // 맵에서 노드 선택
  const selectMapNode = useCallback((node) => {
    const { floor } = parseNodeId(node.id)
    setCurrentFloor(floor)
    setCurrentNodeId(node.id)
    setVisitedNodes(prev => [...prev, node.id])

    switch (node.type) {
      case NODE_TYPES.BATTLE:
      case NODE_TYPES.ELITE:
      case NODE_TYPES.BOSS: {
        // 전투 시작 (인라인)
        const newEnemies = getEnemiesForFloor(floor)
        if (node.type === NODE_TYPES.ELITE) {
          newEnemies.forEach(e => { e.hp = Math.floor(e.hp * 1.5) })
        } else if (node.type === NODE_TYPES.BOSS) {
          newEnemies.forEach(e => { e.hp = Math.floor(e.hp * 2) })
        }

        const allCards = [...deck]
        const shuffled = shuffleArray(allCards)
        const { drawn, drawPile: newDrawPile } = drawCards(shuffled, [], HAND_SIZE)

        const handCards = IS_DEBUG
          ? [
              { ...DEBUG_CARD, uid: `debug_${Date.now()}` },
              ...BASE_CARDS.map((c, i) => ({ ...c, uid: `debug_card_${i}_${Date.now()}` })),
              ...drawn,
            ]
          : drawn

        setTurn(0)
        setEnergy(MAX_ENERGY)
        setHand(handCards)
        setDrawPile(newDrawPile)
        setDiscardPile([])
        setEnemies(newEnemies)
        setEnemyIntents(newEnemies.map(e => getEnemyIntent(e, 0)))
        resetBattleState()
        setPhase(GAME_PHASE.BATTLE)

        const names = newEnemies.map(e => e.name).join(', ')
        const typeLabel = node.type === NODE_TYPES.ELITE ? '【정예】' : node.type === NODE_TYPES.BOSS ? '【두목】' : ''
        addLog(`${typeLabel} ${names} 출현!`)
        break
      }
      case NODE_TYPES.REST:
        setPhase(GAME_PHASE.REST)
        break
      case NODE_TYPES.EVENT:
        setPhase(GAME_PHASE.EVENT)
        break
      default:
        setPhase(GAME_PHASE.MAP)
    }
  }, [deck, addLog, resetBattleState])

  // 카드 선택
  const selectCard = useCallback((cardIndex) => {
    if (phase !== GAME_PHASE.BATTLE) return
    const card = hand[cardIndex]
    if (!card || card.cost > energy) return

    if (cardNeedsTarget(card)) {
      setSelectedCardIndex(cardIndex)
    } else {
      playCardOnTarget(cardIndex, null)
    }
  }, [phase, hand, energy])

  const cancelSelection = useCallback(() => {
    setSelectedCardIndex(null)
  }, [])

  const playCardOnTarget = useCallback((cardIndex, targetIndex) => {
    if (phase !== GAME_PHASE.BATTLE) return
    const card = hand[cardIndex]
    if (!card || card.cost > energy) return

    const result = processCardEffects(card, {
      player, enemies, taeguk, buffs, evasionCount, evasionChance, counter, stance,
      logs: [],
    }, targetIndex)

    setBattleEffect({ type: card.type, nature: card.nature || null, name: card.name, id: Date.now() })

    setPlayer(result.player)
    setEnemies(result.enemies)
    setTaeguk(result.taeguk)
    setBuffs(result.buffs)
    setEvasionCount(result.evasionCount)
    setEvasionChance(result.evasionChance)
    setCounter(result.counter)
    setStance(result.stance)
    setEnergy(prev => prev - card.cost)
    setSelectedCardIndex(null)

    let newHand = hand.filter((_, i) => i !== cardIndex)
    let currentDrawPile = drawPile
    let currentDiscardPile = [...discardPile, card]

    if (result.drawCount > 0) {
      const { drawn, drawPile: dp, discardPile: dsp } = drawCards(
        currentDrawPile, currentDiscardPile, result.drawCount
      )
      newHand = [...newHand, ...drawn]
      currentDrawPile = dp
      currentDiscardPile = dsp
    }

    setHand(newHand)
    setDrawPile(currentDrawPile)
    setDiscardPile(currentDiscardPile)
    addLogs(result.logs)

    const alive = result.enemies.filter(e => e.hp > 0)
    if (alive.length === 0) {
      addLog('적을 모두 제압했다!')
      // 보스(10층) 클리어 시 승리
      if (currentFloor >= 10) {
        setPhase(GAME_PHASE.VICTORY)
      } else {
        const pool = shuffleArray(REWARD_POOL)
        setRewardCards(pool.slice(0, 3).map((c, i) => ({ ...c, uid: `reward_${currentFloor}_${i}` })))
        setPhase(GAME_PHASE.REWARD)
      }
    }
  }, [phase, hand, energy, player, enemies, taeguk, buffs, evasionCount, evasionChance, counter, stance, drawPile, discardPile, currentFloor, addLog, addLogs])

  const selectTarget = useCallback((enemyIndex) => {
    if (selectedCardIndex === null) return
    playCardOnTarget(selectedCardIndex, enemyIndex)
  }, [selectedCardIndex, playCardOnTarget])

  const endTurn = useCallback(() => {
    if (phase !== GAME_PHASE.BATTLE) return
    const alive = enemies.filter(e => e.hp > 0)
    if (alive.length === 0) return

    setSelectedCardIndex(null)

    let currentPlayer = { ...player }
    let currentEnemies = enemies.map(e => ({ ...e }))
    let currentEvasionCount = evasionCount
    let currentEvasionChance = evasionChance
    let currentCounter = counter
    let allLogs = []

    currentEnemies.forEach((enemy, i) => {
      if (enemy.hp <= 0) return
      const intent = enemyIntents[i]
      if (!intent) return

      if (intent.type === 'attack') {
        const result = processEnemyAttack(intent.damage, {
          player: currentPlayer,
          evasionCount: currentEvasionCount,
          evasionChance: currentEvasionChance,
          counter: currentCounter,
          logs: [],
          buffs,
        })

        currentPlayer = result.player
        currentEvasionCount = result.evasionCount
        currentEvasionChance = result.evasionChance
        allLogs.push(`${enemy.name}의 공격 → ${intent.damage} 타격`)
        allLogs.push(...result.logs)

        if (!result.dodged && result.counterDmg > 0) {
          const blocked = Math.min(currentEnemies[i].block || 0, result.counterDmg)
          currentEnemies[i] = {
            ...currentEnemies[i],
            block: Math.max(0, (currentEnemies[i].block || 0) - result.counterDmg),
            hp: currentEnemies[i].hp - (result.counterDmg - blocked),
          }
          allLogs.push(`반격! → ${enemy.name}에게 ${result.counterDmg} 반사`)
        }
      } else if (intent.type === 'defend') {
        currentEnemies[i] = { ...currentEnemies[i], block: intent.block }
        allLogs.push(`${enemy.name} 수비 태세 → ${intent.block} 방어`)
      }
    })

    currentPlayer = { ...currentPlayer, block: 0 }
    currentEvasionCount = 0
    currentEvasionChance = 0
    currentCounter = 0

    currentEnemies = currentEnemies.map((e, i) => {
      if (e.hp <= 0) return e
      const intent = enemyIntents[i]
      if (intent?.type === 'defend') return e
      return { ...e, block: 0 }
    })

    if (currentPlayer.hp <= 0) {
      setPlayer(currentPlayer)
      setPhase(GAME_PHASE.GAME_OVER)
      allLogs.push('태극이 소진되어 쓰러졌다...')
      addLogs(allLogs)
      return
    }

    const newTurn = turn + 1

    let currentTaeguk = taeguk
    let currentBuffs = buffs
    const buffResult = applyBuffsOnTurnStart({
      player: currentPlayer,
      taeguk: currentTaeguk,
      counter: currentCounter,
      buffs: currentBuffs,
      logs: [],
    })

    currentPlayer = buffResult.player
    currentTaeguk = buffResult.taeguk
    currentCounter = buffResult.counter
    currentBuffs = buffResult.buffs
    allLogs.push(...buffResult.logs)

    const allDiscard = [...discardPile, ...hand]
    const { drawn, drawPile: newDrawPile, discardPile: newDiscardPile } = drawCards(
      drawPile, allDiscard, HAND_SIZE
    )

    setPlayer(currentPlayer)
    setEnemies(currentEnemies)
    setTurn(newTurn)
    setEnergy(MAX_ENERGY)
    setHand(drawn)
    setDrawPile(newDrawPile)
    setDiscardPile(newDiscardPile)
    setEnemyIntents(currentEnemies.map(e => e.hp > 0 ? getEnemyIntent(e, newTurn) : null))
    setTaeguk(currentTaeguk)
    setBuffs(currentBuffs)
    setEvasionCount(currentEvasionCount)
    setEvasionChance(currentEvasionChance)
    setCounter(currentCounter)
    setStance(null)

    addLogs(allLogs)
  }, [phase, player, enemies, enemyIntents, turn, hand, drawPile, discardPile, evasionCount, evasionChance, counter, taeguk, buffs, addLogs])

  const clearBattleEffect = useCallback(() => setBattleEffect(null), [])

  // 태극 3 소모 → 기력 +1
  const spendTaeguk = useCallback(() => {
    if (taeguk < 3) return
    setTaeguk(prev => prev - 3)
    setEnergy(prev => prev + 1)
    addLog('태극 3 소모 → 기력 +1')
  }, [taeguk, addLog])

  // 보상 선택 후 맵으로
  const selectReward = useCallback((card) => {
    if (card) {
      setDeck(prev => [...prev, card])
      addLog(`${card.name}을(를) 깨달았다!`)
    }
    setPhase(GAME_PHASE.MAP)
  }, [addLog])

  // 휴식/이벤트 결과 처리 후 맵으로
  const resolveNonBattle = useCallback((result) => {
    setPlayer(prev => {
      let newHp = prev.hp + (result.hpChange || 0)
      newHp = Math.max(0, Math.min(newHp, prev.maxHp))
      const newStr = prev.strength + (result.strengthChange || 0)
      return { ...prev, hp: newHp, strength: newStr }
    })

    if (result.taegukChange) {
      setTaeguk(prev => prev + result.taegukChange)
    }

    if (result.card) {
      const cardWithUid = { ...result.card, uid: `event_${Date.now()}` }
      setDeck(prev => [...prev, cardWithUid])
    }

    if (result.message) {
      addLog(result.message)
    }

    setPhase(GAME_PHASE.MAP)
  }, [addLog])

  // 맵에서 사용 가능한 노드
  const availableNodes = mapFloors.length > 0
    ? getAvailableNodes(mapFloors, visitedNodes, currentNodeId)
    : []

  return {
    phase, player, energy, hand, drawPile, discardPile,
    enemies, enemyIntents, rewardCards, log, deck,
    selectedCardIndex, taeguk, buffs, evasionCount, counter, stance,
    battleEffect,
    // 맵 관련
    mapFloors, currentFloor, visitedNodes, availableNodes,
    // 액션
    startGame, selectCard, selectTarget, cancelSelection, endTurn,
    selectReward, selectMapNode, resolveNonBattle, spendTaeguk,
    clearBattleEffect,
  }
}
