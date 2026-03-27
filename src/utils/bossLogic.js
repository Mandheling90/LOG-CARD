import { SIHYE_CARD, JJOKBAK_CARD } from "../data/cards";

/**
 * Prepare the deck for a boss battle by inserting boss-specific cards.
 * Currently handles: wisungae boss → insert 5 sihye cards.
 *
 * @param {object[]} deck - The player's current deck
 * @param {object} bossEnemy - The boss enemy object (first enemy in the boss array)
 * @returns {object[]} - The modified deck (new array)
 */
export function prepareBossDeck(deck, bossEnemy) {
  if (bossEnemy?.bossId === "wisungae") {
    return [
      ...deck,
      ...Array(5)
        .fill(null)
        .map((_, i) => ({
          ...SIHYE_CARD,
          uid: `sihye_${i}_${Date.now()}`,
        })),
    ];
  }
  return [...deck];
}

/**
 * Generate boss reward cards, potentially including special boss-specific rewards.
 *
 * @param {object} bossEnemy - The boss enemy (may have bossId, bossPhase)
 * @param {object[]} baseRewards - The 3 base reward cards (already shuffled/sliced)
 * @param {object[]} legendaryPool - Pool of legendary cards
 * @returns {object[]} - Modified rewards array
 */
export function getBossReward(bossEnemy, baseRewards, legendaryPool) {
  const rewards = [...baseRewards];

  // 위선개 보스 보상: 쪽박
  if (bossEnemy?.bossId === "wisungae" && bossEnemy.bossPhase === 2) {
    rewards[0] = JJOKBAK_CARD;
  }

  // 보스전 보상에는 항상 전설 카드 포함
  if (legendaryPool.length > 0) {
    // legendaryPool is expected to be already shuffled
    rewards[2] = legendaryPool[0];
  }

  return rewards;
}
