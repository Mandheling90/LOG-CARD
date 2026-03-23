import Card from './Card'

export default function RewardScreen({ cards, onSelect }) {
  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50">
      <div className="bg-gray-900 border border-gray-700 rounded-2xl p-8 flex flex-col items-center gap-6">
        <h2 className="text-2xl font-bold text-amber-400">무공 습득</h2>
        <p className="text-gray-400 text-sm">새로운 초식을 익히거나 지나칠 수 있습니다.</p>

        <div className="flex gap-4">
          {cards.map((card) => (
            <Card key={card.uid} card={card} onClick={() => onSelect(card)} />
          ))}
        </div>

        <button
          onClick={() => onSelect(null)}
          className="mt-2 px-6 py-2 bg-gray-700 hover:bg-gray-600 text-gray-300 rounded-lg transition cursor-pointer"
        >
          지나치기
        </button>
      </div>
    </div>
  )
}
