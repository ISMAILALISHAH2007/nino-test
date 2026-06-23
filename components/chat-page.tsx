'use client'

import { useEffect, useState, useRef } from 'react'
import { getChatSessions, addMessage, getSessionMessages, createChatSession, deleteChatSession, updateMessage } from '@/app/actions/chat'
import { Button } from '@/components/ui/button'
import { SettingsModal } from '@/components/settings-modal'
import { OrbVisualization } from '@/components/orb-visualization'
import { VoiceInput } from '@/components/voice-input'
import { getTTS } from '@/lib/text-to-speech'
import { MemoriesPanel } from '@/components/memories-panel'
import { logout } from '@/app/actions/auth'
import { authClient } from '@/lib/auth-client'

// Web Audio sound oscillators for premium mechanical tick and notification chimes
function playTickSound() {
  if (typeof window === 'undefined') return
  try {
    const ctx = new (window.AudioContext || (window as any).webkitAudioContext)()
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    osc.connect(gain)
    gain.connect(ctx.destination)
    osc.type = 'sine'
    osc.frequency.setValueAtTime(900, ctx.currentTime)
    gain.gain.setValueAtTime(0.008, ctx.currentTime)
    gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.05)
    osc.start()
    osc.stop(ctx.currentTime + 0.05)
  } catch (e) {}
}

function playChimeSound() {
  if (typeof window === 'undefined') return
  try {
    const ctx = new (window.AudioContext || (window as any).webkitAudioContext)()
    const now = ctx.currentTime
    
    const osc1 = ctx.createOscillator()
    const gain1 = ctx.createGain()
    osc1.type = 'sine'
    osc1.frequency.setValueAtTime(523.25, now) // C5
    gain1.gain.setValueAtTime(0.01, now)
    gain1.gain.exponentialRampToValueAtTime(0.0001, now + 0.25)
    osc1.connect(gain1)
    gain1.connect(ctx.destination)
    osc1.start(now)
    osc1.stop(now + 0.25)

    const osc2 = ctx.createOscillator()
    const gain2 = ctx.createGain()
    osc2.type = 'sine'
    osc2.frequency.setValueAtTime(659.25, now + 0.08) // E5
    gain2.gain.setValueAtTime(0.01, now + 0.08)
    gain2.gain.exponentialRampToValueAtTime(0.0001, now + 0.35)
    osc2.connect(gain2)
    gain2.connect(ctx.destination)
    osc2.start(now + 0.08)
    osc2.stop(now + 0.35)
  } catch (e) {}
}
import { 
  Send, 
  Settings, 
  Copy,
  Brain, 
  Plus, 
  LogOut, 
  MessageSquare, 
  Trash2, 
  Sparkles,
  Volume2,
  VolumeX,
  User,
  PanelRightClose,
  PanelRightOpen,
  ArrowRight,
  Menu,
  X,
  Compass,
  Lightbulb,
  Code,
  Check,
  Globe,
  HelpCircle,
  FileText,
  Mic,
  MicOff,
  ArrowDown,
  Monitor,
  Smartphone,
  Tablet,
  ExternalLink,
  Download,
  AlertCircle,
  RefreshCw
} from 'lucide-react'

interface Message {
  id: string
  role: 'user' | 'assistant'
  content: string
  createdAt: Date
  sentiment?: 'positive' | 'neutral' | 'negative'
}

