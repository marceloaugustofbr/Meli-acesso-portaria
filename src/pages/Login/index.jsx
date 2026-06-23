import React, { useState } from 'react';
import { useHistory, Redirect } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import classNames from 'classnames';
import { useAuth } from '../../hooks';
import { authService } from '../../services';
import { loginSchema } from '../../validations';
import ROUTES from '../../constants/routes';

export default function Login() {
  const history = useHistory();
  const { isAuthenticated, loading: authLoading } = useAuth();
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: '', password: '' },
  });

  if (authLoading) return null;

  if (isAuthenticated) {
    return <Redirect to={ROUTES.ADMIN_DASHBOARD} />;
  }

  const onSubmit = async (data) => {
    setSubmitting(true);
    setErrorMsg('');
    try {
      await authService.login(data.email, data.password);
      history.push(ROUTES.ADMIN_DASHBOARD);
    } catch (err) {
      const messages = {
        'auth/user-not-found': 'Usuário não encontrado',
        'auth/wrong-password': 'Senha incorreta',
        'auth/invalid-email': 'Email inválido',
        'auth/too-many-requests': 'Muitas tentativas. Tente novamente mais tarde',
      };
      setErrorMsg(messages[err.code] || 'Erro ao fazer login');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="login-container">
      <div className="login-brand">
        <div className="login-brand-lines" />
        <div className="login-brand-content fade-in">
          <div style={{ fontSize: '3rem', fontWeight: 900, letterSpacing: '-1px', marginBottom: '0.5rem' }}>
            SAFE ACCESS
          </div>
          <p style={{ fontSize: '1rem', opacity: 0.85, maxWidth: 340, lineHeight: 1.5 }}>
            Treinamento e Liberação de Acesso Operacional
          </p>
        </div>
      </div>
      <div className="login-form-wrapper">
        <div style={{ width: '100%', maxWidth: 360 }}>
          <div className="fade-in-up" style={{ marginBottom: '2rem' }}>
            <img src="/dhl-logo.png" alt="DHL" style={{ height: 36, marginBottom: '0.5rem' }} />
            <h1 style={{ fontSize: '1.5rem', fontWeight: 700, margin: 0, color: '#222' }}>Acessar</h1>
            <p style={{ fontSize: '0.85rem', color: '#888', margin: '4px 0 0' }}>
              Informe suas credenciais para continuar
            </p>
          </div>
          <form onSubmit={handleSubmit(onSubmit)} className="stagger">
            <div style={{ marginBottom: '1.25rem' }}>
              <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.35rem', color: '#444' }}>Email</label>
              <input
                className={classNames('input-dhl', { 'is-danger': errors.email })}
                type="email"
                {...register('email')}
                placeholder="seu@email.com"
                autoComplete="email"
              />
              {errors.email && <p style={{ fontSize: '0.78rem', color: '#D32F2F', marginTop: 4 }}>{errors.email.message}</p>}
            </div>
            <div style={{ marginBottom: '1.5rem' }}>
              <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.35rem', color: '#444' }}>Senha</label>
              <input
                className={classNames('input-dhl', { 'is-danger': errors.password })}
                type="password"
                {...register('password')}
                placeholder="Sua senha"
                autoComplete="current-password"
              />
              {errors.password && <p style={{ fontSize: '0.78rem', color: '#D32F2F', marginTop: 4 }}>{errors.password.message}</p>}
            </div>
            {errorMsg && (
              <p style={{ fontSize: '0.85rem', color: '#D32F2F', marginBottom: '1rem', textAlign: 'center' }}>
                {errorMsg}
              </p>
            )}
            <button
              type="submit"
              className={classNames('btn-dhl ripple-btn', { 'is-loading': submitting })}
              style={{ width: '100%', justifyContent: 'center', padding: '0.85rem 1.5rem', fontSize: '1rem' }}
            >
              {submitting ? (
                <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span className="spinner-dhl" style={{ width: 20, height: 20, borderWidth: 2 }} />
                  Entrando...
                </span>
              ) : (
                'Entrar'
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
