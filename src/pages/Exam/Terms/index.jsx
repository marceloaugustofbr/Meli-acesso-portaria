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
          <h2 className="title is-5 mb-4">Termo de Responsabilidade</h2>
          <div className="box" style={{ background: '#f9f9f9', maxHeight: 300, overflowY: 'auto' }}>
            <p>
              Declaro que assisti ao treinamento,
              compreendi as regras de segurança,
              estou ciente dos riscos envolvidos
              e comprometo-me a seguir todas as normas
              de segurança e acesso à operação.
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
