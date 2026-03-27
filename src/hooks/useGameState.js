import { useState, useCallback, useRef, useEffect } from "react";
import {
  createStarterDeck,
  REWARD_POOL,
  LEGENDARY_POOL,
  cardNeedsTarget,
  DEBUG_CARD,
  BASE_CARDS,
} from "../data/cards";
import {
  getEnemiesForFloor,
  getDebugEnemies,
  getBossForChapter,
} from "../data/enemies";
import { ARTIFACTS } from "../data/artifacts";
import { generateMap, NODE_TYPES, parseNodeId } from "../data/mapGenerator";
import {
  shuffleArray,
  drawCards,
  getEnemyIntent,
  processCardEffects,
  applyBuffsOnTurnStart,
} from "../utils/gameLogic";
import { processEnemyAction } from "../utils/enemyActions";
import {
  applyPreCardArtifacts,
  applyPostCardArtifacts,
  applyTurnEndArtifacts,
  applyTurnStartArtifacts,
} from "../utils/artifactEffects";
import { prepareBossDeck } from "../utils/bossLogic";
import { generateBattleRewards } from "../utils/battleRewards";

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
  const [bossCleared, setBossCleared] = useState(false);
  const [log, setLog] = useState([]);
  const [selectedCardIndex, setSelectedCardIndex] = useState(null);

  // 이벤트 → 전투 이월 상태
  const [nextBattleDamage, setNextBattleDamage] = useState(0);

  // 기물 (아티팩트)
  const [artifacts, setArtifacts] = useState([]);
  const [artifactSwitchTotal, setArtifactSwitchTotal] = useState(0);
  const [cardsPlayedThisTurn, setCardsPlayedThisTurn] = useState(0);

  // 보스 전투 추적 (ref로 stale closure 방지)
  const sihyeUsedRef = useRef(false);
  const bossAttackedRef = useRef(false);

  // 전투 상태
  const [taeguk, setTaeguk] = useState(0);
  const [buffs, setBuffs] = useState([]);
  const [evasionCount, setEvasionCount] = useState(0);
  const [evasionChance, setEvasionChance] = useState(0);
  const [counter, setCounter] = useState(0);
  const [stance, setStance] = useState(null);
  const [switchCount, setSwitchCount] = useState(0);
  const [battleEffect, setBattleEffect] = useState(null);
  const [discardEffect, setDiscardEffect] = useState(null);

  // 적 턴 애니메이션 상태
  const [isEnemyTurn, setIsEnemyTurn] = useState(false);
  const [activeEnemyIndex, setActiveEnemyIndex] = useState(null);
  const [activeEnemyAction, setActiveEnemyAction] = useState(null);
  const [activeEnemyDamage, setActiveEnemyDamage] = useState(0);
  const enemyTurnTimers = useRef([]);

  useEffect(() => {
    return () => enemyTurnTimers.current.forEach((t) => clearTimeout(t));
  }, []);

  // 맵 상태
  const [mapFloors, setMapFloors] = useState([]);
  const [currentFloor, setCurrentFloor] = useState(0);
  const [visitedNodes, setVisitedNodes] = useState([]);
  const [currentNodeId, setCurrentNodeId] = useState(null);
  const [chapter, setChapter] = useState(1);
  const TOTAL_CHAPTERS = 3;
  const FLOORS_PER_CHAPTER = 5;

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
    setArtifactSwitchTotal(0);
    setCardsPlayedThisTurn(0);
  }, []);

  // 선택 가능한 다음 노드 계산
  function getAvailableNodes(floors, visited, curNodeId) {
    if (!curNodeId) {
      return floors[1]?.nodes.map((n) => n.id) || [];
    }
    const { floor } = parseNodeId(curNodeId);
    const currentFloorNodes = floors[floor].nodes;
    const currentNode = currentFloorNodes.find((n) => n.id === curNodeId);
    return currentNode ? currentNode.connections : [];
  }

  const startGame = useCallback(() => {
    const starterDeck = createStarterDeck();
    const map = generateMap(FLOORS_PER_CHAPTER);

    setDeck(starterDeck);
    setPlayer(initialPlayerState());
    setEnergy(MAX_ENERGY);
    setDrawPile([]);
    setHand([]);
    setDiscardPile([]);
    setLog([]);
    resetBattleState();
    if (IS_DEBUG) {
      const shuffled = [...ARTIFACTS].sort(() => Math.random() - 0.5);
      setArtifacts(shuffled.slice(0, 3).map((a) => a.id));
    } else {
      setArtifacts([]);
    }

    setChapter(1);
    setMapFloors(map);
    setCurrentFloor(0);
    setVisitedNodes(["0-0"]);
    setCurrentNodeId("0-0");
    setNextBattleDamage(0);

    setPhase(GAME_PHASE.MAP);
    addLog("제1장 — 강호로 출사한다!");
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
          let newEnemies;
          let isBossBattle = false;
          if (IS_DEBUG) {
            newEnemies = getDebugEnemies();
          } else if (node.type === NODE_TYPES.BOSS) {
            const boss = getBossForChapter(chapter);
            if (boss) {
              newEnemies = boss;
              isBossBattle = true;
            } else {
              newEnemies = getEnemiesForFloor(floor);
              newEnemies.forEach((e) => {
                e.hp = Math.floor(e.hp * 2);
              });
            }
          } else {
            newEnemies = getEnemiesForFloor(floor);
            if (node.type === NODE_TYPES.ELITE) {
              newEnemies.forEach((e) => {
                e.hp = Math.floor(e.hp * 1.5);
              });
            }
          }

          // 보스전: 시혜 카드 삽입 (bossLogic 모듈 사용)
          const allCards =
            isBossBattle
              ? prepareBossDeck(deck, newEnemies[0])
              : [...deck];
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
          setHand(handCards);
          setDrawPile(newDrawPile);
          setDiscardPile([]);
          setEnemies(newEnemies);
          setEnemyIntents(newEnemies.map((e) => getEnemyIntent(e, 0)));
          resetBattleState();
          sihyeUsedRef.current = false;
          bossAttackedRef.current = false;
          setEnergy(IS_DEBUG ? 10 : MAX_ENERGY);
          if (IS_DEBUG) setTaeguk(3);

          // 이벤트 디버프: 다음 전투 시작 시 체력 감소
          if (nextBattleDamage > 0) {
            setPlayer((prev) => ({
              ...prev,
              hp: Math.max(1, prev.hp - nextBattleDamage),
            }));
            addLog(`내상이 악화되어 체력 -${nextBattleDamage}!`);
            setNextBattleDamage(0);
          }

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
    [deck, addLog, resetBattleState, nextBattleDamage],
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

  // 버프 기반 코스트 감소 계산
  const getEffectiveCost = useCallback(
    (card) => {
      const reduction = buffs.reduce(
        (sum, b) => sum + (b.costReduction || 0),
        0,
      );
      return Math.max(0, card.cost - reduction);
    },
    [buffs],
  );

  // 카드 사용 가능 여부 (에너지 + 태극 조건)
  const canPlayCard = useCallback(
    (card) => {
      if (getEffectiveCost(card) > energy) return false;
      const taegukCost = card.effects?.find(
        (e) => e.type === "consumeTaegukCost",
      );
      if (taegukCost && taeguk < taegukCost.value) return false;
      return true;
    },
    [energy, taeguk, getEffectiveCost],
  );

  const playCardOnTarget = useCallback(
    (cardIndex, targetIndex) => {
      if (phase !== GAME_PHASE.BATTLE) return;
      const card = hand[cardIndex];
      if (!card || !canPlayCard(card)) return;
      const cost = getEffectiveCost(card);

      // 기물: pre-card artifacts (파손된 도경 등)
      const { buffs: effectBuffs } = applyPreCardArtifacts(
        artifacts,
        card,
        player,
        buffs,
      );

      const result = processCardEffects(
        card,
        {
          player,
          enemies,
          taeguk,
          buffs: effectBuffs,
          evasionCount,
          evasionChance,
          counter,
          stance,
          switchCount,
          logs: [],
        },
        targetIndex,
      );

      // 기물: post-card artifacts (경공 비급 조각, 음양패 등)
      const { newArtifactSwitchTotal } = applyPostCardArtifacts(
        artifacts,
        card,
        result,
        stance,
        artifactSwitchTotal,
      );
      setArtifactSwitchTotal(newArtifactSwitchTotal);

      // 카드 사용 카운트 (목탁용)
      setCardsPlayedThisTurn((prev) => prev + 1);

      // 보스 전투 추적
      if (card.effects?.some((e) => e.type === "sihye")) {
        sihyeUsedRef.current = true;
      }
      const bossEnemy = enemies.find((e) => e.bossId);
      if (bossEnemy) {
        const bossIdx = enemies.indexOf(bossEnemy);
        if (result.enemies[bossIdx].hp < bossEnemy.hp) {
          bossAttackedRef.current = true;
        }
      }

      // 총 데미지 계산 (HP + block 감소량)
      const totalDamage = enemies.reduce((sum, orig, i) => {
        const after = result.enemies[i];
        const hpLoss = orig.hp - after.hp;
        const blockLoss = (orig.block || 0) - (after.block || 0);
        return sum + Math.max(0, hpLoss) + Math.max(0, blockLoss);
      }, 0);

      setBattleEffect({
        type: card.type,
        nature: card.nature || null,
        name: card.name,
        damage: totalDamage,
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
      setEnergy((prev) => prev - cost);

      let newHand = hand.filter((_, i) => i !== cardIndex);
      let currentDrawPile = drawPile;
      let currentDiscardPile = card.exhaust
        ? [...discardPile]
        : [...discardPile, card];

      if (card.exhaust) {
        result.logs.push(`🔥 ${card.name} 소진!`);
      }

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
        // 보스 처치 시 체력 50% 회복
        const defeatedBoss = result.enemies.find((e) => e.bossId);
        if (defeatedBoss) {
          const healTo = Math.floor(result.player.maxHp * 0.5);
          const newHp = Math.max(result.player.hp, healTo);
          result.player = { ...result.player, hp: newHp };
          setPlayer(result.player);
          addLog("보스 격파! → 체력 회복!");
        }
        const isBossFloor = currentFloor >= FLOORS_PER_CHAPTER;
        if (isBossFloor && chapter >= TOTAL_CHAPTERS) {
          setPhase(GAME_PHASE.VICTORY);
        } else {
          const rewardResult = generateBattleRewards(
            result.enemies,
            currentFloor,
            chapter,
            FLOORS_PER_CHAPTER,
            TOTAL_CHAPTERS,
            isBossFloor,
            `reward_${chapter}_${currentFloor}`,
          );
          if (rewardResult.isBossCleared) {
            setBossCleared(true);
          }
          setRewardCards(rewardResult.rewards);
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
      switchCount,
      drawPile,
      discardPile,
      currentFloor,
      chapter,
      addLog,
      addLogs,
      getEffectiveCost,
      canPlayCard,
      artifacts,
      artifactSwitchTotal,
    ],
  );

  // 카드 선택 → 즉시 발동
  const selectCard = useCallback(
    (cardIndex) => {
      if (phase !== GAME_PHASE.BATTLE || isEnemyTurn) return;
      const card = hand[cardIndex];
      if (!card || !canPlayCard(card)) return;

      if (cardNeedsTarget(card)) {
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
    [
      phase,
      isEnemyTurn,
      hand,
      selectedEnemyIndex,
      enemies,
      showToast,
      canPlayCard,
      playCardOnTarget,
    ],
  );

  const endTurn = useCallback(() => {
    if (phase !== GAME_PHASE.BATTLE || isEnemyTurn) return;
    const alive = enemies.filter((e) => e.hp > 0);
    if (alive.length === 0) return;

    // 기물: 턴 종료 아티팩트 (낡은 주머니, 낡은 목탁)
    const turnEndArtifacts = applyTurnEndArtifacts(artifacts, hand, cardsPlayedThisTurn);
    const pouchBonus = turnEndArtifacts.pouchBonus;
    const moktakHeal = turnEndArtifacts.moktakHeal;
    if (turnEndArtifacts.logs.length > 0) {
      addLogs(turnEndArtifacts.logs);
    }

    setSelectedCardIndex(null);
    setIsEnemyTurn(true);
    enemyTurnTimers.current.forEach((t) => clearTimeout(t));
    enemyTurnTimers.current = [];

    // ── 1. 적 행동 미리 계산 (processEnemyAction 사용) ──
    let cp = { ...player };
    if (moktakHeal > 0) {
      cp.hp = Math.min(cp.maxHp, cp.hp + moktakHeal);
    }
    let ce = enemies.map((e) => ({ ...e }));
    let cEvCount = evasionCount;
    let cEvChance = evasionChance;
    let cCounter = counter;
    let cBuffs = buffs.map((b) => ({ ...b }));
    let cTaeguk = taeguk;
    let cSihyeUsed = sihyeUsedRef.current;
    let cBossAttacked = bossAttackedRef.current;

    const steps = [];

    ce.forEach((enemy, i) => {
      if (enemy.hp <= 0) return;

      const result = processEnemyAction(
        enemy,
        i,
        enemyIntents[i],
        {
          player: cp,
          enemies: ce,
          buffs: cBuffs,
          taeguk: cTaeguk,
          evasionCount: cEvCount,
          evasionChance: cEvChance,
          counter: cCounter,
        },
        { sihyeUsed: cSihyeUsed, bossAttacked: cBossAttacked },
      );

      cp = result.player;
      ce = result.enemies;
      cEvCount = result.evasionCount;
      cEvChance = result.evasionChance;
      cCounter = result.counter;
      cBuffs = result.buffs;
      cTaeguk = result.taeguk;
      cSihyeUsed = result.sihyeUsed;
      cBossAttacked = result.bossAttacked;

      steps.push({
        enemyIndex: i,
        actionType: result.actionType || "stun",
        damageTaken: result.damageTaken,
        logs: result.logs,
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
      const highlightTimer = setTimeout(() => {
        setActiveEnemyIndex(step.enemyIndex);
        setActiveEnemyAction(step.actionType);
        setActiveEnemyDamage(step.damageTaken || 0);
      }, idx * STEP_DELAY);
      enemyTurnTimers.current.push(highlightTimer);

      const applyTimer = setTimeout(
        () => {
          setPlayer(step.player);
          setEnemies(step.enemies);
          setTaeguk(step.taeguk);
          setEvasionCount(step.evasionCount);
          setEvasionChance(step.evasionChance);
          setBuffs(step.buffs);
          addLogs(step.logs);
          if (step.damageTaken > 0) {
            setBattleEffect({
              type: "enemy_attack",
              nature: "attack",
              name: "",
              damage: step.damageTaken,
              id: Date.now(),
            });
          }
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
      setActiveEnemyDamage(0);

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
        let dmgRed = e.damageReduction || 0;
        let dmgRedTurns = (e.damageReductionTurns || 0) - 1;
        if (dmgRedTurns <= 0) { dmgRed = 0; dmgRedTurns = 0; }
        if (intent?.type === "defend" || intent?.type === "buff_armor" || e.bossId) return { ...e, damageReduction: dmgRed, damageReductionTurns: dmgRedTurns };
        return { ...e, block: 0, damageReduction: dmgRed, damageReductionTurns: dmgRedTurns };
      });

      if (fp.hp <= 0) {
        // 각성 보스(오탁룡 장홍)전 패배 시 구제
        const awakenedBoss = fe.find((e) => e.bossId === "wisungae" && e.bossPhase === 2);
        if (awakenedBoss) {
          const healedHp = Math.floor(fp.maxHp * 0.5);
          fp = { ...fp, hp: healedHp };
          setPlayer(fp);
          setEnemies(fe);
          finishLogs.push(`"좀더 정진하게!"`, `장홍이 떠났다. 체력이 ${healedHp}만큼 회복되었다.`);
          addLogs(finishLogs);
          setIsEnemyTurn(false);
          setBossCleared(true);
          // 시혜 카드 제거
          setDeck((prev) => prev.filter((c) => c.id !== "sihye"));
          // 다음 장 전환
          const nextChapter = chapter + 1;
          const newMap = generateMap(FLOORS_PER_CHAPTER);
          setChapter(nextChapter);
          setMapFloors(newMap);
          setCurrentFloor(0);
          setVisitedNodes(["0-0"]);
          setCurrentNodeId("0-0");
          setBossCleared(false);
          addLog(`제${nextChapter}장 — 새로운 여정이 시작된다!`);
          setPhase(GAME_PHASE.MAP);
          return;
        }
        setPlayer(fp);
        setEnemies(fe);
        setPhase(GAME_PHASE.GAME_OVER);
        finishLogs.push("태극이 소진되어 쓰러졌다...");
        addLogs(finishLogs);
        setIsEnemyTurn(false);
        return;
      }

      // 반격 등으로 적 전멸 시 승리 처리
      const allDead = fe.every((e) => e.hp <= 0);
      if (allDead) {
        // 보스 처치 시 체력 50% 회복
        const defeatedBoss = fe.find((e) => e.bossId);
        if (defeatedBoss) {
          const healTo = Math.floor(fp.maxHp * 0.5);
          fp = { ...fp, hp: Math.max(fp.hp, healTo) };
          finishLogs.push("보스 격파! → 체력 회복!");
        }
        setPlayer(fp);
        setEnemies(fe);
        finishLogs.push("적을 모두 제압했다!");
        addLogs(finishLogs);
        setIsEnemyTurn(false);

        const isBossFloor = currentFloor >= FLOORS_PER_CHAPTER;
        if (isBossFloor && chapter >= TOTAL_CHAPTERS) {
          setPhase(GAME_PHASE.VICTORY);
        } else {
          const rewardResult = generateBattleRewards(
            fe,
            currentFloor,
            chapter,
            FLOORS_PER_CHAPTER,
            TOTAL_CHAPTERS,
            isBossFloor,
            `reward_${chapter}_${currentFloor}_counter`,
          );
          if (rewardResult.isBossCleared) {
            setBossCleared(true);
          }
          setRewardCards(rewardResult.rewards);
          setPhase(GAME_PHASE.REWARD);
        }
        return;
      }

      // 기물: 턴 시작 아티팩트 (혈염석, 청명등)
      const turnStartResult = applyTurnStartArtifacts(
        artifacts,
        fp,
        player.hp,
        fb,
        ft,
      );
      fp = turnStartResult.player;
      fb = turnStartResult.buffs;
      ft = turnStartResult.taeguk;
      finishLogs.push(...turnStartResult.logs);

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

      // 디버프: 드로우 제한
      // 디버프: 드로우 제한 / 드로우 감소
      const drawLimitBuff = fb.find((b) => b.drawLimit);
      const drawReduction = fb.reduce((sum, b) => sum + (b.drawReduction || 0), 0);
      let actualDrawCount = HAND_SIZE + pouchBonus;
      if (drawLimitBuff) {
        actualDrawCount = Math.min(actualDrawCount, drawLimitBuff.drawLimit);
        finishLogs.push(`${drawLimitBuff.name} → 드로우 ${drawLimitBuff.drawLimit}장 제한!`);
      }
      if (drawReduction > 0) {
        actualDrawCount = Math.max(1, actualDrawCount - drawReduction);
        finishLogs.push(`드로우 감소! → 드로우 -${drawReduction}`);
      }

      // 디버프: 에너지 감소
      const energyReduction = fb.reduce((sum, b) => sum + (b.energyReduction || 0), 0);
      const actualEnergy = Math.max(1, MAX_ENERGY - energyReduction);
      if (energyReduction > 0) {
        finishLogs.push(`기력 저하! → 기력 ${actualEnergy}/${MAX_ENERGY}`);
      }

      const allDiscard = [...discardPile, ...hand];
      const {
        drawn,
        drawPile: newDrawPile,
        discardPile: newDiscardPile,
      } = drawCards(drawPile, allDiscard, actualDrawCount);

      const MAX_TAEGUK_CARRY = 3;
      if (ft > MAX_TAEGUK_CARRY) {
        finishLogs.push(`태극 흩어짐: ${ft} → ${MAX_TAEGUK_CARRY}`);
        ft = MAX_TAEGUK_CARRY;
      }

      setPlayer(fp);
      setEnemies(fe);
      setTurn(newTurn);
      setEnergy(actualEnergy);
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
      setCardsPlayedThisTurn(0);
      sihyeUsedRef.current = false;
      bossAttackedRef.current = false;
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
    artifacts,
    cardsPlayedThisTurn,
    artifactSwitchTotal,
    currentFloor,
    chapter,
  ]);

  const clearBattleEffect = useCallback(() => setBattleEffect(null), []);
  const clearDiscardEffect = useCallback(() => setDiscardEffect(null), []);

  // 태극 3 소모 → 기력 +1
  const spendTaeguk = useCallback(() => {
    if (taeguk < 3) return;
    setTaeguk((prev) => prev - 3);
    setEnergy((prev) => prev + 1);
    addLog("태극 3 소모 → 기력 +1");
  }, [taeguk, addLog]);

  // 보상 선택 후 맵으로 (보스 클리어 시 다음 장)
  const selectReward = useCallback(
    (card) => {
      if (card) {
        setDeck((prev) => [...prev.filter((c) => c.id !== "sihye"), card]);
        addLog(`${card.name}을(를) 깨달았다!`);
      } else {
        setDeck((prev) => prev.filter((c) => c.id !== "sihye"));
      }

      if (bossCleared) {
        const nextChapter = chapter + 1;
        const newMap = generateMap(FLOORS_PER_CHAPTER);
        setChapter(nextChapter);
        setMapFloors(newMap);
        setCurrentFloor(0);
        setVisitedNodes(["0-0"]);
        setCurrentNodeId("0-0");
        setBossCleared(false);
        addLog(`제${nextChapter}장 — 새로운 여정이 시작된다!`);
      }
      setPhase(GAME_PHASE.MAP);
    },
    [addLog, bossCleared, chapter],
  );

  // 휴식/이벤트 결과 처리 후 맵으로
  const resolveNonBattle = useCallback(
    (result) => {
      setPlayer((prev) => {
        let maxHp = prev.maxHp + (result.maxHpChange || 0);
        maxHp = Math.max(1, maxHp);
        let newHp = prev.hp + (result.hpChange || 0);
        newHp = Math.max(1, Math.min(newHp, maxHp));
        const newStr = prev.strength + (result.strengthChange || 0);
        return { ...prev, hp: newHp, maxHp, strength: newStr };
      });

      if (result.taegukChange) {
        setTaeguk((prev) => prev + result.taegukChange);
      }

      if (result.card) {
        const cardWithUid = { ...result.card, uid: `event_${Date.now()}` };
        setDeck((prev) => [...prev, cardWithUid]);
      }

      if (result.removeCardUid) {
        setDeck((prev) => prev.filter((c) => c.uid !== result.removeCardUid));
      }

      if (result.nextBattleDamage) {
        setNextBattleDamage((prev) => prev + result.nextBattleDamage);
      }

      if (result.artifact) {
        setArtifacts((prev) =>
          prev.includes(result.artifact.id)
            ? prev
            : [...prev, result.artifact.id],
        );
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
    artifacts,
    selectedEnemyIndex,
    taeguk,
    buffs,
    evasionCount,
    counter,
    stance,
    battleEffect,
    discardEffect,
    toast,
    isEnemyTurn,
    activeEnemyIndex,
    activeEnemyAction,
    activeEnemyDamage,
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
    clearDiscardEffect,
    getEffectiveCost,
    canPlayCard,
  };
}
