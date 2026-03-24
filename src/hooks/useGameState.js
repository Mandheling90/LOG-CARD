import { useState, useCallback, useRef, useEffect } from "react";
import {
  createStarterDeck,
  REWARD_POOL,
  LEGENDARY_POOL,
  cardNeedsTarget,
  DEBUG_CARD,
  BASE_CARDS,
} from "../data/cards";
import { getEnemiesForFloor, getDebugEnemies } from "../data/enemies";
import { generateMap, NODE_TYPES, parseNodeId } from "../data/mapGenerator";
import {
  shuffleArray,
  drawCards,
  getEnemyIntent,
  processCardEffects,
  processEnemyAttack,
  applyBuffsOnTurnStart,
} from "../utils/gameLogic";

const INITIAL_HP = 80;
const MAX_ENERGY = 3;
const HAND_SIZE = 5;
const IS_DEBUG =
  new URLSearchParams(window.location.search).get("isdebug") === "true";

export const GAME_PHASE = {
  TITLE: "title",
  MAP: "map",
  BATTLE: "battle",
  REWARD: "reward",
  REST: "rest",
  EVENT: "event",
  GAME_OVER: "game_over",
  VICTORY: "victory",
};

function initialPlayerState() {
  return { hp: INITIAL_HP, maxHp: INITIAL_HP, block: 0, strength: 0 };
}

