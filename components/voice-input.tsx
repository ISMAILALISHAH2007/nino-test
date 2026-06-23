'use client'

import { useEffect, useRef, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Mic, MicOff } from 'lucide-react'

interface VoiceInputProps {
  onTranscript: (text: string) => void
  isListening: boolean
  setIsListening: (listening: boolean) => void
}

export function VoiceInput({ onTranscript, isListening, setIsListening }: VoiceInputProps) {
  const recognitionRef = useRef<any>(null)
  const [interimTranscript, setInterimTranscript] = useState('')
  const [isBrowserSupported, setIsBrowserSupported] = useState(true)

  const onTranscriptRef = useRef(onTranscript)
  useEffect(() => {
    onTranscriptRef.current = onTranscript
  }, [onTranscript])

  useEffect(() => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
    if (!SpeechRecognition) {
      setIsBrowserSupported(false)
      return
    }

    const recognition = new SpeechRecognition()
    recognition.continuous = true
    recognition.interimResults = true
    recognition.lang = 'en-US'

    recognition.onstart = () => {
      setIsListening(true)
      setInterimTranscript('')
    }

    recognition.onresult = (event: any) => {
      let finalStr = ''
      let interimStr = ''
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const text = event.results[i][0].transcript
        if (event.results[i].isFinal) {
          finalStr += text
        } else {
          interimStr += text
        }
      }
      
      if (finalStr) {
        onTranscriptRef.current(finalStr)
      }
      setInterimTranscript(interimStr)
    }

    recognition.onend = () => {
      setIsListening(false)
      setInterimTranscript('')
    }

    recognition.onerror = (event: any) => {
      console.error('Speech recognition error:', event.error)
      setIsListening(false)
    }

    recognitionRef.current = recognition

    return () => {
      recognition.abort()
    }
  }, [setIsListening])

  const toggleVoiceInput = () => {
    if (!recognitionRef.current) return

    if (isListening) {
      recognitionRef.current.stop()
    } else {
      setInterimTranscript('')
      try {
        recognitionRef.current.start()
      } catch (err) {
        console.error('Failed to start recognition:', err)
      }
    }
  }

  if (!isBrowserSupported) {
    return null
  }

  return (
    <div className="flex items-center gap-2">
      <button
        type="button"
        onClick={toggleVoiceInput}
        className={`w-9 h-9 rounded-xl flex items-center justify-center transition-all ${
          isListening 
            ? 'bg-red-500 hover:bg-red-600 text-white animate-pulse shadow-md shadow-red-500/20' 
            : 'bg-slate-100 hover:bg-slate-200 dark:bg-zinc-850 dark:hover:bg-zinc-750 text-slate-600 dark:text-zinc-300 border border-slate-200 dark:border-zinc-800'
        }`}
        title={isListening ? 'Stop listening' : 'Start voice input'}
      >
        {isListening ? <MicOff size={16} /> : <Mic size={16} />}
      </button>
      {interimTranscript && (
        <span className="text-xs text-violet-500 dark:text-violet-400 font-medium italic animate-pulse max-w-[150px] truncate">
          {interimTranscript}...
        </span>
      )}
    </div>
  )
}
