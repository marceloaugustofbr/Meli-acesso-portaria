import React from 'react';
import { useHistory } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import classNames from 'classnames';
import { useExamStore } from '../../../store';
import { termsSchema } from '../../../validations';
import ROUTES from '../../../constants/routes';
import ExamLayout from '../../../components/ui/ExamLayout';

export default function ExamTerms() {
  const history = useHistory();
  const setTermsAccepted = useExamStore((s) => s.setTermsAccepted);
  const setStep = useExamStore((s) => s.setStep);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(termsSchema),
    defaultValues: { accepted: false },
  });

  const onSubmit = () => {
    setTermsAccepted(true);
    setStep('signature');
    history.push(ROUTES.EXAM_SIGNATURE);
  };

  return (
    <ExamLayout>
      <div className="card">
        <div className="card-content">
          <h2 className="title is-5 mb-4">Termo de Ciência e Responsabilidade</h2>
          <div className="box" style={{ background: '#f9f9f9', maxHeight: 400, overflowY: 'auto', fontSize: '0.85rem', lineHeight: 1.7 }}>
            <p style={{ marginBottom: 12 }}>
              Declaro, para os devidos fins, que participei integralmente do treinamento ministrado pela empresa, tendo recebido as orientações necessárias sobre as atividades a serem desempenhadas, os procedimentos operacionais, as normas de segurança, os riscos inerentes às atividades e as regras de acesso e permanência na operação.
            </p>
            <p style={{ marginBottom: 12 }}>
              Declaro ainda que compreendi integralmente as instruções recebidas, estou ciente dos riscos envolvidos nas atividades que executarei e comprometo-me a cumprir rigorosamente todas as normas, procedimentos e medidas de segurança estabelecidas pela empresa, utilizando corretamente os equipamentos e recursos disponibilizados.
            </p>
            <p style={{ marginBottom: 12 }}>
              Reconheço que o descumprimento das normas e procedimentos de segurança poderá acarretar medidas administrativas previstas pela empresa, sem prejuízo das demais responsabilidades cabíveis.
            </p>
            <p>
              Por fim, concordo que este termo seja firmado por meio de assinatura eletrônica, reconhecendo sua validade jurídica, nos termos da legislação brasileira aplicável, em especial a <strong>Lei nº 14.063/2020</strong> e a <strong>Medida Provisória nº 2.200-2/2001</strong>, sendo registrado eletronicamente com data e hora da assinatura.
            </p>
          </div>

          <form onSubmit={handleSubmit(onSubmit)}>
            <div className="field mt-4">
              <label className="checkbox">
                <input
                  type="checkbox"
                  {...register('accepted')}
                  className="mr-2"
                />
                Li e concordo com os termos.
              </label>
              {errors.accepted && (
                <p className="help is-danger">{errors.accepted.message}</p>
              )}
            </div>

            <div className="has-text-centered mt-5">
              <button
                type="submit"
                className={classNames('button')}
                style={{ background: '#D40511', color: '#fff', border: 'none' }}
              >
                Continuar
              </button>
            </div>
          </form>
        </div>
      </div>
    </ExamLayout>
  );
}
