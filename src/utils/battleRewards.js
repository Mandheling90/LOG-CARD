import { shuffleArray } from "./gameLogic";
import { REWARD_POOL, LEGENDARY_POOL } from "../data/cards";
import { getBossReward } from "./bossLogic";

/**
 * Generate reward cards for a battle victory.
 * Handles normal battles, boss battles, and legendary card inclusion at later floors.
 *
 * @param {object[]} enemies - The defeated enemies array
 * @param {number} currentFloor - Current map floor
 * @param {number} chapter - Current chapter number
 * @param {number} floorsPerChapter - Number of floors per chapter
 * @param {number} totalChapters - Total number of chapters
 * @param {boolean} isBossFloor - Whether this is a boss floor
 * @param {string} uidPrefix - Prefix for generating unique card UIDs
 * @returns {{ rewards: object[], isFinalVictory: boolean, isBossCleared: boolean }}
 */
export function generateBattleRewards(
  enemies,
  currentFloor,
  chapter,
  floorsPerChapter,
  totalChapters,
  isBossFloor,
  uidPrefix,
) {
  // Final boss of final chapter → victory, no rewards needed
  if (isBossFloor && chapter >= totalChapters) {
    return { rewards: [], isFinalVictory: true, isBossCleared: false };
  }

  if (isBossFloor) {
    // Boss battle rewards
    const bossEnemy = enemies.find((e) => e.bossId);
    const pool = shuffleArray(REWARD_POOL);
    const baseRewards = pool.slice(0, 3);
    const lPool = shuffleArray(LEGENDARY_POOL);
    const rewards = getBossReward(bossEnemy, baseRewards, lPool);

    return {
      rewards: rewards.map((c, i) => ({
        ...c,
        uid: `${uidPrefix}_boss_${i}`,
      })),
      isFinalVictory: false,
      isBossCleared: true,
    };
  }

  // Normal battle rewards
  const pool = shuffleArray(REWARD_POOL);
  const rewards = pool.slice(0, 3);

  // 장의 후반부(60% 이상)에서 전설 카드 포함 가능
  if (
    currentFloor >= Math.ceil(floorsPerChapter * 0.6) &&
    LEGENDARY_POOL.length > 0
  ) {
    const lPool = shuffleArray(LEGENDARY_POOL);
    rewards[2] = lPool[0];
  }

  return {
    rewards: rewards.map((c, i) => ({
      ...c,
      uid: `${uidPrefix}_${i}`,
    })),
    isFinalVictory: false,
    isBossCleared: false,
  };
}
