export function shuffleArray(arr) {
  const shuffled = [...arr];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

export function drawCards(drawPile, discardPile, count) {
  let pile = [...drawPile];
  let discard = [...discardPile];
  const drawn = [];

  for (let i = 0; i < count; i++) {
    if (pile.length === 0) {
      if (discard.length === 0) break;
      pile = shuffleArray(discard);
      discard = [];
    }
    drawn.push(pile.pop());
  }

  return { drawn, drawPile: pile, discardPile: discard };
}

export function getEnemyIntent(enemy, turn) {
  const actions = enemy.actions;
  return actions[turn % actions.length];
}

// 단일 대상 데미지 적용 (방어 고려)
function dealDamage(target, amount) {
  const t = { ...target };
  const blocked = Math.min(t.block || 0, amount);
  t.block = Math.max(0, (t.block || 0) - amount);
  t.hp -= amount - blocked;
  return t;
}

// 카드의 기본 효과가 어떤 자세를 부여하는지 판별
function getCardStance(card) {
  for (const e of card.effects) {
    if (e.type === "damage" || e.type === "finisher" || e.type === "aoe" || e.type === "multiHit")
      return "attack";
    if (e.type === "block" || e.type === "counter") return "defense";
    if (e.type === "stanceSwitch") return "switch";
    // 태극 관련 심법은 현재 자세를 유지하되, switchBonus 판정이 가능하도록 "neutral" 반환
    if (e.type === "taeguk" || e.type === "taegukNextTurn" || e.type === "taegukStrength") return "neutral";
  }
  // buff만 있는 심법/보법 카드도 neutral 반환
  if (card.effects.some(e => e.type === "buff")) return "neutral";
  return null;
}

// 자세 전환이 발생하는지 판별
function isStanceSwitching(prevStance, newStance, switchBonus) {
  if (!switchBonus || !prevStance || !newStance) return false;
  if (newStance === "switch" || newStance === "neutral") return false;

  const dir = switchBonus.direction;
  if (dir === "any" && prevStance !== newStance) return true;
  if (dir === "def_to_atk" && prevStance === "defense" && newStance === "attack") return true;
  if (dir === "atk_to_def" && prevStance === "attack" && newStance === "defense") return true;
  return false;
}

// 카드 효과 처리
export function processCardEffects(card, state, targetIndex) {
  let {
    player, enemies, taeguk, buffs, evasionCount, evasionChance, counter, stance, logs,
    switchCount = 0,
  } = { ...state };
  player = { ...player };
  enemies = enemies.map((e) => ({ ...e, debuffs: [...(e.debuffs || [])] }));
  logs = [...logs];

  const taegukMult = buffs.reduce(
    (m, b) => (b.taegukMultiplier ? m * b.taegukMultiplier : m), 1,
  );

  // 초기 자세 기록
  const initialStance = stance;

  // 자세 전환 보너스 판정
  const prevStance = stance;
  const newStance = getCardStance(card);
  const hasUnityBuff = buffs.some((b) => b.alwaysTriggerSwitchBonus);
  const switched = (hasUnityBuff && card.switchBonus && (newStance || prevStance))
    || isStanceSwitching(prevStance, newStance, card.switchBonus);

  if (switched) {
    logs.push(`【${card.switchBonus.label}】`);
  }

  let finisherMultOverride = null;
  let aoeThresholdOverride = null;
  let convertToAOE = false;

  if (switched && card.switchBonus) {
    for (const be of card.switchBonus.effects) {
      if (be.type === "finisherUpgrade") finisherMultOverride = be.multiplier;
      if (be.type === "aoeThresholdReduce") aoeThresholdOverride = be.newThreshold;
      if (be.type === "convertToAOE") convertToAOE = true;
    }
  }

  // multiHit 추적용
  let lastMultiHitDmg = 0;
  let lastDamageValue = 0;

  // 기본 효과 처리
  for (const effect of card.effects) {
    switch (effect.type) {
      case "damage": {
        const dmg = effect.value + (player.strength || 0);
        lastDamageValue = dmg;
        if (convertToAOE) {
          enemies = enemies.map((e) => {
            if (e.hp <= 0) return e;
            logs.push(`${card.name} → ${e.name}에게 ${dmg} 타격`);
            return dealDamage(e, dmg);
          });
        } else {
          if (targetIndex === null || targetIndex === undefined) break;
          enemies[targetIndex] = dealDamage(enemies[targetIndex], dmg);
          logs.push(`${card.name} → ${enemies[targetIndex].name}에게 ${dmg} 타격`);
        }
        stance = "attack";
        break;
      }

      case "multiHit": {
        if (targetIndex === null || targetIndex === undefined) break;
        const dmg = effect.value + (player.strength || 0);
        lastMultiHitDmg = dmg;
        for (let h = 0; h < effect.hits; h++) {
          enemies[targetIndex] = dealDamage(enemies[targetIndex], dmg);
        }
        logs.push(`${card.name} → ${enemies[targetIndex].name}에게 ${dmg}×${effect.hits} 타격`);
        stance = "attack";
        break;
      }

      case "bonusDamagePerBlock": {
        if (targetIndex === null || targetIndex === undefined) break;
        const targetBlock = enemies[targetIndex].block || 0;
        if (targetBlock > 0 && enemies[targetIndex].hp > 0) {
          enemies[targetIndex] = dealDamage(enemies[targetIndex], targetBlock);
          logs.push(`호조 관통! → 방어도 ${targetBlock}만큼 추가 피해`);
        }
        break;
      }

      case "extraHitsPerSwitch": {
        if (targetIndex === null || targetIndex === undefined) break;
        if (lastMultiHitDmg <= 0) break;
        if (switchCount > 0 && enemies[targetIndex].hp > 0) {
          for (let h = 0; h < switchCount; h++) {
            enemies[targetIndex] = dealDamage(enemies[targetIndex], lastMultiHitDmg);
          }
          logs.push(`전환 연쇄! → ${lastMultiHitDmg}×${switchCount} 추가 타격`);
        }
        break;
      }

      case "extraHitsFromTaeguk": {
        const extraHits = Math.floor(taeguk * effect.ratio);
        if (extraHits <= 0 || lastDamageValue <= 0) break;
        if (convertToAOE) {
          for (let h = 0; h < extraHits; h++) {
            enemies = enemies.map((e) => {
              if (e.hp <= 0) return e;
              return dealDamage(e, lastDamageValue);
            });
          }
          logs.push(`태극 ${taeguk} → 전체 ${lastDamageValue}×${extraHits} 추가 타격!`);
        } else {
          if (targetIndex === null || targetIndex === undefined) break;
          for (let h = 0; h < extraHits; h++) {
            enemies[targetIndex] = dealDamage(enemies[targetIndex], lastDamageValue);
          }
          logs.push(`태극 ${taeguk} → ${lastDamageValue}×${extraHits} 추가 타격!`);
        }
        break;
      }

      case "applyDebuff": {
        if (targetIndex === null || targetIndex === undefined) break;
        if (enemies[targetIndex].hp > 0) {
          enemies[targetIndex].debuffs.push(effect.debuff);
          logs.push(`${card.name} → ${enemies[targetIndex].name}에게 ${effect.label}!`);
        }
        break;
      }

      case "enemyBlockBreak": {
        enemies = enemies.map((e) => {
          if (e.hp <= 0 || !e.block) return e;
          const removed = Math.floor(e.block * effect.ratio);
          logs.push(`${card.name} → ${e.name} 방어 ${removed} 제거`);
          return { ...e, block: e.block - removed };
        });
        break;
      }

      case "counterPerSwitch": {
        const bonus = switchCount * effect.value;
        if (bonus > 0) {
          counter += bonus;
          logs.push(`${card.name} → 전환 ${switchCount}회 × 반격 +${effect.value} = +${bonus}`);
        }
        break;
      }

      case "selfHpCostPercent": {
        const cost = Math.max(1, Math.floor(player.hp * effect.value / 100));
        player.hp -= cost;
        logs.push(`${card.name} → 체력 ${cost} 소모`);
        break;
      }

      case "onKillTaeguk": {
        if (targetIndex === null || targetIndex === undefined) break;
        if (enemies[targetIndex].hp <= 0) {
          taeguk += effect.value;
          logs.push(`처치 보너스! → 태극 +${effect.value}`);
        }
        break;
      }

      case "block": {
        let blockVal = effect.value;
        if (effect.taegukBonus && taeguk >= effect.taegukBonus.threshold) {
          blockVal = effect.taegukBonus.value;
          logs.push(`${card.name} → 태극 충만! 호신강기 +${blockVal}`);
        } else {
          logs.push(`${card.name} → 호신강기 +${blockVal}`);
        }
        player.block = (player.block || 0) + blockVal;
        stance = "defense";
        break;
      }

      case "evasionChance": {
        evasionChance = Math.max(evasionChance, effect.value);
        logs.push(`${card.name} → ${effect.value}% 회피 준비`);
        break;
      }

      case "evasionCount": {
        evasionCount += effect.value;
        logs.push(`${card.name} → 공격 ${effect.value}회 회피`);
        break;
      }

      case "draw": {
        logs.push(`${card.name} → 비급 ${effect.value}장 펼침`);
        break;
      }

      case "taeguk": {
        const gained = Math.floor(effect.value * taegukMult);
        taeguk += gained;
        logs.push(`${card.name} → 태극 +${gained}`);
        break;
      }

      case "taegukNextTurn": {
        buffs = [
          ...buffs,
          {
            buffId: "qi_regen_" + Date.now(),
            name: "행공 여운",
            duration: 1,
            perTurn: { taeguk: Math.floor(effect.value * taegukMult) },
          },
        ];
        logs.push(`다음 턴 태극 +${effect.value} 예약`);
        break;
      }

      case "counter": {
        counter += effect.value;
        logs.push(`${card.name} → 반격 태세 (피격 시 ${effect.value} 반사)`);
        stance = "defense";
        break;
      }

      case "stanceSwitch": {
        if (stance === "attack" || stance === null) {
          const eff = effect.attackEffect;
          if (eff.type === "block") {
            player.block = (player.block || 0) + eff.value;
            logs.push(`음양전환(양→음) → 호신강기 +${eff.value}`);
          }
          stance = "defense";
        } else {
          const eff = effect.defenseEffect;
          if (eff.type === "aoe") {
            enemies = enemies.map((e) => {
              if (e.hp <= 0) return e;
              const hit = dealDamage(e, eff.value);
              logs.push(`음양전환(음→양) → ${e.name}에게 ${eff.value} 타격`);
              return hit;
            });
          }
          stance = "attack";
        }
        break;
      }

      case "finisher": {
        if (taeguk <= 0) {
          logs.push(`${card.name} → 태극이 없다!`);
          break;
        }
        const mult = finisherMultOverride || effect.multiplier;
        const dmg = taeguk * mult + (player.strength || 0);
        logs.push(`${card.name} → 태극 ${taeguk} × ${mult} = ${dmg} 타격!`);
        if (targetIndex !== null && targetIndex !== undefined) {
          enemies[targetIndex] = dealDamage(enemies[targetIndex], dmg);
        }
        taeguk = 0;
        stance = "attack";
        break;
      }

      case "aoe": {
        let dmg = effect.value + (player.strength || 0);
        const threshold = aoeThresholdOverride || effect.taegukThreshold;
        if (threshold && taeguk >= threshold) {
          dmg *= effect.bonusMultiplier;
          logs.push(`${card.name} → 태극 충만! 위력 ${effect.bonusMultiplier}배!`);
        }
        enemies = enemies.map((e) => {
          if (e.hp <= 0) return e;
          logs.push(`${card.name} → ${e.name}에게 ${dmg} 타격`);
          return dealDamage(e, dmg);
        });
        stance = "attack";
        break;
      }

      case "buff": {
        buffs = buffs.filter((b) => b.buffId !== effect.buffId);
        buffs = [
          ...buffs,
          {
            buffId: effect.buffId,
            name: effect.name,
            duration: effect.duration,
            perTurn: effect.perTurn || null,
            taegukMultiplier: effect.taegukMultiplier || null,
            damageReceiveMultiplier: effect.damageReceiveMultiplier || null,
            perSwitch: effect.perSwitch || null,
            onEvade: effect.onEvade || null,
            grantedStrength: effect.grantedStrength || null,
            alwaysTriggerSwitchBonus: effect.alwaysTriggerSwitchBonus || null,
            invincible: effect.invincible || null,
            storedDamage: effect.storedDamage ?? null,
            guaranteedEvade: effect.guaranteedEvade || null,
            overflowBlock: effect.overflowBlock || null,
          },
        ];
        logs.push(`${effect.name} 발동! (${effect.duration}턴)`);
        break;
      }

      case "forceSwitch": {
        if (stance === "attack") {
          stance = "defense";
          logs.push(`${card.name} → 공→수 전환!`);
        } else if (stance === "defense") {
          stance = "attack";
          logs.push(`${card.name} → 수→공 전환!`);
        } else {
          // 자세 없음 → 공격 자세로 전환
          stance = "attack";
          logs.push(`${card.name} → 공격 자세 진입!`);
        }
        break;
      }

      case "blockToDamage": {
        const currentBlock = player.block || 0;
        if (currentBlock <= 0) {
          logs.push(`${card.name} → 호신강기가 없다!`);
          break;
        }
        const dmg = Math.floor(currentBlock * effect.ratio);
        enemies = enemies.map((e) => {
          if (e.hp <= 0) return e;
          logs.push(`${card.name} → ${e.name}에게 ${dmg} 타격 (호신강기 전환)`);
          return dealDamage(e, dmg);
        });
        break;
      }

      case "consumeTaegukDraw": {
        if (taeguk <= 0) {
          logs.push(`${card.name} → 태극이 없다!`);
          break;
        }
        const drawAmount = Math.floor(taeguk * effect.ratio);
        logs.push(`${card.name} → 태극 ${taeguk} 소모 → ${drawAmount}장 뽑기!`);
        effect._drawOverride = drawAmount;
        taeguk = 0;
        break;
      }

      case "selfDamage": {
        player.hp -= effect.value;
        logs.push(`${card.name} → 자해 ${effect.value} 피해!`);
        break;
      }

      case "healPercent": {
        const heal = Math.floor(player.maxHp * effect.value / 100);
        const before = player.hp;
        player.hp = Math.min(player.maxHp, player.hp + heal);
        const actual = player.hp - before;
        logs.push(`${card.name} → 체력 ${actual} 회복`);
        break;
      }

      case "cleanseAll": {
        // 향후 플레이어 디버프 시스템 추가 시 여기서 제거
        // 현재는 음성 버프(피해 증가 등) 제거
        const before = buffs.length;
        buffs = buffs.filter((b) => !b.damageReceiveMultiplier || b.damageReceiveMultiplier <= 1);
        if (buffs.length < before) {
          logs.push(`${card.name} → 음성 효과 제거!`);
        } else {
          logs.push(`${card.name} → 제거할 효과 없음`);
        }
        break;
      }

      case "drawFromTaeguk": {
        if (taeguk <= 0) {
          logs.push(`${card.name} → 태극이 없어 뽑기 불가`);
          break;
        }
        effect._drawOverride = taeguk;
        logs.push(`${card.name} → 태극 ${taeguk}만큼 비급 펼침!`);
        break;
      }

      case "consumeTaegukCost": {
        if (taeguk < effect.value) {
          logs.push(`${card.name} → 태극이 부족하다! (${taeguk}/${effect.value})`);
          // 태극 부족 시 이후 효과도 모두 스킵
          return {
            player, enemies, taeguk, buffs, evasionCount, evasionChance, counter, stance, logs,
            drawCount: 0, switchCount,
          };
        }
        taeguk -= effect.value;
        logs.push(`${card.name} → 태극 ${effect.value} 소모`);
        break;
      }

      case "taegukStrength": {
        const bonus = taeguk;
        if (bonus <= 0) {
          logs.push(`${card.name} → 태극이 부족하여 효과 미미`);
          break;
        }
        player.strength = (player.strength || 0) + bonus;
        buffs = buffs.filter((b) => b.buffId !== "taeguk_insight");
        buffs = [
          ...buffs,
          {
            buffId: "taeguk_insight",
            name: "태극심안",
            duration: effect.duration,
            grantedStrength: bonus,
          },
        ];
        logs.push(`${card.name} → 공력 +${bonus} (${effect.duration}턴)`);
        break;
      }
    }
  }

  // 전환 보너스 효과 적용
  if (switched && card.switchBonus) {
    for (const be of card.switchBonus.effects) {
      switch (be.type) {
        case "evasionChance":
          evasionChance = Math.max(evasionChance, be.value);
          break;
        case "block":
          player.block = (player.block || 0) + be.value;
          break;
        case "taeguk": {
          const gained = Math.floor(be.value * taegukMult);
          taeguk += gained;
          break;
        }
        case "evasionCount":
          evasionCount += be.value;
          break;
        case "counter":
          counter += be.value;
          break;
        case "blockRemove":
          enemies = enemies.map((e) => {
            if (e.hp <= 0 || !e.block) return e;
            logs.push(`${e.name} 방어 제거!`);
            return { ...e, block: 0 };
          });
          break;
        case "aoeDamage":
          enemies = enemies.map((e) => {
            if (e.hp <= 0) return e;
            logs.push(`전환 피해! → ${e.name}에게 ${be.value}`);
            return dealDamage(e, be.value);
          });
          break;
      }
    }
  }

  // 자세 전환 감지 → 태극 +1 + switchCount 증가 + perSwitch 버프 발동
  let perSwitchDraw = 0;
  if (initialStance !== null && stance !== initialStance) {
    switchCount++;
    // 공수 전환 시 항상 태극 +1
    const taegukGain = Math.floor(1 * taegukMult);
    taeguk += taegukGain;
    logs.push(`공수전환! → 태극 +${taegukGain}`);
    for (const buff of buffs) {
      if (!buff.perSwitch) continue;
      if (buff.perSwitch.aoeDamage) {
        const dmg = buff.perSwitch.aoeDamage;
        enemies = enemies.map((e) => {
          if (e.hp <= 0) return e;
          logs.push(`${buff.name} → 전환 피해! ${e.name}에게 ${dmg}`);
          return dealDamage(e, dmg);
        });
      }
      if (buff.perSwitch.taeguk) {
        taeguk += buff.perSwitch.taeguk;
        logs.push(`${buff.name} → 전환 보너스! 태극 +${buff.perSwitch.taeguk}`);
      }
      if (buff.perSwitch.draw) {
        perSwitchDraw += buff.perSwitch.draw;
        logs.push(`${buff.name} → 전환 보너스! 비급 ${buff.perSwitch.draw}장 펼침`);
      }
    }
  }

  // 드로우 수 합산
  let drawCount = perSwitchDraw;
  for (const effect of card.effects) {
    if (effect.type === "draw") drawCount += effect.value;
    if ((effect.type === "consumeTaegukDraw" || effect.type === "drawFromTaeguk") && effect._drawOverride) {
      drawCount += effect._drawOverride;
    }
  }

  return {
    player, enemies, taeguk, buffs, evasionCount, evasionChance, counter, stance, logs,
    drawCount, switchCount,
  };
}

// 적 공격 시 회피/반격/방어 처리
export function processEnemyAttack(damage, state) {
  let { player, evasionCount, evasionChance, counter, logs, buffs } = { ...state };
  player = { ...player };
  logs = [...logs];
  buffs = buffs.map((b) => ({ ...b }));

  const dmgMult = buffs.reduce(
    (m, b) => (b.damageReceiveMultiplier ? m * b.damageReceiveMultiplier : m), 1,
  );
  const finalDamage = Math.ceil(damage * dmgMult);

  // 무형무상: 보장 회피
  const hasGuaranteedEvade = buffs.some((b) => b.guaranteedEvade);

  // 태극혜검: 무적
  const immortalBuff = buffs.find((b) => b.invincible);

  // 확정 회피 (유운보)
  if (evasionCount > 0) {
    evasionCount--;
    logs.push(`유운보로 공격 회피!`);
    const evadeResult = getOnEvadeEffects(buffs);
    return { player, evasionCount, evasionChance, counter, logs, buffs, dodged: true, counterDmg: 0, ...evadeResult };
  }

  // 무형무상 보장 회피
  if (hasGuaranteedEvade) {
    logs.push(`무형무상으로 공격 회피!`);
    const evadeResult = getOnEvadeEffects(buffs);
    return { player, evasionCount, evasionChance, counter, logs, buffs, dodged: true, counterDmg: 0, ...evadeResult };
  }

  // 확률 회피
  if (evasionChance > 0 && Math.random() * 100 < evasionChance) {
    evasionChance = 0;
    logs.push(`태극검의 기운으로 공격 회피!`);
    const evadeResult = getOnEvadeEffects(buffs);
    return { player, evasionCount, evasionChance, counter, logs, buffs, dodged: true, counterDmg: 0, ...evadeResult };
  }

  // 태극혜검: 무적 (피해 흡수 → 저장)
  if (immortalBuff) {
    immortalBuff.storedDamage = (immortalBuff.storedDamage || 0) + finalDamage;
    logs.push(`태극혜검! → ${finalDamage} 피해 흡수`);
    return { player, evasionCount, evasionChance, counter, logs, buffs, dodged: false, counterDmg: 0, onEvadeDmg: 0, onEvadeTaeguk: 0 };
  }

  // 실제 피해
  const blocked = Math.min(player.block || 0, finalDamage);
  player.block = Math.max(0, (player.block || 0) - finalDamage);
  player.hp -= finalDamage - blocked;

  const counterDmg = counter;
  return { player, evasionCount, evasionChance, counter, logs, buffs, dodged: false, counterDmg, onEvadeDmg: 0, onEvadeTaeguk: 0 };
}

function getOnEvadeEffects(buffs) {
  let onEvadeDmg = 0;
  let onEvadeTaeguk = 0;
  for (const buff of buffs) {
    if (buff.onEvade?.damage) onEvadeDmg += buff.onEvade.damage;
    if (buff.onEvade?.taeguk) onEvadeTaeguk += buff.onEvade.taeguk;
  }
  return { onEvadeDmg, onEvadeTaeguk };
}

// 턴 시작 시 버프 효과 적용
export function applyBuffsOnTurnStart(state) {
  let { player, taeguk, counter, buffs, logs } = { ...state };
  player = { ...player };
  logs = [...logs];

  for (const buff of buffs) {
    if (buff.perTurn) {
      if (buff.perTurn.block) {
        player.block = (player.block || 0) + buff.perTurn.block;
        logs.push(`${buff.name} → 호신강기 +${buff.perTurn.block}`);
      }
      if (buff.perTurn.counter) {
        counter += buff.perTurn.counter;
        logs.push(`${buff.name} → 반격 준비 ${buff.perTurn.counter}`);
      }
      if (buff.perTurn.taeguk) {
        taeguk += buff.perTurn.taeguk;
        logs.push(`${buff.name} → 태극 +${buff.perTurn.taeguk}`);
      }
    }
  }

  const newBuffs = [];
  for (const b of buffs) {
    const remaining = b.duration - 1;
    if (remaining > 0) {
      newBuffs.push({ ...b, duration: remaining });
    } else {
      if (b.grantedStrength) {
        player.strength = Math.max(0, (player.strength || 0) - b.grantedStrength);
        logs.push(`${b.name} 만료 → 공력 -${b.grantedStrength}`);
      }
      // 태극혜검: 흡수한 피해를 공력으로 변환
      if (b.storedDamage > 0) {
        player.strength = (player.strength || 0) + b.storedDamage;
        logs.push(`${b.name} 만료 → 흡수 피해 ${b.storedDamage} → 공력 +${b.storedDamage}`);
      }
    }
  }
  buffs = newBuffs;

  return { player, taeguk, counter, buffs, logs };
}
