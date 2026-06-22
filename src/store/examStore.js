import { createWithEqualityFn } from 'zustand/traditional';
import { persist } from 'zustand/middleware';

const initialState = {
  step: 'intro',
  videoFinished: false,
  identification: null,
  startTime: null,
  answers: [],
  termsAccepted: false,
  signature: null,
  signatureIp: null,
  signatureUserAgent: null,
  cpf: '',
};

export const useExamStore = createWithEqualityFn(
  persist(
    (set) => ({
      ...initialState,
      setStep: (step) => set({ step }),
      setVideoFinished: () => set({ videoFinished: true }),
      setIdentification: (data) => set({ identification: data }),
      setStartTime: (time) => set({ startTime: time }),
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
      setSignatureIp: (ip) => set({ signatureIp: ip }),
      setSignatureUserAgent: (ua) => set({ signatureUserAgent: ua }),
      setCpf: (cpf) => set({ cpf }),
      reset: () => set(initialState),
    }),
    {
      name: 'exam-storage',
      partialize: ({ signature: _signature, signatureIp: _ip, signatureUserAgent: _ua, videoFinished: _videoFinished, ...rest }) => rest,
    }
  ),
  undefined
);
