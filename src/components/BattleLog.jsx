import { useEffect, useRef } from 'react'

export default function BattleLog({ log, mobile }) {
  const endRef = useRef(null)

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [log])

  if (mobile) {
    return (
      <div className="h-16 bg-gray-900/80 border border-gray-700 rounded-lg px-2 py-1 overflow-y-auto text-[10px] text-gray-400">
        {log.slice(-6).map((msg, i) => (
          <div key={i} className="py-px leading-tight">
            {msg}
          </div>
        ))}
        <div ref={endRef} />
      </div>
    )
  }

  return (
    <div className="w-56 h-64 bg-gray-900/80 border border-gray-700 rounded-lg p-3 overflow-y-auto text-xs text-gray-300">
      <div className="text-gray-500 font-bold mb-2 text-[10px] uppercase tracking-wider">강호 풍운록</div>
      {log.map((msg, i) => (
        <div key={i} className="py-0.5 border-b border-gray-800 last:border-0">
          {msg}
        </div>
      ))}
      <div ref={endRef} />
    </div>
  )
}
