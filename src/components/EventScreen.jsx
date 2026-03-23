const EVENTS = [
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
      { text: '대화를 나눈다 (태극 +3)', effect: 'taeguk' },
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

export default function EventScreen({ onResolve, rewardPool }) {
  const event = EVENTS[Math.floor(Math.random() * EVENTS.length)]

  function handleChoice(effect) {
    switch (effect) {
      case 'explore': {
        const card = rewardPool[Math.floor(Math.random() * rewardPool.length)]
        onResolve({ hpChange: -10, card, message: `체력을 소모하고 ${card.name}을(를) 깨달았다!` })
        break
      }
      case 'heal':
        onResolve({ hpChange: 15, message: '약사의 약으로 체력을 회복했다.' })
        break
      case 'taeguk':
        onResolve({ taegukChange: 3, message: '노인의 조언으로 태극이 깊어졌다.' })
        break
      case 'card': {
        const card = rewardPool[Math.floor(Math.random() * rewardPool.length)]
        onResolve({ card, message: `비급을 수련하여 ${card.name}을(를) 깨달았다!` })
        break
      }
      case 'heal_small':
        onResolve({ hpChange: 10, message: '조용한 수련으로 기력을 되찾았다.' })
        break
      case 'intimidate':
        onResolve({ hpChange: -5, strengthChange: 1, message: '산적을 쫓아내며 기세가 올랐다!' })
        break
      case 'skip':
        onResolve({ message: '조용히 지나갔다.' })
        break
    }
  }

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
