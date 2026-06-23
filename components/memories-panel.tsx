import { useEffect, useState, useRef } from 'react'
import { Button } from '@/components/ui/button'
import { Brain, Sparkles, Heart, Activity, BookOpen, Target, Calendar, User, Trash2 } from 'lucide-react'

interface Memory {
  id: string
  key: string
  value: string
  importance: number
  createdAt: string
}

interface MindMapNode {
  id: string
  label: string
  value: string
  x: number
  y: number
  vx: number
  vy: number
  r: number
  color: string
  isCenter?: boolean
}

function MemoryMindMap({ memories }: { memories: any[] }) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const [hoveredNode, setHoveredNode] = useState<MindMapNode | null>(null)
  const nodesRef = useRef<MindMapNode[]>([])
  const draggedNodeRef = useRef<MindMapNode | null>(null)
  const requestRef = useRef<number | null>(null)

  // Initialize nodes
  useEffect(() => {
    const nodes: MindMapNode[] = [
      {
        id: 'center',
        label: 'Nino\'s Brain',
        value: 'The core neural link of your conversation companion.',
        x: 150,
        y: 160,
        vx: 0,
        vy: 0,
        r: 32,
        color: '#8b5cf6',
        isCenter: true
      }
    ]

    memories.forEach((m, idx) => {
      const angle = (idx / memories.length) * Math.PI * 2
      const dist = 90 + Math.random() * 20
      nodes.push({
        id: m.id,
        label: m.key,
        value: m.value,
        x: 150 + Math.cos(angle) * dist,
        y: 160 + Math.sin(angle) * dist,
        vx: 0,
        vy: 0,
        r: 16 + Math.min(5, m.importance || 3) * 2.2,
        color: ['#3b82f6', '#10b981', '#f59e0b', '#ec4899', '#6366f1'][idx % 5]
      })
    })

    nodesRef.current = nodes
  }, [memories])

  // Physics animation loop
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const animate = () => {
      const nodes = nodesRef.current
      const width = canvas.width
      const height = canvas.height

      // Clear
      ctx.clearRect(0, 0, width, height)

      // 1. Calculate Forces
      // Attraction to center for non-center nodes
      nodes.forEach(node => {
        if (node.isCenter) return
        if (node === draggedNodeRef.current) return

        const dx = 150 - node.x
        const dy = 160 - node.y
        
        // Soft spring pull
        const force = 0.015
        node.vx += dx * force
        node.vy += dy * force
      })

      // Repulsion between all nodes
      for (let i = 0; i < nodes.length; i++) {
        for (let j = i + 1; j < nodes.length; j++) {
          const n1 = nodes[i]
          const n2 = nodes[j]

          const dx = n2.x - n1.x
          const dy = n2.y - n1.y
          const dist = Math.sqrt(dx * dx + dy * dy) || 1
          const minDist = n1.r + n2.r + 28

          if (dist < minDist) {
            const force = (minDist - dist) * 0.05
            const ax = (dx / dist) * force
            const ay = (dy / dist) * force

            if (n1 !== draggedNodeRef.current) {
              n1.vx -= ax
              n1.vy -= ay
            }
            if (n2 !== draggedNodeRef.current) {
              n2.vx += ax
              n2.vy += ay
            }
          }
        }
      }

      // Update positions with friction
      nodes.forEach(node => {
        if (node === draggedNodeRef.current) return
        node.x += node.vx
        node.y += node.vy
        node.vx *= 0.85
        node.vy *= 0.85

        // Keep inside canvas bounds
        node.x = Math.max(node.r + 5, Math.min(width - node.r - 5, node.x))
        node.y = Math.max(node.r + 5, Math.min(height - node.r - 5, node.y))
      })

      // 2. Draw connections (lines)
      ctx.lineWidth = 1.5
      nodes.forEach(node => {
        if (node.isCenter) return
        const center = nodes[0]
        
        // Gradient line
        const grad = ctx.createLinearGradient(center.x, center.y, node.x, node.y)
        grad.addColorStop(0, 'rgba(139, 92, 246, 0.45)')
        grad.addColorStop(1, 'rgba(99, 102, 241, 0.06)')
        ctx.strokeStyle = grad
        
        ctx.beginPath()
        ctx.moveTo(center.x, center.y)
        ctx.lineTo(node.x, node.y)
        ctx.stroke()
      })

      // 3. Draw nodes
      nodes.forEach(node => {
        // Shadow/Glow effect
        ctx.shadowColor = node.color
        ctx.shadowBlur = hoveredNode?.id === node.id ? 15 : 6
        
        ctx.fillStyle = node.color
        ctx.beginPath()
        ctx.arc(node.x, node.y, node.r, 0, Math.PI * 2)
        ctx.fill()
        
        // Inner white shine
        ctx.fillStyle = 'rgba(255, 255, 255, 0.15)'
        ctx.beginPath()
        ctx.arc(node.x - node.r*0.2, node.y - node.r*0.2, node.r * 0.4, 0, Math.PI * 2)
        ctx.fill()

        // Text
        ctx.shadowBlur = 0
        ctx.fillStyle = '#ffffff'
        ctx.font = 'bold 9px sans-serif'
        ctx.textAlign = 'center'
        ctx.textBaseline = 'middle'
        
        // Truncate label to fit node
        const maxChar = Math.floor(node.r / 3.2) + 3
        const truncated = node.label.length > maxChar ? node.label.substring(0, maxChar) + '..' : node.label
        ctx.fillText(truncated, node.x, node.y)
      })

      requestRef.current = requestAnimationFrame(animate)
    }

    animate()
    return () => {
      if (requestRef.current) cancelAnimationFrame(requestRef.current)
    }
  }, [hoveredNode])

  // Mouse handlers
  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current
    if (!canvas) return
    const rect = canvas.getBoundingClientRect()
    const x = e.clientX - rect.left
    const y = e.clientY - rect.top

    // Find node clicked
    const clicked = nodesRef.current.find(node => {
      const dist = Math.sqrt((node.x - x) ** 2 + (node.y - y) ** 2)
      return dist < node.r
    })

    if (clicked) {
      draggedNodeRef.current = clicked
    }
  }

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current
    if (!canvas) return
    const rect = canvas.getBoundingClientRect()
    const x = e.clientX - rect.left
    const y = e.clientY - rect.top

    if (draggedNodeRef.current) {
      draggedNodeRef.current.x = x
      draggedNodeRef.current.y = y
      draggedNodeRef.current.vx = 0
      draggedNodeRef.current.vy = 0
    } else {
      // Check for hover
      const hovered = nodesRef.current.find(node => {
        const dist = Math.sqrt((node.x - x) ** 2 + (node.y - y) ** 2)
        return dist < node.r
      })
      setHoveredNode(hovered || null)
    }
  }

  const handleMouseUp = () => {
    draggedNodeRef.current = null
  }

  return (
    <div className="space-y-2 mt-2">
      <div className="flex justify-between items-center px-1">
        <span className="text-[10px] font-bold uppercase tracking-wider text-violet-600 dark:text-violet-400">Synaptic Mind Web</span>
        <span className="text-[9px] text-slate-400 italic">Drag nodes to interact</span>
      </div>
      <div className="memory-canvas-container flex items-center justify-center relative">
        <canvas
          ref={canvasRef}
          width={300}
          height={320}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
          className="cursor-grab active:cursor-grabbing w-full h-full"
        />
      </div>
      
      {/* Node Tooltip Detail */}
      <div className="p-3 bg-white/40 dark:bg-zinc-900/40 backdrop-blur-xl border border-slate-200/50 dark:border-white/5 rounded-xl min-h-[64px] flex flex-col justify-center text-left">
        {hoveredNode ? (
          <>
            <span className="text-xs font-bold text-violet-600 dark:text-violet-400 capitalize">{hoveredNode.label}</span>
            <span className="text-[11px] text-slate-600 dark:text-zinc-300 leading-normal mt-0.5">{hoveredNode.value}</span>
          </>
        ) : (
          <span className="text-[10px] text-slate-400 dark:text-zinc-500 italic text-center block">Hover nodes to read synaptic context</span>
        )}
      </div>
    </div>
  )
}

