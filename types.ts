
export type LegalMethod = 'NONE' | 'IRAC' | 'CREC' | 'IPAC';

export interface Message {
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  images?: string[]; 
  sources?: GroundingSource[];
  audioBuffer?: AudioBuffer;
  appliedMethod?: LegalMethod;
}

export interface GroundingSource {
  title: string;
  uri: string;
}

export type VoiceGender = 'MALE' | 'FEMALE';

export interface ChatSession {
  id: string;
  title: string;
  messages: Message[];
  lastModified: number;
  legalMethod: LegalMethod;
}

export enum AppStatus {
  IDLE = 'idle',
  LOADING = 'loading',
  ERROR = 'error'
}