export function useGameState() {
  const [phase, setPhase] = useState(GAME_PHASE.TITLE);
  const [player, setPlayer] = useState(initialPlayerState());
  const [energy, setEnergy] = useState(MAX_ENERGY);
  const [deck, setDeck] = useState([]);
  const [drawPile, setDrawPile] = useState([]);
  const [hand, setHand] = useState([]);
  const [discardPile, setDiscardPile] = useState([]);
  const [enemies, setEnemies] = useState([]);
  const [enemyIntents, setEnemyIntents] = useState([]);
  const [turn, setTurn] = useState(0);
  const [rewardCards, setRewardCards] = useState([]);
  const [log, setLog] = useState([]);
  const [selectedCardIndex, setSelectedCardIndex] = useState(null);

  // 전투 상태
  const [taeguk, setTaeguk] = useState(0);
  const [buffs, setBuffs] = useState([]);
  const [evasionCount, setEvasionCount] = useState(0);
  const [evasionChance, setEvasionChance] = useState(0);
  const [counter, setCounter] = useState(0);
  const [stance, setStance] = useState(null);
  const [switchCount, setSwitchCount] = useState(0);
  const [battleEffect, setBattleEffect] = useState(null);

  // 적 턴 애니메이션 상태
  const [isEnemyTurn, setIsEnemyTurn] = useState(false);
  const [activeEnemyIndex, setActiveEnemyIndex] = useState(null);
  const [activeEnemyAction, setActiveEnemyAction] = useState(null); // 'attack' | 'defend' | 'stun'
  const enemyTurnTimers = useRef([]);

  useEffect(() => {
    return () => enemyTurnTimers.current.forEach((t) => clearTimeout(t));
  }, []);

  // 맵 상태
  const [mapFloors, setMapFloors] = useState([]);
  const [currentFloor, setCurrentFloor] = useState(0);
  const [visitedNodes, setVisitedNodes] = useState([]);
  const [currentNodeId, setCurrentNodeId] = useState(null);

  const addLog = useCallback((msg) => {
    setLog((prev) => [...prev.slice(-29), msg]);
  }, []);

  const addLogs = useCallback((msgs) => {
    setLog((prev) => [...prev, ...msgs].slice(-30));
  }, []);

  // 전투 상태 초기화
  const resetBattleState = useCallback(() => {
    setTaeguk(0);
    setBuffs([]);
    setEvasionCount(0);
    setEvasionChance(0);
    setCounter(0);
    setStance(null);
    setSwitchCount(0);
    setSelectedCardIndex(null);
    setSelectedEnemyIndex(null);
  }, []);

  // 선택 가능한 다음 노드 계산
  function getAvailableNodes(floors, visited, curNodeId) {
    if (!curNodeId) {
      // 게임 시작: 1층 노드 전부
      return floors[1]?.nodes.map((n) => n.id) || [];
    }
    const { floor } = parseNodeId(curNodeId);
    const currentFloorNodes = floors[floor].nodes;
    const currentNode = currentFloorNodes.find((n) => n.id === curNodeId);
    return currentNode ? currentNode.connections : [];
  }

  const startGame = useCallback(() => {
    const starterDeck = createStarterDeck();
    const map = generateMap(10);

    setDeck(starterDeck);
    setPlayer(initialPlayerState());
    setEnergy(MAX_ENERGY);
    setDrawPile([]);
    setHand([]);
    setDiscardPile([]);
    setLog([]);
    resetBattleState();

    // 맵 초기화
    setMapFloors(map);
    setCurrentFloor(0);
    setVisitedNodes(["0-0"]);
    setCurrentNodeId("0-0");

    setPhase(GAME_PHASE.MAP);
    addLog("강호로 출사한다!");
  }, [addLog, resetBattleState]);

  // 맵에서 노드 선택
  const selectMapNode = useCallback(
    (node) => {
      const { floor } = parseNodeId(node.id);
      setCurrentFloor(floor);
      setCurrentNodeId(node.id);
      setVisitedNodes((prev) => [...prev, node.id]);

      switch (node.type) {
        case NODE_TYPES.BATTLE:
        case NODE_TYPES.ELITE:
        case NODE_TYPES.BOSS: {
          // 전투 시작 (인라인)
          let newEnemies;
          if (IS_DEBUG) {
            // 디버그: 다양한 적 3명
            newEnemies = getDebugEnemies();
          } else {
            newEnemies = getEnemiesForFloor(floor);
            if (node.type === NODE_TYPES.ELITE) {
              newEnemies.forEach((e) => {
                e.hp = Math.floor(e.hp * 1.5);
              });
            } else if (node.type === NODE_TYPES.BOSS) {
              const bossMult = floor <= 5 ? 1.5 : 2;
              newEnemies.forEach((e) => {
                e.hp = Math.floor(e.hp * bossMult);
              });
            }
          }

          const allCards = [...deck];
          const shuffled = shuffleArray(allCards);
          const { drawn, drawPile: newDrawPile } = drawCards(
            shuffled,
            [],
            HAND_SIZE,
          );

          const handCards = IS_DEBUG
            ? [
                { ...DEBUG_CARD, uid: `debug_${Date.now()}` },
                ...BASE_CARDS.map((c, i) => ({
                  ...c,
                  uid: `debug_card_${i}_${Date.now()}`,
                })),
                ...drawn,
              ]
            : drawn;

          setTurn(0);
          setEnergy(MAX_ENERGY);
          setHand(handCards);
          setDrawPile(newDrawPile);
          setDiscardPile([]);
          setEnemies(newEnemies);
          setEnemyIntents(newEnemies.map((e) => getEnemyIntent(e, 0)));
          resetBattleState();
          setPhase(GAME_PHASE.BATTLE);

          const names = newEnemies.map((e) => e.name).join(", ");
          const typeLabel =
            node.type === NODE_TYPES.ELITE
              ? "【정예】"
              : node.type === NODE_TYPES.BOSS
                ? "【두목】"
                : "";
          addLog(`${typeLabel} ${names} 출현!`);
          break;
        }
        case NODE_TYPES.REST:
          setPhase(GAME_PHASE.REST);
          break;
        case NODE_TYPES.EVENT:
          setPhase(GAME_PHASE.EVENT);
          break;
        default:
          setPhase(GAME_PHASE.MAP);
      }
    },
    [deck, addLog, resetBattleState],
  );

  // 대상 선택 (적 클릭)
  const [selectedEnemyIndex, setSelectedEnemyIndex] = useState(null);
  const [toast, setToast] = useState(null);
  const toastTimer = useRef(null);

  const showToast = useCallback((msg) => {
    setToast(msg);
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(null), 1500);
  }, []);

  const selectEnemy = useCallback(
    (enemyIndex) => {
      if (phase !== GAME_PHASE.BATTLE || isEnemyTurn) return;
      setSelectedEnemyIndex((prev) =>
        prev === enemyIndex ? null : enemyIndex,
      );
    },
    [phase, isEnemyTurn],
  );

  // 카드 선택 → 즉시 발동
  const selectCard = useCallback(
    (cardIndex) => {
      if (phase !== GAME_PHASE.BATTLE || isEnemyTurn) return;
      const card = hand[cardIndex];
      if (!card || card.cost > energy) return;

      if (cardNeedsTarget(card)) {
        // 적이 1마리면 자동 타겟
        const aliveEnemies = enemies
          .map((e, i) => ({ ...e, idx: i }))
          .filter((e) => e.hp > 0);
        let target = selectedEnemyIndex;
        if (aliveEnemies.length === 1) {
          target = aliveEnemies[0].idx;
        }
        if (target === null || enemies[target]?.hp <= 0) {
          showToast("대상을 먼저 선택하시오!");
          return;
        }
        playCardOnTarget(cardIndex, target);
      } else {
        playCardOnTarget(cardIndex, null);
      }
    },
    [phase, isEnemyTurn, hand, energy, selectedEnemyIndex, enemies, showToast],
  );

  const playCardOnTarget = useCallback(
    (cardIndex, targetIndex) => {
      if (phase !== GAME_PHASE.BATTLE) return;
      const card = hand[cardIndex];
      if (!card || card.cost > energy) return;

      const result = processCardEffects(
        card,
        {
          player,
          enemies,
          taeguk,
          buffs,
          evasionCount,
          evasionChance,
          counter,
          stance,
          switchCount,
          logs: [],
        },
        targetIndex,
      );

      setBattleEffect({
        type: card.type,
        nature: card.nature || null,
        name: card.name,
        id: Date.now(),
      });

      setPlayer(result.player);
      setEnemies(result.enemies);
      setTaeguk(result.taeguk);
      setBuffs(result.buffs);
      setEvasionCount(result.evasionCount);
      setEvasionChance(result.evasionChance);
      setCounter(result.counter);
      setStance(result.stance);
      setSwitchCount(result.switchCount || 0);
      setEnergy((prev) => prev - card.cost);

      let newHand = hand.filter((_, i) => i !== cardIndex);
      let currentDrawPile = drawPile;
      let currentDiscardPile = [...discardPile, card];

      if (result.drawCount > 0) {
        const {
          drawn,
          drawPile: dp,
          discardPile: dsp,
        } = drawCards(currentDrawPile, currentDiscardPile, result.drawCount);
        newHand = [...newHand, ...drawn];
        currentDrawPile = dp;
        currentDiscardPile = dsp;
      }

      setHand(newHand);
      setDrawPile(currentDrawPile);
      setDiscardPile(currentDiscardPile);
      addLogs(result.logs);

      // 선택된 적이 죽었으면 선택 해제
      if (targetIndex !== null && result.enemies[targetIndex]?.hp <= 0) {
        setSelectedEnemyIndex(null);
      }

      const alive = result.enemies.filter((e) => e.hp > 0);
      if (alive.length === 0) {
        addLog("적을 모두 제압했다!");
        // 보스(10층) 클리어 시 승리
        if (currentFloor >= 10) {
          setPhase(GAME_PHASE.VICTORY);
        } else {
          // 7층 이상에서 전설 카드 1장 포함 가능
          let pool = shuffleArray(REWARD_POOL);
          const rewards = pool.slice(0, 3);
          if (currentFloor >= 7 && LEGENDARY_POOL.length > 0) {
            const legendaryPool = shuffleArray(LEGENDARY_POOL);
            rewards[2] = legendaryPool[0];
          }
          setRewardCards(
            rewards.map((c, i) => ({
              ...c,
              uid: `reward_${currentFloor}_${i}`,
            })),
          );
          setPhase(GAME_PHASE.REWARD);
        }
      }
    },
    [
      phase,
      hand,
      energy,
      player,
      enemies,
      taeguk,
      buffs,
      evasionCount,
      evasionChance,
      counter,
      stance,
      drawPile,
      discardPile,
      currentFloor,
      addLog,
      addLogs,
    ],
  );

  const endTurn = useCallback(() => {
    if (phase !== GAME_PHASE.BATTLE || isEnemyTurn) return;
    const alive = enemies.filter((e) => e.hp > 0);
    if (alive.length === 0) return;

    setSelectedCardIndex(null);
    setIsEnemyTurn(true);
    enemyTurnTimers.current.forEach((t) => clearTimeout(t));
    enemyTurnTimers.current = [];

    // ── 1. 적 행동 미리 계산 ──
    let cp = { ...player };
    let ce = enemies.map((e) => ({ ...e }));
    let cEvCount = evasionCount;
    let cEvChance = evasionChance;
    let cCounter = counter;
    let cBuffs = buffs.map((b) => ({ ...b }));
    let cTaeguk = taeguk;

    const steps = [];

    ce.forEach((enemy, i) => {
      if (enemy.hp <= 0) return;

      const stepLogs = [];

      if (enemy.debuffs?.includes("stun")) {
        ce[i] = {
          ...ce[i],
          debuffs: enemy.debuffs.filter((d) => d !== "stun"),
        };
        stepLogs.push(`${enemy.name} 기맥차단! 행동 불가!`);
        steps.push({
          enemyIndex: i,
          actionType: "stun",
          logs: stepLogs,
          player: { ...cp },
          enemies: ce.map((e) => ({ ...e })),
          taeguk: cTaeguk,
          evasionCount: cEvCount,
          evasionChance: cEvChance,
          buffs: cBuffs.map((b) => ({ ...b })),
        });
        return;
      }

      const intent = enemyIntents[i];
      if (!intent) return;

      if (intent.type === "attack") {
        stepLogs.push(`${enemy.name}의 공격 → ${intent.damage} 타격`);
        const result = processEnemyAttack(intent.damage, {
          player: cp,
          evasionCount: cEvCount,
          evasionChance: cEvChance,
          counter: cCounter,
          logs: [],
          buffs: cBuffs,
        });
        cp = result.player;
        cEvCount = result.evasionCount;
        cEvChance = result.evasionChance;
        cBuffs = result.buffs;
        stepLogs.push(...result.logs);

        if (result.dodged && result.onEvadeDmg > 0) {
          const blocked = Math.min(ce[i].block || 0, result.onEvadeDmg);
          ce[i] = {
            ...ce[i],
            block: Math.max(0, (ce[i].block || 0) - result.onEvadeDmg),
            hp: ce[i].hp - (result.onEvadeDmg - blocked),
          };
          stepLogs.push(`반격! → ${enemy.name}에게 ${result.onEvadeDmg} 피해`);
        }
        if (result.dodged && result.onEvadeTaeguk > 0) {
          cTaeguk += result.onEvadeTaeguk;
          stepLogs.push(`회피 보너스! → 태극 +${result.onEvadeTaeguk}`);
        }
        if (!result.dodged && result.counterDmg > 0) {
          const blocked = Math.min(ce[i].block || 0, result.counterDmg);
          ce[i] = {
            ...ce[i],
            block: Math.max(0, (ce[i].block || 0) - result.counterDmg),
            hp: ce[i].hp - (result.counterDmg - blocked),
          };
          stepLogs.push(`반격! → ${enemy.name}에게 ${result.counterDmg} 반사`);
        }
      } else if (intent.type === "defend") {
        ce[i] = { ...ce[i], block: intent.block };
        stepLogs.push(`${enemy.name} 수비 태세 → ${intent.block} 방어`);
      }

      steps.push({
        enemyIndex: i,
        actionType: intent.type,
        logs: stepLogs,
        player: { ...cp },
        enemies: ce.map((e) => ({ ...e })),
        taeguk: cTaeguk,
        evasionCount: cEvCount,
        evasionChance: cEvChance,
        buffs: cBuffs.map((b) => ({ ...b })),
      });
    });

    // ── 2. 순차 애니메이션 재생 ──
    const STEP_DELAY = 700;

    steps.forEach((step, idx) => {
      // 적 하이라이트 표시
      const highlightTimer = setTimeout(() => {
        setActiveEnemyIndex(step.enemyIndex);
        setActiveEnemyAction(step.actionType);
      }, idx * STEP_DELAY);
      enemyTurnTimers.current.push(highlightTimer);

      // 결과 적용
      const applyTimer = setTimeout(
        () => {
          setPlayer(step.player);
          setEnemies(step.enemies);
          setTaeguk(step.taeguk);
          setEvasionCount(step.evasionCount);
          setEvasionChance(step.evasionChance);
          setBuffs(step.buffs);
          addLogs(step.logs);
        },
        idx * STEP_DELAY + 300,
      );
      enemyTurnTimers.current.push(applyTimer);
    });

    // ── 3. 턴 마무리 ──
    const finishDelay = steps.length * STEP_DELAY + 400;
    const finishTimer = setTimeout(() => {
      setActiveEnemyIndex(null);
      setActiveEnemyAction(null);

      const last = steps.length > 0 ? steps[steps.length - 1] : null;
      let fp = last ? { ...last.player } : { ...cp };
      let fe = last
        ? last.enemies.map((e) => ({ ...e }))
        : ce.map((e) => ({ ...e }));
      let ft = last ? last.taeguk : cTaeguk;
      let fb = last ? last.buffs.map((b) => ({ ...b })) : cBuffs;
      const finishLogs = [];

      // 태극유전: 남은 방어 → 공력
      const overflowBuff = fb.find((b) => b.overflowBlock);
      if (overflowBuff && fp.block > 0) {
        const bonus = Math.floor(fp.block * overflowBuff.overflowBlock.ratio);
        if (bonus > 0) {
          fp = { ...fp, strength: (fp.strength || 0) + bonus };
          finishLogs.push(
            `${overflowBuff.name} → 남은 방어 ${fp.block}의 ${overflowBuff.overflowBlock.ratio * 100}% → 공력 +${bonus}`,
          );
          fb = [
            ...fb,
            {
              buffId: "overflow_strength_" + Date.now(),
              name: "태극유전 여운",
              duration: 2,
              grantedStrength: bonus,
            },
          ];
        }
      }
      fp = { ...fp, block: 0 };

      fe = fe.map((e, i) => {
        if (e.hp <= 0) return e;
        const intent = enemyIntents[i];
        if (intent?.type === "defend") return e;
        return { ...e, block: 0 };
      });

      if (fp.hp <= 0) {
        setPlayer(fp);
        setEnemies(fe);
        setPhase(GAME_PHASE.GAME_OVER);
        finishLogs.push("태극이 소진되어 쓰러졌다...");
        addLogs(finishLogs);
        setIsEnemyTurn(false);
        return;
      }

      const newTurn = turn + 1;
      const buffResult = applyBuffsOnTurnStart({
        player: fp,
        taeguk: ft,
        counter: 0,
        buffs: fb,
        logs: [],
      });
      fp = buffResult.player;
      ft = buffResult.taeguk;
      fb = buffResult.buffs;
      finishLogs.push(...buffResult.logs);

      const allDiscard = [...discardPile, ...hand];
      const {
        drawn,
        drawPile: newDrawPile,
        discardPile: newDiscardPile,
      } = drawCards(drawPile, allDiscard, HAND_SIZE);

      const MAX_TAEGUK_CARRY = 3;
      if (ft > MAX_TAEGUK_CARRY) {
        finishLogs.push(`태극 흩어짐: ${ft} → ${MAX_TAEGUK_CARRY}`);
        ft = MAX_TAEGUK_CARRY;
      }

      setPlayer(fp);
      setEnemies(fe);
      setTurn(newTurn);
      setEnergy(MAX_ENERGY);
      setHand(drawn);
      setDrawPile(newDrawPile);
      setDiscardPile(newDiscardPile);
      setEnemyIntents(
        fe.map((e) => (e.hp > 0 ? getEnemyIntent(e, newTurn) : null)),
      );
      setTaeguk(ft);
      setBuffs(fb);
      setEvasionCount(0);
      setEvasionChance(0);
      setCounter(0);
      setStance(null);
      setSwitchCount(0);
      setIsEnemyTurn(false);
      addLogs(finishLogs);
    }, finishDelay);
    enemyTurnTimers.current.push(finishTimer);
  }, [
    phase,
    isEnemyTurn,
    player,
    enemies,
    enemyIntents,
    turn,
    hand,
    drawPile,
    discardPile,
    evasionCount,
    evasionChance,
    counter,
    taeguk,
    buffs,
    addLogs,
    addLog,
  ]);

  const clearBattleEffect = useCallback(() => setBattleEffect(null), []);

  // 태극 3 소모 → 기력 +1
  const spendTaeguk = useCallback(() => {
    if (taeguk < 3) return;
    setTaeguk((prev) => prev - 3);
    setEnergy((prev) => prev + 1);
    addLog("태극 3 소모 → 기력 +1");
  }, [taeguk, addLog]);

  // 보상 선택 후 맵으로
  const selectReward = useCallback(
    (card) => {
      if (card) {
        setDeck((prev) => [...prev, card]);
        addLog(`${card.name}을(를) 깨달았다!`);
      }
      setPhase(GAME_PHASE.MAP);
    },
    [addLog],
  );

  // 휴식/이벤트 결과 처리 후 맵으로
  const resolveNonBattle = useCallback(
    (result) => {
      setPlayer((prev) => {
        let newHp = prev.hp + (result.hpChange || 0);
        newHp = Math.max(0, Math.min(newHp, prev.maxHp));
        const newStr = prev.strength + (result.strengthChange || 0);
        return { ...prev, hp: newHp, strength: newStr };
      });

      if (result.taegukChange) {
        setTaeguk((prev) => prev + result.taegukChange);
      }

      if (result.card) {
        const cardWithUid = { ...result.card, uid: `event_${Date.now()}` };
        setDeck((prev) => [...prev, cardWithUid]);
      }

      if (result.message) {
        addLog(result.message);
      }

      setPhase(GAME_PHASE.MAP);
    },
    [addLog],
  );

  // 맵에서 사용 가능한 노드
  const availableNodes =
    mapFloors.length > 0
      ? getAvailableNodes(mapFloors, visitedNodes, currentNodeId)
      : [];

  return {
    phase,
    player,
    energy,
    hand,
    drawPile,
    discardPile,
    enemies,
    enemyIntents,
    rewardCards,
    log,
    deck,
    selectedEnemyIndex,
    taeguk,
    buffs,
    evasionCount,
    counter,
    stance,
    battleEffect,
    toast,
    isEnemyTurn,
    activeEnemyIndex,
    activeEnemyAction,
    // 맵 관련
    mapFloors,
    currentFloor,
    visitedNodes,
    availableNodes,
    // 액션
    startGame,
    selectCard,
    selectEnemy,
    endTurn,
    selectReward,
    selectMapNode,
    resolveNonBattle,
    spendTaeguk,
    clearBattleEffect,
  };
}
