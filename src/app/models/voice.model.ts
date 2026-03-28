export type VoiceState = 'idle' | 'listening' | 'processing' | 'confirming' | 'error';
export type VoiceLanguage = 'en' | 'es';

export interface VoiceMatch {
  menuItemId: string;
  menuItemName: string;
  price: number;
  quantity: number;
  confidence: number;
}

export interface VoiceTranscript {
  text: string;
  isFinal: boolean;
  timestamp: Date;
}

export interface VoiceSession {
  id: string;
  language: VoiceLanguage;
  transcripts: VoiceTranscript[];
  matches: VoiceMatch[];
  startedAt: Date;
}
