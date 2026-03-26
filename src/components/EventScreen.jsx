import { useState, useMemo } from "react";
import { ARTIFACTS } from "../data/artifacts";

function shuffleArray(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

const EVENTS = [
  {
    title: "봉인된 석실",
    description:
      "산 깊숙이 고대 봉인이 걸린 석실을 발견했다. 강렬한 기운이 느껴진다.",
    choices: [
      {
        text: "봉인을 깨뜨린다 (체력 30% 소모, 전설 무공 획득)",
        effect: "legendary",
      },
      { text: "위험하다, 돌아간다", effect: "skip", message: "봉인에 손대지 않고 돌아갔다." },
    ],
    requires: "legendary",
  },
  {
    title: "숨겨진 동굴",
    description: "산 속 동굴에서 옛 무림 고수의 흔적을 발견했다.",
    choices: [
      { text: "동굴을 탐색한다 (체력 -10, 랜덤 카드 획득)", effect: "explore" },
      { text: "조용히 지나간다", effect: "skip" },
    ],
  },
  {
    title: "떠돌이 약사",
    description: "길가에서 약초를 캐는 노인을 만났다.",
    choices: [
      { text: "약을 구한다 (체력 +15)", effect: "heal" },
      { text: "대화를 나눈다 (공력 +1)", effect: "strength" },
    ],
  },
  {
    title: "무림 비급",
    description: "폐허가 된 객잔에서 낡은 비급을 발견했다.",
    choices: [
      { text: "수련한다 (랜덤 카드 획득)", effect: "card" },
      { text: "태극 수련에 집중한다 (체력 +10)", effect: "heal_small" },
    ],
  },
  {
    title: "산적의 매복",
    description: "좁은 협곡에서 산적이 통행세를 요구한다.",
    choices: [
      { text: "위압으로 쫓아낸다 (체력 -5, 공력 +1)", effect: "intimidate" },
      { text: "돌아간다", effect: "skip", message: "산적을 피해 돌아갔다." },
    ],
  },
  // ===== 새 이벤트 =====
  {
    title: "폐관수련",
    description:
      "깊은 산 속, 세상과 단절된 채 수련에 들어갈 수 있는 동굴을 발견했다.",
    choices: [
      {
        text: "폐관수련 (현재 체력 50% 소모, 전설 카드 선택 획득)",
        effect: "legendary_select",
      },
      { text: "짧게 수련한다 (체력 -10, 희귀 카드 획득)", effect: "rare_card" },
      { text: "위험하다, 나간다", effect: "skip", message: "동굴을 빠져나왔다." },
    ],
    requires: "legendary",
  },
  {
    title: "심마입도",
    description: "수련 도중 마음이 흔들린다. 강해질 기회… 하지만 위험하다.",
    choices: [
      {
        text: "힘을 받아들인다 (공력 +3, 최대 체력 -20%)",
        effect: "power_curse",
      },
      { text: "억제한다 (체력 -15)", effect: "cleanse" },
    ],
  },
  {
    title: "고수의 잔영",
    description: "이미 죽은 고수의 검의 흔적이 남아있다.",
    choices: [
      {
        text: "검의를 깨닫는다 (초식 카드 2장 중 선택)",
        effect: "choose_chosik",
      },
      { text: "흐름을 관찰한다 (공력 +1)", effect: "strength", message: "고수의 흐름에서 깨달음을 얻었다." },
    ],
  },
  {
    title: "내상 악화",
    description: "이전 전투의 충격이 몸에 남아있다.",
    choices: [
      {
        text: "억지로 싸운다 (다음 전투 시작 시 체력 -15)",
        effect: "future_damage",
      },
      { text: "휴식한다 (카드 1장 제거)", effect: "remove_card" },
    ],
    requires: "deck",
  },
  {
    title: "무림 고수",
    description: "길 위에서 정체를 알 수 없는 고수를 만났다.",
    choices: [
      { text: "도전한다 (체력 -40%, 전설 카드 획득)", effect: "elite_fight" },
      { text: "예를 갖춘다 (공력 +1, 체력 +10)", effect: "respect" },
      { text: "피한다", effect: "skip", message: "고수를 피해 길을 돌아갔다." },
    ],
    requires: "legendary",
  },
  {
    title: "독초",
    description: "강력한 기운이 느껴지는 독초를 발견했다.",
    choices: [
      { text: "복용한다 (랜덤 버프 또는 디버프)", effect: "random_potion" },
      { text: "연단한다 (희귀 카드 획득)", effect: "rare_card", message: "독초를 연단하여 {card}을(를) 깨달았다!" },
    ],
  },
  {
    title: "사문 시험",
    description: "무당의 시험이 시작되었다.",
    choices: [
      {
        text: "태극의 길 (방어 초식 3장 중 선택)",
        effect: "choose_defense",
      },
      {
        text: "검의 길 (공격 초식 3장 중 선택)",
        effect: "choose_attack",
      },
    ],
  },
  // ===== 기물 이벤트 =====
  {
    title: "행상인",
    description: "산길에서 보따리를 짊어진 행상인을 만났다. 진귀한 물건을 하나 보여준다.",
    choices: [
      { text: "물건을 받는다 (기물 획득)", effect: "artifact" },
      { text: "정중히 거절한다", effect: "skip", message: "행상인과 인사를 나누고 헤어졌다." },
    ],
    requires: "artifact",
  },
  {
    title: "폐허의 보물상자",
    description: "무너진 객잔 잔해 속에서 오래된 상자를 발견했다.",
    choices: [
      { text: "상자를 연다 (체력 -5, 기물 획득)", effect: "artifact_cost" },
      { text: "지나친다", effect: "skip", message: "함부로 손대지 않고 지나갔다." },
    ],
    requires: "artifact",
  },
];

const rarityColors = {
  common: "text-gray-300",
  uncommon: "text-green-400",
  rare: "text-blue-400",
  legendary: "text-amber-400",
};

const rarityLabels = {
  common: "일반",
  uncommon: "고급",
  rare: "희귀",
  legendary: "전설",
};

const typeLabels = {
  chosik: "초식",
  simbeop: "심법",
  bobeop: "보법",
};

function CardPanel({ card }) {
  return (
    <div className="w-full bg-gray-800 border border-gray-600 rounded-xl p-4 flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <span
          className={`text-lg font-bold ${rarityColors[card.rarity] || "text-gray-300"}`}
        >
          {card.name}
        </span>
        <span className="text-xs text-gray-400">
          {rarityLabels[card.rarity] || card.rarity} ·{" "}
          {typeLabels[card.type] || card.type}
        </span>
      </div>
      <div className="flex items-center gap-2">
        <span className="text-cyan-400 text-sm font-bold">
          비용 {card.cost}
        </span>
      </div>
      <p className="text-gray-300 text-sm leading-relaxed whitespace-pre-line">
        {card.description}
      </p>
    </div>
  );
}

export default function EventScreen({
  onResolve,
  rewardPool,
  legendaryPool,
  player,
  deck,
  artifacts = [],
}) {
  const [result, setResult] = useState(null);
  // 카드 선택 모드: { cards, pendingResult }
  const [cardSelectMode, setCardSelectMode] = useState(null);
  // 카드 제거 모드: { pendingResult }
  const [cardRemoveMode, setCardRemoveMode] = useState(null);

  const hasLegendary = legendaryPool?.length > 0;
  const starterIds = ["taichi_strike", "inner_guard", "cloud_step"];
  const removableDeck = deck?.filter((c) => !starterIds.includes(c.id)) || [];

  const availableArtifacts = useMemo(() => {
    return ARTIFACTS.filter((a) => !artifacts.includes(a.id));
  }, [artifacts]);

  const available = useMemo(() => {
    return EVENTS.filter((e) => {
      if (e.requires === "legendary" && !hasLegendary) return false;
      if (e.requires === "deck" && removableDeck.length === 0) return false;
      if (e.requires === "artifact" && availableArtifacts.length === 0) return false;
      return true;
    });
  }, [hasLegendary, removableDeck.length, availableArtifacts.length]);

  const [event] = useState(
    () => available[Math.floor(Math.random() * available.length)],
  );

  const rarePool = useMemo(
    () => rewardPool?.filter((c) => c.rarity === "rare") || [],
    [rewardPool],
  );

  const chosikPool = useMemo(
    () => rewardPool?.filter((c) => c.type === "chosik") || [],
    [rewardPool],
  );

  const attackChosikPool = useMemo(
    () => rewardPool?.filter((c) => c.type === "chosik" && (c.nature === "attack" || c.nature === "dual")) || [],
    [rewardPool],
  );

  const defenseChosikPool = useMemo(
    () => rewardPool?.filter((c) => c.type === "chosik" && (c.nature === "defense" || c.nature === "dual")) || [],
    [rewardPool],
  );

  function handleChoice(choice) {
    const effect = choice.effect;
    const overrideMsg = choice.message;
    let res;
    switch (effect) {
      case "legendary": {
        if (!legendaryPool?.length) {
          res = { message: "봉인 속에 아무것도 없었다..." };
          break;
        }
        const card =
          legendaryPool[Math.floor(Math.random() * legendaryPool.length)];
        const hpCost = -Math.floor((player?.hp || 80) * 0.3);
        res = {
          hpChange: hpCost,
          card,
          message: `봉인을 깨뜨리고 ${card.name}을(를) 깨달았다!`,
        };
        break;
      }
      case "explore": {
        const card = rewardPool[Math.floor(Math.random() * rewardPool.length)];
        res = {
          hpChange: -10,
          card,
          message: `체력을 소모하고 ${card.name}을(를) 깨달았다!`,
        };
        break;
      }
      case "heal":
        res = { hpChange: 15, message: "약사의 약으로 체력을 회복했다." };
        break;
      case "card": {
        const card = rewardPool[Math.floor(Math.random() * rewardPool.length)];
        res = { card, message: `비급을 수련하여 ${card.name}을(를) 깨달았다!` };
        break;
      }
      case "heal_small":
        res = { hpChange: 10, message: "조용한 수련으로 기력을 되찾았다." };
        break;
      case "strength":
        res = {
          strengthChange: 1,
          message: overrideMsg || "노인의 조언으로 공력이 상승했다.",
        };
        break;
      case "intimidate":
        res = {
          hpChange: -5,
          strengthChange: 1,
          message: "산적을 쫓아내며 기세가 올랐다!",
        };
        break;
      case "skip":
        res = { message: overrideMsg || "조용히 지나갔다." };
        break;

      // ===== 새 이벤트 효과 =====
      case "legendary_select": {
        if (!legendaryPool?.length) {
          res = { message: "동굴 속에 아무것도 없었다..." };
          break;
        }
        const cards = shuffleArray(legendaryPool).slice(0, 3);
        const hpCost = -Math.floor((player?.hp || 80) * 0.5);
        setCardSelectMode({
          cards,
          pendingResult: { hpChange: hpCost },
          title: "전설 무공 중 하나를 선택하시오",
        });
        return;
      }
      case "rare_card": {
        const pool = rarePool.length > 0 ? rarePool : rewardPool;
        const card = pool[Math.floor(Math.random() * pool.length)];
        const msg = overrideMsg
          ? overrideMsg.replace("{card}", card.name)
          : `수련으로 ${card.name}을(를) 깨달았다!`;
        res = { hpChange: -10, card, message: msg };
        break;
      }
      case "power_curse": {
        const maxHpLoss = -Math.floor((player?.maxHp || 80) * 0.2);
        res = {
          strengthChange: 3,
          maxHpChange: maxHpLoss,
          message: `마기를 받아들여 공력이 크게 올랐으나, 체력이 약해졌다. (최대 체력 ${maxHpLoss})`,
        };
        break;
      }
      case "cleanse":
        res = { hpChange: -15, message: "심마를 억제했다. 체력이 소모되었다." };
        break;
      case "choose_chosik": {
        if (chosikPool.length === 0) {
          res = { message: "잔영이 사라졌다..." };
          break;
        }
        const cards = shuffleArray(chosikPool).slice(0, 2);
        setCardSelectMode({
          cards,
          pendingResult: {},
          title: "초식 중 하나를 선택하시오",
        });
        return;
      }
      case "future_damage":
        res = {
          nextBattleDamage: 15,
          message: "내상을 무시하고 나아간다. 다음 전투에서 체력이 감소한다.",
        };
        break;
      case "remove_card": {
        if (removableDeck.length === 0) {
          res = { message: "제거할 카드가 없다." };
          break;
        }
        setCardRemoveMode({ pendingResult: {} });
        return;
      }
      case "elite_fight": {
        if (!legendaryPool?.length) {
          res = { message: "고수는 이미 떠난 후였다..." };
          break;
        }
        const card =
          legendaryPool[Math.floor(Math.random() * legendaryPool.length)];
        const hpCost = -Math.floor((player?.hp || 80) * 0.4);
        res = {
          hpChange: hpCost,
          card,
          message: `사투 끝에 ${card.name}을(를) 깨달았다!`,
        };
        break;
      }
      case "respect":
        res = {
          hpChange: 10,
          strengthChange: 1,
          message: "고수가 예를 받아들이고 조언을 남겼다.",
        };
        break;
      case "random_potion": {
        const roll = Math.random();
        if (roll < 0.4) {
          res = {
            strengthChange: 2,
            message: "독초의 기운이 내공으로 변했다! (공력 +2)",
          };
        } else if (roll < 0.7) {
          res = {
            hpChange: 20,
            taegukChange: 2,
            message: "독초에서 영약을 추출했다! (체력 +20, 태극 +2)",
          };
        } else {
          const maxHpLoss = -Math.floor((player?.maxHp || 80) * 0.1);
          res = {
            maxHpChange: maxHpLoss,
            hpChange: -10,
            message: `독기에 중독되었다! (체력 -10, 최대 체력 ${maxHpLoss})`,
          };
        }
        break;
      }
      case "choose_defense": {
        const pool = defenseChosikPool.length > 0 ? defenseChosikPool : chosikPool;
        if (pool.length === 0) {
          res = { message: "시험에서 깨달음을 얻지 못했다..." };
          break;
        }
        const cards = shuffleArray(pool).slice(0, 3);
        setCardSelectMode({
          cards,
          pendingResult: {},
          title: "방어 초식 중 하나를 선택하시오",
        });
        return;
      }
      case "artifact": {
        if (availableArtifacts.length === 0) {
          res = { message: "특별한 물건은 없었다..." };
          break;
        }
        const artifact = availableArtifacts[Math.floor(Math.random() * availableArtifacts.length)];
        res = {
          artifact,
          message: `${artifact.emoji} ${artifact.name}을(를) 획득했다! (${artifact.description})`,
        };
        break;
      }
      case "artifact_cost": {
        if (availableArtifacts.length === 0) {
          res = { message: "상자 안은 비어있었다..." };
          break;
        }
        const artifact = availableArtifacts[Math.floor(Math.random() * availableArtifacts.length)];
        res = {
          hpChange: -5,
          artifact,
          message: `${artifact.emoji} ${artifact.name}을(를) 발견했다! (${artifact.description})`,
        };
        break;
      }
      case "choose_attack": {
        const pool = attackChosikPool.length > 0 ? attackChosikPool : chosikPool;
        if (pool.length === 0) {
          res = { message: "시험에서 깨달음을 얻지 못했다..." };
          break;
        }
        const cards = shuffleArray(pool).slice(0, 3);
        setCardSelectMode({
          cards,
          pendingResult: {},
          title: "공격 초식 중 하나를 선택하시오",
        });
        return;
      }
    }
    setResult(res);
  }

  // 카드 선택 화면
  if (cardSelectMode) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center p-4">
        <div className="bg-gray-900 border border-gray-700 rounded-2xl p-6 md:p-8 max-w-lg w-full flex flex-col items-center gap-6">
          <div className="text-4xl">📜</div>
          <h2 className="text-xl font-bold text-amber-400">
            {cardSelectMode.title}
          </h2>
          <div className="flex flex-col gap-3 w-full">
            {cardSelectMode.cards.map((card, i) => (
              <button
                key={i}
                onClick={() => {
                  const res = {
                    ...cardSelectMode.pendingResult,
                    card,
                    message: `${card.name}을(를) 깨달았다!`,
                  };
                  setCardSelectMode(null);
                  setResult(res);
                }}
                className="w-full text-left bg-gray-800 hover:bg-gray-700 border border-gray-600 hover:border-amber-500 rounded-xl p-4 transition cursor-pointer"
              >
                <div className="flex items-center justify-between mb-1">
                  <span
                    className={`font-bold ${rarityColors[card.rarity] || "text-gray-300"}`}
                  >
                    {card.name}
                  </span>
                  <span className="text-xs text-gray-400">
                    {rarityLabels[card.rarity]} ·{" "}
                    {typeLabels[card.type] || card.type} · 비용 {card.cost}
                  </span>
                </div>
                <p className="text-gray-400 text-sm whitespace-pre-line">{card.description}</p>
              </button>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // 카드 제거 화면
  if (cardRemoveMode) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center p-4">
        <div className="bg-gray-900 border border-gray-700 rounded-2xl p-6 md:p-8 max-w-lg w-full flex flex-col items-center gap-6">
          <div className="text-4xl">🗑️</div>
          <h2 className="text-xl font-bold text-red-400">
            제거할 카드를 선택하시오
          </h2>
          <div className="flex flex-col gap-2 w-full max-h-80 overflow-y-auto">
            {removableDeck.map((card) => (
              <button
                key={card.uid}
                onClick={() => {
                  const res = {
                    ...cardRemoveMode.pendingResult,
                    removeCardUid: card.uid,
                    message: `${card.name}을(를) 잊었다.`,
                  };
                  setCardRemoveMode(null);
                  setResult(res);
                }}
                className="w-full text-left bg-gray-800 hover:bg-gray-700 border border-gray-600 hover:border-red-500 rounded-xl p-3 transition cursor-pointer"
              >
                <div className="flex items-center justify-between">
                  <span
                    className={`font-bold text-sm ${rarityColors[card.rarity] || "text-gray-300"}`}
                  >
                    {card.name}
                  </span>
                  <span className="text-xs text-gray-400">
                    {rarityLabels[card.rarity]} ·{" "}
                    {typeLabels[card.type] || card.type} · 비용 {card.cost}
                  </span>
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // 결과 화면
  if (result) {
    const card = result.card;
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <div className="bg-gray-900 border border-gray-700 rounded-2xl p-8 max-w-md flex flex-col items-center gap-6">
          <div className="text-4xl">
            {result.artifact ? result.artifact.emoji : card ? "📜" : result.removeCardUid ? "🗑️" : "✅"}
          </div>
          <p className="text-gray-200 text-center text-lg font-bold">
            {result.message}
          </p>

          {card && <CardPanel card={card} />}

          <div className="flex flex-col items-center gap-1">
            {result.hpChange && (
              <p
                className={`text-sm ${result.hpChange > 0 ? "text-green-400" : "text-red-400"}`}
              >
                체력 {result.hpChange > 0 ? "+" : ""}
                {result.hpChange}
              </p>
            )}
            {result.maxHpChange && (
              <p className="text-sm text-red-400">
                최대 체력 {result.maxHpChange > 0 ? "+" : ""}
                {result.maxHpChange}
              </p>
            )}
            {result.strengthChange && (
              <p className="text-sm text-orange-400">
                공력 +{result.strengthChange}
              </p>
            )}
            {result.taegukChange && (
              <p className="text-sm text-cyan-400">
                태극 +{result.taegukChange}
              </p>
            )}
            {result.nextBattleDamage && (
              <p className="text-sm text-red-300">
                다음 전투 시작 시 체력 -{result.nextBattleDamage}
              </p>
            )}
          </div>

          <button
            onClick={() => onResolve(result)}
            className="px-6 py-3 bg-amber-700 hover:bg-amber-600 text-white rounded-lg font-bold transition cursor-pointer"
          >
            계속
          </button>
        </div>
      </div>
    );
  }

  // 이벤트 선택 화면
  return (
    <div className="min-h-screen bg-gray-950 flex items-center justify-center">
      <div className="bg-gray-900 border border-gray-700 rounded-2xl p-8 max-w-md flex flex-col items-center gap-6">
        <div className="text-4xl">❓</div>
        <h2 className="text-2xl font-bold text-amber-400">{event.title}</h2>
        <p className="text-gray-300 text-center leading-relaxed">
          {event.description}
        </p>

        <div className="flex flex-col gap-3 w-full">
          {event.choices.map((choice, i) => (
            <button
              key={i}
              onClick={() => handleChoice(choice)}
              className="w-full px-4 py-3 bg-gray-800 hover:bg-gray-700 text-gray-200 rounded-lg border border-gray-600 hover:border-amber-600 transition text-sm text-left cursor-pointer"
            >
              {choice.text}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
