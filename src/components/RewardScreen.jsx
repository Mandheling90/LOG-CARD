import Card from './Card'

export default function RewardScreen({ cards, onSelect }) {
  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
      <div className="bg-gray-900 border border-gray-700 rounded-2xl p-4 md:p-8 flex flex-col items-center gap-4 md:gap-6 max-w-full">
        <h2 className="text-xl md:text-2xl font-bold text-amber-400">무공 습득</h2>
        <p className="text-gray-400 text-xs md:text-sm">새로운 초식을 익히거나 지나칠 수 있습니다.</p>

        <div className="flex gap-2 md:gap-4 overflow-x-auto max-w-full pb-2">
          {cards.map((card) => (
            <div key={card.uid} className="shrink-0">
              <Card card={card} onClick={() => onSelect(card)} small />
            </div>
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
