export interface Question {
  id: string;
  question: string;
  options: string[];
  correctAnswer: string;
  category: string;
}

export interface Answer {
  questionId: string;
  question: string;
  selectedAnswer: string;
  correctAnswer: string;
  isCorrect: boolean;
}
