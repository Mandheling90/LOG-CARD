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
  }
  return null;
}

// 자세 전환이 발생하는지 판별
function isStanceSwitching(prevStance, newStance, switchBonus) {
  if (!switchBonus || !prevStance || !newStance) return false;
  if (newStance === "switch") return false;

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
  const switched = isStanceSwitching(prevStance, newStance, card.switchBonus);

  if (switched) {
    logs.push(`【${card.switchBonus.label}】`);
  }

  let finisherMultOverride = null;
  let aoeThresholdOverride = null;

  if (switched && card.switchBonus) {
    for (const be of card.switchBonus.effects) {
      if (be.type === "finisherUpgrade") finisherMultOverride = be.multiplier;
      if (be.type === "aoeThresholdReduce") aoeThresholdOverride = be.newThreshold;
    }
  }

  // multiHit 추적용
  let lastMultiHitDmg = 0;

  // 기본 효과 처리
  for (const effect of card.effects) {
    switch (effect.type) {
      case "damage": {
        if (targetIndex === null || targetIndex === undefined) break;
        const dmg = effect.value + (player.strength || 0);
        enemies[targetIndex] = dealDamage(enemies[targetIndex], dmg);
        logs.push(`${card.name} → ${enemies[targetIndex].name}에게 ${dmg} 타격`);
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

      case "applyDebuff": {
        if (targetIndex === null || targetIndex === undefined) break;
        if (enemies[targetIndex].hp > 0) {
          enemies[targetIndex].debuffs.push(effect.debuff);
          logs.push(`${card.name} → ${enemies[targetIndex].name}에게 ${effect.label}!`);
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
        player.block = (player.block || 0) + effect.value;
        logs.push(`${card.name} → 호신강기 +${effect.value}`);
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
          },
        ];
        logs.push(`${effect.name} 발동! (${effect.duration}턴)`);
        break;
      }

      case "forceSwitch": {
        if (stance === "attack") {
          stance = "defense";
          logs.push(`${card.name} → 공→수 전환!`);
        } else {
          stance = "attack";
          logs.push(`${card.name} → 수→공 전환!`);
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

      case "taegukStrength": {
        const bonus = Math.floor(taeguk / 2);
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
      }
    }
  }

  // 자세 전환 감지 → switchCount 증가 + perSwitch 버프 발동
  if (initialStance !== null && stance !== initialStance) {
    switchCount++;
    for (const buff of buffs) {
      if (buff.perSwitch?.aoeDamage) {
        const dmg = buff.perSwitch.aoeDamage;
        enemies = enemies.map((e) => {
          if (e.hp <= 0) return e;
          logs.push(`${buff.name} → 전환 피해! ${e.name}에게 ${dmg}`);
          return dealDamage(e, dmg);
        });
      }
    }
  }

  // 드로우 수 합산
  let drawCount = 0;
  for (const effect of card.effects) {
    if (effect.type === "draw") drawCount += effect.value;
    if (effect.type === "consumeTaegukDraw" && effect._drawOverride) {
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

  const dmgMult = buffs.reduce(
    (m, b) => (b.damageReceiveMultiplier ? m * b.damageReceiveMultiplier : m), 1,
  );
  const finalDamage = Math.ceil(damage * dmgMult);

  // 확정 회피
  if (evasionCount > 0) {
    evasionCount--;
    logs.push(`유운보로 공격 회피!`);
    const onEvadeDmg = getOnEvadeDamage(buffs);
    return { player, evasionCount, evasionChance, counter, logs, dodged: true, counterDmg: 0, onEvadeDmg };
  }

  // 확률 회피
  if (evasionChance > 0 && Math.random() * 100 < evasionChance) {
    evasionChance = 0;
    logs.push(`태극검의 기운으로 공격 회피!`);
    const onEvadeDmg = getOnEvadeDamage(buffs);
    return { player, evasionCount, evasionChance, counter, logs, dodged: true, counterDmg: 0, onEvadeDmg };
  }

  // 실제 피해
  const blocked = Math.min(player.block || 0, finalDamage);
  player.block = Math.max(0, (player.block || 0) - finalDamage);
  player.hp -= finalDamage - blocked;

  const counterDmg = counter;
  return { player, evasionCount, evasionChance, counter, logs, dodged: false, counterDmg, onEvadeDmg: 0 };
}

function getOnEvadeDamage(buffs) {
  for (const buff of buffs) {
    if (buff.onEvade?.damage) return buff.onEvade.damage;
  }
  return 0;
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
    }
  }
  buffs = newBuffs;

  return { player, taeguk, counter, buffs, logs };
}
