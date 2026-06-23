import React, { useMemo, useState, useCallback, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts';
import { useQueryClient } from '@tanstack/react-query';
import * as XLSX from 'xlsx';
import { useExamStats, useLatestExams } from '../../../hooks';
import { examService } from '../../../services';
import AdminLayout from '../../../components/ui/AdminLayout';
import Loading from '../../../components/ui/Loading';
import { formatCPF } from '../../../utils';
import CITIES from '../../../constants/cities';

const MONTHS_PT = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];

const COLORS = ['#D40511', '#FFCC00', '#28A745', '#37474F'];

export default function AdminDashboard() {
  const { data: stats, isLoading: statsLoading } = useExamStats();
  const queryClient = useQueryClient();

  const [nameFilter, setNameFilter] = useState('');
  const [cityFilter, setCityFilter] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [appliedFilters, setAppliedFilters] = useState({});
  const [cursorStack, setCursorStack] = useState([]);
  const [cursor, setCursor] = useState(null);

  const [dropdownPos, setDropdownPos] = useState(null);
  const [exportOpen, setExportOpen] = useState(false);
  const [blockModal, setBlockModal] = useState(null);
  const [unblockModal, setUnblockModal] = useState(null);
  const [blockReason, setBlockReason] = useState('');
  const [savingBlock, setSavingBlock] = useState(false);

  const { data, isLoading: examsLoading } = useLatestExams(appliedFilters, cursor);

  useEffect(() => {
    if (!dropdownPos && !exportOpen) return undefined;
    const handler = () => { setDropdownPos(null); setExportOpen(false); };
    document.addEventListener('click', handler);
    return () => document.removeEventListener('click', handler);
  }, [dropdownPos, exportOpen]);

  const applyFilters = useCallback(() => {
    const next = {};
    if (nameFilter.trim()) next.name = nameFilter.trim().toUpperCase();
    if (cityFilter) next.city = cityFilter;
    if (typeFilter) next.operationType = typeFilter;
    if (statusFilter) next.status = statusFilter;
    setAppliedFilters(next);
    setCursorStack([]);
    setCursor(null);
  }, [nameFilter, cityFilter, typeFilter, statusFilter]);

  const clearFilters = useCallback(() => {
    setNameFilter('');
    setCityFilter('');
    setTypeFilter('');
    setStatusFilter('');
    setAppliedFilters({});
    setCursorStack([]);
    setCursor(null);
  }, []);

  const nextPage = useCallback(() => {
    if (data?.hasMore && data?.lastCursor) {
      setCursorStack((prev) => [...prev, cursor]);
      setCursor(data.lastCursor);
    }
  }, [data, cursor]);

  const prevPage = useCallback(() => {
    if (cursorStack.length > 0) {
      const prev = cursorStack[cursorStack.length - 1];
      setCursorStack((s) => s.slice(0, -1));
      setCursor(prev);
    }
  }, [cursorStack]);

  const pageData = data?.data || [];

  const monthlyData = useMemo(() => {
    if (!stats?.monthlyCounts) return [];
    return Object.entries(stats.monthlyCounts)
      .map(([month, count]) => {
        const monthNum = parseInt(month.split('-')[1], 10) - 1;
        return { month: MONTHS_PT[monthNum] || month, count };
      })
      .sort((a, b) => MONTHS_PT.indexOf(a.month) - MONTHS_PT.indexOf(b.month));
  }, [stats]);

  const operationData = useMemo(() => {
    if (!stats?.typeCounts) return [];
    return Object.entries(stats.typeCounts).map(([name, value]) => ({ name, value }));
  }, [stats]);

  const pieData = useMemo(() => [
    { name: 'Aprovados', value: stats?.approvedPeople ?? 0 },
    { name: 'Reprovados', value: stats?.reprovedPeople ?? 0 },
  ], [stats]);

  const kpis = useMemo(() => [
    { label: 'Total Pessoas', value: stats?.totalPeople ?? 0, color: '#222' },
    { label: 'Aprovados', value: stats?.approvedPeople ?? 0, color: '#28A745' },
    { label: 'Reprovados', value: stats?.reprovedPeople ?? 0, color: '#D32F2F' },
    { label: 'Taxa Aprovação', value: stats?.approvalRate ?? 0, suffix: '%', color: '#D40511' },
  ], [stats]);

  const statusConfig = {
    approved: { bg: '#E8F5E9', color: '#28A745', label: 'Aprovado' },
    blocked: { bg: '#FFF3E0', color: '#E65100', label: 'Bloqueado' },
  };

  const handleBlockConfirm = async () => {
    if (!blockModal || !blockReason.trim()) return;
    setSavingBlock(true);
    try {
      await examService.blockUser(blockModal.cpf, {
        blockedBy: 'Liderança DHL',
        blockReason: blockReason.trim(),
      });
      queryClient.invalidateQueries({ queryKey: ['latestExams'] });
      queryClient.invalidateQueries({ queryKey: ['examAggregation'] });
      setBlockModal(null);
      setBlockReason('');
    } catch (err) {
      alert(`Erro ao bloquear: ${err.message}`);
    } finally {
      setSavingBlock(false);
    }
  };

  const handleUnblockConfirm = async () => {
    if (!unblockModal) return;
    setSavingBlock(true);
    try {
      await examService.unblockUser(unblockModal.cpf);
      queryClient.invalidateQueries({ queryKey: ['latestExams'] });
      queryClient.invalidateQueries({ queryKey: ['examAggregation'] });
      setUnblockModal(null);
    } catch (err) {
      alert(`Erro ao desbloquear: ${err.message}`);
    } finally {
      setSavingBlock(false);
    }
  };

  const handleExport = async (format) => {
    setExportOpen(false);
    try {
      const res = await examService.exportExams(appliedFilters);
      const rows = (res.data || []).map((exam) => ({
        Nome: exam.name || '',
        CPF: exam.cpf || '',
        Cidade: exam.city || '',
        'Tipo (Operação)': exam.operationType || '',
        Nota: exam.percentage != null ? (exam.percentage / 10).toFixed(1) : '',
        Status: statusConfig[exam.status]?.label || exam.status || '',
        Tentativas: exam.attempts || 1,
        Data: exam.createdAt ? new Date(exam.createdAt).toLocaleDateString('pt-BR') : '',
      }));

      const wb = XLSX.utils.book_new();
      const ws = XLSX.utils.json_to_sheet(rows);

      if (format === 'csv') {
        const csv = XLSX.utils.sheet_to_csv(ws);
        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `exames_${new Date().toISOString().slice(0, 10)}.csv`;
        a.click();
        URL.revokeObjectURL(url);
      } else {
        XLSX.utils.book_append_sheet(wb, ws, 'Exames');
        XLSX.writeFile(wb, `exames_${new Date().toISOString().slice(0, 10)}.xlsx`);
      }
    } catch (err) {
      alert('Erro ao exportar. Tente novamente.');
    }
  };

  const handleRecalculate = async () => {
    try {
      await examService.recalculateAggregation();
      queryClient.invalidateQueries({ queryKey: ['examAggregation'] });
    } catch (err) {
      // Erro silenciado — aggregation pode estar desatualizada
    }
  };

  if (statsLoading && !stats) return <AdminLayout><Loading fullPage /></AdminLayout>;

  return (
    <AdminLayout>
      <div className="fade-in">
        <div style={{ marginBottom: '1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h1 style={{ fontSize: '1.5rem', fontWeight: 700, margin: 0 }}>Dashboard</h1>
            <p style={{ fontSize: '0.85rem', color: '#888', margin: '4px 0 0' }}>Visão geral dos treinamentos</p>
          </div>
          <div style={{ position: 'relative' }}>
            <button className="button is-small is-light" onClick={() => setExportOpen((o) => !o)}>
              <span className="icon is-small"><i className="fas fa-download" /></span>
              <span>Exportar</span>
            </button>
            {exportOpen && (
              <div style={{
                position: 'absolute', top: '100%', right: 0, zIndex: 100,
                background: '#fff', borderRadius: 8, boxShadow: '0 4px 16px rgba(0,0,0,0.15)',
                minWidth: 140, padding: '0.25rem 0', marginTop: 4,
              }}>
                <button onClick={() => handleExport('xlsx')} style={{
                  display: 'block', width: '100%', textAlign: 'left', padding: '0.5rem 1rem',
                  fontSize: '0.85rem', color: '#222', border: 'none', background: 'transparent', cursor: 'pointer',
                }}>
                  <i className="fas fa-file-excel" style={{ width: 18, color: '#28A745' }} /> Excel (.xlsx)
                </button>
                <button onClick={() => handleExport('csv')} style={{
                  display: 'block', width: '100%', textAlign: 'left', padding: '0.5rem 1rem',
                  fontSize: '0.85rem', color: '#222', border: 'none', background: 'transparent', cursor: 'pointer',
                }}>
                  <i className="fas fa-file-csv" style={{ width: 18, color: '#1565C0' }} /> CSV (.csv)
                </button>
              </div>
            )}
          </div>
          <button className="button is-small is-light" onClick={handleRecalculate}>
            <span className="icon is-small"><i className="fas fa-sync-alt" /></span>
            <span>Recalcular</span>
          </button>
        </div>

        {/* KPIs */}
        <div className="columns is-multiline" style={{ marginBottom: '1.5rem' }}>
          {kpis.map((kpi, i) => (
            <div key={kpi.label} className="column is-3 fade-in-up" style={{ animationDelay: `${i * 100}ms` }}>
              <div className="kpi-card">
                <div className="kpi-label">{kpi.label}</div>
                <div className="kpi-value" style={{ color: kpi.color }}>{kpi.value}{kpi.suffix || ''}</div>
              </div>
            </div>
          ))}
        </div>

        {/* Charts */}
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

        {/* Table */}
        <div className="kpi-card" style={{ padding: '1.5rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem', flexWrap: 'wrap', gap: '0.5rem' }}>
            <h3 style={{ fontSize: '0.9rem', fontWeight: 700, margin: 0, color: '#444' }}>
              Histórico de Provas
              <span className="has-text-grey is-size-7 ml-2">({stats?.total ?? 0} total)</span>
            </h3>
            <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', alignItems: 'center' }}>
              <input
                type="text"
                className="input-dhl"
                placeholder="Buscar nome..."
                value={nameFilter}
                onChange={(e) => setNameFilter(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') applyFilters(); }}
                style={{ width: 180, padding: '0.4rem 0.75rem', fontSize: '0.8rem' }}
              />
              <select className="select-dhl" style={{ width: 'auto', padding: '0.4rem 0.75rem', fontSize: '0.8rem' }} value={cityFilter} onChange={(e) => setCityFilter(e.target.value)}>
                <option value="">Todas cidades</option>
                {CITIES.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
              <select className="select-dhl" style={{ width: 'auto', padding: '0.4rem 0.75rem', fontSize: '0.8rem' }} value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)}>
                <option value="">Todos tipos</option>
                <option value="TSI">TSI</option>
                <option value="Polly">Polly</option>
              </select>
              <select className="select-dhl" style={{ width: 'auto', padding: '0.4rem 0.75rem', fontSize: '0.8rem' }} value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
                <option value="">Todos status</option>
                <option value="approved">Aprovado</option>
                <option value="reproved">Reprovado</option>
                <option value="blocked">Bloqueado</option>
              </select>
              {Object.keys(appliedFilters).length > 0 && (
                <button className="button is-small is-light" onClick={clearFilters}>
                  <i className="fas fa-times" /> Limpar
                </button>
              )}
              <button className="button is-small" onClick={applyFilters} style={{ background: '#D40511', color: '#fff', border: 'none' }}>
                <i className="fas fa-search" />
              </button>
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
                  <tr key={exam.id}>
                    <td data-label="Nome">{exam.name}</td>
                    <td data-label="CPF">{formatCPF(exam.cpf || '')}</td>
                    <td data-label="Cidade">{exam.city}</td>
                    <td data-label="Tipo">{exam.operationType}</td>
                    <td data-label="Nota">{(exam.percentage / 10).toFixed(1)}</td>
                    <td data-label="Tentativas">{exam.attempts || 1}ª</td>
                    <td data-label="Status">
                      {(() => {
                        const cfg = statusConfig[exam.status] || { bg: '#FFEBEE', color: '#D32F2F', label: 'Reprovado' };
                        return (
                          <span style={{
                            display: 'inline-block', padding: '2px 10px', borderRadius: 12,
                            fontSize: '0.75rem', fontWeight: 600, background: cfg.bg, color: cfg.color,
                          }}>
                            {cfg.label}
                          </span>
                        );
                      })()}
                    </td>
                    <td data-label="Data">{exam.createdAt ? new Date(exam.createdAt).toLocaleDateString('pt-BR') : '-'}</td>
                    <td data-label="Ações">
                      <button className="button is-small is-light" onClick={(e) => { e.stopPropagation(); const rect = e.currentTarget.getBoundingClientRect(); setDropdownPos({ top: rect.bottom + 4, left: rect.right - 180, exam }); }} style={{ border: 'none', background: 'transparent', cursor: 'pointer', fontSize: '1.1rem', lineHeight: 1 }}>
                        &#8942;
                      </button>
                    </td>
                  </tr>
                ))}
                {examsLoading && (
                  <tr><td colSpan={9} style={{ textAlign: 'center', padding: '2rem' }}><Loading /></td></tr>
                )}
                {!examsLoading && pageData.length === 0 && (
                  <tr><td colSpan={9} style={{ textAlign: 'center', color: '#888', padding: '2rem' }}>Nenhuma prova encontrada</td></tr>
                )}
              </tbody>
            </table>
          </div>

          <nav className="pagination is-centered" role="navigation" style={{ marginTop: '1rem' }}>
            <button className="button is-small" disabled={cursorStack.length === 0} onClick={prevPage}>Anterior</button>
            <button className="button is-small" disabled={!data?.hasMore} onClick={nextPage}>Próximo</button>
          </nav>
        </div>
      </div>

      {/* Dropdown */}
      {dropdownPos && (
        <div style={{ position: 'fixed', top: dropdownPos.top, left: dropdownPos.left, zIndex: 100, background: '#fff', borderRadius: 8, boxShadow: '0 4px 16px rgba(0,0,0,0.15)', minWidth: 180, padding: '0.25rem 0' }}>
          <Link to={`/admin/exam/detail/${dropdownPos.exam.uid}`} style={{ display: 'block', padding: '0.5rem 1rem', fontSize: '0.85rem', color: '#222', textDecoration: 'none' }}>
            <i className="fas fa-eye" style={{ width: 18 }} /> Visualizar
          </Link>
          {dropdownPos.exam.status === 'blocked' ? (
            <button onClick={() => { setUnblockModal(dropdownPos.exam); setDropdownPos(null); }} style={{ display: 'block', width: '100%', textAlign: 'left', padding: '0.5rem 1rem', fontSize: '0.85rem', color: '#28A745', border: 'none', background: 'transparent', cursor: 'pointer' }}>
              <i className="fas fa-lock-open" style={{ width: 18 }} /> Desbloquear
            </button>
          ) : (
            <button onClick={() => { setBlockModal(dropdownPos.exam); setDropdownPos(null); }} style={{ display: 'block', width: '100%', textAlign: 'left', padding: '0.5rem 1rem', fontSize: '0.85rem', color: '#D32F2F', border: 'none', background: 'transparent', cursor: 'pointer' }}>
              <i className="fas fa-ban" style={{ width: 18 }} /> Bloquear
            </button>
          )}
        </div>
      )}

      {/* Block Modal */}
      {blockModal && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.5)', padding: 16 }} onClick={() => { setBlockModal(null); setBlockReason(''); }}>
          <div style={{ background: '#fff', borderRadius: 16, padding: 32, maxWidth: 480, width: '100%', maxHeight: '90vh', overflowY: 'auto' }} onClick={(e) => e.stopPropagation()}>
            <h2 style={{ fontSize: '1.1rem', fontWeight: 700, color: '#D32F2F', margin: '0 0 4px' }}>Bloquear Colaborador</h2>
            <p style={{ fontSize: '0.85rem', color: '#888', margin: '0 0 16px' }}>{blockModal.name} — {formatCPF(blockModal.cpf || '')} — {blockModal.operationType}</p>
            <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: 6, color: '#444' }}>Motivo do bloqueio</label>
            <textarea className="textarea" rows={4} placeholder="Descreva o motivo..." value={blockReason} onChange={(e) => setBlockReason(e.target.value)} style={{ marginBottom: 16, resize: 'vertical' }} />
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12 }}>
              <button className="button" onClick={() => { setBlockModal(null); setBlockReason(''); }} disabled={savingBlock}>Cancelar</button>
              <button className="button" disabled={!blockReason.trim() || savingBlock} onClick={handleBlockConfirm} style={{ background: '#D32F2F', color: '#fff', border: 'none' }}>
                {savingBlock ? 'Salvando...' : 'Confirmar Bloqueio'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Unblock Modal */}
      {unblockModal && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.5)', padding: 16 }} onClick={() => setUnblockModal(null)}>
          <div style={{ background: '#fff', borderRadius: 16, padding: 32, maxWidth: 420, width: '100%' }} onClick={(e) => e.stopPropagation()}>
            <h2 style={{ fontSize: '1.1rem', fontWeight: 700, color: '#28A745', margin: '0 0 4px' }}>Desbloquear Colaborador</h2>
            <p style={{ fontSize: '0.85rem', color: '#888', margin: '0 0 16px' }}>{unblockModal.name} — {formatCPF(unblockModal.cpf || '')} — {unblockModal.operationType}</p>
            <p style={{ fontSize: '0.85rem', color: '#555', marginBottom: 20 }}>Tem certeza que deseja desbloquear este colaborador?</p>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12 }}>
              <button className="button" onClick={() => setUnblockModal(null)} disabled={savingBlock}>Cancelar</button>
              <button className="button" disabled={savingBlock} onClick={handleUnblockConfirm} style={{ background: '#28A745', color: '#fff', border: 'none' }}>
                {savingBlock ? 'Salvando...' : 'Confirmar Desbloqueio'}
              </button>
            </div>
          </div>
        </div>
      )}
    </AdminLayout>
  );
}
