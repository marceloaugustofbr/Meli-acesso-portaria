import React, { useState, useEffect } from 'react';
import { useHistory } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import classNames from 'classnames';
import { useExamStore } from '../../../store';
import { examService } from '../../../services';
import { identificationSchema } from '../../../validations';
import { maskCPF, validateCPF } from '../../../utils/cpf';
import ROUTES from '../../../constants/routes';
import ExamLayout from '../../../components/ui/ExamLayout';

const companies = ['TSI', 'Polly'];

const cities = [
  'Araçatuba',
  'Avaré',
  'Barretos',
  'Bauru',
  'Cravinhos',
  'Franca',
  'Jales',
  'Piracicaba',
  'Presidente Prudente',
  'Ribeirão Preto',
  'São Carlos',
];

export default function ExamIdentification() {
  const history = useHistory();
  const setIdentification = useExamStore((s) => s.setIdentification);
  const setStartTime = useExamStore((s) => s.setStartTime);
  const setStep = useExamStore((s) => s.setStep);
  const storedCpf = useExamStore((s) => s.cpf);
  const [cpfBlocked, setCpfBlocked] = useState('');
  const [lastExamData, setLastExamData] = useState(null);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    reset,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: zodResolver(identificationSchema),
    defaultValues: { name: '', cpf: '', city: '', operationType: '' },
  });

  const selectedType = watch('operationType');

  useEffect(() => {
    if (storedCpf) {
      setValue('cpf', storedCpf);
      examService.getLatestByCpf(storedCpf).then((last) => {
        setLastExamData(last);
        if (last) {
          reset({
            name: last.name || '',
            cpf: last.cpf || storedCpf,
            city: last.city || '',
            operationType: last.operationType || '',
          });
        }
      });
    }
  }, [storedCpf, setValue, reset]);

  const normalizeName = (value) =>
    value
      .toUpperCase()
      .replace(/\s{2,}/g, ' ')
      .trim();

  const handleNameChange = (e) => {
    const uppercased = e.target.value.toUpperCase();
    setValue('name', uppercased, { shouldValidate: true });
  };

  const handleCPFChange = (e) => {
    const masked = maskCPF(e.target.value);
    setValue('cpf', masked, { shouldValidate: true });
    setCpfBlocked('');
  };

  const onSubmit = async (data) => {
    if (!validateCPF(data.cpf)) {
      setCpfBlocked('CPF inválido');
      return;
    }
    const last = lastExamData || await examService.getLatestByCpf(data.cpf);
    if (last && last.status === 'approved') {
      setCpfBlocked('CPF já possui aprovação');
      return;
    }
    const normalized = { ...data, name: normalizeName(data.name) };
    setIdentification(normalized);
    setStartTime(new Date().toISOString());
    setStep('questions');
    history.push(ROUTES.EXAM_QUESTIONS);
  };

  return (
    <ExamLayout>
      <div className="stagger">
        <div style={{ marginBottom: '1.5rem' }}>
          <h1 style={{ fontSize: '1.25rem', fontWeight: 700, color: '#D40511', margin: '0 0 0.25rem' }}>Identificação</h1>
          <p style={{ fontSize: '0.85rem', color: '#888', margin: 0 }}>Preencha seus dados para iniciar o treinamento</p>
        </div>

        <form onSubmit={handleSubmit(onSubmit)}>
          <div style={{ marginBottom: '1.25rem' }}>
            <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.35rem', color: '#444' }}>
              <i className="fas fa-user" style={{ marginRight: 6, color: '#D40511' }} />
              Nome Completo
            </label>
            <input
              className={classNames('input-dhl', { 'is-danger': errors.name })}
              {...register('name')}
              onChange={handleNameChange}
              placeholder="Seu nome completo"
            />
            {errors.name && <p style={{ fontSize: '0.78rem', color: '#D32F2F', marginTop: 4 }}>{errors.name.message}</p>}
          </div>

          <div style={{ marginBottom: '1.25rem' }}>
            <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.35rem', color: '#444' }}>
              <i className="fas fa-id-card" style={{ marginRight: 6, color: '#D40511' }} />
              CPF
            </label>
            <input
              className={classNames('input-dhl', { 'is-danger': errors.cpf || cpfBlocked })}
              {...register('cpf')}
              onChange={handleCPFChange}
              placeholder="000.000.000-00"
              maxLength={14}
            />
            {errors.cpf && <p style={{ fontSize: '0.78rem', color: '#D32F2F', marginTop: 4 }}>{errors.cpf.message}</p>}
            {cpfBlocked && <p style={{ fontSize: '0.78rem', color: '#D32F2F', marginTop: 4 }}>{cpfBlocked}</p>}
          </div>

          <div style={{ marginBottom: '1.25rem' }}>
            <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.35rem', color: '#444' }}>
              <i className="fas fa-city" style={{ marginRight: 6, color: '#D40511' }} />
              Cidade
            </label>
            <select className={classNames('select-dhl', { 'is-danger': errors.city })} {...register('city')}>
              <option value="">Selecione uma cidade</option>
              {cities.map((city) => (
                <option key={city} value={city}>{city}</option>
              ))}
            </select>
            {errors.city && <p style={{ fontSize: '0.78rem', color: '#D32F2F', marginTop: 4 }}>{errors.city.message}</p>}
          </div>

          <div style={{ marginBottom: '1.5rem' }}>
            <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.5rem', color: '#444' }}>
              <i className="fas fa-building" style={{ marginRight: 6, color: '#D40511' }} />
              Empresa
            </label>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
              {companies.map((company) => (
                <div
                  key={company}
                  className={`option-card ${selectedType === company ? 'selected' : ''}`}
                  onClick={() => setValue('operationType', company, { shouldValidate: true })}
                  style={{ transition: 'all 80ms ease' }}
                >
                  {company}
                </div>
              ))}
            </div>
            {errors.operationType && <p style={{ fontSize: '0.78rem', color: '#D32F2F', marginTop: 4 }}>{errors.operationType.message}</p>}
          </div>

          <button
            type="submit"
            className={classNames('btn-dhl ripple-btn', { 'is-loading': isSubmitting })}
            style={{ width: '100%', justifyContent: 'center', padding: '0.85rem' }}
          >
            Continuar
          </button>
        </form>
      </div>
    </ExamLayout>
  );
}