export function MemoriesPanel({ activeMessages = [] }: { activeMessages?: any[] }) {
  const [memories, setMemories] = useState<Memory[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<'facts' | 'insights'>('facts')

  useEffect(() => {
    loadMemories()
  }, [])

  async function loadMemories() {
    try {
      setLoading(true)
      const response = await fetch('/api/memories')
      if (response.ok) {
        const data = await response.json()
        setMemories(data)
      }
    } catch (error) {
      console.error('Failed to load memories:', error)
    } finally {
      setLoading(false)
    }
  }

  async function deleteMemory(id: string) {
    try {
      const response = await fetch(`/api/memories?id=${id}`, {
        method: 'DELETE',
      })
      if (response.ok) {
        setMemories((prev) => prev.filter((m) => m.id !== id))
      }
    } catch (error) {
      console.error('Failed to delete memory:', error)
    }
  }

  // Calculate Insights
  const totalMemories = memories.length
  const avgImportance = totalMemories > 0 
    ? (memories.reduce((acc, m) => acc + m.importance, 0) / totalMemories).toFixed(1)
    : '0.0'

  // Extract topics based on memory keys/values
  const getTopics = () => {
    const topics: Array<{ name: string; count: number; icon: React.ReactNode; color: string }> = []
    
    const codingMatch = memories.some(m => /code|program|python|javascript|rust|developer|html|css|tech/i.test(m.key + ' ' + m.value))
    const langMatch = memories.some(m => /speak|language|french|spanish|german|english|accent/i.test(m.key + ' ' + m.value))
    const personalMatch = memories.some(m => /name|age|location|brother|sister|friend|wife|husband|job|work/i.test(m.key + ' ' + m.value))
    const goalsMatch = memories.some(m => /goal|dream|aim|career|aspire/i.test(m.key + ' ' + m.value))

    if (codingMatch) topics.push({ name: 'Programming & Tech', count: 85, icon: <Activity size={14} />, color: 'from-blue-500 to-cyan-500' })
    if (langMatch) topics.push({ name: 'Languages & Speech', count: 70, icon: <BookOpen size={14} />, color: 'from-emerald-500 to-teal-500' })
    if (personalMatch) topics.push({ name: 'Identity & Bio', count: 95, icon: <User size={14} />, color: 'from-violet-500 to-purple-500' })
    if (goalsMatch) topics.push({ name: 'Aspirations & Goals', count: 60, icon: <Target size={14} />, color: 'from-amber-500 to-orange-500' })

    // Fallbacks if no memories
    if (topics.length === 0) {
      topics.push({ name: 'Active Listening', count: 10, icon: <Sparkles size={14} />, color: 'from-violet-500 to-indigo-500' })
    }
    return topics
  }

  // Calculate sentiment analysis from active conversation messages
  const getSentimentStats = () => {
    let positive = 0
    let negative = 0
    let neutral = 0

    activeMessages.forEach((m) => {
      if (m.sentiment === 'positive') positive++
      else if (m.sentiment === 'negative') negative++
      else if (m.sentiment !== undefined) neutral++
    })

    const total = positive + negative + neutral || 1
    return {
      positive: Math.round((positive / total) * 100),
      negative: Math.round((negative / total) * 100),
      neutral: Math.round((neutral / total) * 100),
      totalCount: activeMessages.length
    }
  }

  const sentiment = getSentimentStats()
  const topics = getTopics()

  // Cognitive development level
  const getCognitiveLevel = () => {
    if (totalMemories === 0) return { lvl: 1, name: 'Initial Spark', desc: 'Nino is listening and waiting to discover facts about you.' }
    if (totalMemories < 4) return { lvl: 2, name: 'First Milestones', desc: 'Nino has registered basic preferences.' }
    if (totalMemories < 8) return { lvl: 3, name: 'Bonding Companion', desc: 'Nino understands your routines and key interests.' }
    return { lvl: 4, name: 'Cognitive Synced', desc: 'Nino has a multi-dimensional understanding of your profile.' }
  }
  const cognitive = getCognitiveLevel()

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-12 space-y-3">
        <div className="w-8 h-8 border-2 border-violet-600 border-t-transparent rounded-full animate-spin" />
        <span className="text-xs text-slate-500 dark:text-zinc-400 font-medium">Reading memory matrix...</span>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full space-y-4">
      
      {/* Sub Tabs */}
      <div className="flex p-1 bg-slate-100 dark:bg-zinc-800 rounded-xl border border-slate-200/50 dark:border-zinc-700/50">
        <button
          onClick={() => setActiveTab('facts')}
          className={`flex-1 py-1.5 text-xs font-semibold rounded-lg transition-all ${
            activeTab === 'facts'
              ? 'bg-white dark:bg-zinc-900 text-slate-900 dark:text-white shadow-sm'
              : 'text-slate-500 hover:text-slate-900 dark:text-zinc-400 dark:hover:text-white'
          }`}
        >
          🧠 Facts ({totalMemories})
        </button>
        <button
          onClick={() => setActiveTab('insights')}
          className={`flex-1 py-1.5 text-xs font-semibold rounded-lg transition-all ${
            activeTab === 'insights'
              ? 'bg-white dark:bg-zinc-900 text-slate-900 dark:text-white shadow-sm'
              : 'text-slate-500 hover:text-slate-900 dark:text-zinc-400 dark:hover:text-white'
          }`}
        >
          📊 Insights
        </button>
      </div>

      {activeTab === 'facts' ? (
        <div className="flex-1 space-y-3 overflow-y-auto max-h-[70vh] pr-1 scrollbar-thin">
          {memories.length === 0 ? (
            <div className="text-center text-slate-400 dark:text-zinc-500 py-10 px-4">
              <Brain size={32} className="mx-auto mb-3 opacity-30 text-violet-500" />
              <p className="text-xs font-medium leading-relaxed">
                Nino has not extracted any memories yet. Start chatting about your work, language goals, or hobbies to build your profile!
              </p>
            </div>
          ) : (
            memories.map((memory) => (
              <div
                key={memory.id}
                className="group p-3 bg-white dark:bg-zinc-900 border border-slate-200/80 dark:border-zinc-800/80 rounded-xl shadow-sm hover:border-violet-300 dark:hover:border-violet-800 transition-all flex items-start gap-2.5"
              >
                <div className="flex-1 min-w-0">
                  <h4 className="text-xs font-bold text-violet-600 dark:text-violet-400 capitalize truncate">{memory.key}</h4>
                  <p className="text-xs text-slate-600 dark:text-zinc-300 font-medium leading-relaxed mt-0.5 break-words">{memory.value}</p>
                  
                  <div className="flex items-center gap-2 mt-2">
                    <span className="inline-flex items-center px-1.5 py-0.5 rounded-full bg-slate-100 dark:bg-zinc-800 text-[10px] font-semibold text-slate-500 dark:text-zinc-400">
                      Weight: {memory.importance}/5
                    </span>
                    <span className="text-[9px] text-slate-400">
                      {new Date(memory.createdAt).toLocaleDateString([], { month: 'short', day: 'numeric' })}
                    </span>
                  </div>
                </div>

                <button
                  onClick={() => deleteMemory(memory.id)}
                  className="opacity-0 group-hover:opacity-100 text-slate-400 hover:text-red-500 transition-opacity p-1 hover:bg-slate-50 dark:hover:bg-zinc-800 rounded-md"
                  title="Forget Fact"
                >
                  <Trash2 size={13} />
                </button>
              </div>
            ))
          )}
        </div>
      ) : (
        <div className="space-y-4 overflow-y-auto max-h-[70vh] pr-1 scrollbar-thin">
          
          {/* Interactive Mind Map Synapse Web */}
          <MemoryMindMap memories={memories} />
          
          {/* Cognitive Level Gauge */}
          <div className="p-3 bg-gradient-to-tr from-violet-600/5 to-indigo-600/5 border border-violet-100 dark:border-violet-950/40 rounded-2xl">
            <div className="flex justify-between items-center mb-1">
              <span className="text-[10px] font-bold uppercase tracking-wider text-violet-600 dark:text-violet-400">Cognitive Sync</span>
              <span className="text-xs font-bold text-violet-600 dark:text-violet-400">Lvl {cognitive.lvl}</span>
            </div>
            <h4 className="text-sm font-bold text-slate-800 dark:text-white">{cognitive.name}</h4>
            <p className="text-[11px] text-slate-500 dark:text-zinc-400 leading-relaxed mt-0.5">{cognitive.desc}</p>
            
            {/* Progress bar */}
            <div className="w-full bg-slate-200 dark:bg-zinc-800 h-1.5 rounded-full mt-3 overflow-hidden">
              <div 
                className="bg-gradient-to-r from-violet-600 to-indigo-600 h-full rounded-full transition-all duration-500"
                style={{ width: `${Math.min(100, (totalMemories / 10) * 100)}%` }}
              />
            </div>
          </div>

          {/* Core Analytics Cards */}
          <div className="grid grid-cols-2 gap-2">
            <div className="p-3 bg-white dark:bg-zinc-900 border border-slate-200/80 dark:border-zinc-800/80 rounded-xl text-center">
              <span className="block text-[10px] text-slate-400 dark:text-zinc-500 font-bold uppercase">Memories</span>
              <span className="text-lg font-black text-slate-800 dark:text-white mt-1 block">{totalMemories}</span>
            </div>
            <div className="p-3 bg-white dark:bg-zinc-900 border border-slate-200/80 dark:border-zinc-800/80 rounded-xl text-center">
              <span className="block text-[10px] text-slate-400 dark:text-zinc-500 font-bold uppercase">Avg Importance</span>
              <span className="text-lg font-black text-slate-800 dark:text-white mt-1 block">{avgImportance}/5</span>
            </div>
          </div>

          {/* User Mood / Sentiment Distribution */}
          <div className="p-3.5 bg-white dark:bg-zinc-900 border border-slate-200/80 dark:border-zinc-800/80 rounded-2xl">
            <div className="flex items-center gap-1.5 mb-2.5">
              <Heart size={14} className="text-rose-500" />
              <h4 className="text-xs font-bold text-slate-800 dark:text-zinc-200">Emotional Resonance</h4>
            </div>
            
            {sentiment.totalCount === 0 ? (
              <p className="text-[10px] text-slate-400 dark:text-zinc-500 text-center py-2">
                No active session message metrics
              </p>
            ) : (
              <div className="space-y-2">
                {/* Horizontal segmented gauge */}
                <div className="w-full h-2 rounded-full overflow-hidden flex bg-slate-100 dark:bg-zinc-800">
                  <div className="bg-emerald-500 h-full" style={{ width: `${sentiment.positive}%` }} title={`Positive: ${sentiment.positive}%`} />
                  <div className="bg-amber-500 h-full" style={{ width: `${sentiment.neutral}%` }} title={`Neutral: ${sentiment.neutral}%`} />
                  <div className="bg-rose-500 h-full" style={{ width: `${sentiment.negative}%` }} title={`Negative: ${sentiment.negative}%`} />
                </div>

                <div className="flex justify-between items-center text-[10px] font-semibold text-slate-500 dark:text-zinc-400 pt-1">
                  <span className="flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-emerald-500" /> Pos {sentiment.positive}%</span>
                  <span className="flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-amber-500" /> Neu {sentiment.neutral}%</span>
                  <span className="flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-rose-500" /> Neg {sentiment.negative}%</span>
                </div>
              </div>
            )}
          </div>

          {/* Top Domain Categories */}
          <div className="space-y-2">
            <h4 className="text-xs font-bold text-slate-800 dark:text-zinc-200 px-1">Registered Domains</h4>
            
            <div className="space-y-1.5">
              {topics.map((t, i) => (
                <div 
                  key={i}
                  className="p-2.5 bg-white dark:bg-zinc-900 border border-slate-200/80 dark:border-zinc-800/80 rounded-xl flex items-center justify-between"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="p-1.5 bg-slate-100 dark:bg-zinc-800 rounded-lg text-violet-500 dark:text-violet-400 shrink-0">
                      {t.icon}
                    </span>
                    <span className="text-xs font-bold text-slate-700 dark:text-zinc-300 truncate">{t.name}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-12 bg-slate-100 dark:bg-zinc-800 h-1.5 rounded-full overflow-hidden">
                      <div className={`h-full rounded-full bg-gradient-to-r ${t.color}`} style={{ width: `${t.count}%` }} />
                    </div>
                    <span className="text-[10px] font-bold text-slate-500">{t.count}%</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

        </div>
      )}
    </div>
  )
}
