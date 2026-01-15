export type ContentType = 'announcement' | 'assignment' | 'page' | 'module' | 'file'

export type SearchIntent = 'planning' | 'due_date' | 'content_qa' | 'general'

export interface SearchPlan {
  intent: SearchIntent
  rewrittenQuery: string
  filters?: {
    courseIds?: string[]
    types?: ContentType[]
    timeRange?: 'upcoming' | 'past' | 'all'
  }
  searchDisabled?: boolean
}

/**
 * Coordinate search intent and parameters using a fast LLM pass.
 */
export async function coordinateSearch(
  query: string, 
  courses: any[]
): Promise<SearchPlan> {
  // Fallback if AI not available
  if (!window.ai) {
    return { intent: 'content_qa', rewrittenQuery: query }
  }

  // Quick course alias map for the system prompt
  const courseMap = courses.map((c: any) => {
    const name = c.name || c.course_code || ''
    const id = String(c.id)
    return `${id}: ${name}`
  }).join('\n').slice(0, 1500) // Truncate to save context

  try {
    // Build few-shot examples as message pairs for reliable JSON output
    const messages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }> = [
      {
        role: 'system',
        content: `You are a search coordinator. Output JSON only.

Courses: ${courseMap}

Intents: planning (priorities/schedule), due_date (deadlines), content_qa (explain/find content), general (greetings)

JSON format: {"intent":"...","rewrittenQuery":"keywords","filters":{"courseIds":[]},"searchDisabled":false}`
      },
      // Few-shot examples
      { role: 'user', content: 'when is homework 3 due' },
      { role: 'assistant', content: '{"intent":"due_date","rewrittenQuery":"homework 3","filters":{},"searchDisabled":false}' },
      { role: 'user', content: 'what should I work on this week' },
      { role: 'assistant', content: '{"intent":"planning","rewrittenQuery":"","filters":{},"searchDisabled":false}' },
      { role: 'user', content: 'explain the late policy' },
      { role: 'assistant', content: '{"intent":"content_qa","rewrittenQuery":"late policy syllabus","filters":{},"searchDisabled":false}' },
      { role: 'user', content: 'hello' },
      { role: 'assistant', content: '{"intent":"general","rewrittenQuery":"","filters":{},"searchDisabled":true}' },
      // Actual query
      { role: 'user', content: query }
    ]

    const result = await window.ai.chat(messages, 150) // Compact JSON output

    if (!result.ok || !result.choices?.[0]?.message?.content) {
      throw new Error('Coordinator failed')
    }

    const content = result.choices[0].message.content
    // Basic JSON extraction
    const jsonStr = content.match(/\{[\s\S]*\}/)?.[0] || content
    const plan = JSON.parse(jsonStr) as SearchPlan
    
    // Default safe values
    if (!plan.rewrittenQuery) plan.rewrittenQuery = query
    if (!plan.intent) plan.intent = 'general'
    
    return plan
  } catch (e) {
    console.warn('Coordinator fallback:', e)
    // Fallback heuristic
    const q = query.toLowerCase()
    const intent = (q.includes('due') || q.includes('when')) ? 'due_date' : 'content_qa'
    return { intent, rewrittenQuery: query }
  }
}
