export const ARTIFACTS = [
  {
    id: "old_pouch",
    name: "낡은 주머니",
    emoji: "👝",
    description: "손패가 2장 이하일 때, 턴 종료 시 다음턴 카드 2장 더 뽑기",
  },
  {
    id: "yin_yang_token",
    name: "음양패",
    emoji: "🪙",
    description: "공격↔방어 전환 5회마다 공력 +1",
  },
  {
    id: "broken_scripture",
    name: "파손된 도경",
    emoji: "📜",
    description: "체력이 50% 이하일 때 태극 획득량 2배",
  },
  {
    id: "lightfoot_scrap",
    name: "경공 비급 조각",
    emoji: "🍃",
    description: "보법 카드 사용 시 카드 1장 추가 뽑기",
  },
  {
    id: "blood_stone",
    name: "혈염석",
    emoji: "💎",
    description: "체력을 잃을 때, 다음 턴 공력 +2",
  },
  {
    id: "clear_lantern",
    name: "청명등",
    emoji: "🏮",
    description: "디버프 상태에서 턴 시작 시 태극 +1",
  },
  {
    id: "old_moktak",
    name: "낡은 목탁",
    emoji: "🔔",
    description: "카드를 3장 미만 사용하고 턴 종료 시 체력 +5",
  },
];

export function getArtifact(id) {
  return ARTIFACTS.find((a) => a.id === id);
}
