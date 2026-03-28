import { describe, it, expect } from 'vitest';

// --- Interfaces ---

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  sources?: string[];
}

// --- Pure function replicas ---

function appendMessage(messages: ChatMessage[], message: ChatMessage): ChatMessage[] {
  return [...messages, message];
}

function clearConversation(): { messages: ChatMessage[]; conversationId: string | null; error: string | null } {
  return { messages: [], conversationId: null, error: null };
}

function extractErrorMessage(err: unknown): string {
  return err instanceof Error ? err.message : 'Failed to get response';
}

function buildErrorMessage(): ChatMessage {
  return {
    id: 'err-id',
    role: 'assistant',
    content: 'Sorry, I couldn\'t process that request. The AI chat service may not be available yet. Please try again later.',
    timestamp: new Date(),
  };
}

function shouldSendMessage(merchantId: string | null, content: string): boolean {
  return merchantId !== null && content.trim().length > 0;
}

// --- Tests ---

describe('ChatService — appendMessage', () => {
  it('appends user message', () => {
    const messages: ChatMessage[] = [];
    const msg: ChatMessage = { id: '1', role: 'user', content: 'Hello', timestamp: new Date() };
    const result = appendMessage(messages, msg);
    expect(result).toHaveLength(1);
    expect(result[0].role).toBe('user');
  });

  it('appends multiple messages', () => {
    const messages: ChatMessage[] = [
      { id: '1', role: 'user', content: 'Hello', timestamp: new Date() },
    ];
    const reply: ChatMessage = { id: '2', role: 'assistant', content: 'Hi there', timestamp: new Date(), sources: ['src'] };
    const result = appendMessage(messages, reply);
    expect(result).toHaveLength(2);
    expect(result[1].sources).toEqual(['src']);
  });
});

describe('ChatService — clearConversation', () => {
  it('resets all state', () => {
    const result = clearConversation();
    expect(result.messages).toHaveLength(0);
    expect(result.conversationId).toBeNull();
    expect(result.error).toBeNull();
  });
});

describe('ChatService — extractErrorMessage', () => {
  it('extracts Error message', () => {
    expect(extractErrorMessage(new Error('Network error'))).toBe('Network error');
  });

  it('returns fallback for non-Error', () => {
    expect(extractErrorMessage('string error')).toBe('Failed to get response');
    expect(extractErrorMessage(null)).toBe('Failed to get response');
    expect(extractErrorMessage(42)).toBe('Failed to get response');
  });
});

describe('ChatService — buildErrorMessage', () => {
  it('creates assistant error message', () => {
    const msg = buildErrorMessage();
    expect(msg.role).toBe('assistant');
    expect(msg.content).toContain('AI chat service');
  });
});

describe('ChatService — shouldSendMessage', () => {
  it('true when restaurant and non-empty content', () => {
    expect(shouldSendMessage('r-1', 'Hello')).toBe(true);
  });

  it('false when no restaurant', () => {
    expect(shouldSendMessage(null, 'Hello')).toBe(false);
  });

  it('false when empty content', () => {
    expect(shouldSendMessage('r-1', '')).toBe(false);
    expect(shouldSendMessage('r-1', '   ')).toBe(false);
  });
});
