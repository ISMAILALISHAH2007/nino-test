export class TextToSpeech {
  private synth: SpeechSynthesis | null = null
  private isSpeaking = false
  private selectedVoiceName: string | null = null

  constructor() {
    if (typeof window !== 'undefined') {
      this.synth = window.speechSynthesis
    }
  }

  setVoice(voiceName: string) {
    this.selectedVoiceName = voiceName
  }

  getVoices() {
    if (!this.synth) return []
    return this.synth.getVoices()
  }

  speak(text: string, options?: { rate?: number; pitch?: number; lang?: string; voiceName?: string }) {
    if (!this.synth) return

    // Cancel any ongoing speech
    this.synth.cancel()

    // Strip markdown formatting symbols so they are not read aloud
    const cleanText = text
      .replace(/\*\*([^*]+)\*\*/g, '$1') // remove bold asterisks
      .replace(/[#*_\-`]/g, ' ')         // remove other formatting symbols
      .replace(/\s+/g, ' ')              // collapse whitespace
      .trim()

    const utterance = new SpeechSynthesisUtterance(cleanText)
    utterance.rate = options?.rate || 1.05
    utterance.pitch = options?.pitch || 1.0
    utterance.lang = options?.lang || 'en-US'

    const targetVoiceName = options?.voiceName || this.selectedVoiceName
    const voices = this.synth.getVoices()
    
    if (voices.length > 0) {
      let voice = null
      
      // 1. Try to find user preferred voice
      if (targetVoiceName) {
        voice = voices.find(v => v.name === targetVoiceName)
      }
      
      // 2. Try Google US English or Natural premium sounding voices
      if (!voice) {
        voice = voices.find(v => 
          (v.name.includes('Google US English') || v.name.includes('Natural') || v.name.includes('Samantha') || v.name.includes('Premium')) &&
          v.lang.startsWith(options?.lang || 'en-US')
        )
      }
      
      // 3. Fallback to any Google or Microsoft English voice
      if (!voice) {
        voice = voices.find(v => 
          (v.name.includes('Google') || v.name.includes('Microsoft') || v.name.includes('Apple')) &&
          v.lang.startsWith(options?.lang || 'en-US')
        )
      }

      // 4. Fallback to matching language
      if (!voice) {
        voice = voices.find(v => v.lang.startsWith(options?.lang || 'en-US'))
      }

      if (voice) {
        utterance.voice = voice
      }
    }

    utterance.onstart = () => {
      this.isSpeaking = true
    }

    utterance.onend = () => {
      this.isSpeaking = false
    }

    utterance.onerror = (event) => {
      // Ignore normal interruption and cancel events when resetting speech synthesis
      if (event.error !== 'interrupted' && event.error !== 'canceled') {
        console.error('Speech synthesis error:', event.error)
      }
      this.isSpeaking = false
    }

    this.synth.speak(utterance)
  }

  stop() {
    if (this.synth) {
      this.synth.cancel()
      this.isSpeaking = false
    }
  }

  getIsSpeaking() {
    return this.isSpeaking
  }
}

let ttsInstance: TextToSpeech | null = null

export function getTTS() {
  if (!ttsInstance && typeof window !== 'undefined') {
    ttsInstance = new TextToSpeech()
  }
  return ttsInstance
}
