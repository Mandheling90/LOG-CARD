import { processEnemyAttack } from "./gameLogic";

// 구걸 변형 데이터
const BEGGING_VARIANTS = {
  money: {
    name: "돈구걸",
    emoji: "💰",
    log: "\"한 푼만 주시오!\"",
    sihye: { heal: 20, strength: 2, debuffLog: "돈을 줘서 주머니가 가벼워졌다..." },
    attack: { debuff: { name: "빈곤의 저주", duration: 2, drawLimit: 3 }, log: "\"돈도 없는 놈이 칼질이야!\"" },
    ignore: { block: 15, strength: 1, log: "\"쳇, 쩨쩨한 놈. 돈으로 장비나 사야겠군\"" },
  },
  food: {
    name: "밥구걸",
    emoji: "🍚",
    log: "\"밥 한술만 주시오!\"",
    sihye: { heal: 30, strength: 1, debuffLog: "밥을 나눠주니 힘이 빠진다..." },
    attack: { debuff: { name: "굶주린 자의 원한", duration: 2, energyReduction: 1 }, log: "\"굶주린 자를 때리다니!\"" },
    ignore: { heal: 20, strength: 1, log: "\"배고프면 자력구제! 든든하군\"" },
  },
  mercy: {
    name: "자비구걸",
    emoji: "🙏",
    log: "\"자비를 베풀어주시오!\"",
    sihye: { heal: 15, strength: 3, debuffLog: "자비를 베푸니 마음이 약해졌다..." },
    attack: { debuff: { name: "무자비의 업보", duration: 2, damageReceiveMultiplier: 1.5 }, log: "\"무자비한 놈!\"" },
    ignore: { damageReduction: 0.5, damageReductionTurns: 2, log: "\"자비 없는 세상, 스스로를 지키리라\"" },
  },
  life: {
    name: "목숨구걸",
    emoji: "💀",
    log: "\"목숨만은 살려주시오!\"",
    sihye: { heal: 25, strength: 2, debuffLog: "목숨값으로 기력을 내어주었다..." },
    attack: { counterDmg: 30, log: "\"죽기 살기로 간다!\"" },
    ignore: { strength: 3, log: "\"무시하면... 이를 갈며 분노한다\"" },
  },
};

const BEGGING_KEYS = Object.keys(BEGGING_VARIANTS);

