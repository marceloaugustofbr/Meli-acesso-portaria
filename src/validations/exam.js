import { z } from 'zod';
import { validateCPF } from '../utils/cpf';

export const identificationSchema = z.object({
  name: z.string().min(5, 'Nome deve ter no mínimo 5 caracteres'),
  cpf: z.string().refine(validateCPF, { message: 'CPF inválido' }),
  city: z.string().min(1, 'Selecione uma cidade'),
  operationType: z.enum(['TSI', 'Polly'], {
    errorMap: () => ({ message: 'Selecione uma empresa' }),
  }),
});

export const termsSchema = z.object({
  accepted: z.literal(true, { errorMap: () => ({ message: 'Você deve aceitar os termos' }) }),
});

export type IdentificationFormData = z.infer<typeof identificationSchema>;
export type TermsFormData = z.infer<typeof termsSchema>;
