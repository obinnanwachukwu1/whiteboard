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

  const explainPriority = async (assignmentName: string, dueDate: string, weight: string): Promise<string | null> => {
    return chat([
      {
        role: 'system',
        content: 'You are a study coach. Explain briefly (1 sentence) why this assignment is prioritized.'
      },
      {
        role: 'user',
        content: `Assignment: ${assignmentName}\nDue: ${dueDate}\nWeight: ${weight}\n\nWhy should I do this now?`
      }
    ], 100);
  };

  return {
    chat,
    summarize,
    explainPriority,
    loading,
    error
  };
};
