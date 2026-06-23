'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { logout } from '@/app/actions/auth'
import { MemoriesPanel } from '@/components/memories-panel'

interface SettingsModalProps {
  isOpen: boolean
  onClose: () => void
}

export function SettingsModal({ isOpen, onClose }: SettingsModalProps) {
  const [activeTab, setActiveTab] = useState<'settings' | 'memories'>('settings')
  const [aiProvider, setAiProvider] = useState('gemini')
  const [voiceEnabled, setVoiceEnabled] = useState(true)
  const [voiceLanguage, setVoiceLanguage] = useState('en-US')
  const [theme, setTheme] = useState('dark')
  const [saving, setSaving] = useState(false)
  const [voiceName, setVoiceName] = useState('')
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([])

  // Load browser voices
  useEffect(() => {
    if (typeof window !== 'undefined' && window.speechSynthesis) {
      const loadAvailableVoices = () => {
        setVoices(window.speechSynthesis.getVoices())
      }
      loadAvailableVoices()
      window.speechSynthesis.onvoiceschanged = loadAvailableVoices
    }
  }, [])

  // Fetch settings on open
  useEffect(() => {
    if (isOpen) {
      fetch('/api/settings')
        .then((res) => res.json())
        .then((data) => {
          if (data) {
            setAiProvider(data.aiProvider || 'gemini')
            setVoiceEnabled(data.voiceEnabled !== undefined ? data.voiceEnabled : true)
            setVoiceLanguage(data.voiceLanguage || 'en-US')
            setTheme(data.theme || 'dark')
            
            const savedVoice = localStorage.getItem('nino-voice') || ''
            setVoiceName(savedVoice)
          }
        })
        .catch(console.error)
    }
  }, [isOpen])

  async function handleSave() {
    setSaving(true)
    try {
      const response = await fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          aiProvider,
          voiceEnabled,
          voiceLanguage,
          theme,
        }),
      })

      if (response.ok) {
        onClose()
      }
    } catch (error) {
      console.error('Failed to save settings:', error)
    } finally {
      setSaving(false)
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-md">
      <div className="glass-panel text-slate-800 dark:text-zinc-100 p-7 rounded-3xl w-full max-w-md max-h-[90vh] overflow-y-auto shadow-2xl relative border border-slate-200/40 dark:border-white/10">
        <h2 className="text-2xl font-extrabold mb-5 tracking-tight bg-gradient-to-r from-violet-500 to-indigo-500 bg-clip-text text-transparent">Settings</h2>
        
        {/* Tabs */}
        <div className="flex gap-4 mb-6 border-b border-slate-200/50 dark:border-white/5">
          <button
            onClick={() => setActiveTab('settings')}
            className={`px-3 py-2 text-sm font-semibold transition-all relative ${
              activeTab === 'settings'
                ? 'text-violet-600 dark:text-violet-400 font-bold'
                : 'text-slate-400 hover:text-slate-700 dark:hover:text-zinc-200'
            }`}
          >
            Preferences
            {activeTab === 'settings' && (
              <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-violet-500 rounded-full" />
            )}
          </button>
          <button
            onClick={() => setActiveTab('memories')}
            className={`px-3 py-2 text-sm font-semibold transition-all relative ${
              activeTab === 'memories'
                ? 'text-violet-600 dark:text-violet-400 font-bold'
                : 'text-slate-400 hover:text-slate-700 dark:hover:text-zinc-200'
            }`}
          >
            Memories
            {activeTab === 'memories' && (
              <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-violet-500 rounded-full" />
            )}
          </button>
        </div>
 
        {/* Settings Tab */}
        {activeTab === 'settings' && (
          <>
            <div className="space-y-5">
              <div>
                <label className="block text-xs font-bold text-slate-500 dark:text-zinc-400 uppercase tracking-wider mb-2">
                  AI Provider / Model
                </label>
                <select
                  value={aiProvider}
                  onChange={(e) => setAiProvider(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-white/10 dark:bg-zinc-950/40 border border-slate-200/50 dark:border-white/10 rounded-xl text-slate-800 dark:text-zinc-200 focus:outline-none focus:ring-2 focus:ring-violet-500/30 transition-all font-semibold text-sm"
                >
                  <option value="gemini">Google Gemini</option>
                  <option value="openai">OpenAI</option>
                  <option value="groq">Groq (Llama 3.1)</option>
                  <option value="github">GitHub Models</option>
                  <option value="openrouter">OpenRouter (GLM-5.2)</option>
                </select>
              </div>
 
              <div className="flex items-center gap-3 py-1">
                <input
                  type="checkbox"
                  id="voiceEnabled"
                  checked={voiceEnabled}
                  onChange={(e) => setVoiceEnabled(e.target.checked)}
                  className="w-4 h-4 rounded text-violet-600 focus:ring-violet-500 border-slate-300"
                />
                <label htmlFor="voiceEnabled" className="text-sm font-semibold text-slate-700 dark:text-zinc-300">
                  Enable Voice Companion Mode
                </label>
              </div>
 
              {voiceEnabled && (
                <div className="space-y-5 p-4 rounded-2xl bg-slate-100/50 dark:bg-white/5 border border-slate-200/40 dark:border-white/5">
                  <div>
                    <label className="block text-xs font-bold text-slate-500 dark:text-zinc-400 uppercase tracking-wider mb-2">
                      Voice Language
                    </label>
                    <select
                      value={voiceLanguage}
                      onChange={(e) => setVoiceLanguage(e.target.value)}
                      className="w-full px-3.5 py-2.5 bg-white/20 dark:bg-zinc-950/40 border border-slate-200/50 dark:border-white/10 rounded-xl text-slate-800 dark:text-zinc-200 focus:outline-none focus:ring-2 focus:ring-violet-500/30 transition-all font-semibold text-sm"
                    >
                      <option value="en-US">English (US)</option>
                      <option value="en-GB">English (UK)</option>
                      <option value="es-ES">Spanish</option>
                      <option value="fr-FR">French</option>
                      <option value="de-DE">German</option>
                    </select>
                  </div>
 
                  <div>
                    <label className="block text-xs font-bold text-slate-500 dark:text-zinc-400 uppercase tracking-wider mb-2">
                      Preferred Voice
                    </label>
                    <select
                      value={voiceName}
                      onChange={(e) => {
                        setVoiceName(e.target.value)
                        localStorage.setItem('nino-voice', e.target.value)
                      }}
                      className="w-full px-3.5 py-2.5 bg-white/20 dark:bg-zinc-950/40 border border-slate-200/50 dark:border-white/10 rounded-xl text-slate-800 dark:text-zinc-200 focus:outline-none focus:ring-2 focus:ring-violet-500/30 transition-all font-semibold text-xs"
                    >
                      <option value="">Default Premium Natural Voice</option>
                      {voices
                        .filter((v) => v.lang.startsWith(voiceLanguage))
                        .map((v) => (
                          <option key={v.name} value={v.name}>
                            {v.name} ({v.localService ? 'Local' : 'Cloud'})
                          </option>
                        ))}
                    </select>
                  </div>
                </div>
              )}
 
              <div>
                <label className="block text-xs font-bold text-slate-500 dark:text-zinc-400 uppercase tracking-wider mb-2">
                  Theme Mode
                </label>
                <select
                  value={theme}
                  onChange={(e) => setTheme(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-white/10 dark:bg-zinc-950/40 border border-slate-200/50 dark:border-white/10 rounded-xl text-slate-800 dark:text-zinc-200 focus:outline-none focus:ring-2 focus:ring-violet-500/30 transition-all font-semibold text-sm"
                >
                  <option value="light">Light</option>
                  <option value="dark">Dark</option>
                  <option value="auto">Auto / System</option>
                </select>
              </div>
            </div>
 
            <div className="flex gap-3 mt-8">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 py-2.5 px-4 rounded-xl border border-slate-200/80 dark:border-white/5 text-xs font-bold bg-white/5 hover:bg-slate-100 dark:hover:bg-white/10 active:scale-95 transition-all text-slate-600 dark:text-zinc-300"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSave}
                disabled={saving}
                className="flex-1 py-2.5 px-4 rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white font-bold text-xs shadow-md shadow-indigo-600/20 active:scale-95 transition-all disabled:opacity-50"
              >
                {saving ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
 
            <div className="border-t border-slate-200/50 dark:border-white/5 mt-6 pt-5">
              <button
                type="button"
                onClick={() => logout()}
                className="w-full py-2.5 px-4 rounded-xl border border-red-500/20 text-red-500 hover:bg-red-500/10 active:scale-95 transition-all text-xs font-bold"
              >
                Logout Account
              </button>
            </div>
          </>
        )}
 
        {/* Memories Tab */}
        {activeTab === 'memories' && (
          <>
            <div className="space-y-4 max-h-[50vh] overflow-y-auto pr-1">
              <MemoriesPanel activeMessages={[]} />
            </div>
            <div className="mt-8">
              <button 
                type="button" 
                onClick={onClose} 
                className="w-full py-2.5 px-4 rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white font-bold text-xs shadow-md shadow-indigo-600/20 active:scale-95 transition-all"
              >
                Close Panel
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
