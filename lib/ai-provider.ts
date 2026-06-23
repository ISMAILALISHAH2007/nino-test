import { google, createGoogleGenerativeAI } from '@ai-sdk/google'
import { openai } from '@ai-sdk/openai'
import { groq } from '@ai-sdk/groq'
import { createOpenAI } from '@ai-sdk/openai'

export type AIProvider = 'gemini' | 'openai' | 'groq' | 'github' | 'openrouter'

const openrouter = createOpenAI({
  apiKey: process.env.OPENROUTER_API_KEY || '',
  baseURL: 'https://openrouter.ai/api/v1',
})

export function getModel(provider: AIProvider = 'groq') {
  if (provider === 'openai' && process.env.OPENAI_API_KEY) {
    return openai('gpt-4o-mini')
  }
  if (provider === 'gemini') {
    const key = process.env.GEMINI_API_KEY || process.env.GOOGLE_GENERATIVE_AI_API_KEY
    if (key) {
      const googleProvider = createGoogleGenerativeAI({ apiKey: key })
      return googleProvider('gemini-2.0-flash')
    }
  }
  if (provider === 'openrouter' && process.env.OPENROUTER_API_KEY) {
    return openrouter('z-ai/glm-5.2')
  }
  
  // Default Groq versatile decoding (ultra-fast responses)
  if (process.env.GROQ_API_KEY) {
    return groq('llama-3.3-70b-versatile')
  }

  // Backup fallback using OpenAI
  if (process.env.OPENAI_API_KEY) {
    return openai('gpt-4o-mini')
  }

  // Absolute fallback
  return groq('llama-3.1-8b-instant')
}

export function analyzeSentiment(text: string): 'positive' | 'neutral' | 'negative' {
  // Simple heuristic sentiment analysis
  const positive = /happy|great|wonderful|awesome|love|excellent|amazing/i
  const negative = /sad|bad|terrible|awful|hate|horrible|angry/i

  if (negative.test(text)) return 'negative'
  if (positive.test(text)) return 'positive'
  return 'neutral'
}
