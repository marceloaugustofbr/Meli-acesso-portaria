import React, { useMemo, useState, useEffect, useCallback, useRef } from 'react';
import { Link } from 'react-router-dom';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts';
import { useQueryClient } from '@tanstack/react-query';
import SignatureCanvas from 'react-signature-canvas';
import { useExamStats, useLatestExams } from '../../../hooks';
import { examService } from '../../../services';
import AdminLayout from '../../../components/ui/AdminLayout';
import Loading from '../../../components/ui/Loading';
import { formatCPF } from '../../../utils';

const COLORS = ['#D40511', '#FFCC00', '#D9D9D9', '#222222'];

const CITIES = [
  'Araçatuba', 'Avaré', 'Barretos', 'Bauru', 'Cravinhos',
  'Franca', 'Jales', 'Piracicaba', 'Presidente Prudente',
  'Ribeirão Preto', 'S.J Rio Preto', 'São Carlos',
];

const TYPES = ['TSI', 'Polly'];

function AnimatedCounter({ value, suffix = '' }) {
  const [display, setDisplay] = useState(0);

  useEffect(() => {
    const duration = 800;
    const steps = 20;
    let start = 0;
    const increment = value / steps;
    const timer = setInterval(() => {
      start++;
      const next = Math.round(increment * start);
      if (next >= value) {
        setDisplay(value);
        clearInterval(timer);
      } else {
        setDisplay(next);
      }
    }, duration / steps);

    return function cleanup() { clearInterval(timer); };
  }, [value]);

  return <span>{display}{suffix}</span>;
}

