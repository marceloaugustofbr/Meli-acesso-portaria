import type { Answer } from './question';

export type OperationType = 'Service Center' | 'Crossdocking' | 'Full' | 'Same Day';

export type ExamStatus = 'approved' | 'reproved';

export interface ExamIdentification {
  name: string;
  cpf: string;
  city: string;
  operationType: OperationType;
}

export interface ExamData {
  id?: string;
  createdAt: string;
  name: string;
  cpf: string;
  city: string;
  operationType: OperationType;
  startTime: string;
  endTime: string;
  duration: number;
  score: number;
  correctAnswers: number;
  wrongAnswers: number;
  percentage: number;
  status: ExamStatus;
  signature: string;
  answers: Answer[];
}

export interface ExamState {
  step: 'intro' | 'video' | 'identification' | 'questions' | 'terms' | 'signature' | 'result';
  videoFinished: boolean;
  identification: ExamIdentification | null;
  startTime: string | null;
  answers: Answer[];
  termsAccepted: boolean;
  signature: string | null;
}
