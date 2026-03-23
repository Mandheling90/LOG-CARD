import { useEffect, useState } from 'react'

const EFFECTS = {
  attack: {
    symbols: ['⚔️', '💥', '🗡️'],
    color: 'text-red-400',
    bgColor: 'bg-red-500/20',
    borderColor: 'border-red-500/50',
    label: '공격',
  },
  skill: {
    symbols: ['☯️', '🌀', '💠'],
    color: 'text-cyan-400',
    bgColor: 'bg-cyan-500/20',
    borderColor: 'border-cyan-500/50',
    label: '태극',
  },
  power: {
    symbols: ['🔥', '✨', '💫'],
    color: 'text-amber-400',
    bgColor: 'bg-amber-500/20',
    borderColor: 'border-amber-500/50',
    label: '심법',
  },
}

export default function BattleEffect({ effect, onDone }) {
  const [stage, setStage] = useState('enter') // enter → active → exit

  useEffect(() => {
    if (!effect) return

    // enter → active
    const t1 = setTimeout(() => setStage('active'), 50)
    // active → exit
    const t2 = setTimeout(() => setStage('exit'), 400)
    // cleanup
    const t3 = setTimeout(() => {
      setStage('enter')
      onDone()
    }, 650)

    return () => {
      clearTimeout(t1)
      clearTimeout(t2)
      clearTimeout(t3)
    }
  }, [effect, onDone])

  if (!effect) return null

  const config = EFFECTS[effect.type] || EFFECTS.attack

  return (
    <div className="pointer-events-none fixed inset-0 z-40 flex items-center justify-center">
      {/* Flash overlay */}
      <div
        className={`absolute inset-0 transition-opacity duration-200 ${config.bgColor} ${
          stage === 'active' ? 'opacity-100' : 'opacity-0'
        }`}
      />

      {/* Center burst */}
      <div
        className={`relative flex flex-col items-center gap-1 transition-all duration-300 ${
          stage === 'enter'
            ? 'scale-50 opacity-0'
            : stage === 'active'
              ? 'scale-110 opacity-100'
              : 'scale-150 opacity-0'
        }`}
      >
        {/* Particles */}
        {config.symbols.map((s, i) => (
          <div
            key={i}
            className="absolute text-2xl md:text-4xl animate-ping"
            style={{
              top: `${Math.sin((i * Math.PI * 2) / 3) * 50}px`,
              left: `${Math.cos((i * Math.PI * 2) / 3) * 50}px`,
              animationDuration: `${0.4 + i * 0.15}s`,
              animationIterationCount: 1,
            }}
          >
            {s}
          </div>
        ))}

        {/* Main icon */}
        <div className="text-5xl md:text-7xl drop-shadow-lg">
          {config.symbols[0]}
        </div>

        {/* Card name */}
        <div
          className={`${config.color} font-black text-lg md:text-2xl tracking-wider drop-shadow-lg`}
        >
          {effect.name}
        </div>
      </div>

      {/* Slash lines for attack */}
      {effect.type === 'attack' && stage === 'active' && (
        <>
          <div className="absolute w-[200%] h-0.5 bg-gradient-to-r from-transparent via-red-400 to-transparent rotate-45 animate-pulse opacity-80" />
          <div className="absolute w-[200%] h-0.5 bg-gradient-to-r from-transparent via-red-400 to-transparent -rotate-45 animate-pulse opacity-80" />
        </>
      )}

      {/* Ripple for skill */}
      {effect.type === 'skill' && stage === 'active' && (
        <div className="absolute w-40 h-40 md:w-60 md:h-60 rounded-full border-2 border-cyan-400/60 animate-ping" />
      )}

      {/* Glow for power */}
      {effect.type === 'power' && stage === 'active' && (
        <div className="absolute w-32 h-32 md:w-48 md:h-48 rounded-full bg-amber-400/20 blur-2xl animate-pulse" />
      )}
    </div>
  )
}
