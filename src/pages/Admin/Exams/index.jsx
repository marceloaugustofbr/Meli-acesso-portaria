import React, { useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { useExams, useExamStats } from '../../../hooks';
import AdminLayout from '../../../components/ui/AdminLayout';
import Loading from '../../../components/ui/Loading';
import { formatCPF } from '../../../utils/cpf';

export default function AdminExams() {
  const { data: stats } = useExamStats();
  const [cityInput, setCityInput] = useState('');
  const [typeInput, setTypeInput] = useState('');
  const [statusInput, setStatusInput] = useState('');

  const [filters, setFilters] = useState({});
  const [cursorStack, setCursorStack] = useState([]);
  const [cursor, setCursor] = useState(null);

  const { data, isLoading } = useExams(filters, cursor);

  const handleFilter = useCallback(() => {
    const next = {};
    if (cityInput) next.city = cityInput;
    if (typeInput) next.operationType = typeInput;
    if (statusInput) next.status = statusInput;
    setFilters(next);
    setCursorStack([]);
    setCursor(null);
  }, [cityInput, typeInput, statusInput]);

  const nextPage = useCallback(() => {
    if (data?.hasMore && data?.lastCursor) {
      setCursorStack((prev) => [...prev, cursor]);
      setCursor(data.lastCursor);
    }
  }, [data, cursor]);

  const prevPage = useCallback(() => {
    if (cursorStack.length > 0) {
      const prev = cursorStack[cursorStack.length - 1];
      setCursorStack((prevStack) => prevStack.slice(0, -1));
      setCursor(prev);
    }
  }, [cursorStack]);

  if (isLoading && !data) return <AdminLayout><Loading fullPage /></AdminLayout>;

  const pageData = data?.data || [];
  const total = stats?.total ?? 0;

  return (
    <AdminLayout>
      <h1 className="title is-4 mb-4">
        Provas
        <span className="has-text-grey is-size-6 ml-2">({total} total)</span>
      </h1>

      <div className="box mb-4">
        <div className="columns is-multiline is-vcentered">
          <div className="column is-3">
            <input
              className="input is-small"
              placeholder="Filtrar cidade"
              value={cityInput}
              onChange={(e) => setCityInput(e.target.value)}
            />
          </div>
          <div className="column is-3">
            <div className="select is-small is-fullwidth">
              <select value={typeInput} onChange={(e) => setTypeInput(e.target.value)}>
                <option value="">Todos tipos</option>
                <option value="TSI">TSI</option>
                <option value="Polly">Polly</option>
              </select>
            </div>
          </div>
          <div className="column is-3">
            <div className="select is-small is-fullwidth">
              <select value={statusInput} onChange={(e) => setStatusInput(e.target.value)}>
                <option value="">Todos status</option>
                <option value="approved">Aprovado</option>
                <option value="reproved">Reprovado</option>
              </select>
            </div>
          </div>
          <div className="column is-3">
            <button className="button is-primary is-small is-fullwidth" onClick={handleFilter}>
              Filtrar
            </button>
          </div>
        </div>
      </div>

      <div className="b-table">
        <div className="table-container">
          <table className="table is-fullwidth is-striped is-hoverable has-mobile-cards">
            <thead>
              <tr>
                <th>Nome</th>
                <th>CPF</th>
                <th>Cidade</th>
                <th>Tipo</th>
                <th>Nota</th>
                <th>Status</th>
                <th>Data</th>
                <th>Ações</th>
              </tr>
            </thead>
            <tbody>
              {pageData.map((exam) => (
                <tr key={exam.id}>
                  <td data-label="Nome">{exam.name}</td>
                  <td data-label="CPF">{formatCPF(exam.cpf || '')}</td>
                  <td data-label="Cidade">{exam.city}</td>
                  <td data-label="Tipo">{exam.operationType}</td>
                  <td data-label="Nota">{exam.score}</td>
                  <td data-label="Status">
                    <span className={`tag ${exam.status === 'approved' ? 'is-success' : 'is-danger'}`}>
                      {exam.status === 'approved' ? 'Aprovado' : 'Reprovado'}
                    </span>
                  </td>
                  <td data-label="Data">{exam.createdAt ? new Date(exam.createdAt).toLocaleDateString('pt-BR') : '-'}</td>
                  <td data-label="Ações">
                    <Link to={`/admin/exam/${exam.id}`} className="button is-small is-primary is-light">
                      Detalhes
                    </Link>
                  </td>
                </tr>
              ))}
              {pageData.length === 0 && (
                <tr><td colSpan={8} className="has-text-centered has-text-grey">Nenhuma prova encontrada</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <nav className="pagination is-centered" role="navigation" aria-label="pagination">
        <button
          className="button is-small"
          disabled={cursorStack.length === 0}
          onClick={prevPage}
        >
          Anterior
        </button>
        <button
          className="button is-small"
          disabled={!data?.hasMore}
          onClick={nextPage}
        >
          Próximo
        </button>
      </nav>
    </AdminLayout>
  );
}
