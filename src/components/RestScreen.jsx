export default function RestScreen({ player, onRest }) {
  const healAmount = Math.floor(player.maxHp * 0.3)
  const healTo = Math.min(player.hp + healAmount, player.maxHp)

  return (
    <div className="min-h-screen bg-gray-950 flex items-center justify-center">
      <div className="bg-gray-900 border border-gray-700 rounded-2xl p-8 max-w-md flex flex-col items-center gap-6">
        <div className="text-6xl">🏥</div>
        <h2 className="text-2xl font-bold text-green-400">휴식처</h2>
        <p className="text-gray-300 text-center">
          조용한 곳에서 상처를 치유하고 태극을 다스릴 수 있다.
        </p>
        <p className="text-gray-500 text-sm">
          현재 체력: {player.hp}/{player.maxHp}
        </p>

        <div className="flex flex-col gap-3 w-full">
          <button
            onClick={() => onRest({ hpChange: healAmount, message: `휴식으로 체력을 ${healAmount} 회복했다.` })}
            className="w-full px-4 py-3 bg-green-900/50 hover:bg-green-900/80 text-green-300 rounded-lg border border-green-700 transition text-sm cursor-pointer"
          >
            🏥 휴식하기 (체력 +{healAmount}, 최대 {healTo})
          </button>
          <button
            onClick={() => onRest({ strengthChange: 1, message: '명상으로 공력이 1 상승했다.' })}
            className="w-full px-4 py-3 bg-amber-900/50 hover:bg-amber-900/80 text-amber-300 rounded-lg border border-amber-700 transition text-sm cursor-pointer"
          >
            🧘 수련하기 (공력 +1)
          </button>
        </div>
      </div>
    </div>
  )
}