function CodeBlock({ 
  language, 
  code, 
  onPreview 
}: { 
  language: string; 
  code: string; 
  onPreview?: (title: string, code: string, lang: string) => void 
}) {
  const [copied, setCopied] = useState(false)

  const handleCopy = () => {
    navigator.clipboard.writeText(code)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const isRenderable = ['html', 'svg', 'xml', 'javascript', 'js', 'css'].includes(language?.toLowerCase())

  return (
    <div className="my-4 overflow-hidden rounded-xl border border-white/10 bg-zinc-950/80 shadow-2xl backdrop-blur-md text-left w-full">
      <div className="flex items-center justify-between px-4 py-2.5 bg-zinc-900/60 border-b border-white/5">
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-rose-500/80" />
          <span className="w-2.5 h-2.5 rounded-full bg-amber-500/80" />
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-500/80" />
          <span className="text-[10px] font-bold text-zinc-500 uppercase ml-2 tracking-wider">{language || 'code'}</span>
        </div>
        <div className="flex items-center gap-1.5">
          <button
            onClick={handleCopy}
            type="button"
            className="text-[10px] font-bold text-zinc-400 hover:text-zinc-100 transition-colors flex items-center gap-1.5 px-2.5 py-1 rounded bg-white/5 border border-white/5 active:scale-95"
          >
            {copied ? <Check size={12} className="text-emerald-400" /> : null}
            {copied ? 'COPIED!' : 'COPY'}
          </button>
          {isRenderable && onPreview && (
            <button
              onClick={() => onPreview(`${language.toUpperCase()} Artifact`, code, language)}
              type="button"
              className="text-[10px] font-bold text-violet-400 hover:text-violet-100 transition-colors flex items-center gap-1.5 px-2.5 py-1 rounded bg-violet-600/10 border border-violet-500/20 active:scale-95"
            >
              <Sparkles size={12} />
              PREVIEW
            </button>
          )}
        </div>
      </div>
      <pre className="p-4 overflow-x-auto font-mono text-[11px] text-zinc-300 leading-relaxed max-w-full">
        <code>{code}</code>
      </pre>
    </div>
  )
}

export function ChatPage() {
  const [sessions, setSessions] = useState<any[]>([])
  const [currentSessionId, setCurrentSessionId] = useState<string>('')
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [streaming, setStreaming] = useState(false)
  const [showSettings, setShowSettings] = useState(false)
  const [showMemories, setShowMemories] = useState(false)
  const [isListening, setIsListening] = useState(false)
  const [lastSentiment, setLastSentiment] = useState<'positive' | 'neutral' | 'negative'>('neutral')
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [theme, setTheme] = useState('dark')
  const [isMobile, setIsMobile] = useState(false)
  const [thinkingStatus, setThinkingStatus] = useState('Nino is processing...')
  const [memories, setMemories] = useState<any[]>([])
  const [memoryToast, setMemoryToast] = useState<{ key: string; value: string } | null>(null)
  const [errorToast, setErrorToast] = useState<string | null>(null)

  // NEW UPGRADE STATES
  const [activeArtifact, setActiveArtifact] = useState<{ title: string; code: string; language: string } | null>(null)
  const [artifactTab, setArtifactTab] = useState<'preview' | 'code'>('preview')
  const [voiceModeActive, setVoiceModeActive] = useState(false)
  const [voiceState, setVoiceState] = useState<'idle' | 'listening' | 'speaking'>('idle')
  const [voiceInterimText, setVoiceInterimText] = useState('')
  const [voiceUserSpeech, setVoiceUserSpeech] = useState('')
  const [voiceAISpeech, setVoiceAISpeech] = useState('')
  const [showSlashMenu, setShowSlashMenu] = useState(false)
  const [selectedSlashIndex, setSelectedSlashIndex] = useState(0)
  const [artifactViewport, setArtifactViewport] = useState<'desktop' | 'tablet' | 'mobile'>('desktop')
  const [showScrollButton, setShowScrollButton] = useState(false)
  const shouldAutoScrollRef = useRef(true)

  const [playingMessageId, setPlayingMessageId] = useState<string | null>(null)
  const [activeModifyMenuId, setActiveModifyMenuId] = useState<string | null>(null)
  const [copiedMessageId, setCopiedMessageId] = useState<string | null>(null)

  const voiceRecognitionRef = useRef<any>(null)
  
  const { data: sessionData } = authClient.useSession()
  const userName = sessionData?.user?.name || 'there'
  
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const ttsRef = useRef(getTTS())
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  // Auto-grow textarea height on input change
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto'
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 180)}px`
    }
  }, [input])

  // Load sessions and settings on mount
  useEffect(() => {
    loadSessions()
    loadSettings()
    
    fetch('/api/memories')
      .then((res) => res.json())
      .then((data) => setMemories(data || []))
      .catch(console.error)
    
    if (typeof window !== 'undefined') {
      const handleResize = () => {
        const mobile = window.innerWidth < 1024
        setIsMobile(mobile)
        if (mobile) {
          setSidebarOpen(false)
        } else {
          setSidebarOpen(true)
        }
      }
      handleResize()
      window.addEventListener('resize', handleResize)
      return () => window.removeEventListener('resize', handleResize)
    }
  }, [])

  // Update thinking status during AI streaming
  useEffect(() => {
    if (!streaming) return

    const statuses = [
      'Nino is referencing your memories...',
      'Synthesizing contextual thoughts...',
      'Accessing neural provider...',
      'Formulating response...',
      'Learning interests from query...'
    ]
    let idx = 0
    setThinkingStatus(statuses[0])

    const interval = setInterval(() => {
      idx = (idx + 1) % statuses.length
      setThinkingStatus(statuses[idx])
    }, 2000)

    return () => clearInterval(interval)
  }, [streaming])

  // Load messages when session changes
  useEffect(() => {
    if (currentSessionId) {
      loadMessages()
    }
  }, [currentSessionId])

  const messagesContainerRef = useRef<HTMLDivElement>(null)

  // Scroll to bottom when messages change, only if user is anchored near bottom
  const handleScroll = () => {
    const container = messagesContainerRef.current
    if (!container) return
    const { scrollTop, scrollHeight, clientHeight } = container
    const isNearBottom = scrollHeight - scrollTop - clientHeight < 120
    shouldAutoScrollRef.current = isNearBottom
    setShowScrollButton(!isNearBottom)
  }

  useEffect(() => {
    const container = messagesContainerRef.current
    if (container) {
      container.addEventListener('scroll', handleScroll, { passive: true })
      return () => container.removeEventListener('scroll', handleScroll)
    }
  }, [])

  useEffect(() => {
    if (shouldAutoScrollRef.current && messagesContainerRef.current) {
      messagesContainerRef.current.scrollTop = messagesContainerRef.current.scrollHeight
    }
  }, [messages])

  const scrollToBottom = () => {
    if (messagesContainerRef.current) {
      messagesContainerRef.current.scrollTo({
        top: messagesContainerRef.current.scrollHeight,
        behavior: 'smooth'
      })
      shouldAutoScrollRef.current = true
      setShowScrollButton(false)
    }
  }

  // EFFECT: Ambient Voice Mode Recognition Lifecycle
  useEffect(() => {
    if (!voiceModeActive) {
      if (voiceRecognitionRef.current) {
        try {
          voiceRecognitionRef.current.abort()
        } catch (e) {}
      }
      return
    }

    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
    if (!SpeechRecognition) return

    const rec = new SpeechRecognition()
    rec.continuous = true
    rec.interimResults = true
    rec.lang = 'en-US'

    let silenceTimeout: any = null

    rec.onstart = () => {
      setVoiceState('listening')
      setVoiceInterimText('')
    }

    rec.onresult = (event: any) => {
      // INTERRUPTION DETECTED: If user starts speaking while AI is speaking, interrupt immediately!
      if (ttsRef.current && ttsRef.current.getIsSpeaking()) {
        ttsRef.current.stop()
        setVoiceState('listening')
        setVoiceAISpeech('')
      }

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

      if (interimStr) {
        setVoiceInterimText(interimStr)
        setVoiceState('listening')
      }

      if (finalStr) {
        setVoiceUserSpeech(finalStr.trim())
        setVoiceInterimText('')
        
        if (silenceTimeout) clearTimeout(silenceTimeout)
        silenceTimeout = setTimeout(() => {
          triggerVoiceSendMessage(finalStr.trim())
        }, 1600)
      }
    }

    rec.onerror = (e: any) => {
      if (e.error !== 'aborted') {
        console.error("Voice recognition error in Ambient Mode:", e.error)
      }
    }

    rec.onend = () => {
      // If voice mode is still active and we're not speaking/processing, restart it!
      if (voiceModeActive && voiceState === 'listening') {
        try {
          rec.start()
        } catch (err) {}
      }
    }

    voiceRecognitionRef.current = rec
    try {
      rec.start()
    } catch (err) {}

    return () => {
      if (silenceTimeout) clearTimeout(silenceTimeout)
      try {
        rec.abort()
      } catch (e) {}
    }
  }, [voiceModeActive, voiceState])

  // EFFECT: Monitor when SpeechSynthesis finishes playing to resume listening
  useEffect(() => {
    if (!voiceModeActive) return
    if (voiceState !== 'speaking') return

    const interval = setInterval(() => {
      if (ttsRef.current && !ttsRef.current.getIsSpeaking()) {
        // AI finished speaking. Reset voice states and start listening again!
        setVoiceState('listening')
        setVoiceUserSpeech('')
        setVoiceInterimText('')
        setVoiceAISpeech('')
        if (voiceRecognitionRef.current) {
          try {
            voiceRecognitionRef.current.start()
          } catch (err) {}
        }
      }
    }, 400)

    return () => clearInterval(interval)
  }, [voiceModeActive, voiceState])

  // Trigger Send Message inside Voice Mode
  async function triggerVoiceSendMessage(text: string) {
    if (!text.trim() || !currentSessionId) return
    
    // Stop recording while processing
    if (voiceRecognitionRef.current) {
      try {
        voiceRecognitionRef.current.abort()
      } catch (e) {}
    }

    setVoiceState('speaking')
    setVoiceAISpeech('Thinking...')
    setVoiceUserSpeech(text)

    try {
      // Add user message to DB in background
      addMessage(currentSessionId, 'user', text).catch(console.error)
      setMessages((prev) => [
        ...prev,
        {
          id: `user-${Date.now()}`,
          role: 'user',
          content: text,
          createdAt: new Date(),
        },
      ])
      setTimeout(scrollToBottom, 50)

      let aiResponse = ''
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: [
            ...messages,
            { role: 'user', content: text },
          ],
          sessionId: currentSessionId,
        }),
      })

      if (!response.ok) {
        let errorMsg = 'Failed to get AI response'
        try {
          const errData = await response.json()
          if (errData && errData.error) errorMsg = errData.error
        } catch (e) {
          try {
            const errText = await response.text()
            if (errText) errorMsg = errText
          } catch (e2) {}
        }
        throw new Error(errorMsg)
      }

      const reader = response.body?.getReader()
      const decoder = new TextDecoder()

      if (reader) {
        while (true) {
          const { done, value } = await reader.read()
          if (done) break

          const chunkText = decoder.decode(value)
          aiResponse += chunkText
          setVoiceAISpeech(aiResponse)

          setMessages((prev) => {
            const last = prev[prev.length - 1]
            if (last?.role === 'assistant' && last.id.startsWith('ai-stream-')) {
              return [
                ...prev.slice(0, -1),
                { ...last, content: aiResponse, sentiment: detectSentiment(aiResponse) },
              ]
            } else {
              return [
                ...prev,
                {
                  id: `ai-stream-${Date.now()}`,
                  role: 'assistant',
                  content: aiResponse,
                  createdAt: new Date(),
                  sentiment: detectSentiment(aiResponse),
                },
              ]
            }
          })
        }
      }

      const sentiment = detectSentiment(aiResponse)
      setLastSentiment(sentiment)
      playChimeSound()

      if (ttsRef.current) {
        const preferredVoice = localStorage.getItem('nino-voice') || undefined
        ttsRef.current.speak(aiResponse, { voiceName: preferredVoice })
      }

      await loadMessages()
      await checkForNewMemories()

      // Delay-refresh sessions to sync title generation if it was a New Chat
      const currentTitle = sessions.find(s => s.id === currentSessionId)?.title
      if (currentTitle === 'New Chat') {
        setTimeout(() => {
          loadSessions()
        }, 1500)
      }
    } catch (error: any) {
      console.error('Failed in voice message:', error)
      const errorMessage = error?.message || 'Failed to get AI response'
      setVoiceAISpeech(`⚠️ Connection failed: ${errorMessage}`)
      
      setMessages((prev) => [
        ...prev,
        {
          id: `ai-error-${Date.now()}`,
          role: 'assistant',
          content: `⚠️ **Nino Voice Mode Connection Error**\n\nI was unable to retrieve a response from my AI cores during voice transmission.\n\n*Error details: ${errorMessage}*`,
          createdAt: new Date(),
          sentiment: 'negative'
        }
      ])
      setTimeout(scrollToBottom, 50)

      setTimeout(() => {
        setVoiceState('listening')
        setVoiceUserSpeech('')
        setVoiceInterimText('')
        setVoiceAISpeech('')
        if (voiceRecognitionRef.current) {
          try {
            voiceRecognitionRef.current.start()
          } catch (e) {}
        }
      }, 5000)
    }
  }

  // Polling to reset playingMessageId if SpeechSynthesis stops
  useEffect(() => {
    if (!playingMessageId) return
    const interval = setInterval(() => {
      if (typeof window !== 'undefined' && !window.speechSynthesis.speaking) {
        setPlayingMessageId(null)
      }
    }, 500)
    return () => clearInterval(interval)
  }, [playingMessageId])

  const handleReadAloud = (msg: Message) => {
    if (!ttsRef.current) return
    
    if (playingMessageId === msg.id) {
      ttsRef.current.stop()
      setPlayingMessageId(null)
    } else {
      ttsRef.current.stop()
      const preferredVoice = localStorage.getItem('nino-voice') || undefined
      ttsRef.current.speak(msg.content, { 
        voiceName: preferredVoice
      })
      setPlayingMessageId(msg.id)
    }
  }

  const handleCopyMessage = (msgId: string, content: string) => {
    navigator.clipboard.writeText(content)
    setCopiedMessageId(msgId)
    setTimeout(() => setCopiedMessageId(null), 2000)
  }

  async function modifyResponse(messageId: string, style: 'shorter' | 'longer' | 'simpler' | 'professional' | 'casual') {
    if (streaming) return
    setActiveModifyMenuId(null)

    // Find the message index
    const msgIdx = messages.findIndex(m => m.id === messageId)
    if (msgIdx === -1) return

    // History up to the message to modify (excluding it and everything after)
    const history = messages.slice(0, msgIdx)

    playTickSound()
    setStreaming(true)

    // Optimistically show rewriting state
    setMessages((prev) =>
      prev.map((m) => (m.id === messageId ? { ...m, content: 'Rewriting response...' } : m))
    )

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: [
            ...history.map(m => ({ role: m.role, content: m.content })),
            { role: 'user', content: `[System instruction: Rewrite your previous response to be ${style}. Keep the same core information, but adapt the style, vocabulary, and length accordingly. Do not add conversational prefixes like "Sure" or "Here is the rewritten version". Just start outputting the rewritten text directly.]` }
          ],
          sessionId: currentSessionId,
        }),
      })

      if (!response.ok) {
        let errorMsg = 'Failed to modify response'
        try {
          const errData = await response.json()
          if (errData && errData.error) errorMsg = errData.error
        } catch (e) {
          try {
            const errText = await response.text()
            if (errText) errorMsg = errText
          } catch (e2) {}
        }
        throw new Error(errorMsg)
      }

      const reader = response.body?.getReader()
      const decoder = new TextDecoder()
      let modifiedText = ''

      if (reader) {
        // Change the ID temporarily so it glows while streaming in-place!
        setMessages((prev) =>
          prev.map((m) => (m.id === messageId ? { ...m, id: `ai-stream-modify-${messageId}`, content: '' } : m))
        )

        while (true) {
          const { done, value } = await reader.read()
          if (done) break

          const chunkText = decoder.decode(value)
          modifiedText += chunkText

          setMessages((prev) =>
            prev.map((m) =>
              m.id === `ai-stream-modify-${messageId}`
                ? { ...m, content: modifiedText, sentiment: detectSentiment(modifiedText) }
                : m
            )
          )
        }
      }

      const finalSentiment = detectSentiment(modifiedText)
      setLastSentiment(finalSentiment)

      // Persistent update to database
      await updateMessage(messageId, modifiedText, finalSentiment)

      // Reload messages to restore the correct IDs and sync state
      await loadMessages()
    } catch (err: any) {
      console.error('Failed to modify response:', err)
      setErrorToast(err?.message || 'Failed to modify response')
      setTimeout(() => setErrorToast(null), 6000)
      await loadMessages() // revert changes on error
    } finally {
      setStreaming(false)
    }
  }

  const handleOpenInNewTab = () => {
    if (!activeArtifact) return
    const newWindow = window.open()
    if (newWindow) {
      const htmlContent = activeArtifact.language.toLowerCase() === 'svg'
        ? `<!DOCTYPE html><html><body style="margin:0;display:flex;justify-content:center;align-items:center;height:100vh;background:#fafafa;color:#18181b;font-family:sans-serif;">${activeArtifact.code}</body></html>`
        : `<!DOCTYPE html><html><head><style>body{margin:0;padding:16px;font-family:sans-serif;background:#fafafa;color:#18181b;}@media(prefers-color-scheme:dark){body{background:#18181b;color:#f4f4f5;}}</style></head><body>${activeArtifact.code}</body></html>`
      newWindow.document.write(htmlContent)
      newWindow.document.close()
    }
  }

  const handleDownloadArtifact = () => {
    if (!activeArtifact) return
    const blob = new Blob([activeArtifact.code], { type: 'text/plain' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    let ext = 'html'
    if (activeArtifact.language.toLowerCase() === 'svg') ext = 'svg'
    else if (['js', 'javascript'].includes(activeArtifact.language.toLowerCase())) ext = 'js'
    else if (activeArtifact.language.toLowerCase() === 'css') ext = 'css'
    
    a.download = `artifact-${Date.now()}.${ext}`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  async function loadSettings() {
    try {
      const response = await fetch('/api/settings')
      if (response.ok) {
        const data = await response.json()
        if (data) {
          setTheme(data.theme || 'dark')
          applyTheme(data.theme || 'dark')
        }
      }
    } catch (e) {
      console.error('Failed to load settings:', e)
    }
  }

  function applyTheme(t: string) {
    if (t === 'dark') {
      document.documentElement.classList.add('dark')
    } else if (t === 'light') {
      document.documentElement.classList.remove('dark')
    } else {
      const systemDark = window.matchMedia('(prefers-color-scheme: dark)').matches
      if (systemDark) {
        document.documentElement.classList.add('dark')
      } else {
        document.documentElement.classList.remove('dark')
      }
    }
  }

  function detectSentiment(text: string): 'positive' | 'neutral' | 'negative' {
    const positiveWords = /\b(great|good|happy|love|excellent|amazing|wonderful|perfect|awesome|thanks|thank)\b/gi
    const negativeWords = /\b(bad|terrible|hate|awful|horrible|poor|sad|worst|error|failed|fail|wrong)\b/gi
    
    const hasPositive = positiveWords.test(text)
    const hasNegative = negativeWords.test(text)
    
    if (hasPositive && !hasNegative) return 'positive'
    if (hasNegative && !hasPositive) return 'negative'
    return 'neutral'
  }

  async function loadSessions() {
    try {
      const data = await getChatSessions()
      setSessions(data)
      if (data.length > 0 && !currentSessionId) {
        setCurrentSessionId(data[0].id)
      }
    } catch (error) {
      console.error('Failed to load sessions:', error)
    }
  }

  async function loadMessages() {
    try {
      const data = await getSessionMessages(currentSessionId)
      setMessages(data)
      if (data.length > 0) {
        const lastMsg = data[data.length - 1]
        if (lastMsg.role === 'assistant' && lastMsg.sentiment) {
          setLastSentiment(lastMsg.sentiment as any)
        }
      }
    } catch (error) {
      console.error('Failed to load messages:', error)
    }
  }

  function handleVoiceTranscript(text: string) {
    setInput((prev) => (prev ? prev + ' ' + text : text))
  }

  async function newChat() {
    try {
      setLoading(true)
      const sessionId = await createChatSession('New Chat')
      setCurrentSessionId(sessionId)
      setMessages([])
      await loadSessions()
      if (window.innerWidth < 1024) {
        setSidebarOpen(false)
      }
    } catch (error) {
      console.error('Failed to create chat:', error)
    } finally {
      setLoading(false)
    }
  }

  async function handleDeleteSession(id: string, e: React.MouseEvent) {
    e.stopPropagation()
    if (!confirm('Are you sure you want to delete this conversation?')) return
    try {
      await deleteChatSession(id)
      await loadSessions()
      if (currentSessionId === id) {
        setMessages([])
        setCurrentSessionId('')
      }
    } catch (error) {
      console.error('Failed to delete session:', error)
    }
  }

  async function checkForNewMemories() {
    try {
      const response = await fetch('/api/memories')
      if (response.ok) {
        const currentMemories = await response.json()
        
        // Find if there is any memory in currentMemories that is not in our state memories list
        const newMemory = currentMemories.find(
          (m: any) => !memories.some((oldM) => oldM.id === m.id)
        )
        
        if (newMemory) {
          playChimeSound()
          setMemoryToast({ key: newMemory.key, value: newMemory.value })
          setTimeout(() => setMemoryToast(null), 5500)
        }
        
        setMemories(currentMemories)
      }
    } catch (e) {
      console.error('Failed to check for new memories:', e)
    }
  }

  async function sendMessage(e?: React.FormEvent | React.KeyboardEvent) {
    if (e) e.preventDefault()
    if (!input.trim() || !currentSessionId) return

    playTickSound()

    const userMessage = input
    setInput('')

    try {
      // Add user message to DB in background
      addMessage(currentSessionId, 'user', userMessage).catch(console.error)
      setMessages((prev) => [
        ...prev,
        {
          id: `user-${Date.now()}`,
          role: 'user',
          content: userMessage,
          createdAt: new Date(),
        },
      ])
      setTimeout(scrollToBottom, 50)

      setStreaming(true)
      let aiResponse = ''

      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: [
            ...messages,
            { role: 'user', content: userMessage },
          ],
          sessionId: currentSessionId,
        }),
      })

      if (!response.ok) {
        let errorMsg = 'Failed to get AI response'
        try {
          const errData = await response.json()
          if (errData && errData.error) errorMsg = errData.error
        } catch (e) {
          try {
            const errText = await response.text()
            if (errText) errorMsg = errText
          } catch (e2) {}
        }
        throw new Error(errorMsg)
      }

      const reader = response.body?.getReader()
      const decoder = new TextDecoder()

      if (reader) {
        while (true) {
          const { done, value } = await reader.read()
          if (done) break

          const text = decoder.decode(value)
          aiResponse += text

          setMessages((prev) => {
            const last = prev[prev.length - 1]
            if (last?.role === 'assistant' && last.id.startsWith('ai-stream-')) {
              return [
                ...prev.slice(0, -1),
                { ...last, content: aiResponse, sentiment: detectSentiment(aiResponse) },
              ]
            } else {
              return [
                ...prev,
                {
                  id: `ai-stream-${Date.now()}`,
                  role: 'assistant',
                  content: aiResponse,
                  createdAt: new Date(),
                  sentiment: detectSentiment(aiResponse),
                },
              ]
            }
          })
        }
      }

      // Update global sentiment state and read response aloud if enabled
      const sentiment = detectSentiment(aiResponse)
      setLastSentiment(sentiment)
      if (ttsRef.current) {
        const preferredVoice = localStorage.getItem('nino-voice') || undefined
        ttsRef.current.speak(aiResponse, { voiceName: preferredVoice })
      }

      // Refresh to ensure we align with persistent DB messages
      await loadMessages()
      await checkForNewMemories()

      // Delay-refresh sessions to sync title generation if it was a New Chat
      const currentTitle = sessions.find(s => s.id === currentSessionId)?.title
      if (currentTitle === 'New Chat') {
        setTimeout(() => {
          loadSessions()
        }, 1500)
      }
    } catch (error: any) {
      console.error('Failed to send message:', error)
      const errorMessage = error?.message || 'Failed to get AI response'
      setMessages((prev) => [
        ...prev,
        {
          id: `ai-error-${Date.now()}`,
          role: 'assistant',
          content: `⚠️ **Nino Connection Error**\n\nI was unable to retrieve a response from my AI cores.\n\n*Error details: ${errorMessage}*\n\nPlease make sure your API configuration is correct or switch providers in Settings.`,
          createdAt: new Date(),
          sentiment: 'negative'
        }
      ])
      setTimeout(scrollToBottom, 50)
    } finally {
      setStreaming(false)
    }
  }

  // SLASH COMMAND SYSTEM
  const slashCommands = [
    { cmd: '/code', desc: 'Generate code templates', icon: <Code size={14} />, prefix: 'Create code for ' },
    { cmd: '/web', desc: 'Query search engine in real-time', icon: <Globe size={14} />, prefix: 'Search the web for ' },
    { cmd: '/explain', desc: 'Explain complex concepts', icon: <HelpCircle size={14} />, prefix: 'Explain ' },
    { cmd: '/summarize', desc: 'Summarize articles or notes', icon: <FileText size={14} />, prefix: 'Summarize ' },
    { cmd: '/voice', desc: 'Activate Ambient Voice Companion', icon: <Mic size={14} />, action: () => setVoiceModeActive(true) }
  ]

  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement | HTMLInputElement>) => {
    const val = e.target.value
    setInput(val)
    
    if (val.startsWith('/') && !val.includes(' ')) {
      const filtered = slashCommands.filter(c => c.cmd.startsWith(val))
      if (filtered.length > 0) {
        setShowSlashMenu(true)
        setSelectedSlashIndex(0)
      } else {
        setShowSlashMenu(false)
      }
    } else {
      setShowSlashMenu(false)
    }
  }

  const handleInputKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (showSlashMenu) {
      const filtered = slashCommands.filter(c => c.cmd.startsWith(input))
      if (filtered.length > 0) {
        if (e.key === 'ArrowDown') {
          e.preventDefault()
          setSelectedSlashIndex((prev) => (prev + 1) % filtered.length)
          return
        } else if (e.key === 'ArrowUp') {
          e.preventDefault()
          setSelectedSlashIndex((prev) => (prev - 1 + filtered.length) % filtered.length)
          return
        } else if (e.key === 'Enter' || e.key === 'Tab') {
          e.preventDefault()
          const selected = filtered[selectedSlashIndex]
          if (selected) {
            executeSlashCommand(selected)
          }
          return
        } else if (e.key === 'Escape') {
          setShowSlashMenu(false)
          return
        }
      }
    }

    // Submit on Enter (without Shift key)
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendMessage(e)
    }
  }

  const executeSlashCommand = (cmdObj: typeof slashCommands[0]) => {
    setShowSlashMenu(false)
    if (cmdObj.action) {
      cmdObj.action()
      setInput('')
    } else if (cmdObj.prefix) {
      setInput(cmdObj.prefix)
    }
  }

  // Format message text with basic HTML tags for bold, bullet points, headers, and code blocks
  function formatMessageContent(content: string) {
    if (!content) return null
    
    // Split content by code blocks: ```lang\ncode\n```
    const parts = content.split(/(```[\s\S]*?```)/g)
    
    return parts.map((part, idx) => {
      if (part.startsWith('```') && part.endsWith('```')) {
        const match = part.match(/```(\w*)\n([\s\S]*?)```/)
        const lang = match ? match[1] : 'code'
        const code = match ? match[2] : part.slice(3, -3)
        return (
          <CodeBlock 
            key={idx} 
            language={lang} 
            code={code} 
            onPreview={(title, c, l) => {
              setActiveArtifact({ title, code: c, language: l })
              setArtifactTab('preview')
            }} 
          />
        )
      }
      
      // Plain text portion parser
      const lines = part.split('\n')
      return lines.map((line, index) => {
        const parseBold = (text: string) => {
          const boldParts = text.split(/(\*\*[^*]+\*\*)/g)
          return boldParts.map((bp, pIdx) => {
            if (bp.startsWith('**') && bp.endsWith('**')) {
              return <strong key={pIdx} className="font-bold">{bp.slice(2, -2)}</strong>
            }
            return bp
          })
        }

        // Bullet points
        if (line.startsWith('- ') || line.startsWith('* ')) {
          return (
            <li key={`${idx}-${index}`} className="list-disc ml-5 my-1.5">
              {parseBold(line.substring(2))}
            </li>
          )
        }
        
        // Numbered lists
        const numMatch = line.match(/^(\d+)\.\s(.*)/)
        if (numMatch) {
          return (
            <li key={`${idx}-${index}`} className="list-decimal ml-5 my-1.5">
              {parseBold(numMatch[2])}
            </li>
          )
        }

        // Headers
        if (line.startsWith('### ')) {
          return <h4 key={`${idx}-${index}`} className="text-sm font-bold mt-4 mb-1.5">{parseBold(line.substring(4))}</h4>
        }
        if (line.startsWith('## ')) {
          return <h3 key={`${idx}-${index}`} className="text-base font-bold mt-5 mb-2">{parseBold(line.substring(3))}</h3>
        }
        if (line.startsWith('# ')) {
          return <h2 key={`${idx}-${index}`} className="text-lg font-bold mt-6 mb-2.5">{parseBold(line.substring(2))}</h2>
        }

        // Plain paragraph
        return (
          <p key={`${idx}-${index}`} className="my-1.5 leading-relaxed break-words">
            {parseBold(line)}
          </p>
        )
      })
    })
  }

  const sentimentEmojis = {
    positive: '😊',
    neutral: '😐',
    negative: '😢',
  }

  return (
    <>
      <SettingsModal isOpen={showSettings} onClose={() => { setShowSettings(false); loadSettings(); }} />

      {/* Floating Memory Toast */}
      {memoryToast && (
        <div className="fixed top-20 right-6 z-50 glass-panel p-4 rounded-2xl shadow-xl flex items-center gap-3 animate-slide-in border border-violet-500/30 dark:border-violet-500/20 max-w-sm">
          <div className="w-10 h-10 rounded-xl bg-violet-600/10 flex items-center justify-center text-violet-500 shrink-0">
            <Brain size={20} className="animate-pulse" />
          </div>
          <div>
            <span className="text-[10px] font-bold text-violet-600 dark:text-violet-400 uppercase tracking-wider block">Fact Learned</span>
            <span className="text-xs font-bold text-slate-800 dark:text-zinc-200 capitalize">{memoryToast.key}</span>
            <span className="text-[11px] text-slate-500 dark:text-zinc-400 block mt-0.5 line-clamp-1">{memoryToast.value}</span>
          </div>
        </div>
      )}

      {/* Floating Error Toast */}
      {errorToast && (
        <div className="fixed top-20 right-6 z-50 error-glass-panel p-4 rounded-2xl shadow-xl flex items-center gap-3 animate-slide-in border border-red-500/30 dark:border-red-500/20 max-w-sm animate-error-pulse">
          <div className="w-10 h-10 rounded-xl bg-red-600/10 flex items-center justify-center text-red-500 shrink-0">
            <AlertCircle size={20} className="animate-pulse" />
          </div>
          <div className="flex-1 min-w-0">
            <span className="text-[10px] font-bold text-red-600 dark:text-red-400 uppercase tracking-wider block">Error Occurred</span>
            <span className="text-xs font-semibold text-slate-800 dark:text-zinc-200 block truncate" title={errorToast}>{errorToast}</span>
          </div>
          <button 
            onClick={() => setErrorToast(null)} 
            className="text-slate-400 hover:text-slate-600 dark:hover:text-zinc-200 text-xs font-bold p-1 self-start cursor-pointer hover:bg-black/5 dark:hover:bg-white/5 rounded-md"
          >
            ✕
          </button>
        </div>
      )}

      {/* Ambient Voice Mode Overlay */}
      {voiceModeActive && (
        <div className="voice-live-overlay text-slate-800 dark:text-zinc-100">
          {/* Top Bar info */}
          <div className="w-full flex items-center justify-between max-w-4xl">
            <div className="flex items-center gap-2">
              <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
              <span className="text-xs font-bold uppercase tracking-widest text-slate-500 dark:text-zinc-400">Nino Live Sync</span>
            </div>
            <button
              onClick={() => {
                setVoiceModeActive(false);
                if (voiceRecognitionRef.current) {
                  try { voiceRecognitionRef.current.abort() } catch (e) {}
                }
                if (ttsRef.current) {
                  ttsRef.current.stop();
                }
              }}
              className="px-3.5 py-1.5 rounded-xl bg-slate-900/10 dark:bg-white/10 hover:bg-slate-900/20 dark:hover:bg-white/20 active:scale-95 transition-all text-xs font-bold border border-slate-200/50 dark:border-white/5"
            >
              Exit Live Mode
            </button>
          </div>

          {/* Central Visualizer Area */}
          <div className="flex flex-col items-center justify-center gap-8 my-auto">
            {/* Avatar Ring */}
            <div className="voice-avatar-ring">
              <div className={`voice-avatar-orb ${
                voiceState === 'listening' ? 'listening' : voiceState === 'speaking' ? 'speaking' : ''
              }`} />
            </div>

            {/* Current State Text */}
            <div className="text-center">
              <span className="text-xs font-bold tracking-wider text-violet-600 dark:text-violet-400 uppercase">
                {voiceState === 'listening' ? 'Listening...' : voiceState === 'speaking' ? 'Nino Speaking' : 'Connecting...'}
              </span>
              
              {/* Animated waveform lines */}
              <div className="voice-wave-container justify-center mt-3">
                {[...Array(6)].map((_, i) => (
                  <div
                    key={i}
                    className={`voice-wave-bar ${voiceState === 'speaking' ? 'speaking-active' : ''}`}
                    style={{
                      animationDelay: `${i * 100}ms`,
                      height: voiceState === 'speaking' ? undefined : '8px'
                    }}
                  />
                ))}
              </div>
            </div>
          </div>

          {/* Rolling Subtitle Transcripts */}
          <div className="w-full max-w-2xl bg-white/40 dark:bg-zinc-900/40 backdrop-blur-xl border border-slate-200/50 dark:border-white/5 rounded-3xl p-6 shadow-xl space-y-4">
            {voiceUserSpeech && (
              <div className="space-y-1">
                <span className="text-[10px] font-bold text-violet-600 dark:text-violet-400 uppercase tracking-widest block">You said</span>
                <p className="text-sm font-medium text-slate-800 dark:text-zinc-200 italic">"{voiceUserSpeech}"</p>
              </div>
            )}

            {voiceInterimText && (
              <div className="space-y-1">
                <span className="text-[10px] font-bold text-slate-400 dark:text-zinc-500 uppercase tracking-widest block">Listening</span>
                <p className="text-sm font-medium text-slate-500 dark:text-zinc-400 italic">"{voiceInterimText}..."</p>
              </div>
            )}

            {voiceAISpeech && (
              <div className="border-t border-slate-200/50 dark:border-white/5 pt-3 space-y-1">
                <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-widest block">Nino Response</span>
                <p className="text-sm font-semibold text-slate-700 dark:text-zinc-100 max-h-[120px] overflow-y-auto leading-relaxed scrollbar-thin">
                  {voiceAISpeech}
                </p>
              </div>
            )}
          </div>
        </div>
      )}
      
      <div className="flex h-screen overflow-hidden font-sans transition-colors duration-200 liquid-glass-bg text-slate-900 dark:text-zinc-100 w-full relative">
        {/* iOS 27 Glowing liquid glass moving orbs */}
        <div className="liquid-orb orb-1" />
        <div className="liquid-orb orb-2" />
        <div className="liquid-orb orb-3" />

        {/* Mobile Sidebar overlay */}
        {sidebarOpen && (
          <div 
            className="lg:hidden fixed inset-0 bg-black/60 z-20 backdrop-blur-sm transition-opacity duration-300"
            onClick={() => setSidebarOpen(false)}
          />
        )}
        
        {/* Sidebar */}
        <aside 
          className={`${
            sidebarOpen ? 'translate-x-0 w-[280px]' : '-translate-x-full w-0 lg:w-0'
          } fixed lg:static top-0 bottom-0 left-0 shrink-0 bg-slate-950/80 lg:bg-slate-950/45 backdrop-blur-3xl border-r border-white/5 flex flex-col z-30 transition-all duration-300 h-full overflow-hidden`}
        >
          {/* Header branding */}
          <div className="p-5 border-b border-white/5 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-violet-600 to-indigo-600 flex items-center justify-center text-white font-bold shadow-md shadow-indigo-600/25">
                N
              </div>
              <div>
                <h1 className="font-semibold text-zinc-100 leading-none">Nino AI</h1>
                <span className="text-[10px] text-violet-400 font-medium tracking-wider uppercase mt-0.5 inline-block">Companion</span>
              </div>
            </div>
            <button 
              onClick={() => setSidebarOpen(false)}
              className="lg:hidden text-slate-400 hover:text-zinc-100 transition-colors p-1"
            >
              <X size={18} />
            </button>
          </div>

          {/* New Chat & Settings Buttons */}
          <div className="p-4 space-y-2 border-b border-white/5">
            <button
              onClick={newChat}
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 active:scale-[0.98] text-white rounded-xl py-2.5 px-4 transition-all duration-200 font-medium text-sm shadow-lg shadow-indigo-600/20"
            >
              <Plus size={16} />
              New Chat
            </button>
          </div>

          {/* Chat Session List */}
          <div className="flex-1 overflow-y-auto p-2.5 space-y-1 scrollbar-thin scrollbar-thumb-white/5">
            {sessions.map((session) => (
              <div
                key={session.id}
                onClick={() => {
                  setCurrentSessionId(session.id);
                  if (window.innerWidth < 1024) setSidebarOpen(false);
                }}
                className={`group flex items-center justify-between px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 cursor-pointer ${
                  currentSessionId === session.id
                    ? 'bg-white/10 text-zinc-100 shadow-sm border border-white/10'
                    : 'text-slate-400 hover:bg-white/5 hover:text-zinc-200'
                }`}
              >
                <div className="flex items-center gap-2.5 min-w-0 flex-1">
                  <MessageSquare size={16} className={currentSessionId === session.id ? 'text-violet-400' : 'text-slate-500'} />
                  <span className="truncate pr-2">{session.title}</span>
                </div>
                <button
                  onClick={(e) => handleDeleteSession(session.id, e)}
                  className="opacity-0 group-hover:opacity-100 hover:text-red-400 text-slate-500 transition-all p-1 rounded-md hover:bg-white/5"
                  title="Delete Chat"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            ))}
            {sessions.length === 0 && (
              <div className="text-center py-8 text-slate-500 text-xs">
                No conversations yet
              </div>
            )}
          </div>

          {/* Sidebar Footer */}
          <div className="p-4 border-t border-white/5 bg-slate-950/20 backdrop-blur-md flex items-center justify-between gap-2">
            <button
              onClick={() => setShowSettings(true)}
              className="flex items-center gap-2 px-3 py-2 text-xs font-semibold text-slate-300 hover:text-zinc-100 hover:bg-white/5 rounded-lg transition-all border border-white/5"
            >
              <Settings size={14} />
              Settings
            </button>
            <button
              onClick={() => logout()}
              className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-red-400 hover:text-red-300 hover:bg-red-950/20 rounded-lg transition-all"
            >
              <LogOut size={14} />
              Sign Out
            </button>
          </div>
        </aside>

        {/* Main Area */}
        <div className="flex-1 flex flex-col h-full relative overflow-hidden bg-transparent z-10">
          
          {/* Header */}
          <header className="h-16 glass-header flex items-center justify-between px-4 sm:px-6 z-10">
            <div className="flex items-center gap-3">
              {(!sidebarOpen || isMobile) && (
                <button
                  onClick={() => setSidebarOpen(!sidebarOpen)}
                  className="p-1.5 hover:bg-white/5 rounded-lg text-slate-600 dark:text-zinc-400 transition-colors border border-slate-200/50 dark:border-white/5"
                >
                  <Menu size={20} />
                </button>
              )}
              <div className="flex items-center gap-2">
                <h2 className="font-semibold text-slate-800 dark:text-white text-sm max-w-[120px] sm:max-w-xs truncate">
                  {sessions.find(s => s.id === currentSessionId)?.title || 'Nino Companion'}
                </h2>
                <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              </div>
            </div>

            {/* Header Right Actions */}
            <div className="flex items-center gap-2 sm:gap-3">
              
              {/* Pulsing sentiment indicator */}
              <div className="hidden md:flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-white/5 text-xs font-semibold border border-white/5">
                <span>Sentiment:</span>
                <span className="text-violet-600 dark:text-violet-400 font-bold capitalize">
                  {sentimentEmojis[lastSentiment]} {lastSentiment}
                </span>
              </div>

              {/* Collapsed Orb visualization right in the header! */}
              <div className="w-10 h-10 rounded-full border border-slate-200/50 dark:border-white/10 shadow-sm overflow-hidden flex items-center justify-center bg-white/5 backdrop-blur-md">
                <OrbVisualization sentiment={lastSentiment} isListening={isListening} className="w-10 h-10" />
              </div>

              {/* Memories toggle */}
              <button
                onClick={() => setShowMemories(!showMemories)}
                className={`p-2 rounded-lg border transition-all ${
                  showMemories 
                    ? 'bg-violet-50 border-violet-200 text-violet-600 dark:bg-violet-950/20 dark:border-violet-900/50 dark:text-violet-400' 
                    : 'border-slate-200/50 dark:border-white/5 hover:bg-slate-100 dark:hover:bg-white/5 text-slate-600 dark:text-zinc-400'
                }`}
                title="Toggle Nino's Memory Panel"
              >
                <Brain size={18} />
              </button>

              <button
                onClick={() => setShowSettings(true)}
                className="p-2 rounded-lg border border-slate-200/50 dark:border-white/5 hover:bg-slate-100 dark:hover:bg-white/5 text-slate-600 dark:text-zinc-400 transition-all"
                title="Settings"
              >
                <Settings size={18} />
              </button>
            </div>
          </header>

          {/* Workspace Wrapper (Message thread + Memories Drawer) */}
          <div className="flex-1 flex overflow-hidden w-full relative">
            
            {/* Messages pane */}
            <div className="flex-1 flex flex-col h-full overflow-hidden bg-transparent relative">
              <div ref={messagesContainerRef} className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6 scrollbar-thin">
                
                {/* Empty State */}
                {messages.length === 0 ? (
                  <div className="flex flex-col items-center justify-center min-h-[72vh] text-center max-w-2xl mx-auto p-6 font-sans">
                    <div className="relative w-24 h-24 mb-8 group cursor-pointer flex items-center justify-center select-none">
                      {/* Glow Backdrops */}
                      <div className="absolute inset-0 bg-gradient-to-tr from-violet-600 via-indigo-600 to-cyan-500 rounded-full blur-xl opacity-60 group-hover:opacity-80 group-hover:scale-110 transition-all duration-500 animate-pulse" />
                      {/* Dynamic Morphing Inner Orb */}
                      <div className="absolute w-20 h-20 rounded-full bg-gradient-to-tr from-violet-600 via-pink-500 via-indigo-600 to-cyan-400 animate-spin-slow animate-morph-1 shadow-2xl transition-transform duration-500 group-hover:scale-105" />
                      <div className="absolute w-16 h-16 rounded-full bg-gradient-to-br from-cyan-500 via-violet-500 to-pink-500 opacity-80 animate-morph-2 mix-blend-screen" />
                      <Sparkles size={24} className="relative z-10 text-white animate-pulse" />
                    </div>
                    
                    {/* Welcome Header */}
                    <h3 className="text-4xl sm:text-5xl font-extrabold tracking-tight mb-2 bg-gradient-to-r from-violet-500 via-pink-500 via-amber-400 to-emerald-400 bg-clip-text text-transparent animate-gradient-flow select-none py-1">
                      Hello, {userName}.
                    </h3>
                    <h4 className="text-2xl sm:text-3xl font-bold text-slate-700 dark:text-zinc-300 mb-8 tracking-tight">
                      How can I help you today?
                    </h4>
                    
                    <p className="text-slate-500 dark:text-zinc-400 text-sm mb-10 max-w-md leading-relaxed">
                      Type your message below or try a quick macro command using <code className="px-1.5 py-0.5 rounded bg-slate-100 dark:bg-white/5 border border-slate-200/50 dark:border-white/5 font-mono text-xs font-bold text-violet-500">/</code> to trigger next-generation learning workflows.
                    </p>
                    
                    {/* Prompt suggestions */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 w-full">
                      {[
                        { text: 'Practice conversational French with me', desc: 'Starts an interactive dialogue session', icon: <Compass className="text-emerald-500" size={18} /> },
                        { text: 'Explain Quantum Computing simply', desc: 'Breaks down complex mechanics', icon: <Lightbulb className="text-amber-500" size={18} /> },
                        { text: 'Create a responsive web game in HTML', desc: 'Generates client-side execution workspace', icon: <Code className="text-blue-500" size={18} /> },
                        { text: 'What is your favorite topic to discuss?', desc: 'Asks Nino about learning objectives', icon: <Sparkles className="text-violet-500" size={18} /> }
                      ].map((item, idx) => (
                        <button
                          key={idx}
                          onClick={() => setInput(item.text)}
                          className="flex items-start gap-4 p-4 rounded-2xl text-left transition-all duration-200 group border border-slate-200/50 dark:border-white/5 bg-white/5 hover:bg-white/10 dark:hover:bg-white/10 hover:border-violet-500/30 dark:hover:border-violet-500/20 active:scale-[0.98] shadow-sm cursor-pointer hover:shadow-md hover:shadow-violet-500/5"
                        >
                          <span className="shrink-0 mt-0.5 p-2 bg-slate-100 dark:bg-white/5 rounded-xl text-slate-600 dark:text-zinc-300 group-hover:bg-violet-600/10 group-hover:text-violet-500 transition-colors">{item.icon}</span>
                          <div className="flex-1 min-w-0">
                            <span className="text-xs font-bold text-slate-800 dark:text-zinc-200 block group-hover:text-violet-600 dark:group-hover:text-violet-400 transition-colors leading-normal">{item.text}</span>
                            <span className="text-[10px] text-slate-400 dark:text-zinc-500 mt-0.5 block truncate leading-normal">{item.desc}</span>
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="space-y-6 max-w-4xl mx-auto pb-4">
                    {messages.map((msg) => (
                      <div
                        key={msg.id}
                        className={`flex flex-col ${
                          msg.role === 'user' ? 'items-end' : 'items-start'
                        }`}
                      >
                        {/* Bubble */}
                        <div
                          className={`max-w-[85%] sm:max-w-[75%] px-4 py-3 rounded-2xl shadow-md transition-all duration-200 ${
                            msg.role === 'user'
                              ? 'bg-gradient-to-tr from-violet-600 to-indigo-600 text-white rounded-tr-sm shadow-indigo-600/10 font-medium'
                              : msg.id.startsWith('ai-error-')
                                ? 'error-glass-panel border-red-500/40 dark:border-red-400/30 text-red-900 dark:text-red-200 rounded-tl-sm animate-error-pulse'
                                : msg.id.startsWith('ai-stream-')
                                  ? 'glass-panel text-slate-800 dark:text-zinc-100 rounded-tl-sm border-violet-500/40 shadow-lg shadow-violet-500/5 animate-pulse-glow'
                                  : 'glass-panel text-slate-800 dark:text-zinc-100 rounded-tl-sm'
                          }`}
                        >
                          {msg.role === 'user' ? (
                            <p className="text-sm leading-relaxed break-words whitespace-pre-wrap">{msg.content}</p>
                          ) : (
                            <div className="text-sm space-y-1">
                              {formatMessageContent(msg.content)}
                              
                              {msg.id.startsWith('ai-error-') && (
                                <button
                                  type="button"
                                  onClick={() => {
                                    const errorIdx = messages.findIndex(m => m.id === msg.id)
                                    if (errorIdx > 0) {
                                      const lastUserMsg = messages.slice(0, errorIdx).reverse().find(m => m.role === 'user')
                                      if (lastUserMsg) {
                                        setInput(lastUserMsg.content)
                                        if (textareaRef.current) {
                                          textareaRef.current.focus()
                                        }
                                      }
                                    }
                                  }}
                                  className="mt-2.5 px-3 py-1.5 rounded-xl bg-red-500/10 border border-red-500/25 hover:bg-red-500/20 text-red-700 dark:text-red-300 font-semibold text-[10px] transition-all flex items-center gap-1.5 active:scale-95 cursor-pointer w-fit"
                                >
                                  <RefreshCw size={10} className="animate-spin-slow" />
                                  Restore original query
                                </button>
                              )}
                            </div>
                          )}
                        </div>

                        {/* Timestamp, Meta & Actions */}
                        <div className="flex flex-wrap items-center gap-3 mt-1.5 px-1.5 text-[10px] text-slate-400 dark:text-zinc-500 w-full justify-start relative">
                          <span>{new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                          
                          {msg.role === 'assistant' && msg.sentiment && (
                            <span className="font-semibold bg-slate-100/50 dark:bg-white/5 px-1.5 py-0.5 rounded-full text-slate-500 dark:text-zinc-400 capitalize select-none">
                              {sentimentEmojis[msg.sentiment]} {msg.sentiment}
                            </span>
                          )}

                          {msg.role === 'assistant' && !msg.id.startsWith('ai-stream-') && (
                            <div className="flex items-center gap-2 ml-1">
                              {/* Copy Button */}
                              <button
                                type="button"
                                onClick={() => handleCopyMessage(msg.id, msg.content)}
                                className="p-1 hover:bg-slate-100 dark:hover:bg-white/5 rounded-md hover:text-slate-700 dark:hover:text-zinc-200 active:scale-95 transition-all cursor-pointer"
                                title="Copy response"
                              >
                                {copiedMessageId === msg.id ? (
                                  <span className="text-[9px] font-bold text-emerald-500">COPIED!</span>
                                ) : (
                                  <Copy size={11} />
                                )}
                              </button>

                              {/* Read Aloud Button */}
                              <button
                                type="button"
                                onClick={() => handleReadAloud(msg)}
                                className={`p-1 hover:bg-slate-100 dark:hover:bg-white/5 rounded-md hover:text-slate-700 dark:hover:text-zinc-200 active:scale-95 transition-all cursor-pointer ${
                                  playingMessageId === msg.id ? 'text-violet-500 dark:text-violet-400 animate-pulse' : ''
                                }`}
                                title={playingMessageId === msg.id ? "Stop voice synthesis" : "Read response aloud"}
                              >
                                {playingMessageId === msg.id ? <VolumeX size={11} /> : <Volume2 size={11} />}
                              </button>

                              {/* Modify / Rewrite Response Button */}
                              <div className="relative">
                                <button
                                  type="button"
                                  onClick={() => setActiveModifyMenuId(activeModifyMenuId === msg.id ? null : msg.id)}
                                  className="p-1 hover:bg-slate-100 dark:hover:bg-white/5 rounded-md hover:text-slate-700 dark:hover:text-zinc-200 active:scale-95 transition-all text-violet-500/80 dark:text-violet-400/80 cursor-pointer"
                                  title="Modify Response"
                                >
                                  <Sparkles size={11} />
                                </button>

                                {activeModifyMenuId === msg.id && (
                                  <div className="absolute left-0 bottom-full mb-1 z-40 bg-white dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 shadow-2xl rounded-2xl p-1.5 flex flex-col w-36 gap-0.5 animate-slide-in text-[10px]">
                                    <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider px-2 py-1 select-none">Tone & Style</span>
                                    {[
                                      { style: 'shorter', label: '📝 Make shorter' },
                                      { style: 'longer', label: '📚 Make longer' },
                                      { style: 'simpler', label: '💡 Simplify content' },
                                      { style: 'professional', label: '👔 Professional tone' },
                                      { style: 'casual', label: '🍃 Casual tone' }
                                    ].map((opt) => (
                                      <button
                                        key={opt.style}
                                        type="button"
                                        onClick={() => modifyResponse(msg.id, opt.style as any)}
                                        className="px-2 py-1.5 text-left font-semibold rounded-lg hover:bg-slate-100 dark:hover:bg-white/5 text-slate-600 dark:text-zinc-300 hover:text-slate-900 dark:hover:text-white transition-all cursor-pointer"
                                      >
                                        {opt.label}
                                      </button>
                                    ))}
                                  </div>
                                )}
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                    
                    {/* Streaming indicator */}
                    {streaming && messages[messages.length - 1]?.role === 'user' && (
                      <div className="flex flex-col items-start animate-fade-in">
                        <div className="glass-panel rounded-2xl rounded-tl-sm px-4 py-3 shadow-md flex items-center gap-3">
                          <div className="flex gap-1 items-center py-1 shrink-0">
                            <span className="w-1.5 h-1.5 rounded-full bg-violet-500 dark:bg-violet-400 animate-bounce" style={{ animationDelay: '0ms' }} />
                            <span className="w-1.5 h-1.5 rounded-full bg-violet-500 dark:bg-violet-400 animate-bounce" style={{ animationDelay: '150ms' }} />
                            <span className="w-1.5 h-1.5 rounded-full bg-violet-500 dark:bg-violet-400 animate-bounce" style={{ animationDelay: '300ms' }} />
                          </div>
                          <span className="text-xs text-slate-500 dark:text-zinc-400 font-medium italic animate-pulse">
                            {thinkingStatus}
                          </span>
                        </div>
                      </div>
                    )}

                    <div ref={messagesEndRef} />
                  </div>
                )}
              </div>

              {/* Chat Input Container */}
              <div className="p-4 bg-transparent relative">
                {currentSessionId ? (
                  <form
                    onSubmit={sendMessage}
                    className="max-w-3xl mx-auto space-y-2.5"
                  >
                    {/* Suggestion Chips */}
                    {input === '' && (
                      <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
                        {[
                          { text: '💻 Code HTML Calculator', value: '/code Create a beautiful working calculator in HTML, CSS and JS' },
                          { text: '⚛️ Explain Quantum Physics', value: '/explain Quantum Physics like I am 5' },
                          { text: '📰 Web Search SpaceX', value: '/web What is the latest SpaceX mission status?' },
                          { text: '🎙️ Start Voice Chat', value: '/voice' }
                        ].map((item, idx) => (
                          <button
                            key={idx}
                            type="button"
                            onClick={() => {
                              if (item.value === '/voice') {
                                setVoiceModeActive(true);
                              } else {
                                setInput(item.value);
                              }
                            }}
                            className="suggestion-chip bg-white/5 border border-slate-200/50 dark:border-white/5 text-slate-600 dark:text-zinc-300 hover:bg-slate-100 dark:hover:bg-white/10 active:scale-95 transition-all shadow-sm cursor-pointer"
                          >
                            {item.text}
                          </button>
                        ))}
                      </div>
                    )}

                    <div className="relative glass-input-bar rounded-2xl shadow-xl p-2.5 flex items-center gap-2.5 focus-within:ring-2 focus-within:ring-violet-500/20 focus-within:border-violet-500 transition-all duration-200">
                      
                      {/* Slash command list dropdown */}
                      {showSlashMenu && (
                        <div className="slash-cmd-dropdown active bg-white dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 shadow-2xl">
                          {slashCommands
                            .filter(c => c.cmd.startsWith(input))
                            .map((cmdObj, cIdx) => (
                              <button
                                key={cmdObj.cmd}
                                type="button"
                                onClick={() => executeSlashCommand(cmdObj)}
                                className={`slash-cmd-item text-xs font-semibold ${
                                  cIdx === selectedSlashIndex
                                    ? 'selected bg-violet-600/10 text-violet-600 dark:text-violet-400'
                                    : 'text-slate-600 dark:text-zinc-400 hover:bg-slate-50 dark:hover:bg-zinc-900'
                                }`}
                              >
                                <span className="p-1 bg-slate-100 dark:bg-zinc-800 rounded text-violet-500">
                                  {cmdObj.icon}
                                </span>
                                <div className="flex-1 min-w-0">
                                  <span className="font-bold block">{cmdObj.cmd}</span>
                                  <span className="text-[10px] text-slate-400 font-medium block truncate">{cmdObj.desc}</span>
                                </div>
                              </button>
                            ))}
                        </div>
                      )}

                      {/* Voice mic button */}
                      <div className="shrink-0">
                        <VoiceInput
                          onTranscript={handleVoiceTranscript}
                          isListening={isListening}
                          setIsListening={setIsListening}
                        />
                      </div>

                      {/* Input field */}
                      <textarea
                        ref={textareaRef}
                        value={input}
                        onChange={handleInputChange}
                        onKeyDown={handleInputKeyDown}
                        placeholder="Ask Nino anything... (Type / for commands)"
                        disabled={streaming}
                        rows={1}
                        className="flex-1 bg-transparent border-0 px-2 py-1.5 text-sm focus:ring-0 focus:outline-none text-slate-800 dark:text-zinc-100 placeholder-slate-400 dark:placeholder-zinc-500 resize-none max-h-[180px] overflow-y-auto leading-relaxed scrollbar-thin self-center"
                      />

                      {/* Send button */}
                      <button
                        type="submit"
                        disabled={streaming || !input.trim()}
                        className="w-9 h-9 rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white flex items-center justify-center transition-all shadow-md active:scale-95 disabled:opacity-30 disabled:pointer-events-none shrink-0"
                      >
                        <Send size={16} />
                      </button>
                    </div>
                  </form>
                ) : (
                  <div className="text-center max-w-md mx-auto py-2">
                    <button
                      onClick={newChat}
                      className="bg-gradient-to-r from-violet-600 to-indigo-600 text-white rounded-xl py-2 px-5 font-semibold text-sm transition-all shadow-md inline-flex items-center gap-2"
                    >
                      <Plus size={16} /> Start a conversation
                    </button>
                  </div>
                )}
              </div>
              
              {/* Floating scroll down button */}
              {showScrollButton && (
                <button
                  type="button"
                  onClick={scrollToBottom}
                  className="floating-scroll-btn animate-bounce"
                  title="Scroll to bottom"
                >
                  <ArrowDown size={16} />
                </button>
              )}
            </div>

            {/* Memories Panel Drawer */}
            <aside
              className={`${
                showMemories ? 'w-80 border-l border-white/5' : 'w-0 overflow-hidden'
              } shrink-0 glass-panel flex flex-col h-full transition-all duration-300 relative z-20`}
              style={{ width: showMemories ? '320px' : '0px' }}
            >
              <div className="p-4 border-b border-white/5 flex items-center justify-between bg-transparent">
                <div className="flex items-center gap-2">
                  <Brain size={18} className="text-violet-500" />
                  <h3 className="font-bold text-sm text-slate-900 dark:text-white">Nino's Memory</h3>
                </div>
                <button
                  onClick={() => setShowMemories(false)}
                  className="p-1 hover:bg-white/5 rounded-md text-slate-500 dark:text-zinc-400"
                >
                  <X size={16} />
                </button>
              </div>
              <div className="flex-1 overflow-y-auto p-4 bg-transparent">
                <MemoriesPanel activeMessages={messages} />
              </div>
            </aside>

            {/* Artifacts Side-Panel Drawer */}
            <aside
              className={`artifact-workspace h-full transition-all duration-300 relative z-20 flex flex-col ${
                activeArtifact ? 'w-[45%] border-l border-white/5 active' : 'w-0 overflow-hidden'
              }`}
              style={{ width: activeArtifact ? '45%' : '0px' }}
            >
              {activeArtifact && (
                <>
                  {/* Header */}
                  <div className="p-4 border-b border-white/5 flex items-center justify-between bg-slate-950/5">
                    <div className="flex items-center gap-2 min-w-0">
                      <Sparkles size={16} className="text-violet-500 animate-pulse shrink-0" />
                      <h3 className="font-bold text-sm text-slate-900 dark:text-white truncate">
                        {activeArtifact.title}
                      </h3>
                    </div>
                    
                    {/* Tabs & Close button */}
                    <div className="flex items-center gap-4 shrink-0">
                      <div className="flex gap-2 p-0.5 bg-slate-100 dark:bg-zinc-800 rounded-lg border border-slate-200/50 dark:border-zinc-700/50 text-xs">
                        <button
                          onClick={() => setArtifactTab('preview')}
                          className={`px-3 py-1 font-semibold rounded-md transition-all ${
                            artifactTab === 'preview'
                              ? 'bg-white dark:bg-zinc-900 text-slate-900 dark:text-white shadow-sm'
                              : 'text-slate-500 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-white'
                          }`}
                        >
                          Preview
                        </button>
                        <button
                          onClick={() => setArtifactTab('code')}
                          className={`px-3 py-1 font-semibold rounded-md transition-all ${
                            artifactTab === 'code'
                              ? 'bg-white dark:bg-zinc-900 text-slate-900 dark:text-white shadow-sm'
                              : 'text-slate-500 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-white'
                          }`}
                        >
                          Code
                        </button>
                      </div>
                      <button
                        onClick={() => setActiveArtifact(null)}
                        className="p-1.5 hover:bg-slate-200 dark:hover:bg-white/5 rounded-md text-slate-500 dark:text-zinc-400"
                      >
                        <X size={16} />
                      </button>
                    </div>
                  </div>

                  {/* Utility bar for simulation and actions */}
                  {artifactTab === 'preview' && (
                    <div className="px-4 py-2 border-b border-slate-200/50 dark:border-white/5 bg-slate-100/50 dark:bg-slate-950/20 flex items-center justify-between text-xs select-none">
                      {/* Viewport Selectors */}
                      <div className="flex items-center gap-1.5">
                        <span className="text-[9px] font-bold text-slate-400 dark:text-zinc-500 uppercase tracking-wider mr-1">View</span>
                        <button
                          type="button"
                          onClick={() => setArtifactViewport('desktop')}
                          className={`p-1.5 rounded-lg transition-all flex items-center gap-1.5 ${
                            artifactViewport === 'desktop'
                              ? 'bg-violet-600/10 text-violet-600 dark:text-violet-400 font-semibold'
                              : 'text-slate-500 dark:text-zinc-400 hover:text-slate-800 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-zinc-800'
                          }`}
                          title="Desktop View (100%)"
                        >
                          <Monitor size={12} />
                          <span className="text-[10px]">Desktop</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => setArtifactViewport('tablet')}
                          className={`p-1.5 rounded-lg transition-all flex items-center gap-1.5 ${
                            artifactViewport === 'tablet'
                              ? 'bg-violet-600/10 text-violet-600 dark:text-violet-400 font-semibold'
                              : 'text-slate-500 dark:text-zinc-400 hover:text-slate-800 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-zinc-800'
                          }`}
                          title="Tablet View (768px)"
                        >
                          <Tablet size={12} />
                          <span className="text-[10px]">Tablet</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => setArtifactViewport('mobile')}
                          className={`p-1.5 rounded-lg transition-all flex items-center gap-1.5 ${
                            artifactViewport === 'mobile'
                              ? 'bg-violet-600/10 text-violet-600 dark:text-violet-400 font-semibold'
                              : 'text-slate-500 dark:text-zinc-400 hover:text-slate-800 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-zinc-800'
                          }`}
                          title="Mobile View (375px)"
                        >
                          <Smartphone size={12} />
                          <span className="text-[10px]">Mobile</span>
                        </button>
                      </div>

                      {/* Export Options */}
                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={handleOpenInNewTab}
                          className="px-2 py-1 rounded-lg bg-white/5 border border-slate-200/50 dark:border-white/5 hover:bg-slate-100 dark:hover:bg-white/10 text-slate-600 dark:text-zinc-300 hover:text-slate-900 dark:hover:text-white active:scale-95 transition-all flex items-center gap-1.5"
                          title="Open in new window"
                        >
                          <ExternalLink size={11} />
                          <span className="text-[10px] font-semibold">New Tab</span>
                        </button>
                        <button
                          type="button"
                          onClick={handleDownloadArtifact}
                          className="px-2 py-1 rounded-lg bg-violet-600/10 border border-violet-500/20 hover:bg-violet-600/20 text-violet-600 dark:text-violet-400 hover:text-violet-900 dark:hover:text-violet-300 active:scale-95 transition-all flex items-center gap-1.5"
                          title="Download source code"
                        >
                          <Download size={11} />
                          <span className="text-[10px] font-semibold">Download</span>
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Content */}
                  <div className="flex-1 p-4 overflow-hidden flex flex-col bg-transparent">
                    {artifactTab === 'preview' ? (
                      <div className="artifact-preview-wrapper flex-1">
                        <div className={
                          artifactViewport === 'tablet' 
                            ? 'device-sim-tablet animate-fade-in' 
                            : artifactViewport === 'mobile' 
                              ? 'device-sim-mobile animate-fade-in' 
                              : 'w-full h-full'
                        }>
                          <iframe
                            title="Artifact Render Sandbox"
                            srcDoc={
                              activeArtifact.language.toLowerCase() === 'svg'
                                ? `<!DOCTYPE html><html><body style="margin:0;display:flex;justify-content:center;align-items:center;height:100vh;background:#fafafa;color:#18181b;font-family:sans-serif;">${activeArtifact.code}</body></html>`
                                : `<!DOCTYPE html><html><head><style>body{margin:0;padding:16px;font-family:sans-serif;background:#fafafa;color:#18181b;}@media(prefers-color-scheme:dark){body{background:#18181b;color:#f4f4f5;}}</style></head><body>${activeArtifact.code}</body></html>`
                            }
                            sandbox="allow-scripts"
                            className="w-full h-full border-0 rounded-xl"
                          />
                        </div>
                      </div>
                    ) : (
                      <div className="flex-1 overflow-auto rounded-xl border border-white/5 bg-zinc-950/80 p-4 font-mono text-[11px] text-zinc-300 leading-relaxed">
                        <pre className="whitespace-pre-wrap break-all">{activeArtifact.code}</pre>
                      </div>
                    )}
                  </div>
                </>
              )}
            </aside>

          </div>
        </div>
      </div>
    </>
  )
}
