const typeColors = {
  attack: 'from-red-950 to-red-800 border-red-600',
  skill: 'from-sky-950 to-sky-800 border-sky-600',
  power: 'from-amber-950 to-amber-800 border-amber-600',
}

const typeLabels = {
  attack: '초식',
  skill: '태극',
  power: '심법',
}

const typeIcons = {
  attack: '⚔️',
  skill: '☯️',
  power: '🔥',
}

const rarityGlow = {
  common: '',
  uncommon: 'shadow-sky-500/30 shadow-lg',
  rare: 'shadow-amber-400/40 shadow-lg',
}

export default function Card({ card, onClick, disabled, small, selected }) {
  const colors = typeColors[card.type]
  const glow = rarityGlow[card.rarity]
  const canPlay = !disabled

  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`
        relative flex flex-col rounded-xl border-2 bg-gradient-to-b
        ${colors} ${glow}
        ${small ? 'w-32 h-44 p-2 text-xs' : 'w-36 h-52 p-3 text-sm'}
        ${canPlay ? 'hover:scale-110 hover:-translate-y-2 cursor-pointer' : 'opacity-50 cursor-not-allowed'}
        ${selected ? 'scale-110 -translate-y-3 ring-2 ring-yellow-400 ring-offset-2 ring-offset-gray-950' : ''}
        transition-all duration-200
      `}
    >
      <div className="flex justify-between items-start w-full">
        <span className="font-bold text-white truncate">{card.name}</span>
        <span className="flex items-center justify-center w-6 h-6 rounded-full bg-amber-400 text-black font-bold text-xs shrink-0">
          {card.cost}
        </span>
      </div>

      <div className="flex-1 flex items-center justify-center my-2">
        <span className="text-2xl">{typeIcons[card.type]}</span>
      </div>

      <div className="text-gray-200 text-center text-xs leading-tight">
        {card.description}
      </div>

      <div className="text-gray-400 text-[10px] mt-1 text-center">
        {typeLabels[card.type]}
      </div>
    </button>
  )
}
