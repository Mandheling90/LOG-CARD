import { useEffect, useState } from 'react'

// 초식은 nature(공/수/공수)에 따라 이펙트가 달라짐
const NATURE_EFFECTS = {
  attack: {
    symbols: ['⚔️', '💥', '🗡️'],
    color: 'text-red-400',
    bgColor: 'bg-red-500/20',
    slashColor: 'via-red-400',
  },
  defense: {
    symbols: ['🛡️', '💠', '✨'],
    color: 'text-blue-400',
    bgColor: 'bg-blue-500/20',
    slashColor: 'via-blue-400',
  },
  dual: {
    symbols: ['☯️', '⚔️', '🛡️'],
    color: 'text-purple-400',
    bgColor: 'bg-purple-500/20',
    slashColor: 'via-purple-400',
  },
}

const TYPE_EFFECTS = {
  simbeop: {
    symbols: ['🔥', '✨', '💫'],
    color: 'text-amber-400',
    bgColor: 'bg-amber-500/20',
  },
  bobeop: {
    symbols: ['💨', '🌀', '✨'],
    color: 'text-emerald-400',
    bgColor: 'bg-emerald-500/20',
  },
}

function getEffectConfig(effect) {
  if (effect.type === 'chosik' && effect.nature) {
    return { ...NATURE_EFFECTS[effect.nature], effectStyle: 'slash' }
  }
  if (effect.type === 'chosik') {
    return { ...NATURE_EFFECTS.attack, effectStyle: 'slash' }
  }
  if (effect.type === 'simbeop') {
    return { ...TYPE_EFFECTS.simbeop, effectStyle: 'glow' }
  }
  if (effect.type === 'bobeop') {
    return { ...TYPE_EFFECTS.bobeop, effectStyle: 'ripple' }
  }
  return { ...NATURE_EFFECTS.attack, effectStyle: 'slash' }
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

  const config = getEffectConfig(effect)

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

      {/* Slash lines for chosik */}
      {config.effectStyle === 'slash' && stage === 'active' && (
        <>
          <div className={`absolute w-[200%] h-0.5 bg-gradient-to-r from-transparent ${config.slashColor} to-transparent rotate-45 animate-pulse opacity-80`} />
          <div className={`absolute w-[200%] h-0.5 bg-gradient-to-r from-transparent ${config.slashColor} to-transparent -rotate-45 animate-pulse opacity-80`} />
        </>
      )}

      {/* Ripple for bobeop */}
      {config.effectStyle === 'ripple' && stage === 'active' && (
        <div className="absolute w-40 h-40 md:w-60 md:h-60 rounded-full border-2 border-emerald-400/60 animate-ping" />
      )}

      {/* Glow for simbeop */}
      {config.effectStyle === 'glow' && stage === 'active' && (
        <div className="absolute w-32 h-32 md:w-48 md:h-48 rounded-full bg-amber-400/20 blur-2xl animate-pulse" />
      )}
    </div>
  )
}
