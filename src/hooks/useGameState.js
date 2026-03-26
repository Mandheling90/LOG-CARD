import { useState, useCallback, useRef, useEffect } from "react";
import {
  createStarterDeck,
  REWARD_POOL,
  LEGENDARY_POOL,
  cardNeedsTarget,
  DEBUG_CARD,
  BASE_CARDS,
  SIHYE_CARD,
  JJOKBAK_CARD,
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

  // 이벤트 → 전투 이월 상태
  const [nextBattleDamage, setNextBattleDamage] = useState(0);

  // 기물 (아티팩트)
  const [artifacts, setArtifacts] = useState([]);
  const [artifactSwitchTotal, setArtifactSwitchTotal] = useState(0);
  const [cardsPlayedThisTurn, setCardsPlayedThisTurn] = useState(0);

  const hasArtifact = useCallback((id) => artifacts.includes(id), [artifacts]);

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
  const [activeEnemyAction, setActiveEnemyAction] = useState(null); // 'attack' | 'defend' | 'stun'
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

    // 맵 초기화
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
          // 전투 시작 (인라인)
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

          // 보스전: 시혜 카드 5장 삽입
          const allCards =
            isBossBattle && newEnemies[0]?.bossId === "wisungae"
              ? [
                  ...deck,
                  ...Array(5)
                    .fill(null)
                    .map((_, i) => ({
                      ...SIHYE_CARD,
                      uid: `sihye_${i}_${Date.now()}`,
                    })),
                ]
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

      // 기물: 파손된 도경 - 체력 50% 이하 시 태극 획득 2배
      let effectBuffs = [...buffs];
      if (hasArtifact("broken_scripture") && player.hp <= player.maxHp * 0.5) {
        effectBuffs = [...effectBuffs, { taegukMultiplier: 2 }];
      }

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

      // 기물: 경공 비급 조각 - 보법 사용 시 추가 드로우
      if (hasArtifact("lightfoot_scrap") && card.type === "bobeop") {
        result.drawCount = (result.drawCount || 0) + 1;
        result.logs.push("경공 비급 조각 → 카드 1장 추가!");
      }

      // 기물: 음양패 - 전환 5회마다 공력 +1
      const prevStance = stance;
      const newStance = result.stance;
      if (
        hasArtifact("yin_yang_token") &&
        prevStance &&
        newStance &&
        prevStance !== newStance
      ) {
        const newTotal = artifactSwitchTotal + 1;
        setArtifactSwitchTotal(newTotal);
        if (newTotal % 5 === 0) {
          result.player = {
            ...result.player,
            strength: (result.player.strength || 0) + 1,
          };
          result.logs.push("음양패 → 전환 5회 달성! 공력 +1");
        }
      }

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
      // exhaust 카드는 버린 패에 넣지 않고 소진 (전투 중 재사용 불가)
      let currentDiscardPile = card.exhaust
        ? [...discardPile]
        : [...discardPile, card];

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
        const isBossFloor = currentFloor >= FLOORS_PER_CHAPTER;
        if (isBossFloor && chapter >= TOTAL_CHAPTERS) {
          // 최종장 보스 클리어 → 승리
          setPhase(GAME_PHASE.VICTORY);
        } else if (isBossFloor) {
          // 장 보스 클리어 → 보스 보상 + 일반 보상
          const bossEnemy = result.enemies.find((e) => e.bossId);
          let pool = shuffleArray(REWARD_POOL);
          const rewards = pool.slice(0, 3);
          // 위선개 보스 보상: 쪽박
          if (bossEnemy?.bossId === "wisungae") {
            rewards[0] = JJOKBAK_CARD;
          }
          if (LEGENDARY_POOL.length > 0) {
            const lPool = shuffleArray(LEGENDARY_POOL);
            rewards[2] = lPool[0];
          }
          setRewardCards(
            rewards.map((c, i) => ({
              ...c,
              uid: `reward_ch${chapter}_boss_${i}`,
            })),
          );
          setPhase(GAME_PHASE.REWARD);
        } else {
          // 일반 전투 보상
          let pool = shuffleArray(REWARD_POOL);
          const rewards = pool.slice(0, 3);
          // 장의 후반부(3층 이상)에서 전설 카드 포함 가능
          if (
            currentFloor >= Math.ceil(FLOORS_PER_CHAPTER * 0.6) &&
            LEGENDARY_POOL.length > 0
          ) {
            const lPool = shuffleArray(LEGENDARY_POOL);
            rewards[2] = lPool[0];
          }
          setRewardCards(
            rewards.map((c, i) => ({
              ...c,
              uid: `reward_${chapter}_${currentFloor}_${i}`,
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
      switchCount,
      drawPile,
      discardPile,
      currentFloor,
      chapter,
      addLog,
      addLogs,
      getEffectiveCost,
      canPlayCard,
      hasArtifact,
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

    // 기물: 낡은 주머니 - 손패 2장 이하면 다음턴 추가 드로우
    const pouchBonus = hasArtifact("old_pouch") && hand.length <= 2 ? 2 : 0;
    if (pouchBonus > 0) addLog("낡은 주머니 → 다음 턴 카드 2장 추가!");

    // 기물: 낡은 목탁 - 카드 3장 미만 사용 시 체력 +5
    let moktakHeal = 0;
    if (hasArtifact("old_moktak") && cardsPlayedThisTurn < 3) {
      moktakHeal = 5;
      addLog("낡은 목탁 → 체력 +5 회복!");
    }

    setSelectedCardIndex(null);
    setIsEnemyTurn(true);
    enemyTurnTimers.current.forEach((t) => clearTimeout(t));
    enemyTurnTimers.current = [];

    // ── 1. 적 행동 미리 계산 ──
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

      const prevHp = cp.hp;
      const prevBlock = cp.block || 0;

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
      } else if (intent.type === "begging") {
        // 구걸 해결
        if (sihyeUsedRef.current) {
          // 시혜 사용 → 크게 회복 + 버프, sihyeCount 증가
          const heal = Math.floor(ce[i].hp * 0.3) + 20;
          ce[i] = {
            ...ce[i],
            hp: ce[i].hp + heal,
            sihyeCount: (ce[i].sihyeCount || 0) + 1,
          };
          stepLogs.push(
            `${enemy.name}: "좋다, 좋아!" → 체력 +${heal}, 공력 강화!`,
          );
          // 시혜 3회 → 각성
          if (ce[i].sihyeCount >= 3 && ce[i].phase2) {
            const p2 = ce[i].phase2;
            ce[i] = {
              ...ce[i],
              name: p2.name,
              emoji: p2.emoji,
              hp: p2.hp,
              actions: p2.actions,
              bossPhase: 2,
            };
            stepLogs.push(
              `나를 대적하지 않기에 나의 무공은 너를 해할 수 없구나`,
              `위선개는 잊었던 걸인의 마음을 깨달았다! ${p2.name}(으)로 각성!`,
              `이젠 적이아닌 협으로 그대에게 가르침을 주겠다`,
            );
          }
        } else if (bossAttackedRef.current) {
          // 공격 → 플레이어 디버프
          cBuffs = [
            ...cBuffs,
            {
              buffId: "beggar_curse_" + Date.now(),
              name: "약점 노출",
              duration: 3,
              damageReceiveMultiplier: 1.5,
            },
          ];
          stepLogs.push(
            `${enemy.name}: "그러고도 정파의 고수냐!" → 약점 노출! (받는 피해 50% 증가, 3턴)`,
          );
        } else {
          // 방치 → 회복 + 소규모 버프
          const heal = Math.floor(ce[i].hp * 0.15) + 10;
          ce[i] = { ...ce[i], hp: ce[i].hp + heal };
          stepLogs.push(`${enemy.name}: 구걸로 기력 회복 → 체력 +${heal}`);
        }
        sihyeUsedRef.current = false;
        bossAttackedRef.current = false;
      }

      // 피격 데미지 계산 (HP 손실 + 방어 소모)
      const damageTaken =
        intent.type === "attack"
          ? Math.max(0, prevHp - cp.hp) +
            Math.max(0, prevBlock - (cp.block || 0))
          : 0;

      steps.push({
        enemyIndex: i,
        actionType: intent.type,
        damageTaken,
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
        setActiveEnemyDamage(step.damageTaken || 0);
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
          // 피격 시 화면 흔들림
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

      // 반격 등으로 적 전멸 시 승리 처리
      const allDead = fe.every((e) => e.hp <= 0);
      if (allDead) {
        setPlayer(fp);
        setEnemies(fe);
        finishLogs.push("적을 모두 제압했다!");
        addLogs(finishLogs);
        setIsEnemyTurn(false);

        const isBossFloor = currentFloor >= FLOORS_PER_CHAPTER;
        if (isBossFloor && chapter >= TOTAL_CHAPTERS) {
          setPhase(GAME_PHASE.VICTORY);
        } else {
          let pool = shuffleArray(REWARD_POOL);
          const rewards = pool.slice(0, 3);
          if (isBossFloor && LEGENDARY_POOL.length > 0) {
            const lPool = shuffleArray(LEGENDARY_POOL);
            rewards[2] = lPool[0];
          } else if (
            currentFloor >= Math.ceil(FLOORS_PER_CHAPTER * 0.6) &&
            LEGENDARY_POOL.length > 0
          ) {
            const lPool = shuffleArray(LEGENDARY_POOL);
            rewards[2] = lPool[0];
          }
          setRewardCards(
            rewards.map((c, i) => ({
              ...c,
              uid: `reward_${chapter}_${currentFloor}_counter_${i}`,
            })),
          );
          setPhase(GAME_PHASE.REWARD);
        }
        return;
      }

      // 기물: 혈염석 - 플레이어가 체력을 잃었으면 다음 턴 공력 +2
      if (hasArtifact("blood_stone") && fp.hp < player.hp) {
        fb = [
          ...fb,
          {
            buffId: "blood_stone_" + Date.now(),
            name: "혈염석",
            duration: 2,
            grantedStrength: 2,
          },
        ];
        fp = { ...fp, strength: (fp.strength || 0) + 2 };
        finishLogs.push("혈염석 → 피를 흘려 공력 +2!");
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

      // 기물: 청명등 - 디버프(피해 증가 버프) 있으면 태극 +1
      if (
        hasArtifact("clear_lantern") &&
        fb.some(
          (b) => b.damageReceiveMultiplier && b.damageReceiveMultiplier > 1,
        )
      ) {
        ft += 1;
        finishLogs.push("청명등 → 디버프 상태에서 태극 +1!");
      }

      const allDiscard = [...discardPile, ...hand];
      const {
        drawn,
        drawPile: newDrawPile,
        discardPile: newDiscardPile,
      } = drawCards(drawPile, allDiscard, HAND_SIZE + pouchBonus);

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
    hasArtifact,
    cardsPlayedThisTurn,
    artifactSwitchTotal,
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

  // 보상 선택 후 맵으로
  const selectReward = useCallback(
    (card) => {
      if (card) {
        setDeck((prev) => [...prev.filter((c) => c.id !== "sihye"), card]);
        addLog(`${card.name}을(를) 깨달았다!`);
      } else {
        setDeck((prev) => prev.filter((c) => c.id !== "sihye"));
      }
      setPhase(GAME_PHASE.MAP);
    },
    [addLog],
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