export default function AdminDashboard() {
  const { data: stats, isLoading: statsLoading } = useExamStats();

  const [cityFilter, setCityFilter] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [nameInput, setNameInput] = useState('');
  const [filters, setFilters] = useState({});
  const [cursorStack, setCursorStack] = useState([]);
  const [cursor, setCursor] = useState(null);

  const [dropdownPos, setDropdownPos] = useState(null);
  const [blockModal, setBlockModal] = useState(null);
  const [blockReason, setBlockReason] = useState('');
  const [savingBlock, setSavingBlock] = useState(false);
  const sigRef = useRef(null);

  const queryClient = useQueryClient();
  const { data, isLoading: examsLoading } = useLatestExams(filters, cursor);

  const applyFilters = useCallback(() => {
    const next = {};
    const trimmed = nameInput.trim().toUpperCase();
    if (trimmed) next.name = trimmed;
    if (cityFilter) next.city = cityFilter;
    if (typeFilter) next.operationType = typeFilter;
    if (statusFilter) next.status = statusFilter;
    setFilters(next);
    setCursorStack([]);
    setCursor(null);
  }, [cityFilter, typeFilter, statusFilter, nameInput]);

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') applyFilters();
  };

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

  useEffect(() => {
    if (!dropdownPos) return undefined;
    const handler = () => setDropdownPos(null);
    document.addEventListener('click', handler);
    return () => document.removeEventListener('click', handler);
  }, [dropdownPos]);

  const openDropdown = (exam, e) => {
    e.stopPropagation();
    const rect = e.currentTarget.getBoundingClientRect();
    setDropdownPos({
      top: rect.bottom + 4,
      left: rect.right - 180,
      exam,
    });
  };

  const openBlockModal = (exam) => {
    setBlockModal(exam);
    setBlockReason('');
    setDropdownPos(null);
  };

  const closeBlockModal = () => {
    setBlockModal(null);
    setBlockReason('');
    setSavingBlock(false);
  };

  const handleBlockConfirm = async () => {
    if (!blockModal || !blockReason.trim()) return;
    setSavingBlock(true);
    try {
      let signatureUrl = null;
      if (sigRef.current && !sigRef.current.isEmpty()) {
        const trimmed = sigRef.current.getTrimmedCanvas();
        signatureUrl = trimmed.toDataURL('image/png');
      }
      await examService.blockUser(blockModal.cpf, {
        blockedBy: 'Admin',
        blockReason: blockReason.trim(),
        blockSignature: signatureUrl,
      });
      queryClient.invalidateQueries({ queryKey: ['latestExams'] });
      closeBlockModal();
    } catch (err) {
      console.error('Erro ao bloquear:', err);
    } finally {
      setSavingBlock(false);
    }
  };

  const monthlyData = useMemo(() => {
    if (!stats?.monthlyCounts) return [];
    return Object.entries(stats.monthlyCounts)
      .map(([month, count]) => ({ month, count }))
      .sort((a, b) => a.month.localeCompare(b.month));
  }, [stats]);

  const operationData = useMemo(() => {
    if (!stats?.typeCounts) return [];
    return Object.entries(stats.typeCounts).map(([name, value]) => ({ name, value }));
  }, [stats]);

  const pieData = useMemo(() => [
    { name: 'Aprovados', value: stats?.approvedPeople ?? 0 },
    { name: 'Reprovados', value: stats?.reprovedPeople ?? 0 },
  ], [stats]);

  const statusConfig = {
    approved: { bg: '#E8F5E9', color: '#28A745', label: 'Aprovado' },
    blocked: { bg: '#FFF3E0', color: '#E65100', label: 'Bloqueado' },
  };

  const kpis = useMemo(() => [
    { label: 'Total Pessoas', value: stats?.totalPeople ?? stats?.total ?? 0, color: '#222' },
    { label: 'Aprovados', value: stats?.approvedPeople ?? 0, color: '#28A745' },
    { label: 'Reprovados', value: stats?.reprovedPeople ?? 0, color: '#D32F2F' },
    { label: 'Taxa Aprovação', value: stats?.approvalRate || 0, suffix: '%', color: '#D40511' },
  ], [stats]);

  const [recalculating, setRecalculating] = useState(false);

  const handleRecalculate = async () => {
    setRecalculating(true);
    try {
      await examService.recalculateAggregation();
      queryClient.invalidateQueries(['examAggregation']);
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error('Erro ao recalcular:', err);
    } finally {
      setRecalculating(false);
    }
  };

  const pageData = data?.data || [];
  const total = stats?.totalPeople ?? stats?.total ?? 0;

  if (statsLoading && !stats) return <AdminLayout><Loading fullPage /></AdminLayout>;

  return (
    <AdminLayout>
      <div className="fade-in">
        <div style={{ marginBottom: '1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h1 style={{ fontSize: '1.5rem', fontWeight: 700, margin: 0 }}>Dashboard</h1>
            <p style={{ fontSize: '0.85rem', color: '#888', margin: '4px 0 0' }}>Visão geral dos treinamentos</p>
          </div>
          <button
            className={`button is-small is-light ${recalculating ? 'is-loading' : ''}`}
            onClick={handleRecalculate}
            disabled={recalculating}
          >
            <span className="icon is-small"><i className="fas fa-sync-alt" /></span>
            <span>Recalcular</span>
          </button>
        </div>

        <div className="columns is-multiline" style={{ marginBottom: '1.5rem' }}>
          {kpis.map((kpi, i) => (
            <div key={kpi.label} className="column is-3 fade-in-up" style={{ animationDelay: `${i * 100}ms` }}>
              <div className="kpi-card">
                <div className="kpi-label">{kpi.label}</div>
                <div className="kpi-value" style={{ color: kpi.color }}>
                  <AnimatedCounter value={kpi.value} suffix={kpi.suffix || ''} />
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="columns" style={{ marginBottom: '1.5rem' }}>
          <div className="column is-6">
            <div className="kpi-card">
              <h3 style={{ fontSize: '0.9rem', fontWeight: 700, marginBottom: '1rem', color: '#444' }}>Provas por Mês</h3>
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={monthlyData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#eee" />
                  <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                  <YAxis tick={{ fontSize: 12 }} allowDecimals={false} />
                  <Tooltip />
                  <Bar dataKey="count" fill="#D40511" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
          <div className="column is-3">
            <div className="kpi-card" style={{ height: '100%' }}>
              <h3 style={{ fontSize: '0.9rem', fontWeight: 700, marginBottom: '1rem', color: '#444' }}>Aprovados x Reprovados</h3>
              <ResponsiveContainer width="100%" height={250}>
                <PieChart>
                  <Pie data={pieData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80}>
                    <Cell fill="#28A745" />
                    <Cell fill="#D32F2F" />
                  </Pie>
                  <Tooltip />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>
          <div className="column is-3">
            <div className="kpi-card" style={{ height: '100%' }}>
              <h3 style={{ fontSize: '0.9rem', fontWeight: 700, marginBottom: '1rem', color: '#444' }}>Empresa Diarista</h3>
              <ResponsiveContainer width="100%" height={250}>
                <PieChart>
                  <Pie data={operationData} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={45} outerRadius={80} label>
                    {operationData.map((entry, idx) => (
                      <Cell key={entry.name} fill={COLORS[idx % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        <div className="kpi-card" style={{ padding: '1.5rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem', flexWrap: 'wrap', gap: '0.5rem' }}>
            <h3 style={{ fontSize: '0.9rem', fontWeight: 700, margin: 0, color: '#444' }}>
              Histórico de Provas
              <span className="has-text-grey is-size-7 ml-2">({total} total)</span>
            </h3>
            <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', alignItems: 'center' }}>
              <input
                type="text"
                className="input-dhl"
                placeholder="Buscar nome..."
                value={nameInput}
                onChange={(e) => setNameInput(e.target.value)}
                onKeyDown={handleKeyDown}
                style={{ width: 180, padding: '0.4rem 0.75rem', fontSize: '0.8rem' }}
              />
              <button className="button is-small" onClick={applyFilters} style={{ background: '#D40511', color: '#fff', border: 'none' }}>
                <i className="fas fa-search" />
              </button>
              <select className="select-dhl" style={{ width: 'auto', padding: '0.4rem 0.75rem', fontSize: '0.8rem' }} value={cityFilter} onChange={(e) => { setCityFilter(e.target.value); }}>
                <option value="">Todas cidades</option>
                {CITIES.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
              <select className="select-dhl" style={{ width: 'auto', padding: '0.4rem 0.75rem', fontSize: '0.8rem' }} value={typeFilter} onChange={(e) => { setTypeFilter(e.target.value); }}>
                <option value="">Todos tipos</option>
                {TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
              </select>
              <select className="select-dhl" style={{ width: 'auto', padding: '0.4rem 0.75rem', fontSize: '0.8rem' }} value={statusFilter} onChange={(e) => { setStatusFilter(e.target.value); }}>
                <option value="">Todos status</option>
                <option value="approved">Aprovado</option>
                <option value="reproved">Reprovado</option>
                <option value="blocked">Bloqueado</option>
              </select>
            </div>
          </div>
          <div className="table-container">
            <table className="table is-fullwidth is-striped is-hoverable" style={{ fontSize: '0.85rem' }}>
              <thead>
                <tr>
                  <th>Nome</th>
                  <th>CPF</th>
                  <th>Cidade</th>
                  <th>Tipo</th>
                  <th>Nota</th>
                  <th>Tentativas</th>
                  <th>Status</th>
                  <th>Data</th>
                  <th>Ações</th>
                </tr>
              </thead>
              <tbody>
                {!examsLoading && pageData.map((exam) => (
                  <tr key={exam.id} className="hover-card" style={{ cursor: 'default' }}>
                    <td data-label="Nome">{exam.name}</td>
                    <td data-label="CPF">{formatCPF(exam.cpf || '')}</td>
                    <td data-label="Cidade">{exam.city}</td>
                    <td data-label="Tipo">{exam.operationType}</td>
                    <td data-label="Nota">{exam.score}</td>
                    <td data-label="Tentativas">{exam.attempts || 1}ª</td>
                    <td data-label="Status">
                      {(() => {
                        const cfg = statusConfig[exam.status] || { bg: '#FFEBEE', color: '#D32F2F', label: 'Reprovado' };
                        return (
                          <span style={{
                            display: 'inline-block', padding: '2px 10px', borderRadius: 12,
                            fontSize: '0.75rem', fontWeight: 600,
                            background: cfg.bg, color: cfg.color,
                          }}>
                            {cfg.label}
                          </span>
                        );
                      })()}
                    </td>
                    <td data-label="Data">{exam.createdAt ? new Date(exam.createdAt).toLocaleDateString('pt-BR') : '-'}</td>
                    <td data-label="Ações">
                      <button
                        className="button is-small is-light"
                        onClick={(e) => openDropdown(exam, e)}
                        style={{ border: 'none', background: 'transparent', cursor: 'pointer', fontSize: '1.1rem', lineHeight: 1 }}
                      >
                        &#8942;
                      </button>
                    </td>
                  </tr>
                ))}
                {!examsLoading && pageData.length === 0 && (
                  <tr><td colSpan={9} style={{ textAlign: 'center', color: '#888', padding: '2rem' }}>Nenhuma prova encontrada</td></tr>
                )}
                {examsLoading && (
                  <tr><td colSpan={9} style={{ textAlign: 'center', padding: '2rem' }}><Loading /></td></tr>
                )}
              </tbody>
            </table>
          </div>

          <nav className="pagination is-centered" role="navigation" aria-label="pagination" style={{ marginTop: '1rem' }}>
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
        </div>
      </div>
      {dropdownPos && (
        <div style={{
          position: 'fixed', top: dropdownPos.top, left: dropdownPos.left, zIndex: 100,
          background: '#fff', borderRadius: 8, boxShadow: '0 4px 16px rgba(0,0,0,0.15)',
          minWidth: 180, padding: '0.25rem 0',
        }}>
          <Link to={`/admin/exam/detail/${dropdownPos.exam.uid}`} style={{
            display: 'block', padding: '0.5rem 1rem', fontSize: '0.85rem',
            color: '#222', textDecoration: 'none',
          }}>
            <i className="fas fa-eye" style={{ width: 18 }} /> Visualizar
          </Link>
          <button
            onClick={() => openBlockModal(dropdownPos.exam)}
            style={{
              display: 'block', width: '100%', textAlign: 'left',
              padding: '0.5rem 1rem', fontSize: '0.85rem',
              color: '#D32F2F', border: 'none', background: 'transparent', cursor: 'pointer',
            }}
          >
            <i className="fas fa-ban" style={{ width: 18 }} /> Bloquear colaborador
          </button>
        </div>
      )}
      {blockModal && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 1000,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          background: 'rgba(0,0,0,0.5)', padding: 16,
        }} onClick={closeBlockModal}>
          <div style={{
            background: '#fff', borderRadius: 16, padding: 32,
            maxWidth: 480, width: '100%', maxHeight: '90vh', overflowY: 'auto',
          }} onClick={(e) => e.stopPropagation()}>
            <h2 style={{ fontSize: '1.1rem', fontWeight: 700, color: '#D32F2F', margin: '0 0 4px' }}>
              Bloquear Colaborador
            </h2>
            <p style={{ fontSize: '0.85rem', color: '#888', margin: '0 0 16px' }}>
              {blockModal.name} — {formatCPF(blockModal.cpf || '')}
            </p>

            <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: 6, color: '#444' }}>
              Motivo do bloqueio
            </label>
            <textarea
              className="textarea"
              rows={4}
              placeholder="Descreva o motivo do bloqueio..."
              value={blockReason}
              onChange={(e) => setBlockReason(e.target.value)}
              style={{ marginBottom: 16, resize: 'vertical' }}
            />

            <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: 6, color: '#444' }}>
              Assinatura do administrador
            </label>
            <div style={{
              border: '2px dashed #ccc', borderRadius: 8, overflow: 'hidden', marginBottom: 20,
            }}>
              <SignatureCanvas
                ref={sigRef}
                penColor="#000"
                canvasProps={{
                  width: 600, height: 150,
                  style: { width: '100%', height: 150, cursor: 'crosshair' },
                }}
              />
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12 }}>
              <button
                className="button"
                onClick={closeBlockModal}
                disabled={savingBlock}
              >
                Cancelar
              </button>
              <button
                className="button"
                disabled={!blockReason.trim() || savingBlock}
                onClick={handleBlockConfirm}
                style={{ background: '#D32F2F', color: '#fff', border: 'none' }}
              >
                {savingBlock ? 'Salvando...' : 'Confirmar Bloqueio'}
              </button>
            </div>
          </div>
        </div>
      )}
    </AdminLayout>
  );
}
