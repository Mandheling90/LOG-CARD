const typeColors = {
  chosik: 'from-stone-950 to-stone-800 border-stone-500',
  simbeop: 'from-amber-950 to-amber-800 border-amber-600',
  bobeop: 'from-emerald-950 to-emerald-800 border-emerald-600',
}

const typeLabels = {
  chosik: '초식',
  simbeop: '심법',
  bobeop: '보법',
}

const typeIcons = {
  chosik: '⚔️',
  simbeop: '🔥',
  bobeop: '💨',
}

// 초식 내 공/수 구분 - 좌측 악센트 바 색상 + 아이콘
const natureAccent = {
  attack: { bar: 'bg-red-500', icon: '⚔️', label: '공', color: 'text-red-400' },
  defense: { bar: 'bg-blue-500', icon: '🛡️', label: '수', color: 'text-blue-400' },
  dual: { bar: 'bg-gradient-to-b from-red-500 to-blue-500', icon: '☯️', label: '공수', color: 'text-purple-400' },
}

const rarityGlow = {
  common: '',
  uncommon: 'shadow-sky-500/30 shadow-lg',
  rare: 'shadow-amber-400/40 shadow-lg',
}

const rarityName = {
  common: { color: 'text-gray-300', costBg: 'bg-gray-500', costBorder: '' },
  uncommon: { color: 'text-sky-300', costBg: 'bg-sky-400', costBorder: 'ring-1 ring-sky-300' },
  rare: { color: 'text-amber-300', costBg: 'bg-amber-400', costBorder: 'ring-1 ring-amber-300' },
}

export default function Card({ card, onClick, disabled, small, selected, mobile }) {
  const colors = typeColors[card.type] || typeColors.chosik
  const glow = rarityGlow[card.rarity]
  const rarity = rarityName[card.rarity] || rarityName.common
  const canPlay = !disabled
  const nature = card.nature ? natureAccent[card.nature] : null

  const sizeClass = small
    ? 'w-32 h-44 p-2 text-xs'
    : mobile
      ? 'w-24 h-36 p-1.5 text-[10px] md:w-36 md:h-52 md:p-3 md:text-sm'
      : 'w-36 h-52 p-3 text-sm'

  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`
        relative flex flex-col rounded-xl border-2 bg-gradient-to-b overflow-hidden
        ${colors} ${glow}
        ${sizeClass}
        ${canPlay ? 'hover:scale-110 hover:-translate-y-2 cursor-pointer' : 'opacity-50 cursor-not-allowed'}
        ${selected ? 'scale-105 -translate-y-2 md:scale-110 md:-translate-y-3 ring-2 ring-yellow-400 ring-offset-2 ring-offset-gray-950' : ''}
        transition-all duration-200
      `}
    >
      {/* 초식 공/수 악센트 바 (좌측) */}
      {nature && (
        <div className={`absolute left-0 top-0 bottom-0 w-1 md:w-1.5 ${nature.bar} rounded-l-lg`} />
      )}

      <div className="flex justify-between items-start w-full">
        <span className={`font-bold truncate text-[10px] md:text-sm pl-1 ${rarity.color}`}>{card.name}</span>
        <span className={`flex items-center justify-center w-5 h-5 md:w-6 md:h-6 rounded-full ${rarity.costBg} ${rarity.costBorder} text-black font-bold text-[10px] md:text-xs shrink-0`}>
          {card.cost}
        </span>
      </div>

      <div className="flex-1 flex items-center justify-center my-1 md:my-2">
        <span className="text-lg md:text-2xl">
          {nature ? nature.icon : typeIcons[card.type]}
        </span>
      </div>

      <div className="text-gray-200 text-center text-[9px] md:text-xs leading-tight">
        {card.description}
      </div>

      {/* 하단: 카테고리 + 공/수 태그 */}
      <div className="flex items-center justify-center gap-1 mt-1">
        <span className="text-gray-400 text-[10px]">{typeLabels[card.type]}</span>
        {nature && (
          <span className={`text-[9px] md:text-[10px] font-bold ${nature.color}`}>
            {nature.label}
          </span>
        )}
      </div>
    </button>
  )
}
