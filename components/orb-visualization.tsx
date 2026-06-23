'use client'

import { memo } from 'react'

interface OrbProps {
  sentiment?: 'positive' | 'neutral' | 'negative'
  isListening?: boolean
  className?: string
}

export const OrbVisualization = memo(function OrbVisualization({ sentiment = 'neutral', isListening = false, className = "w-24 h-24" }: OrbProps) {
  const colorMap = {
    positive: 'from-emerald-400 via-teal-500 to-green-600',
    neutral: 'from-indigo-400 via-purple-500 to-pink-600',
    negative: 'from-rose-500 via-red-600 to-orange-500',
  }
  
  const pulseClass = isListening 
    ? 'animate-pulse scale-110 shadow-lg shadow-red-500/20' 
    : 'animate-breathing scale-100 shadow-md shadow-indigo-600/5'

  return (
    <div className={`relative flex items-center justify-center select-none shrink-0 ${className} ${pulseClass}`}>
      {/* Outer pulsing ring during active listen */}
      {isListening && (
        <>
          <div className="absolute inset-0 rounded-full bg-red-500/25 blur-md animate-ping" />
          <div className="absolute -inset-2 rounded-full bg-red-400/10 blur-xl animate-pulse" />
        </>
      )}

      {/* Layer 1: Base Ambient Glow */}
      <div className={`absolute inset-0 rounded-full bg-gradient-to-tr ${colorMap[sentiment]} opacity-60 blur-xl animate-spin-slow`} />

      {/* Layer 2: Shifting Fluid Body */}
      <div className={`absolute inset-1 rounded-full bg-gradient-to-bl ${colorMap[sentiment]} opacity-75 blur-md animate-morph-1`} />

      {/* Layer 3: Dynamic Core */}
      <div className={`absolute inset-2 rounded-full bg-gradient-to-tr ${colorMap[sentiment]} opacity-95 blur-[2px] animate-morph-2`} />

      {/* Layer 4: Glossy glass cover reflection */}
      <div className="absolute inset-0 rounded-full border border-white/25 bg-gradient-to-b from-white/15 to-transparent shadow-inner backdrop-blur-[2px] z-10" />

      {/* Specular highlights */}
      <div className="absolute top-1 left-2 right-2 h-4 bg-gradient-to-b from-white/40 to-transparent rounded-full opacity-60 filter blur-[0.5px] z-15" />
    </div>
  )
})
