export enum AppMode {
  UPLOAD = 'UPLOAD',
  DASHBOARD = 'DASHBOARD',
  NOTEBOOK = 'NOTEBOOK',
  SPEC_BUILDER = 'SPEC_BUILDER'
}

export type Theme = 'dark' | 'light' | 'contrast';
export type FontSize = 'small' | 'medium' | 'large';

export interface User {
  id: string;
  email: string;
  name?: string;
}

export interface Entity {
  name: string;
  value: string;
  unit?: string;
  type: 'CONSTANT' | 'VARIABLE' | 'MATERIAL' | 'DEVICE';
  sourceId: string;
}

export interface Claim {
  statement: string;
  type: 'MEASUREMENT' | 'HYPOTHESIS' | 'DERIVATION';
  confidence: number; // 0-1
  page?: number;
  sourceId: string;
}

export interface Conflict {
  parameter: string;
  description: string;
  sourceIds: string[];
}

export interface DocumentData {
  id: string;
  filename: string;
  content: string;
  processed: boolean;
  entities: Entity[];
  claims: Claim[];
  conflicts: Conflict[];
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'model';
  content: string;
  timestamp: number;
  citations?: string[];
}

export interface SpecSection {
  title: string;
  content: string;
  type: 'TEXT' | 'EQUATION' | 'TABLE';
}

export interface CanonicalSpec {
  title: string;
  version: string;
  sections: SpecSection[];
  assumptions: string[];
  openQuestions: string[];
}

export interface UserData {
  documents: DocumentData[];
  chatHistory: ChatMessage[];
  spec: CanonicalSpec | null;
  preferences: {
    theme: Theme;
    fontSize: FontSize;
  };
  lastMode?: AppMode;
  lastSaved: number;
}