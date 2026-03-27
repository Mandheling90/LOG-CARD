/**
 * Artifact effect processing — all pure functions.
 * No React state, hooks, or refs.
 */

/**
 * Apply pre-card-play artifact effects (before processCardEffects).
 * Currently handles: broken_scripture (태극 획득 2배 at low HP).
 *
 * @param {string[]} artifacts - List of artifact IDs the player owns
 * @param {object} card - The card being played
 * @param {object} player - Current player state
 * @param {object[]} buffs - Current buffs array
 * @returns {{ buffs: object[] }} - Modified buffs to pass into processCardEffects
 */
export function applyPreCardArtifacts(artifacts, card, player, buffs) {
  let effectBuffs = [...buffs];

  // 파손된 도경 - 체력 50% 이하 시 태극 획득 2배
  if (artifacts.includes("broken_scripture") && player.hp <= player.maxHp * 0.5) {
    effectBuffs = [...effectBuffs, { taegukMultiplier: 2 }];
  }

  return { buffs: effectBuffs };
}

/**
 * Apply post-card-play artifact effects (after processCardEffects).
 * Currently handles: lightfoot_scrap (보법 추가 드로우), yin_yang_token (전환 5회 공력+1).
 *
 * @param {string[]} artifacts - List of artifact IDs
 * @param {object} card - The card that was played
 * @param {object} result - The result from processCardEffects (will be mutated)
 * @param {string|null} prevStance - Stance before playing the card
 * @param {number} artifactSwitchTotal - Running total of stance switches for yin_yang_token
 * @returns {{ result: object, newArtifactSwitchTotal: number }}
 */
export function applyPostCardArtifacts(artifacts, card, result, prevStance, artifactSwitchTotal) {
  let newArtifactSwitchTotal = artifactSwitchTotal;

  // 경공 비급 조각 - 보법 사용 시 추가 드로우
  if (artifacts.includes("lightfoot_scrap") && card.type === "bobeop") {
    result.drawCount = (result.drawCount || 0) + 1;
    result.logs.push("경공 비급 조각 → 카드 1장 추가!");
  }

  // 음양패 - 전환 5회마다 공력 +1
  const newStance = result.stance;
  if (
    artifacts.includes("yin_yang_token") &&
    prevStance &&
    newStance &&
    prevStance !== newStance
  ) {
    newArtifactSwitchTotal = artifactSwitchTotal + 1;
    if (newArtifactSwitchTotal % 5 === 0) {
      result.player = {
        ...result.player,
        strength: (result.player.strength || 0) + 1,
      };
      result.logs.push("음양패 → 전환 5회 달성! 공력 +1");
    }
  }

  return { result, newArtifactSwitchTotal };
}

/**
 * Apply turn-end artifact effects (before enemy actions).
 * Currently handles: old_pouch (손패 2장 이하 시 추가 드로우), old_moktak (카드 3장 미만 시 회복).
 *
 * @param {string[]} artifacts - List of artifact IDs
 * @param {object[]} hand - Current hand cards
 * @param {number} cardsPlayedThisTurn - Number of cards played this turn
 * @returns {{ pouchBonus: number, moktakHeal: number, logs: string[] }}
 */
export function applyTurnEndArtifacts(artifacts, hand, cardsPlayedThisTurn) {
  const logs = [];
  let pouchBonus = 0;
  let moktakHeal = 0;

  // 낡은 주머니 - 손패 2장 이하면 다음턴 추가 드로우
  if (artifacts.includes("old_pouch") && hand.length <= 2) {
    pouchBonus = 2;
    logs.push("낡은 주머니 → 다음 턴 카드 2장 추가!");
  }

  // 낡은 목탁 - 카드 3장 미만 사용 시 체력 +5
  if (artifacts.includes("old_moktak") && cardsPlayedThisTurn < 3) {
    moktakHeal = 5;
    logs.push("낡은 목탁 → 체력 +5 회복!");
  }

  return { pouchBonus, moktakHeal, logs };
}

/**
 * Apply turn-start artifact effects (in the finish timer, after enemy actions).
 * Currently handles: blood_stone (체력 감소 시 공력+2), clear_lantern (디버프 시 태극+1).
 *
 * @param {string[]} artifacts - List of artifact IDs
 * @param {object} player - Current player state
 * @param {number} previousHp - Player HP before enemy actions (to detect damage taken)
 * @param {object[]} buffs - Current buffs
 * @param {number} taeguk - Current taeguk value
 * @returns {{ player: object, buffs: object[], taeguk: number, logs: string[] }}
 */
export function applyTurnStartArtifacts(artifacts, player, previousHp, buffs, taeguk) {
  let fp = { ...player };
  let fb = [...buffs];
  let ft = taeguk;
  const logs = [];

  // 혈염석 - 플레이어가 체력을 잃었으면 다음 턴 공력 +2
  if (artifacts.includes("blood_stone") && fp.hp < previousHp) {
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
    logs.push("혈염석 → 피를 흘려 공력 +2!");
  }

  // 청명등 - 디버프(피해 증가 버프) 있으면 태극 +1
  if (
    artifacts.includes("clear_lantern") &&
    fb.some((b) => b.damageReceiveMultiplier && b.damageReceiveMultiplier > 1)
  ) {
    ft += 1;
    logs.push("청명등 → 디버프 상태에서 태극 +1!");
  }

  return { player: fp, buffs: fb, taeguk: ft, logs };
}
