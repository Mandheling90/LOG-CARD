import { useState, useRef, useEffect, useCallback } from 'react'

export default function Tooltip({ text, children, className = '' }) {
  const [show, setShow] = useState(false)
  const ref = useRef(null)
  const timerRef = useRef(null)

  const open = useCallback(() => {
    setShow(true)
    clearTimeout(timerRef.current)
    timerRef.current = setTimeout(() => setShow(false), 2000)
  }, [])

  const toggle = useCallback((e) => {
    e.stopPropagation()
    if (show) {
      setShow(false)
      clearTimeout(timerRef.current)
    } else {
      open()
    }
  }, [show, open])

  // Close when tapping outside
  useEffect(() => {
    if (!show) return
    const handler = (e) => {
      if (ref.current && !ref.current.contains(e.target)) {
        setShow(false)
        clearTimeout(timerRef.current)
      }
    }
    document.addEventListener('pointerdown', handler)
    return () => document.removeEventListener('pointerdown', handler)
  }, [show])

  useEffect(() => () => clearTimeout(timerRef.current), [])

  return (
    <span ref={ref} className={`relative inline-flex ${className}`} onClick={toggle}>
      {children}
      {show && (
        <span className="absolute z-50 bottom-full left-1/2 -translate-x-1/2 mb-1.5 px-2.5 py-1.5 rounded-lg bg-gray-800 border border-gray-600 text-[11px] text-gray-200 whitespace-nowrap shadow-lg animate-tooltip-in pointer-events-none">
          {text}
          <span className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-gray-800" />
        </span>
      )}
    </span>
  )
}
