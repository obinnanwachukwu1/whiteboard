// src/hooks/useAI.ts
import { useState } from 'react';

// Message type for chat completions
export type AIMessage = {
  role: 'system' | 'user' | 'assistant';
  content: string;
};

// Response type
export type AIResponse = {
  id: string;
  choices: Array<{
    message: AIMessage;
    finish_reason: string;
  }>;
};

export const useAI = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const chat = async (messages: AIMessage[], max_tokens = 500): Promise<string | null> => {
    setLoading(true);
    setError(null);
    try {
      // @ts-ignore - Exposed via preload
      const res = await window.ai.chat(messages, max_tokens);
      
      if (res.error) {
        throw new Error(res.error.message || 'Unknown AI error');
      }

      const content = res.choices?.[0]?.message?.content || null;
      return content;
    } catch (e: any) {
      console.error('AI Error:', e);
      setError(e.message || 'Failed to communicate with AI');
      return null;
    } finally {
      setLoading(false);
    }
  };

  const summarize = async (text: string, bulletPoints = 2): Promise<string | null> => {
    return chat([
      {
        role: 'system',
        content: `You are a helpful assistant. Summarize the following text into exactly ${bulletPoints} concise bullet points. Return ONLY the bullet points, no intro/outro.`
      },
      {
        role: 'user',
        content: text
      }
    ]);
  };

  const streamSummarize = (text: string, onUpdate: (text: string) => void, bulletPoints = 2): (() => void) => {
    let accumulated = '';
    const messages = [
      {
        role: 'system',
        content: `You are a helpful assistant. Summarize the following text into exactly ${bulletPoints} concise bullet points. Return ONLY the bullet points, no intro/outro.`
      },
      {
        role: 'user',
        content: text
      }
    ];
    
    // @ts-ignore - Exposed via preload
    return window.ai.chatStream(messages, (chunk) => {
      accumulated += chunk;
      onUpdate(accumulated);
    });
  };

  type PriorityExplainPayload = {
    assignmentName: string
    courseName?: string
    relativeDue: string
    hoursUntilDue?: number | null
    urgencyMultiplier?: number | null
    weightText?: string
    weightPercent?: number | null
    pointsPossible?: number | null
    priorityScore?: number | null
    rank?: number | null
    assignmentDescription?: string
    draftWhy?: string
    draftNext?: string
  }

  const buildPriorityMessages = (payload: PriorityExplainPayload): AIMessage[] => {
    const lines: string[] = []
    lines.push(`Assignment: ${payload.assignmentName}`)
    if (payload.courseName) lines.push(`Course: ${payload.courseName}`)
    if (payload.assignmentDescription) {
      lines.push(`Description: ${payload.assignmentDescription}`)
    }
    lines.push(`Due: ${payload.relativeDue}`)
    if (payload.weightPercent !== undefined && payload.weightPercent !== null) {
      lines.push(`WeightPercent: ${payload.weightPercent}`)
    }
    if (payload.weightText) lines.push(`WeightLabel: ${payload.weightText}`)
    if (
      payload.pointsPossible !== undefined &&
      payload.pointsPossible !== null &&
      typeof payload.pointsPossible === 'number' &&
      payload.pointsPossible > 0
    ) {
      lines.push(`PointsPossible: ${payload.pointsPossible}`)
    }
    if (payload.rank !== undefined && payload.rank !== null) {
      lines.push(`RankPosition: ${payload.rank}`)
    }

    const drafts: string[] = []
    if (payload.draftWhy) drafts.push(`Why: ${payload.draftWhy}`)
    if (payload.draftNext) drafts.push(`Next: ${payload.draftNext}`)

    const systemContent = [
      'You are a concise, practical study coach.',
      'Write exactly 2 short sentences (no bullets).',
      'Sentence 1: why this is priority, using the facts.',
      'Sentence 2: the next action to take now, ideally a task from the description.',
      'Use plain language. Avoid semicolons and long clauses.',
      'Avoid these filler phrases: "due to", "in order to", "crucial", "significant", "dedicating", "tackle this", "effectively".',
      'If mentioning time: use "in N hours" (N < 12) or "in N days". Never use ordinals like "3rd day".',
      'Prefer active voice and simple verbs (start, outline, pick, draft, submit).',
      'Use the Draft as raw material, but do NOT copy it verbatim.',
      'Use only the provided facts. If a fact is unknown, omit it. Do not guess or add new info.',
      'Never mention internal scoring or implementation details (e.g., "PriorityScore").',
      'Never invent grades or scores (e.g., "20/20"). Only mention pointsPossible if provided.',
      'Do not mention 0 points; if points are missing, omit points entirely.',
      'Keep each sentence <= 18 words. Avoid filler like "foundation", "positive tone", "manage workload".',
    ].join('\n')

    const userContent = [
      'Facts:',
      ...lines.map(l => `- ${l}`),
      drafts.length ? 'Draft:' : '',
      ...drafts.map(d => `- ${d}`),
    ].filter(Boolean).join('\n')

    return [
      { role: 'system', content: systemContent },
      { role: 'user', content: userContent },
    ]
  }

  const explainPriority = async (payload: PriorityExplainPayload): Promise<string | null> => {
    const messages = buildPriorityMessages(payload)
    return chat(messages, 150)
  }

  const streamExplainPriority = (
    payload: PriorityExplainPayload,
    onUpdate: (text: string) => void
  ): (() => void) => {
    const messages = buildPriorityMessages(payload)
    let accumulated = ''
    // @ts-ignore - Exposed via preload
    return window.ai.chatStream(messages, (chunk: string) => {
      accumulated += chunk
      onUpdate(accumulated)
    })
  }

  return {
    chat,
    summarize,
    streamSummarize,
    explainPriority,
    streamExplainPriority,
    loading,
    error
  };
};
