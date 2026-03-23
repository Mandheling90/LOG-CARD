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
    if (e.type === "damage" || e.type === "finisher" || e.type === "aoe")
      return "attack";
    if (e.type === "block" || e.type === "counter") return "defense";
    if (e.type === "stanceSwitch") return "switch"; // 별도 처리
  }
  return null; // 유운보, 운수행공 등 자세 변경 없는 카드
}

// 자세 전환이 발생하는지 판별
function isStanceSwitching(prevStance, newStance, switchBonus) {
  if (!switchBonus || !prevStance || !newStance) return false;
  if (newStance === "switch") return false; // 음양전환은 자체 처리

  const dir = switchBonus.direction;
  if (dir === "any" && prevStance !== newStance) return true;
  if (
    dir === "def_to_atk" &&
    prevStance === "defense" &&
    newStance === "attack"
  )
    return true;
  if (
    dir === "atk_to_def" &&
    prevStance === "attack" &&
    newStance === "defense"
  )
    return true;
  return false;
}

// 카드 효과 처리
export function processCardEffects(card, state, targetIndex) {
  let {
    player,
    enemies,
    taeguk,
    buffs,
    evasionCount,
    evasionChance,
    counter,
    stance,
    logs,
  } = { ...state };
  player = { ...player };
  enemies = enemies.map((e) => ({ ...e }));
  logs = [...logs];

  const taegukMult = buffs.reduce(
    (m, b) => (b.taegukMultiplier ? m * b.taegukMultiplier : m),
    1,
  );

  // 자세 전환 보너스 판정
  const prevStance = stance;
  const newStance = getCardStance(card);
  const switched = isStanceSwitching(prevStance, newStance, card.switchBonus);

  // 전환 보너스 발동 시 미리 로그
  if (switched) {
    logs.push(`【${card.switchBonus.label}】`);
  }

  // 진기폭발 전환 보너스: 배율 업그레이드
  let finisherMultOverride = null;
  // 태허검기 전환 보너스: 태극 조건 완화
  let aoeThresholdOverride = null;

  if (switched && card.switchBonus) {
    for (const be of card.switchBonus.effects) {
      if (be.type === "finisherUpgrade") finisherMultOverride = be.multiplier;
      if (be.type === "aoeThresholdReduce")
        aoeThresholdOverride = be.newThreshold;
    }
  }

  // 기본 효과 처리
  for (const effect of card.effects) {
    switch (effect.type) {
      case "damage": {
        if (targetIndex === null || targetIndex === undefined) break;
        const dmg = effect.value + (player.strength || 0);
        enemies[targetIndex] = dealDamage(enemies[targetIndex], dmg);
        logs.push(
          `${card.name} → ${enemies[targetIndex].name}에게 ${dmg} 타격`,
        );
        stance = "attack";
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
          logs.push(
            `${card.name} → 태극 충만! 위력 ${effect.bonusMultiplier}배!`,
          );
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
          },
        ];
        logs.push(`${effect.name} 발동! (${effect.duration}턴)`);
        break;
      }
    }
  }

  // 전환 보너스 효과 적용 (finisherUpgrade, aoeThresholdReduce 제외 - 위에서 처리됨)
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
        // finisherUpgrade, aoeThresholdReduce 는 위에서 이미 처리
      }
    }
  }

  const drawCount = card.effects
    .filter((e) => e.type === "draw")
    .reduce((sum, e) => sum + e.value, 0);

  return {
    player,
    enemies,
    taeguk,
    buffs,
    evasionCount,
    evasionChance,
    counter,
    stance,
    logs,
    drawCount,
  };
}

// 적 공격 시 회피/반격/방어 처리
export function processEnemyAttack(damage, state) {
  let { player, evasionCount, evasionChance, counter, logs, buffs } = {
    ...state,
  };
  player = { ...player };
  logs = [...logs];

  // 받는 피해 증가 버프 체크
  const dmgMult = buffs.reduce(
    (m, b) => (b.damageReceiveMultiplier ? m * b.damageReceiveMultiplier : m),
    1,
  );
  const finalDamage = Math.ceil(damage * dmgMult);

  // 확정 회피
  if (evasionCount > 0) {
    evasionCount--;
    logs.push(`유운보로 공격 회피!`);
    return { player, evasionCount, evasionChance, counter, logs, dodged: true };
  }

  // 확률 회피
  if (evasionChance > 0 && Math.random() * 100 < evasionChance) {
    evasionChance = 0;
    logs.push(`태극검의 기운으로 공격 회피!`);
    return { player, evasionCount, evasionChance, counter, logs, dodged: true };
  }

  // 실제 피해
  const blocked = Math.min(player.block || 0, finalDamage);
  player.block = Math.max(0, (player.block || 0) - finalDamage);
  player.hp -= finalDamage - blocked;

  // 반격
  const counterDmg = counter;
  return {
    player,
    evasionCount,
    evasionChance,
    counter,
    logs,
    dodged: false,
    counterDmg,
  };
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

  // 버프 지속시간 감소
  buffs = buffs
    .map((b) => ({ ...b, duration: b.duration - 1 }))
    .filter((b) => b.duration > 0);

  return { player, taeguk, counter, buffs, logs };
}