export function getRandomBeggingVariant() {
  return BEGGING_KEYS[Math.floor(Math.random() * BEGGING_KEYS.length)];
}

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
  let { player, enemies, buffs, taeguk, evasionCount, evasionChance, counter } =
    state;
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

  // action에 커스텀 로그가 있으면 먼저 출력
  if (intent.log) {
    logs.push(intent.log);
  }

  if (intent.type === "attack" || intent.type === "rage") {
    const atkDmg = intent.damage + (enemies[enemyIndex].strength || 0);
    const hits = intent.hits || 1;
    const label = intent.label
      ? `${enemy.name}의 ${intent.label}`
      : `${enemy.name}의 공격`;
    logs.push(`${label} → ${atkDmg}${hits > 1 ? `×${hits}` : ''} 타격`);

    // 관통강타: 공격 전 플레이어 방어력 제거
    if (intent.stripBlock && (player.block || 0) > 0) {
      const stripped = player.block;
      player = { ...player, block: 0 };
      logs.push(`호신강기 관통! → 방어 ${stripped} 제거!`);
    }

    for (let h = 0; h < hits; h++) {
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
      block: (enemies[enemyIndex].block || 0) + (intent.block || 0),
    };
    logs.push(`${enemy.name} 기공 운용! → 공력 +${intent.value}${intent.block ? `, 방어 +${intent.block}` : ''}`);
  } else if (intent.type === "heal") {
    const maxHeal = intent.value;
    const healBlock = intent.block || 0;
    enemies[enemyIndex] = {
      ...enemies[enemyIndex],
      hp: enemies[enemyIndex].hp + maxHeal,
      block: (enemies[enemyIndex].block || 0) + healBlock,
    };
    logs.push(`${enemy.name} 회복! → 체력 +${maxHeal}${healBlock > 0 ? `, 방어 +${healBlock}` : ''}`);
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
    // 구걸 변형 결정 (intent에 variant가 있으면 사용, 없으면 랜덤)
    const variantKey = intent.beggingVariant || getRandomBeggingVariant();
    const variant = BEGGING_VARIANTS[variantKey];

    if (sihyeUsed) {
      // 시혜 → 회복 + 공력 증가 + sihyeCount++
      const heal = variant.sihye.heal;
      const strGain = variant.sihye.strength;
      enemies[enemyIndex] = {
        ...enemies[enemyIndex],
        hp: enemies[enemyIndex].hp + heal,
        strength: (enemies[enemyIndex].strength || 0) + strGain,
        sihyeCount: (enemies[enemyIndex].sihyeCount || 0) + 1,
      };
      const sihyeLines = [
        `${enemy.name}: "더 가져와! 아니, 다 가져와!" → 체력 +${heal}, 공력 +${strGain}!`,
        `${enemy.name}: "좋구나 좋아!" → 체력 +${heal}, 공력 +${strGain}!`,
        `${enemy.name}: "크하하! 졌네, 졌어" → 체력 +${heal}, 공력 +${strGain}!`,
      ];
      const sihyeIdx = (enemies[enemyIndex].sihyeCount - 1) % sihyeLines.length;
      logs.push(sihyeLines[sihyeIdx]);

      // 시혜 대가: 공격 시와 동일한 플레이어 디버프
      const atkEffect = variant.attack;
      if (atkEffect.debuff) {
        const d = atkEffect.debuff;
        buffs = [
          ...buffs,
          {
            buffId: `sihye_cost_${variantKey}_${Date.now()}`,
            name: d.name,
            duration: d.duration,
            drawLimit: d.drawLimit || null,
            energyReduction: d.energyReduction || null,
            damageReceiveMultiplier: d.damageReceiveMultiplier || null,
          },
        ];
        logs.push(variant.sihye.debuffLog);
        if (d.drawLimit) logs.push(`→ 드로우 ${d.drawLimit}장 제한 (${d.duration}턴)`);
        else if (d.energyReduction) logs.push(`→ 기력 -${d.energyReduction} (${d.duration}턴)`);
        else if (d.damageReceiveMultiplier) logs.push(`→ 받는 피해 ${Math.round((d.damageReceiveMultiplier - 1) * 100)}% 증가 (${d.duration}턴)`);
      }
      if (atkEffect.counterDmg) {
        logs.push(variant.sihye.debuffLog);
        const blocked = Math.min(player.block || 0, atkEffect.counterDmg);
        player = {
          ...player,
          block: Math.max(0, (player.block || 0) - atkEffect.counterDmg),
          hp: player.hp - (atkEffect.counterDmg - blocked),
        };
        logs.push(`목숨값 → ${atkEffect.counterDmg} 피해!`);
      }

      // 시혜 대가: 무시 시와 동일한 보스 버프
      const ignEffect = variant.ignore;
      if (ignEffect.block) {
        enemies[enemyIndex] = { ...enemies[enemyIndex], block: (enemies[enemyIndex].block || 0) + ignEffect.block };
        logs.push(`${enemies[enemyIndex].name} → 방어 +${ignEffect.block}`);
      }
      if (ignEffect.heal) {
        enemies[enemyIndex] = { ...enemies[enemyIndex], hp: enemies[enemyIndex].hp + ignEffect.heal };
        logs.push(`${enemies[enemyIndex].name} → 체력 +${ignEffect.heal}`);
      }
      if (ignEffect.damageReduction) {
        enemies[enemyIndex] = { ...enemies[enemyIndex], damageReduction: ignEffect.damageReduction, damageReductionTurns: ignEffect.damageReductionTurns || 2 };
        logs.push(`${enemies[enemyIndex].name} → 받는 피해 ${Math.round(ignEffect.damageReduction * 100)}% 감소 (${ignEffect.damageReductionTurns || 2}턴)`);
      }
      // ignore의 strength는 sihye.strength에 이미 포함되므로 중복 적용하지 않음

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
          `거지를 대적하지 않기에 나의 무공은 그대를 해할 수 없네`,
          `위선개는 잊었던 걸인의 마음을 깨달았다! ${p2.name}(으)로 각성!`,
          `이젠 적이아닌 협으로 그대에게 가르침을 주겠다`,
        );
      }
    } else if (bossAttacked) {
      // 공격 → 변형별 패널티
      const atkEffect = variant.attack;
      logs.push(`${enemy.name}: ${atkEffect.log}`);
      if (atkEffect.debuff) {
        const debuff = atkEffect.debuff;
        buffs = [
          ...buffs,
          {
            buffId: `beggar_${variantKey}_${Date.now()}`,
            name: debuff.name,
            duration: debuff.duration,
            damageReceiveMultiplier: debuff.damageReceiveMultiplier || null,
            drawLimit: debuff.drawLimit || null,
            energyReduction: debuff.energyReduction || null,
          },
        ];
        if (debuff.drawLimit) {
          logs.push(`${debuff.name}! → 턴 드로우 ${debuff.drawLimit}장 제한 (${debuff.duration}턴)`);
        } else if (debuff.energyReduction) {
          logs.push(`${debuff.name}! → 기력 -${debuff.energyReduction} (${debuff.duration}턴)`);
        } else if (debuff.damageReceiveMultiplier) {
          logs.push(`${debuff.name}! → 받는 피해 ${Math.round((debuff.damageReceiveMultiplier - 1) * 100)}% 증가 (${debuff.duration}턴)`);
        }
      }
      if (atkEffect.counterDmg) {
        const blocked = Math.min(player.block || 0, atkEffect.counterDmg);
        player = {
          ...player,
          block: Math.max(0, (player.block || 0) - atkEffect.counterDmg),
          hp: player.hp - (atkEffect.counterDmg - blocked),
        };
        logs.push(`${enemy.name}의 필사 반격! → ${atkEffect.counterDmg} 피해!`);
      }
    } else {
      // 무시 → 변형별 효과
      const ignEffect = variant.ignore;
      logs.push(`${enemy.name}: ${ignEffect.log}`);
      if (ignEffect.heal) {
        enemies[enemyIndex] = {
          ...enemies[enemyIndex],
          hp: enemies[enemyIndex].hp + ignEffect.heal,
        };
        logs.push(`${enemy.name} → 체력 +${ignEffect.heal}`);
      }
      if (ignEffect.block) {
        enemies[enemyIndex] = {
          ...enemies[enemyIndex],
          block: (enemies[enemyIndex].block || 0) + ignEffect.block,
        };
        logs.push(`${enemy.name} → 방어 +${ignEffect.block}`);
      }
      if (ignEffect.strength) {
        enemies[enemyIndex] = {
          ...enemies[enemyIndex],
          strength: (enemies[enemyIndex].strength || 0) + ignEffect.strength,
        };
        logs.push(`${enemy.name} 분노! → 공력 +${ignEffect.strength}`);
      }
      if (ignEffect.damageReduction) {
        enemies[enemyIndex] = {
          ...enemies[enemyIndex],
          damageReduction: ignEffect.damageReduction,
          damageReductionTurns: ignEffect.damageReductionTurns || 2,
        };
        logs.push(`${enemy.name} → 받는 피해 ${Math.round(ignEffect.damageReduction * 100)}% 감소 (${ignEffect.damageReductionTurns || 2}턴)`);
      }
    }
    sihyeUsed = false;
    bossAttacked = false;
  }

  // 피격 데미지 계산 (HP 손실 + 방어 소모)
  const damageTaken =
    intent.type === "attack" || intent.type === "rage"
      ? Math.max(0, prevHp - player.hp) +
        Math.max(0, prevBlock - (player.block || 0))
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
