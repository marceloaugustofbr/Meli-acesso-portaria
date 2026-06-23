import React, { useState, useEffect, useCallback } from 'react';
import classNames from 'classnames';
import { apiService } from '../../../services';
import AdminLayout from '../../../components/ui/AdminLayout';
import Loading from '../../../components/ui/Loading';

const CITIES = ['Avaré', 'Barretos', 'Bauru'];

const defaultForm = { email: '', name: '', password: '', isAdmin: true, cities: [] };

function toggleCity(selected, city) {
  return selected.includes(city)
    ? selected.filter((c) => c !== city)
    : [...selected, city];
}

export default function AdminUsers() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [showCreate, setShowCreate] = useState(false);
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState(null);
  const [form, setForm] = useState(defaultForm);

  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);

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

  return (
    <AdminLayout>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <h1 className="title is-4" style={{ margin: 0 }}>Usuários Administrativos</h1>
        <button className="button is-danger" onClick={() => setShowCreate(true)}>
          <i className="fas fa-plus" style={{ marginRight: 6 }} />
          Novo Usuário
        </button>
      </div>

      {error && (
        <div className="notification is-danger is-light" style={{ padding: '0.75rem 1rem' }}>
          <button className="delete" onClick={() => setError(null)} />
          {error}
        </div>
      )}

      {users.length === 0 ? (
        <p className="has-text-grey">Nenhum usuário encontrado.</p>
      ) : (
        <div className="table-container">
          <table className="table is-fullwidth is-hoverable">
            <thead>
              <tr>
                <th>Email</th>
                <th>Nome</th>
                <th>Cidades</th>
                <th>Admin</th>
                <th>Criado em</th>
                <th style={{ width: 100 }} />
              </tr>
            </thead>
            <tbody>
              {users.map((user) => (
                <tr key={user._id}>
                  <td style={{ verticalAlign: 'middle' }}>{user.email}</td>
                  <td style={{ verticalAlign: 'middle' }}>{user.displayName || '-'}</td>
                  <td style={{ verticalAlign: 'middle' }}>
                    {user.cities && user.cities.length > 0 ? (
                      <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                        {user.cities.map((city) => (
                          <span key={city} className="tag is-info is-light">{city}</span>
                        ))}
                      </div>
                    ) : (
                      <span className="tag is-light">Todas</span>
                    )}
                  </td>
                  <td style={{ verticalAlign: 'middle' }}>
                    {user.isAdmin ? (
                      <span className="tag is-success">Sim</span>
                    ) : (
                      <span className="tag">Não</span>
                    )}
                  </td>
                  <td style={{ verticalAlign: 'middle', fontSize: '0.85rem', color: '#888' }}>
                    {user.createdAt ? new Date(user.createdAt).toLocaleDateString('pt-BR') : '-'}
                  </td>
                  <td style={{ verticalAlign: 'middle' }}>
                    <button
                      className="button is-small is-danger is-light"
                      onClick={() => setDeleteTarget(user)}
                      title="Excluir"
                    >
                      <i className="fas fa-trash" />
                    </button>
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
        <div className="modal-card" style={{ maxWidth: 480 }}>
          <header className="modal-card-head">
            <p className="modal-card-title">Novo Usuário</p>
            <button className="delete" onClick={() => !creating && setShowCreate(false)} />
          </header>
          <form onSubmit={handleCreate}>
            <section className="modal-card-body">
              {createError && (
                <div className="notification is-danger is-light" style={{ padding: '0.5rem 0.75rem', marginBottom: '0.75rem' }}>
                  <button className="delete" onClick={() => setCreateError(null)} />
                  {createError}
                </div>
              )}
              <div className="field">
                <label className="label">Email</label>
                <div className="control">
                  <input className="input" type="email" required value={form.email} onChange={updateForm('email')} placeholder="email@exemplo.com" />
                </div>
              </div>
              <div className="field">
                <label className="label">Nome</label>
                <div className="control">
                  <input className="input" type="text" value={form.name} onChange={updateForm('name')} placeholder="Nome completo" />
                </div>
              </div>
              <div className="field">
                <label className="label">Senha</label>
                <div className="control">
                  <input className="input" type="password" required value={form.password} onChange={updateForm('password')} placeholder="Mín. 6 caracteres" minLength={6} />
                </div>
              </div>
              <div className="field">
                <label className="label">Cidades que gerencia</label>
                <div className="control">
                  {CITIES.map((city) => (
                    <label key={city} className="checkbox" style={{ marginRight: '1.25rem', marginBottom: '0.35rem', display: 'inline-flex', alignItems: 'center' }}>
                      <input
                        type="checkbox"
                        checked={form.cities.includes(city)}
                        onChange={() => toggleFormCity(city)}
                      />
                      <span style={{ marginLeft: 6 }}>{city}</span>
                    </label>
                  ))}
                </div>
                <p className="help">Deixe em branco para ter acesso a todas as cidades</p>
              </div>
              <div className="field">
                <div className="control">
                  <label className="checkbox">
                    <input type="checkbox" checked={form.isAdmin} onChange={updateForm('isAdmin')} />
                    <span style={{ marginLeft: 8 }}>Administrador</span>
                  </label>
                </div>
              </div>
            </section>
            <footer className="modal-card-foot" style={{ justifyContent: 'flex-end' }}>
              <button type="button" className="button" onClick={() => setShowCreate(false)} disabled={creating}>
                Cancelar
              </button>
              <button type="submit" className={classNames('button is-danger', { 'is-loading': creating })} disabled={creating}>
                Criar
              </button>
            </footer>
          </form>
        </div>
      </div>

      {/* Modal Confirmar Exclusão */}
      <div className={classNames('modal', { 'is-active': !!deleteTarget })}>
        <div className="modal-background" onClick={() => !deleting && setDeleteTarget(null)} />
        <div className="modal-card" style={{ maxWidth: 420 }}>
          <header className="modal-card-head">
            <p className="modal-card-title">Confirmar Exclusão</p>
            <button className="delete" onClick={() => !deleting && setDeleteTarget(null)} />
          </header>
          <section className="modal-card-body">
            <p>Tem certeza que deseja excluir o usuário <strong>{deleteTarget?.email}</strong>?</p>
            <p className="has-text-grey" style={{ fontSize: '0.85rem', marginTop: 4 }}>
              Esta ação não pode ser desfeita.
            </p>
          </section>
          <footer className="modal-card-foot" style={{ justifyContent: 'flex-end' }}>
            <button type="button" className="button" onClick={() => setDeleteTarget(null)} disabled={deleting}>
              Cancelar
            </button>
            <button
              type="button"
              className={classNames('button is-danger', { 'is-loading': deleting })}
              onClick={() => handleDelete(deleteTarget._id)}
              disabled={deleting}
            >
              Excluir
            </button>
          </footer>
        </div>
      </div>
    </AdminLayout>
  );
}
