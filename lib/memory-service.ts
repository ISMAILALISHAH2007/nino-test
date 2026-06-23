import { generateText } from 'ai'
import { createGroq } from '@ai-sdk/groq'

const groq = createGroq({ apiKey: process.env.GROQ_API_KEY })

export interface Memory {
  key: string
  value: string
  importance: number
}

export async function extractMemories(userMessage: string, assistantResponse: string): Promise<Memory[]> {
  try {
    const { text } = await generateText({
      model: groq('llama-3.3-70b-versatile'),
      system: `You are a memory extraction system for an AI learning companion. 
Your job is to identify and extract important facts and preferences that Nino should remember about the user.

Extract facts like:
- User's name, age, location
- Preferences (food, music, hobbies, work)
- Goals and aspirations
- Important dates and events
- Interests and expertise
- Personal relationships
- Health and lifestyle information

Return a JSON array of memory objects with structure: [{"key": "fact_name", "value": "fact_content", "importance": 1-5}]
Only return the JSON array, no other text.
If no memorable facts found, return: []`,
      prompt: `User message: "${userMessage}"

Assistant response: "${assistantResponse}"

Extract and remember important facts about the user.`,
      temperature: 0.3,
      maxTokens: 500,
    })

    try {
      // Extract JSON from the response
      const jsonMatch = text.match(/\[[\s\S]*\]/)
      if (jsonMatch) {
        const memories = JSON.parse(jsonMatch[0])
        return Array.isArray(memories) ? memories : []
      }
    } catch (e) {
      console.warn('Failed to parse memories:', e)
    }

    return []
  } catch (error) {
    console.error('Memory extraction error:', error)
    return []
  }
}

export function buildMemoryContext(memories: Array<{ key: string; value: string }>): string {
  if (memories.length === 0) return ''

  const memoryText = memories
    .sort((a, b) => b.value.length - a.value.length) // Prioritize longer/more detailed facts
    .slice(0, 10) // Limit to 10 most important
    .map((m) => `${m.key}: ${m.value}`)
    .join('\n')

  return `Known facts about the user:\n${memoryText}`
}
