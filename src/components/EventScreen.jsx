import { useState } from 'react'

const EVENTS = [
  {
    title: '봉인된 석실',
    description: '산 깊숙이 고대 봉인이 걸린 석실을 발견했다. 강렬한 기운이 느껴진다.',
    choices: [
      { text: '봉인을 깨뜨린다 (체력 30% 소모, 전설 무공 획득)', effect: 'legendary' },
      { text: '위험하다, 돌아간다', effect: 'skip' },
    ],
  },
  {
    title: '숨겨진 동굴',
    description: '산 속 동굴에서 옛 무림 고수의 흔적을 발견했다.',
    choices: [
      { text: '동굴을 탐색한다 (체력 -10, 랜덤 카드 획득)', effect: 'explore' },
      { text: '조용히 지나간다', effect: 'skip' },
    ],
  },
  {
    title: '떠돌이 약사',
    description: '길가에서 약초를 캐는 노인을 만났다.',
    choices: [
      { text: '약을 구한다 (체력 +15)', effect: 'heal' },
      { text: '대화를 나눈다 (공력 +1)', effect: 'strength' },
    ],
  },
  {
    title: '무림 비급',
    description: '폐허가 된 객잔에서 낡은 비급을 발견했다.',
    choices: [
      { text: '수련한다 (랜덤 카드 획득)', effect: 'card' },
      { text: '태극 수련에 집중한다 (체력 +10)', effect: 'heal_small' },
    ],
  },
  {
    title: '산적의 매복',
    description: '좁은 협곡에서 산적이 통행세를 요구한다.',
    choices: [
      { text: '위압으로 쫓아낸다 (체력 -5, 공력 +1)', effect: 'intimidate' },
      { text: '돌아간다', effect: 'skip' },
    ],
  },
]

const rarityColors = {
  common: 'text-gray-300',
  uncommon: 'text-green-400',
  rare: 'text-blue-400',
  legendary: 'text-amber-400',
}

const rarityLabels = {
  common: '일반',
  uncommon: '고급',
  rare: '희귀',
  legendary: '전설',
}

const typeLabels = {
  chosik: '초식',
  simbeop: '심법',
  bobeop: '보법',
}

export default function EventScreen({ onResolve, rewardPool, legendaryPool, player }) {
  const [result, setResult] = useState(null)

  // 봉인된 석실은 전설 풀이 있을 때만 등장
  const available = legendaryPool?.length > 0
    ? EVENTS
    : EVENTS.filter(e => e.title !== '봉인된 석실')
  const [event] = useState(() => available[Math.floor(Math.random() * available.length)])

  function handleChoice(effect) {
    let res
    switch (effect) {
      case 'legendary': {
        if (!legendaryPool?.length) {
          res = { message: '봉인 속에 아무것도 없었다...' }
          break
        }
        const card = legendaryPool[Math.floor(Math.random() * legendaryPool.length)]
        const hpCost = -Math.floor((player?.hp || 80) * 0.3)
        res = { hpChange: hpCost, card, message: `봉인을 깨뜨리고 ${card.name}을(를) 깨달았다!` }
        break
      }
      case 'explore': {
        const card = rewardPool[Math.floor(Math.random() * rewardPool.length)]
        res = { hpChange: -10, card, message: `체력을 소모하고 ${card.name}을(를) 깨달았다!` }
        break
      }
      case 'heal':
        res = { hpChange: 15, message: '약사의 약으로 체력을 회복했다.' }
        break
      case 'card': {
        const card = rewardPool[Math.floor(Math.random() * rewardPool.length)]
        res = { card, message: `비급을 수련하여 ${card.name}을(를) 깨달았다!` }
        break
      }
      case 'heal_small':
        res = { hpChange: 10, message: '조용한 수련으로 기력을 되찾았다.' }
        break
      case 'strength':
        res = { strengthChange: 1, message: '노인의 조언으로 공력이 상승했다.' }
        break
      case 'intimidate':
        res = { hpChange: -5, strengthChange: 1, message: '산적을 쫓아내며 기세가 올랐다!' }
        break
      case 'skip':
        res = { message: '조용히 지나갔다.' }
        break
    }
    setResult(res)
  }

  // 결과 화면
  if (result) {
    const card = result.card
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <div className="bg-gray-900 border border-gray-700 rounded-2xl p-8 max-w-md flex flex-col items-center gap-6">
          <div className="text-4xl">{card ? '📜' : '✅'}</div>
          <p className="text-gray-200 text-center text-lg font-bold">{result.message}</p>

          {card && (
            <div className="w-full bg-gray-800 border border-gray-600 rounded-xl p-4 flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <span className={`text-lg font-bold ${rarityColors[card.rarity] || 'text-gray-300'}`}>
                  {card.name}
                </span>
                <span className="text-xs text-gray-400">
                  {rarityLabels[card.rarity] || card.rarity} · {typeLabels[card.type] || card.type}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-cyan-400 text-sm font-bold">비용 {card.cost}</span>
              </div>
              <p className="text-gray-300 text-sm leading-relaxed">{card.description}</p>
            </div>
          )}

          {result.hpChange && (
            <p className={`text-sm ${result.hpChange > 0 ? 'text-green-400' : 'text-red-400'}`}>
              체력 {result.hpChange > 0 ? '+' : ''}{result.hpChange}
            </p>
          )}
          {result.strengthChange && (
            <p className="text-sm text-orange-400">공력 +{result.strengthChange}</p>
          )}

          <button
            onClick={() => onResolve(result)}
            className="px-6 py-3 bg-amber-700 hover:bg-amber-600 text-white rounded-lg font-bold transition cursor-pointer"
          >
            계속
          </button>
        </div>
      </div>
    )
  }

  // 이벤트 선택 화면
  return (
    <div className="min-h-screen bg-gray-950 flex items-center justify-center">
      <div className="bg-gray-900 border border-gray-700 rounded-2xl p-8 max-w-md flex flex-col items-center gap-6">
        <div className="text-4xl">❓</div>
        <h2 className="text-2xl font-bold text-amber-400">{event.title}</h2>
        <p className="text-gray-300 text-center leading-relaxed">{event.description}</p>

        <div className="flex flex-col gap-3 w-full">
          {event.choices.map((choice, i) => (
            <button
              key={i}
              onClick={() => handleChoice(choice.effect)}
              className="w-full px-4 py-3 bg-gray-800 hover:bg-gray-700 text-gray-200 rounded-lg border border-gray-600 hover:border-amber-600 transition text-sm text-left cursor-pointer"
            >
              {choice.text}
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
