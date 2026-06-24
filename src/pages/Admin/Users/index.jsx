import React, { useState, useCallback } from 'react';
import classNames from 'classnames';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { apiService } from '../../../services';
import { useAuth } from '../../../hooks';
import Loading from '../../../components/ui/Loading';
import CITIES from '../../../constants/cities';
import './Users.scss';

const defaultForm = { email: '', name: '', password: '', isAdmin: true, cities: [] };

function toggleCity(selected, city) {
  return selected.includes(city)
    ? selected.filter((c) => c !== city)
    : [...selected, city];
}

export default function AdminUsers() {
  const { isAdmin, user } = useAuth();
  const queryClient = useQueryClient();

  const { data: users = [], isLoading, error } = useQuery({
    queryKey: ['admin-users'],
    queryFn: () => apiService.listUsers(),
    staleTime: 5 * 60 * 1000,
  });

  const [showCreate, setShowCreate] = useState(false);
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState(null);
  const [form, setForm] = useState(defaultForm);

  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);

  const [editTarget, setEditTarget] = useState(null);
  const [editForm, setEditForm] = useState({ isAdmin: false, cities: [] });
  const [editing, setEditing] = useState(false);
  const [editError, setEditError] = useState(null);

  const isSelf = useCallback((u) => u && u._id === user?.uid, [user?.uid]);

  const invalidateUsers = useCallback(() => queryClient.invalidateQueries({ queryKey: ['admin-users'] }), [queryClient]);

  const handleCreate = useCallback(async (e) => {
    e.preventDefault();
    setCreating(true);
    setCreateError(null);
    try {
      await apiService.createUser(form);
      setShowCreate(false);
      setForm(defaultForm);
      invalidateUsers();
    } catch (err) {
      setCreateError(err.message);
    } finally {
      setCreating(false);
    }
  }, [form, invalidateUsers]);

  const handleDelete = useCallback(async (uid) => {
    setDeleting(true);
    try {
      await apiService.deleteUser(uid);
      setDeleteTarget(null);
      invalidateUsers();
    } catch (err) {
      alert(err.message);
    } finally {
      setDeleting(false);
    }
  }, [invalidateUsers]);

  const openEditModal = useCallback((u) => {
    setEditTarget(u);
    setEditForm({ isAdmin: !!u.isAdmin, cities: u.cities || [] });
    setEditError(null);
  }, []);

  const handleEdit = useCallback(async (e) => {
    e.preventDefault();
    setEditing(true);
    setEditError(null);
    try {
      await apiService.updateUser(editTarget._id, editForm);
      setEditTarget(null);
      invalidateUsers();
    } catch (err) {
      setEditError(err.message);
    } finally {
      setEditing(false);
    }
  }, [editTarget, editForm, invalidateUsers]);

  const toggleEditCity = useCallback((city) => {
    setEditForm((f) => ({ ...f, cities: toggleCity(f.cities, city) }));
  }, []);

  const handleEmailChange = useCallback((e) => {
    setForm((f) => ({ ...f, email: e.target.value }));
  }, []);

  const handleNameChange = useCallback((e) => {
    setForm((f) => ({ ...f, name: e.target.value }));
  }, []);

  const handlePasswordChange = useCallback((e) => {
    setForm((f) => ({ ...f, password: e.target.value }));
  }, []);

  const toggleFormCity = useCallback((city) => {
    setForm((f) => ({ ...f, cities: toggleCity(f.cities, city) }));
  }, []);

  const handleCreateCancel = useCallback(() => {
    if (!creating) setShowCreate(false);
  }, [creating]);

  const handleDeleteCancel = useCallback(() => {
    if (!deleting) setDeleteTarget(null);
  }, [deleting]);

  const handleEditCancel = useCallback(() => {
    if (!editing) setEditTarget(null);
  }, [editing]);

  const handleCreateFormToggle = useCallback(() => {
    setForm((f) => ({ ...f, isAdmin: !f.isAdmin }));
  }, []);

  const handleCreateFormKeyDown = useCallback((e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      setForm((f) => ({ ...f, isAdmin: !f.isAdmin }));
    }
  }, []);

  const handleEditFormToggle = useCallback(() => {
    setEditForm((f) => ({ ...f, isAdmin: !f.isAdmin }));
  }, []);

  const handleEditFormKeyDown = useCallback((e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      setEditForm((f) => ({ ...f, isAdmin: !f.isAdmin }));
    }
  }, []);

  const handleCreateErrorDismiss = useCallback(() => setCreateError(null), []);
  const handleEditErrorDismiss = useCallback(() => setEditError(null), []);
  const handleOpenCreate = useCallback(() => setShowCreate(true), []);

  const handleEditUser = useCallback((e) => {
    const { uid } = e.currentTarget.dataset;
    const u = users.find((x) => x._id === uid);
    if (u) openEditModal(u);
  }, [users, openEditModal]);

  const handleDeleteUser = useCallback((e) => {
    const { uid } = e.currentTarget.dataset;
    const u = users.find((x) => x._id === uid);
    if (u) setDeleteTarget(u);
  }, [users]);

  const handleConfirmDelete = useCallback(() => {
    if (deleteTarget) handleDelete(deleteTarget._id);
  }, [deleteTarget, handleDelete]);

  const handleFormCityToggle = useCallback((e) => {
    const { city } = e.currentTarget.dataset;
    toggleFormCity(city);
  }, [toggleFormCity]);

  const handleEditCityToggle = useCallback((e) => {
    const { city } = e.currentTarget.dataset;
    toggleEditCity(city);
  }, [toggleEditCity]);

  const handleModalCardClick = useCallback((e) => e.stopPropagation(), []);

  if (isLoading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '60vh' }}>
        <Loading text="Carregando usuários..." />
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div style={{ textAlign: 'center', padding: '3rem 1rem' }}>
        <span className="icon is-large has-text-grey" style={{ fontSize: '3rem', marginBottom: '1rem' }}>
          <i className="fas fa-lock" />
        </span>
        <p className="title is-5 has-text-grey">Acesso restrito</p>
        <p className="has-text-grey">Você não tem permissão para gerenciar usuários.</p>
      </div>
    );
  }

  return (
    <div className="users-page">
      <div className="users-header">
        <div className="users-header-info">
          <i className="fas fa-users-cog users-header-icon" />
          <h1>Usuários Administrativos</h1>
        </div>
        <button className="btn-dhl" onClick={handleOpenCreate}>
          <i className="fas fa-plus" style={{ marginRight: 6 }} />
          Novo Usuário
        </button>
      </div>

      {error && (
        <div className="users-error">
          <i className="fas fa-exclamation-circle" />
          {error}
        </div>
      )}

      {users.length === 0 ? (
        <div className="users-empty">
          <i className="fas fa-users users-empty-icon" />
          <p>Nenhum usuário encontrado.</p>
        </div>
      ) : (
        <div className="users-table-card">
          <div className="users-table-wrapper">
            <table className="users-table">
              <thead>
                <tr>
                  <th>Email</th>
                  <th>Nome</th>
                  <th>Cidades</th>
                  <th>Admin</th>
                  <th>Criado em</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {users.map((u) => (
                  <tr key={u._id}>
                    <td data-label="Email">
                      <span className="users-table-email">{u.email}</span>
                    </td>
                    <td data-label="Nome">
                      <span className={classNames('users-table-name', { 'is-empty': !u.displayName })}>
                        {u.displayName || '—'}
                      </span>
                    </td>
                    <td data-label="Cidades">
                      {u.cities && u.cities.length > 0 ? (
                        <div className="users-cities-tags">
                          {u.cities.map((city) => (
                            <span key={city} className="tag is-info is-light">{city}</span>
                          ))}
                        </div>
                      ) : (
                        <span className="users-all-cities">Todas</span>
                      )}
                    </td>
                    <td data-label="Admin">
                      {u.isAdmin ? (
                        <span className="users-role-badge is-admin">Sim</span>
                      ) : (
                        <span className="users-role-badge is-user">Não</span>
                      )}
                    </td>
                    <td data-label="Criado em">
                      <span className="users-table-created">
                        {u.createdAt ? new Date(u.createdAt).toLocaleDateString('pt-BR') : '-'}
                      </span>
                    </td>
                    <td data-label="Ações" className="users-table-actions-cell">
                      {isSelf(u) ? (
                        <span className="users-self-badge" title="Você não pode alterar o próprio usuário">Atual</span>
                      ) : (
                        <div className="users-table-actions">
                          <button
                            className="btn-dhl is-small is-ghost is-info"
                            data-uid={u._id}
                            onClick={handleEditUser}
                            title="Editar"
                          >
                            <i className="fas fa-pen" />
                          </button>
                          <button
                            className="btn-dhl is-small is-ghost is-danger"
                            data-uid={u._id}
                            onClick={handleDeleteUser}
                            title="Excluir"
                          >
                            <i className="fas fa-trash" />
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Modal Criar Usuário */}
      {showCreate && (
        <div className="users-modal-overlay full-bleed" onClick={handleCreateCancel}>
          <div className="users-modal is-lg" onClick={handleModalCardClick}>
            <div className="users-modal-header">
              <p className="users-modal-title">
                <i className="fas fa-user-plus" />
                Novo Usuário
              </p>
              <button className="users-modal-close" onClick={handleCreateCancel}>
                <i className="fas fa-times" />
              </button>
            </div>
            <div className="users-modal-body">
              <form id="createForm" onSubmit={handleCreate}>
                {createError && (
                  <div className="users-form-notification">
                    <i className="fas fa-exclamation-circle" />
                    {createError}
                    <button className="users-form-notification-close" onClick={handleCreateErrorDismiss}>
                      <i className="fas fa-times" />
                    </button>
                  </div>
                )}

                <p className="users-form-section">
                  <i className="fas fa-id-card" />
                  DADOS DO USUÁRIO
                </p>
                <div className="users-form-grid">
                  <div className="field" style={{ marginBottom: 0 }}>
                    <label className="label" style={{ fontSize: '0.82rem', fontWeight: 600 }}>Email</label>
                    <div className="control has-icons-left">
                      <input className="input" type="email" required value={form.email} onChange={handleEmailChange} placeholder="email@exemplo.com" style={{ fontSize: '0.9rem' }} />
                      <span className="icon is-small is-left">
                        <i className="fas fa-envelope" />
                      </span>
                    </div>
                  </div>
                  <div className="field" style={{ marginBottom: 0 }}>
                    <label className="label" style={{ fontSize: '0.82rem', fontWeight: 600 }}>Nome</label>
                    <div className="control has-icons-left">
                      <input className="input" type="text" value={form.name} onChange={handleNameChange} placeholder="Nome completo" style={{ fontSize: '0.9rem' }} />
                      <span className="icon is-small is-left">
                        <i className="fas fa-user" />
                      </span>
                    </div>
                  </div>
                </div>

                <div className="field" style={{ marginTop: '0.75rem' }}>
                  <label className="label" style={{ fontSize: '0.82rem', fontWeight: 600 }}>Senha</label>
                  <div className="control has-icons-left">
                    <input className="input" type="password" required value={form.password} onChange={handlePasswordChange} placeholder="Mínimo 6 caracteres" minLength={6} style={{ fontSize: '0.9rem' }} />
                    <span className="icon is-small is-left">
                      <i className="fas fa-lock" />
                    </span>
                  </div>
                </div>

                <hr className="users-form-divider" />

                <p className="users-form-section">
                  <i className="fas fa-shield-alt" />
                  PERMISSÕES
                </p>

                <div
                  className={classNames('users-permission-box', { 'is-active': form.isAdmin })}
                  onClick={handleCreateFormToggle}
                  role="button"
                  tabIndex={0}
                  onKeyDown={handleCreateFormKeyDown}
                >
                  <div className="users-permission-info">
                    <span className="users-permission-icon">
                      <i className={`fas ${form.isAdmin ? 'fa-toggle-on' : 'fa-toggle-off'}`} />
                    </span>
                    <div>
                      <p className="users-permission-label">
                        {form.isAdmin ? 'Administrador' : 'Usuário comum'}
                      </p>
                      <p className="users-permission-desc">
                        {form.isAdmin
                          ? 'Acesso completo a todas as funcionalidades'
                          : 'Acesso a dashboard e exames, sem gerenciamento de usuários'}
                      </p>
                    </div>
                  </div>
                  <span className="users-permission-check">
                    <i className={`fas ${form.isAdmin ? 'fa-check-circle' : 'fa-circle'}`} />
                  </span>
                </div>

                <div className="field">
                  <label className="label" style={{ fontSize: '0.82rem', fontWeight: 600 }}>
                    Cidades que gerencia
                  </label>
                  <div className="users-cities-container">
                    <div className="users-cities-grid">
                      {CITIES.map((city) => (
                        <label
                          key={city}
                          className={classNames('users-city-checkbox', { 'is-selected': form.cities.includes(city) })}
                        >
                          <input
                            type="checkbox"
                            checked={form.cities.includes(city)}
                            data-city={city}
                            onChange={handleFormCityToggle}
                          />
                          <span className="users-city-label">{city}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                  <p className="users-cities-help">
                    <i className="fas fa-info-circle" />
                    Deixe em branco para ter acesso a todas as cidades
                  </p>
                </div>
              </form>
            </div>
            <div className="users-modal-footer">
              <button type="button" className="btn-dhl is-outline" onClick={handleCreateCancel} disabled={creating}>
                Cancelar
              </button>
              <button type="submit" form="createForm" className={classNames('btn-dhl', { 'is-loading': creating })} disabled={creating}>
                <i className="fas fa-plus" style={{ marginRight: 6 }} />
                Criar Usuário
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Confirmar Exclusão */}
      {!!deleteTarget && (
        <div className="users-modal-overlay full-bleed" onClick={handleDeleteCancel}>
          <div className="users-modal is-sm" onClick={handleModalCardClick}>
            <div className="users-modal-header">
              <p className="users-modal-title">
                <i className="fas fa-exclamation-triangle" style={{ color: '#d32f2f' }} />
                Confirmar Exclusão
              </p>
              <button className="users-modal-close" onClick={handleDeleteCancel}>
                <i className="fas fa-times" />
              </button>
            </div>
            <div className="users-modal-body">
              {isSelf(deleteTarget) ? (
                <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
                  <span className="icon has-text-grey" style={{ fontSize: '1.5rem', marginTop: 2 }}>
                    <i className="fas fa-ban" />
                  </span>
                  <div>
                    <p style={{ fontWeight: 600, fontSize: '0.95rem' }}>Operação inválida</p>
                    <p className="has-text-grey" style={{ fontSize: '0.85rem', marginTop: 4 }}>
                      Você não pode excluir o próprio usuário.
                    </p>
                  </div>
                </div>
              ) : (
                <>
                  <p style={{ fontSize: '0.95rem' }}>
                    Tem certeza que deseja excluir o usuário <strong>{deleteTarget?.email}</strong>?
                  </p>
                  <div className="notification is-warning is-light" style={{ padding: '0.6rem 0.9rem', marginTop: '0.75rem', fontSize: '0.85rem', borderRadius: 8 }}>
                    <i className="fas fa-info-circle" style={{ marginRight: 6 }} />
                    Esta ação não pode ser desfeita.
                  </div>
                </>
              )}
            </div>
            <div className="users-modal-footer">
              <button type="button" className="btn-dhl is-outline" onClick={handleDeleteCancel} disabled={deleting}>
                Cancelar
              </button>
              <button
                type="button"
                className={classNames('btn-dhl is-danger', { 'is-loading': deleting })}
                onClick={handleConfirmDelete}
                disabled={deleting || isSelf(deleteTarget)}
              >
                <i className="fas fa-trash" style={{ marginRight: 6 }} />
                Excluir
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Editar Usuário */}
      {!!editTarget && (
        <div className="users-modal-overlay full-bleed" onClick={handleEditCancel}>
          <div className="users-modal is-lg" onClick={handleModalCardClick}>
            <div className="users-modal-header">
              <p className="users-modal-title is-edit">
                <i className="fas fa-user-edit" />
                Editar Usuário
              </p>
              <button className="users-modal-close" onClick={handleEditCancel}>
                <i className="fas fa-times" />
              </button>
            </div>
            <div className="users-modal-body">
              <form id="editForm" onSubmit={handleEdit}>
                {editError && (
                  <div className="users-form-notification">
                    <i className="fas fa-exclamation-circle" />
                    {editError}
                    <button className="users-form-notification-close" onClick={handleEditErrorDismiss}>
                      <i className="fas fa-times" />
                    </button>
                  </div>
                )}

                <p className="users-form-section">
                  <i className="fas fa-id-card" />
                  DADOS DO USUÁRIO
                </p>

                <div className="field">
                  <label className="label" style={{ fontSize: '0.82rem', fontWeight: 600 }}>Email</label>
                  <div className="control has-icons-left">
                    <input className="input" type="email" value={editTarget?.email || ''} disabled style={{ fontSize: '0.9rem', backgroundColor: '#f5f5f5' }} />
                    <span className="icon is-small is-left">
                      <i className="fas fa-envelope" />
                    </span>
                  </div>
                  <p className="help" style={{ fontSize: '0.78rem', color: '#999' }}>
                    <i className="fas fa-info-circle" style={{ marginRight: 4 }} />
                    O email não pode ser alterado.
                  </p>
                </div>

                <hr className="users-form-divider" />

                <p className="users-form-section">
                  <i className="fas fa-shield-alt" />
                  PERMISSÕES
                </p>

                <div
                  className={classNames('users-permission-box', { 'is-edit-active': editForm.isAdmin })}
                  onClick={handleEditFormToggle}
                  role="button"
                  tabIndex={0}
                  onKeyDown={handleEditFormKeyDown}
                >
                  <div className="users-permission-info">
                    <span className="users-permission-icon">
                      <i className={`fas ${editForm.isAdmin ? 'fa-toggle-on' : 'fa-toggle-off'}`} />
                    </span>
                    <div>
                      <p className="users-permission-label">
                        {editForm.isAdmin ? 'Administrador' : 'Usuário comum'}
                      </p>
                      <p className="users-permission-desc">
                        {editForm.isAdmin
                          ? 'Acesso completo a todas as funcionalidades'
                          : 'Acesso a dashboard e exames, sem gerenciamento de usuários'}
                      </p>
                    </div>
                  </div>
                  <span className="users-permission-check">
                    <i className={`fas ${editForm.isAdmin ? 'fa-check-circle' : 'fa-circle'}`} />
                  </span>
                </div>

                <div className="field">
                  <label className="label" style={{ fontSize: '0.82rem', fontWeight: 600 }}>
                    Cidades que gerencia
                  </label>
                  <div className="users-cities-container">
                    <div className="users-cities-grid">
                      {CITIES.map((city) => (
                        <label
                          key={city}
                          className={classNames('users-edit-city-checkbox', { 'is-selected': editForm.cities.includes(city) })}
                        >
                          <input
                            type="checkbox"
                            checked={editForm.cities.includes(city)}
                            data-city={city}
                            onChange={handleEditCityToggle}
                          />
                          <span className="users-city-label">{city}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                  <p className="users-cities-help">
                    <i className="fas fa-info-circle" />
                    Deixe em branco para ter acesso a todas as cidades
                  </p>
                </div>
              </form>
            </div>
            <div className="users-modal-footer">
              <button type="button" className="btn-dhl is-outline" onClick={handleEditCancel} disabled={editing}>
                Cancelar
              </button>
              <button type="submit" form="editForm" className={classNames('btn-dhl is-info', { 'is-loading': editing })} disabled={editing}>
                <i className="fas fa-save" style={{ marginRight: 6 }} />
                Salvar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
