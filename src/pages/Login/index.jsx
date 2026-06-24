import React, { useState } from 'react';
import { useHistory, Redirect } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import classNames from 'classnames';
import { useAuth } from '../../hooks';
import { authService } from '../../services';
import { loginSchema } from '../../validations';
import ROUTES from '../../constants/routes';

// eslint-disable-next-line import/no-unresolved
import './Login.scss';

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
    <div className="login-page">
      {/* Brand panel */}
      <div className="login-brand">
        <div className="login-brand-bg" />
        <div className="login-brand-inner">
          <div className="login-brand-badge">DHL SUPPLY CHAIN</div>
          <h1 className="login-brand-title">Safe Access</h1>
          <p className="login-brand-sub">
            Treinamento e Liberação<br />de Acesso Operacional
          </p>
          <div className="login-brand-divider" />
          <p className="login-brand-footer">
            Plataforma de gestão de exames<br />e credenciamento de colaboradores
          </p>
        </div>
      </div>

      {/* Form panel */}
      <div className="login-form-panel">
        <div className="login-form-container">
          <div className="login-form-header">
            <img src="/dhl-logo.png" alt="DHL" className="login-logo" loading="lazy" />
            <h2 className="login-form-title">Acessar</h2>
            <p className="login-form-desc">Informe suas credenciais para continuar</p>
          </div>

          <form onSubmit={handleSubmit(onSubmit)} noValidate>
            {errorMsg && (
              <div className="login-error">
                <i className="fas fa-exclamation-circle" />
                <span>{errorMsg}</span>
              </div>
            )}

            <div className="login-field">
              <label className="login-label" htmlFor="email">Email</label>
              <div className={classNames('login-input-wrapper', { 'is-error': errors.email })}>
                <i className="fas fa-envelope login-input-icon" />
                <input
                  id="email"
                  className="login-input"
                  type="email"
                  {...register('email')}
                  placeholder="seu@email.com"
                  autoComplete="email"
                />
              </div>
              {errors.email && <p className="login-field-error">{errors.email.message}</p>}
            </div>

            <div className="login-field">
              <label className="login-label" htmlFor="password">Senha</label>
              <div className={classNames('login-input-wrapper', { 'is-error': errors.password })}>
                <i className="fas fa-lock login-input-icon" />
                <input
                  id="password"
                  className="login-input"
                  type="password"
                  {...register('password')}
                  placeholder="Sua senha"
                  autoComplete="current-password"
                />
              </div>
              {errors.password && <p className="login-field-error">{errors.password.message}</p>}
            </div>

            <button
              type="submit"
              className={classNames('login-submit', { 'is-loading': submitting })}
              disabled={submitting}
            >
              {submitting ? (
                <>
                  <span className="login-spinner" />
                  Entrando...
                </>
              ) : (
                <>
                  Entrar
                  <i className="fas fa-arrow-right" style={{ fontSize: '0.85rem' }} />
                </>
              )}
            </button>
          </form>

          <p className="login-footer-text">
            <i className="fas fa-shield-alt" style={{ marginRight: 6, opacity: 0.5 }} />
            Ambiente seguro · DHL Supply Chain
          </p>
        </div>
      </div>
    </div>
  );
}
