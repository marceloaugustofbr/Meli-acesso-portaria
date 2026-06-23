import React, { useState, useEffect, useCallback } from 'react';
import classNames from 'classnames';
import { apiService } from '../../../services';
import { useAuth } from '../../../hooks';
import AdminLayout from '../../../components/ui/AdminLayout';
import Loading from '../../../components/ui/Loading';
import CITIES from '../../../constants/cities';

const defaultForm = { email: '', name: '', password: '', isAdmin: true, cities: [] };

function toggleCity(selected, city) {
  return selected.includes(city)
    ? selected.filter((c) => c !== city)
    : [...selected, city];
}

export default function AdminUsers() {
  const { isAdmin, user } = useAuth();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

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

  const isSelf = (u) => u && u._id === user?.uid;

  const loadUsers = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setUsers(await apiService.listUsers());
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadUsers(); }, [loadUsers]);

  const handleCreate = async (e) => {
    e.preventDefault();
    setCreating(true);
    setCreateError(null);
    try {
      await apiService.createUser(form);
      setShowCreate(false);
      setForm(defaultForm);
      await loadUsers();
    } catch (err) {
      setCreateError(err.message);
    } finally {
      setCreating(false);
    }
  };

  const handleDelete = async (uid) => {
    setDeleting(true);
    try {
      await apiService.deleteUser(uid);
      setDeleteTarget(null);
      await loadUsers();
    } catch (err) {
      setError(err.message);
    } finally {
      setDeleting(false);
    }
  };

  const openEditModal = (u) => {
    setEditTarget(u);
    setEditForm({ isAdmin: !!u.isAdmin, cities: u.cities || [] });
    setEditError(null);
  };

  const handleEdit = async (e) => {
    e.preventDefault();
    setEditing(true);
    setEditError(null);
    try {
      await apiService.updateUser(editTarget._id, editForm);
      setEditTarget(null);
      await loadUsers();
    } catch (err) {
      setEditError(err.message);
    } finally {
      setEditing(false);
    }
  };

  const toggleEditCity = (city) => {
    setEditForm((f) => ({ ...f, cities: toggleCity(f.cities, city) }));
  };

  const updateForm = (field) => (e) => {
    const value = field === 'isAdmin' ? e.target.checked : e.target.value;
    setForm((f) => ({ ...f, [field]: value }));
  };

  const toggleFormCity = (city) => {
    setForm((f) => ({ ...f, cities: toggleCity(f.cities, city) }));
  };

  if (loading) {
    return (
      <AdminLayout>
        <Loading fullPage text="Carregando usuários..." />
      </AdminLayout>
    );
  }

  if (!isAdmin) {
    return (
      <AdminLayout>
        <div style={{ textAlign: 'center', padding: '3rem 1rem' }}>
          <span className="icon is-large has-text-grey" style={{ fontSize: '3rem', marginBottom: '1rem' }}>
            <i className="fas fa-lock" />
          </span>
          <p className="title is-5 has-text-grey">Acesso restrito</p>
          <p className="has-text-grey">Você não tem permissão para gerenciar usuários.</p>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span className="icon has-text-danger" style={{ fontSize: '1.4rem' }}>
            <i className="fas fa-users-cog" />
          </span>
          <h1 className="title is-4" style={{ margin: 0, fontWeight: 700 }}>Usuários Administrativos</h1>
        </div>
        <button className="button is-danger" onClick={() => setShowCreate(true)} style={{ borderRadius: 8, fontWeight: 600 }}>
          <i className="fas fa-plus" style={{ marginRight: 6 }} />
          Novo Usuário
        </button>
      </div>

      {error && (
        <div className="notification is-danger is-light" style={{ padding: '0.7rem 1rem', marginBottom: '1.25rem', borderRadius: 8, fontSize: '0.9rem' }}>
          <button className="delete" onClick={() => setError(null)} />
          <i className="fas fa-exclamation-circle" style={{ marginRight: 6 }} />
          {error}
        </div>
      )}

      {users.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '3rem 1rem' }}>
          <span className="icon has-text-grey-light" style={{ fontSize: '3rem', marginBottom: '0.75rem' }}>
            <i className="fas fa-users" />
          </span>
          <p className="has-text-grey" style={{ fontWeight: 500 }}>Nenhum usuário encontrado.</p>
        </div>
      ) : (
        <div className="table-container" style={{ borderRadius: 10, border: '1px solid #eaeaea', overflow: 'hidden' }}>
          <table className="table is-fullwidth is-hoverable" style={{ marginBottom: 0 }}>
            <thead style={{ backgroundColor: '#f8f8f8' }}>
              <tr>
                <th style={{ borderBottom: '1px solid #eaeaea', color: '#555', fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '0.03em' }}>Email</th>
                <th style={{ borderBottom: '1px solid #eaeaea', color: '#555', fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '0.03em' }}>Nome</th>
                <th style={{ borderBottom: '1px solid #eaeaea', color: '#555', fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '0.03em' }}>Cidades</th>
                <th style={{ borderBottom: '1px solid #eaeaea', color: '#555', fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '0.03em' }}>Admin</th>
                <th style={{ borderBottom: '1px solid #eaeaea', color: '#555', fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '0.03em' }}>Criado em</th>
                <th style={{ width: 100, borderBottom: '1px solid #eaeaea', color: '#555', fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '0.03em' }} />
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr key={u._id} style={{ transition: 'background 0.15s' }}>
                  <td style={{ verticalAlign: 'middle', fontSize: '0.9rem' }}>{u.email}</td>
                  <td style={{ verticalAlign: 'middle' }}>{u.displayName || <span className="has-text-grey-light">—</span>}</td>
                  <td style={{ verticalAlign: 'middle' }}>
                    {u.cities && u.cities.length > 0 ? (
                      <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                        {u.cities.map((city) => (
                          <span key={city} className="tag is-info is-light" style={{ borderRadius: 4, fontSize: '0.78rem' }}>{city}</span>
                        ))}
                      </div>
                    ) : (
                      <span className="tag is-light" style={{ borderRadius: 4 }}>Todas</span>
                    )}
                  </td>
                  <td style={{ verticalAlign: 'middle' }}>
                    {u.isAdmin ? (
                      <span className="tag is-success" style={{ borderRadius: 4, fontWeight: 600 }}>Sim</span>
                    ) : (
                      <span className="tag" style={{ borderRadius: 4 }}>Não</span>
                    )}
                  </td>
                  <td style={{ verticalAlign: 'middle', fontSize: '0.85rem', color: '#888' }}>
                    {u.createdAt ? new Date(u.createdAt).toLocaleDateString('pt-BR') : '-'}
                  </td>
                  <td style={{ verticalAlign: 'middle' }}>
                    {isSelf(u) ? (
                      <span className="tag is-light" style={{ borderRadius: 4 }} title="Você não pode alterar o próprio usuário">Atual</span>
                    ) : (
                      <div style={{ display: 'flex', gap: 4 }}>
                        <button
                          className="button is-small is-info is-light"
                          onClick={() => openEditModal(u)}
                          title="Editar"
                          style={{ borderRadius: 6 }}
                        >
                          <i className="fas fa-pen" />
                        </button>
                        <button
                          className="button is-small is-danger is-light"
                          onClick={() => setDeleteTarget(u)}
                          title="Excluir"
                          style={{ borderRadius: 6 }}
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
      )}

      {/* Modal Criar Usuário */}
      <div className={classNames('modal', { 'is-active': showCreate })}>
        <div className="modal-background" onClick={() => !creating && setShowCreate(false)} />
        <div className="modal-card" style={{ maxWidth: 600, borderRadius: 12, overflow: 'hidden' }}>
          <header className="modal-card-head" style={{ borderBottom: '1px solid #eaeaea', padding: '1.25rem 1.5rem' }}>
            <p className="modal-card-title" style={{ fontSize: '1.15rem', fontWeight: 600 }}>
              <span className="icon has-text-danger" style={{ marginRight: 8 }}>
                <i className="fas fa-user-plus" />
              </span>
              Novo Usuário
            </p>
            <button className="delete" onClick={() => !creating && setShowCreate(false)} />
          </header>
          <section className="modal-card-body" style={{ padding: '1.5rem' }}>
            <form id="createForm" onSubmit={handleCreate}>
              {createError && (
                <div className="notification is-danger is-light" style={{ padding: '0.6rem 0.9rem', marginBottom: '1.25rem', fontSize: '0.9rem', borderRadius: 8 }}>
                  <button className="delete" onClick={() => setCreateError(null)} />
                  {createError}
                </div>
              )}

              {/* Seção: Dados do Usuário */}
              <p style={{ fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em', color: '#888', marginBottom: '0.75rem' }}>
                <i className="fas fa-id-card" style={{ marginRight: 6 }} />
                DADOS DO USUÁRIO
              </p>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                <div className="field" style={{ marginBottom: 0 }}>
                  <label className="label" style={{ fontSize: '0.82rem', fontWeight: 600 }}>Email</label>
                  <div className="control has-icons-left">
                    <input className="input" type="email" required value={form.email} onChange={updateForm('email')} placeholder="email@exemplo.com" style={{ fontSize: '0.9rem' }} />
                    <span className="icon is-small is-left">
                      <i className="fas fa-envelope" />
                    </span>
                  </div>
                </div>
                <div className="field" style={{ marginBottom: 0 }}>
                  <label className="label" style={{ fontSize: '0.82rem', fontWeight: 600 }}>Nome</label>
                  <div className="control has-icons-left">
                    <input className="input" type="text" value={form.name} onChange={updateForm('name')} placeholder="Nome completo" style={{ fontSize: '0.9rem' }} />
                    <span className="icon is-small is-left">
                      <i className="fas fa-user" />
                    </span>
                  </div>
                </div>
              </div>

              <div className="field" style={{ marginTop: '0.75rem' }}>
                <label className="label" style={{ fontSize: '0.82rem', fontWeight: 600 }}>Senha</label>
                <div className="control has-icons-left">
                  <input className="input" type="password" required value={form.password} onChange={updateForm('password')} placeholder="Mínimo 6 caracteres" minLength={6} style={{ fontSize: '0.9rem' }} />
                  <span className="icon is-small is-left">
                    <i className="fas fa-lock" />
                  </span>
                </div>
              </div>

              <hr style={{ margin: '1.25rem 0', backgroundColor: '#eee', height: 1 }} />

              {/* Seção: Permissões */}
              <p style={{ fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em', color: '#888', marginBottom: '0.75rem' }}>
                <i className="fas fa-shield-alt" style={{ marginRight: 6 }} />
                PERMISSÕES
              </p>

              <div className="field" style={{ marginBottom: '1rem' }}>
                <div
                  className={classNames('box', { 'has-background-danger-light': form.isAdmin })}
                  style={{
                    cursor: 'pointer',
                    padding: '1rem 1.25rem',
                    borderRadius: 10,
                    border: '1px solid',
                    borderColor: form.isAdmin ? '#f14668' : '#ddd',
                    transition: 'all 0.2s',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                  }}
                  onClick={() => setForm((f) => ({ ...f, isAdmin: !f.isAdmin }))}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') setForm((f) => ({ ...f, isAdmin: !f.isAdmin })); }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <span className="icon" style={{ color: form.isAdmin ? '#f14668' : '#888', fontSize: '1.2rem' }}>
                      <i className={`fas ${form.isAdmin ? 'fa-toggle-on' : 'fa-toggle-off'}`} />
                    </span>
                    <div>
                      <p style={{ fontWeight: 600, fontSize: '0.9rem', color: form.isAdmin ? '#cc0f35' : '#444' }}>
                        {form.isAdmin ? 'Administrador' : 'Usuário comum'}
                      </p>
                      <p style={{ fontSize: '0.78rem', color: '#888', marginTop: 1 }}>
                        {form.isAdmin
                          ? 'Acesso completo a todas as funcionalidades'
                          : 'Acesso a dashboard e exames, sem gerenciamento de usuários'}
                      </p>
                    </div>
                  </div>
                  <span className="icon" style={{ color: form.isAdmin ? '#f14668' : '#bbb' }}>
                    <i className={`fas ${form.isAdmin ? 'fa-check-circle' : 'fa-circle'}`} />
                  </span>
                </div>
              </div>

              <div className="field">
                <label className="label" style={{ fontSize: '0.82rem', fontWeight: 600 }}>
                  Cidades que gerencia
                </label>
                <div style={{
                  border: '1px solid #ddd',
                  borderRadius: 10,
                  padding: '0.6rem 0.75rem',
                  maxHeight: 170,
                  overflowY: 'auto',
                  backgroundColor: '#fafafa',
                }}>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.25rem' }}>
                    {CITIES.map((city) => (
                      <label key={city} className="checkbox" style={{ padding: '0.25rem 0.4rem', borderRadius: 6, display: 'flex', alignItems: 'center', fontSize: '0.85rem', cursor: 'pointer', transition: 'background 0.15s', ...(form.cities.includes(city) ? { backgroundColor: '#fef0f0' } : {}) }}>
                        <input
                          type="checkbox"
                          checked={form.cities.includes(city)}
                          onChange={() => toggleFormCity(city)}
                          style={{ accentColor: '#f14668' }}
                        />
                        <span style={{ marginLeft: 7, color: form.cities.includes(city) ? '#cc0f35' : '#444', fontWeight: form.cities.includes(city) ? 500 : 400 }}>{city}</span>
                      </label>
                    ))}
                  </div>
                </div>
                <p className="help" style={{ fontSize: '0.78rem', marginTop: 6, color: '#999' }}>
                  <i className="fas fa-info-circle" style={{ marginRight: 4 }} />
                  Deixe em branco para ter acesso a todas as cidades
                </p>
              </div>
            </form>
          </section>
          <footer className="modal-card-foot" style={{ justifyContent: 'flex-end', borderTop: '1px solid #eaeaea', padding: '1rem 1.5rem', gap: 8 }}>
            <button type="button" className="button" onClick={() => setShowCreate(false)} disabled={creating} style={{ borderRadius: 8, fontWeight: 500 }}>
              Cancelar
            </button>
            <button type="submit" form="createForm" className={classNames('button is-danger', { 'is-loading': creating })} disabled={creating} style={{ borderRadius: 8, fontWeight: 600 }}>
              <i className="fas fa-plus" style={{ marginRight: 6 }} />
              Criar Usuário
            </button>
          </footer>
        </div>
      </div>

      {/* Modal Confirmar Exclusão */}
      <div className={classNames('modal', { 'is-active': !!deleteTarget })}>
        <div className="modal-background" onClick={() => !deleting && setDeleteTarget(null)} />
        <div className="modal-card" style={{ maxWidth: 420, borderRadius: 12, overflow: 'hidden' }}>
          <header className="modal-card-head" style={{ borderBottom: '1px solid #eaeaea', padding: '1.25rem 1.5rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <span className="icon has-text-danger" style={{ fontSize: '1.25rem' }}>
                <i className="fas fa-exclamation-triangle" />
              </span>
              <p className="modal-card-title" style={{ fontSize: '1.1rem', fontWeight: 600 }}>Confirmar Exclusão</p>
            </div>
            <button className="delete" onClick={() => !deleting && setDeleteTarget(null)} />
          </header>
          <section className="modal-card-body" style={{ padding: '1.25rem 1.5rem' }}>
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
          </section>
          <footer className="modal-card-foot" style={{ justifyContent: 'flex-end', borderTop: '1px solid #eaeaea', padding: '1rem 1.5rem', gap: 8 }}>
            <button type="button" className="button" onClick={() => setDeleteTarget(null)} disabled={deleting} style={{ borderRadius: 8, fontWeight: 500 }}>
              Cancelar
            </button>
            <button
              type="button"
              className={classNames('button is-danger', { 'is-loading': deleting })}
              onClick={() => handleDelete(deleteTarget._id)}
              disabled={deleting || isSelf(deleteTarget)}
              style={{ borderRadius: 8, fontWeight: 600 }}
            >
              <i className="fas fa-trash" style={{ marginRight: 6 }} />
              Excluir
            </button>
          </footer>
        </div>
      </div>

      {/* Modal Editar Usuário */}
      <div className={classNames('modal', { 'is-active': !!editTarget })}>
        <div className="modal-background" onClick={() => !editing && setEditTarget(null)} />
        <div className="modal-card" style={{ maxWidth: 600, borderRadius: 12, overflow: 'hidden' }}>
          <header className="modal-card-head" style={{ borderBottom: '1px solid #eaeaea', padding: '1.25rem 1.5rem' }}>
            <p className="modal-card-title" style={{ fontSize: '1.15rem', fontWeight: 600 }}>
              <span className="icon has-text-info" style={{ marginRight: 8 }}>
                <i className="fas fa-user-edit" />
              </span>
              Editar Usuário
            </p>
            <button className="delete" onClick={() => !editing && setEditTarget(null)} />
          </header>
          <section className="modal-card-body" style={{ padding: '1.5rem' }}>
            <form id="editForm" onSubmit={handleEdit}>
              {editError && (
                <div className="notification is-danger is-light" style={{ padding: '0.6rem 0.9rem', marginBottom: '1.25rem', fontSize: '0.9rem', borderRadius: 8 }}>
                  <button className="delete" onClick={() => setEditError(null)} />
                  {editError}
                </div>
              )}

              {/* Dados do Usuário */}
              <p style={{ fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em', color: '#888', marginBottom: '0.75rem' }}>
                <i className="fas fa-id-card" style={{ marginRight: 6 }} />
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

              <hr style={{ margin: '1.25rem 0', backgroundColor: '#eee', height: 1 }} />

              {/* Permissões */}
              <p style={{ fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em', color: '#888', marginBottom: '0.75rem' }}>
                <i className="fas fa-shield-alt" style={{ marginRight: 6 }} />
                PERMISSÕES
              </p>

              <div className="field" style={{ marginBottom: '1rem' }}>
                <div
                  className={classNames('box', { 'has-background-info-light': editForm.isAdmin })}
                  style={{
                    cursor: 'pointer',
                    padding: '1rem 1.25rem',
                    borderRadius: 10,
                    border: '1px solid',
                    borderColor: editForm.isAdmin ? '#3b8bba' : '#ddd',
                    transition: 'all 0.2s',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                  }}
                  onClick={() => setEditForm((f) => ({ ...f, isAdmin: !f.isAdmin }))}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') setEditForm((f) => ({ ...f, isAdmin: !f.isAdmin })); }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <span className="icon" style={{ color: editForm.isAdmin ? '#3b8bba' : '#888', fontSize: '1.2rem' }}>
                      <i className={`fas ${editForm.isAdmin ? 'fa-toggle-on' : 'fa-toggle-off'}`} />
                    </span>
                    <div>
                      <p style={{ fontWeight: 600, fontSize: '0.9rem', color: editForm.isAdmin ? '#296f8a' : '#444' }}>
                        {editForm.isAdmin ? 'Administrador' : 'Usuário comum'}
                      </p>
                      <p style={{ fontSize: '0.78rem', color: '#888', marginTop: 1 }}>
                        {editForm.isAdmin
                          ? 'Acesso completo a todas as funcionalidades'
                          : 'Acesso a dashboard e exames, sem gerenciamento de usuários'}
                      </p>
                    </div>
                  </div>
                  <span className="icon" style={{ color: editForm.isAdmin ? '#3b8bba' : '#bbb' }}>
                    <i className={`fas ${editForm.isAdmin ? 'fa-check-circle' : 'fa-circle'}`} />
                  </span>
                </div>
              </div>

              <div className="field">
                <label className="label" style={{ fontSize: '0.82rem', fontWeight: 600 }}>
                  Cidades que gerencia
                </label>
                <div style={{
                  border: '1px solid #ddd',
                  borderRadius: 10,
                  padding: '0.6rem 0.75rem',
                  maxHeight: 170,
                  overflowY: 'auto',
                  backgroundColor: '#fafafa',
                }}>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.25rem' }}>
                    {CITIES.map((city) => (
                      <label key={city} className="checkbox" style={{ padding: '0.25rem 0.4rem', borderRadius: 6, display: 'flex', alignItems: 'center', fontSize: '0.85rem', cursor: 'pointer', transition: 'background 0.15s', ...(editForm.cities.includes(city) ? { backgroundColor: '#ebf5ff' } : {}) }}>
                        <input
                          type="checkbox"
                          checked={editForm.cities.includes(city)}
                          onChange={() => toggleEditCity(city)}
                          style={{ accentColor: '#3b8bba' }}
                        />
                        <span style={{ marginLeft: 7, color: editForm.cities.includes(city) ? '#296f8a' : '#444', fontWeight: editForm.cities.includes(city) ? 500 : 400 }}>{city}</span>
                      </label>
                    ))}
                  </div>
                </div>
                <p className="help" style={{ fontSize: '0.78rem', marginTop: 6, color: '#999' }}>
                  <i className="fas fa-info-circle" style={{ marginRight: 4 }} />
                  Deixe em branco para ter acesso a todas as cidades
                </p>
              </div>
            </form>
          </section>
          <footer className="modal-card-foot" style={{ justifyContent: 'flex-end', borderTop: '1px solid #eaeaea', padding: '1rem 1.5rem', gap: 8 }}>
            <button type="button" className="button" onClick={() => setEditTarget(null)} disabled={editing} style={{ borderRadius: 8, fontWeight: 500 }}>
              Cancelar
            </button>
            <button type="submit" form="editForm" className={classNames('button is-info', { 'is-loading': editing })} disabled={editing} style={{ borderRadius: 8, fontWeight: 600 }}>
              <i className="fas fa-save" style={{ marginRight: 6 }} />
              Salvar
            </button>
          </footer>
        </div>
      </div>
    </AdminLayout>
  );
}
