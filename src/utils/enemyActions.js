import { processEnemyAttack } from "./gameLogic";

/**
 * Process a single enemy's action during the end-of-turn phase.
 * Pure function — no React state or refs.
 *
 * @param {object} enemy - The enemy performing the action
 * @param {number} enemyIndex - Index in the enemies array
 * @param {object|null} intent - The enemy's current intent (from enemyIntents)
 * @param {object} state - { player, enemies, buffs, taeguk, evasionCount, evasionChance, counter }
 * @param {object} bossRefs - { sihyeUsed, bossAttacked } (plain booleans, not React refs)
 * @returns {{ player, enemies, buffs, taeguk, evasionCount, evasionChance, counter, logs, damageTaken, actionType, sihyeUsed, bossAttacked }}
 */
export function processEnemyAction(enemy, enemyIndex, intent, state, bossRefs) {
  let { player, enemies, buffs, taeguk, evasionCount, evasionChance, counter } = state;
  let { sihyeUsed, bossAttacked } = bossRefs;

  // Deep copy mutable state
  player = { ...player };
  enemies = enemies.map((e) => ({ ...e }));
  buffs = buffs.map((b) => ({ ...b }));
  const logs = [];

  // Stun check
  if (enemy.debuffs?.includes("stun")) {
    enemies[enemyIndex] = {
      ...enemies[enemyIndex],
      debuffs: enemy.debuffs.filter((d) => d !== "stun"),
    };
    logs.push(`${enemy.name} 기맥차단! 행동 불가!`);
    return {
      player,
      enemies,
      buffs,
      taeguk,
      evasionCount,
      evasionChance,
      counter,
      logs,
      damageTaken: 0,
      actionType: "stun",
      sihyeUsed,
      bossAttacked,
    };
  }

  if (!intent) {
    return {
      player,
      enemies,
      buffs,
      taeguk,
      evasionCount,
      evasionChance,
      counter,
      logs,
      damageTaken: 0,
      actionType: null,
      sihyeUsed,
      bossAttacked,
    };
  }

  const prevHp = player.hp;
  const prevBlock = player.block || 0;

  if (intent.type === "attack" || intent.type === "rage") {
    const atkDmg = intent.damage + (enemies[enemyIndex].strength || 0);
    const label = intent.label
      ? `${enemy.name}의 ${intent.label}`
      : `${enemy.name}의 공격`;
    logs.push(`${label} → ${atkDmg} 타격`);

    const result = processEnemyAttack(atkDmg, {
      player,
      evasionCount,
      evasionChance,
      counter,
      logs: [],
      buffs,
    });
    player = result.player;
    evasionCount = result.evasionCount;
    evasionChance = result.evasionChance;
    buffs = result.buffs;
    logs.push(...result.logs);

    if (result.dodged && result.onEvadeDmg > 0) {
      const blocked = Math.min(enemies[enemyIndex].block || 0, result.onEvadeDmg);
      enemies[enemyIndex] = {
        ...enemies[enemyIndex],
        block: Math.max(0, (enemies[enemyIndex].block || 0) - result.onEvadeDmg),
        hp: enemies[enemyIndex].hp - (result.onEvadeDmg - blocked),
      };
      logs.push(`반격! → ${enemy.name}에게 ${result.onEvadeDmg} 피해`);
    }
    if (result.dodged && result.onEvadeTaeguk > 0) {
      taeguk += result.onEvadeTaeguk;
      logs.push(`회피 보너스! → 태극 +${result.onEvadeTaeguk}`);
    }
    if (!result.dodged && result.counterDmg > 0) {
      const blocked = Math.min(enemies[enemyIndex].block || 0, result.counterDmg);
      enemies[enemyIndex] = {
        ...enemies[enemyIndex],
        block: Math.max(0, (enemies[enemyIndex].block || 0) - result.counterDmg),
        hp: enemies[enemyIndex].hp - (result.counterDmg - blocked),
      };
      logs.push(`반격! → ${enemy.name}에게 ${result.counterDmg} 반사`);
    }
    // 분노: 공격 후 공력 증가
    if (intent.type === "rage" && intent.strengthGain) {
      enemies[enemyIndex] = {
        ...enemies[enemyIndex],
        strength: (enemies[enemyIndex].strength || 0) + intent.strengthGain,
      };
      logs.push(`${enemy.name} 분노! → 공력 +${intent.strengthGain}`);
    }
  } else if (intent.type === "defend") {
    enemies[enemyIndex] = {
      ...enemies[enemyIndex],
      block: intent.block + (enemies[enemyIndex].strength || 0),
    };
    logs.push(
      `${enemy.name} 수비 태세 → ${intent.block + (enemies[enemyIndex].strength || 0)} 방어`,
    );
  } else if (intent.type === "buff_strength") {
    enemies[enemyIndex] = {
      ...enemies[enemyIndex],
      strength: (enemies[enemyIndex].strength || 0) + intent.value,
    };
    logs.push(`${enemy.name} 기공 운용! → 공력 +${intent.value}`);
  } else if (intent.type === "heal") {
    const maxHeal = intent.value;
    enemies[enemyIndex] = { ...enemies[enemyIndex], hp: enemies[enemyIndex].hp + maxHeal };
    logs.push(`${enemy.name} 회복! → 체력 +${maxHeal}`);
  } else if (intent.type === "debuff_vulnerable") {
    buffs = [
      ...buffs,
      {
        buffId: `vuln_${enemy.uid}_${Date.now()}`,
        name: `${enemy.name}의 저주`,
        duration: intent.duration || 2,
        damageReceiveMultiplier: intent.value || 1.5,
      },
    ];
    logs.push(
      `${enemy.name}의 저주! → 받는 피해 ${Math.round(((intent.value || 1.5) - 1) * 100)}% 증가 (${intent.duration || 2}턴)`,
    );
  } else if (intent.type === "buff_armor") {
    enemies[enemyIndex] = {
      ...enemies[enemyIndex],
      block: (enemies[enemyIndex].block || 0) + (intent.block || 0),
      damageReduction: intent.reduction || 0.5,
      damageReductionTurns: intent.duration || 2,
    };
    logs.push(
      `${enemy.name} 철벽! → 방어 +${intent.block || 0}, 받는 피해 ${Math.round((intent.reduction || 0.5) * 100)}% 감소 (${intent.duration || 2}턴)`,
    );
  } else if (intent.type === "begging") {
    if (sihyeUsed) {
      const heal = Math.floor(enemies[enemyIndex].hp * 0.3) + 20;
      enemies[enemyIndex] = {
        ...enemies[enemyIndex],
        hp: enemies[enemyIndex].hp + heal,
        sihyeCount: (enemies[enemyIndex].sihyeCount || 0) + 1,
      };
      logs.push(`${enemy.name}: "좋다, 좋아!" → 체력 +${heal}, 공력 강화!`);
      // 시혜 3회 → 각성
      if (enemies[enemyIndex].sihyeCount >= 3 && enemies[enemyIndex].phase2) {
        const p2 = enemies[enemyIndex].phase2;
        enemies[enemyIndex] = {
          ...enemies[enemyIndex],
          name: p2.name,
          emoji: p2.emoji,
          hp: p2.hp,
          actions: p2.actions,
          bossPhase: 2,
        };
        logs.push(
          `나를 대적하지 않기에 나의 무공은 너를 해할 수 없구나`,
          `위선개는 잊었던 걸인의 마음을 깨달았다! ${p2.name}(으)로 각성!`,
          `이젠 적이아닌 협으로 그대에게 가르침을 주겠다`,
        );
      }
    } else if (bossAttacked) {
      buffs = [
        ...buffs,
        {
          buffId: "beggar_curse_" + Date.now(),
          name: "약점 노출",
          duration: 3,
          damageReceiveMultiplier: 1.5,
        },
      ];
      logs.push(
        `${enemy.name}: "그러고도 정파의 고수냐!" → 내공을 담은 꾸짖음! (받는 피해 50% 증가, 3턴)`,
      );
    } else {
      const heal = Math.floor(enemies[enemyIndex].hp * 0.15) + 10;
      enemies[enemyIndex] = { ...enemies[enemyIndex], hp: enemies[enemyIndex].hp + heal };
      logs.push(`${enemy.name}: 구걸로 기력 회복 → 체력 +${heal}`);
    }
    sihyeUsed = false;
    bossAttacked = false;
  }

  // 피격 데미지 계산 (HP 손실 + 방어 소모)
  const damageTaken =
    intent.type === "attack" || intent.type === "rage"
      ? Math.max(0, prevHp - player.hp) + Math.max(0, prevBlock - (player.block || 0))
      : 0;

  return {
    player,
    enemies,
    buffs,
    taeguk,
    evasionCount,
    evasionChance,
    counter,
    logs,
    damageTaken,
    actionType: intent.type,
    sihyeUsed,
    bossAttacked,
  };
}
