import { create } from 'zustand';
import { persist } from 'zustand/middleware';

const initialState = {
  step: 'intro',
  videoFinished: false,
  identification: null,
  startTime: null,
  answers: [],
  termsAccepted: false,
  signature: null,
  cpf: '',
};

export const useExamStore = create(
  persist(
    (set) => ({
      ...initialState,
      setStep: (step) => set({ step }),
      setVideoFinished: () => set({ videoFinished: true }),
      setIdentification: (data) => set({ identification: data }),
      setStartTime: (time) => set({ startTime: time }),
      addAnswer: (answer) => set((state) => ({ answers: [...state.answers, answer] })),
      updateAnswer: (answer) =>
        set((state) => {
          const exists = state.answers.findIndex((a) => a.questionId === answer.questionId);
          if (exists >= 0) {
            const updated = [...state.answers];
            updated[exists] = answer;
            return { answers: updated };
          }
          return { answers: [...state.answers, answer] };
        }),
      setTermsAccepted: (accepted) => set({ termsAccepted: accepted }),
      setSignature: (signature) => set({ signature }),
      setCpf: (cpf) => set({ cpf }),
      reset: () => set(initialState),
    }),
    {
      name: 'exam-storage',
      partialize: ({ signature: _signature, identification: _id, answers: _answers, cpf: _cpf, ...rest }) => rest,
    }
  )
);
