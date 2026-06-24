import React, { useMemo, useState, useCallback, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts';
import { useQueryClient } from '@tanstack/react-query';
import { useExamStats, useLatestExams } from '../../../hooks';
import { examService } from '../../../services';
import Loading from '../../../components/ui/Loading';
import { formatCPF } from '../../../utils';
import CITIES from '../../../constants/cities';
import './Dashboard.scss';

const MONTHS_PT = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];

const COLORS = ['#D40511', '#FFCC00', '#28A745', '#37474F'];

const statusConfig = {
  approved: { cls: 'is-approved', label: 'Aprovado' },
  blocked: { cls: 'is-blocked', label: 'Bloqueado' },
};

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
  const [exportModal, setExportModal] = useState(false);
  const [exportDateStart, setExportDateStart] = useState('');
  const [exportDateEnd, setExportDateEnd] = useState('');
  const [blockModal, setBlockModal] = useState(null);
  const [unblockModal, setUnblockModal] = useState(null);
  const [blockReason, setBlockReason] = useState('');
  const [savingBlock, setSavingBlock] = useState(false);

  const { data, isLoading: examsLoading } = useLatestExams(appliedFilters, cursor);

  useEffect(() => {
    if (!dropdownPos && !exportModal) return undefined;
    const handler = () => { setDropdownPos(null); setExportModal(false); };
    document.addEventListener('click', handler);
    return () => document.removeEventListener('click', handler);
  }, [dropdownPos, exportModal]);

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
    { label: 'Total Pessoas', value: stats?.totalPeople ?? 0, color: '#1a1a2e', icon: 'fa-users', iconClass: 'icon-dhl' },
    { label: 'Aprovados', value: stats?.approvedPeople ?? 0, color: '#28A745', icon: 'fa-check-circle', iconClass: 'icon-success' },
    { label: 'Reprovados', value: stats?.reprovedPeople ?? 0, color: '#D32F2F', icon: 'fa-times-circle', iconClass: 'icon-danger' },
    { label: 'Bloqueados', value: stats?.blockedPeople ?? 0, color: '#E65100', icon: 'fa-ban', iconClass: 'icon-blocked' },
  ], [stats]);

  const handleBlockConfirm = useCallback(async () => {
    if (!blockModal || !blockReason.trim()) return;
    setSavingBlock(true);
    try {
      await examService.blockUser(blockModal.cpf, {
        blockedBy: 'Liderança DHL',
        blockReason: blockReason.trim(),
      });
      await examService.recalculateAggregation();
      queryClient.invalidateQueries({ queryKey: ['latestExams'] });
      queryClient.invalidateQueries({ queryKey: ['examAggregation'] });
      setBlockModal(null);
      setBlockReason('');
    } catch (err) {
      alert(`Erro ao bloquear: ${err.message}`);
    } finally {
      setSavingBlock(false);
    }
  }, [blockModal, blockReason, queryClient]);

  const handleUnblockConfirm = useCallback(async () => {
    if (!unblockModal) return;
    setSavingBlock(true);
    try {
      await examService.unblockUser(unblockModal.cpf);
      await examService.recalculateAggregation();
      queryClient.invalidateQueries({ queryKey: ['latestExams'] });
      queryClient.invalidateQueries({ queryKey: ['examAggregation'] });
      setUnblockModal(null);
    } catch (err) {
      alert(`Erro ao desbloquear: ${err.message}`);
    } finally {
      setSavingBlock(false);
    }
  }, [unblockModal, queryClient]);

  const handleExport = useCallback(async (format) => {
    setExportModal(false);
    try {
      const XLSX = await import('xlsx');
      const filters = { ...appliedFilters };
      if (exportDateStart) filters.dateStart = exportDateStart;
      if (exportDateEnd) filters.dateEnd = exportDateEnd;
      const res = await examService.exportExams(filters);
      const rows = (res.data || []).map((exam) => ({
        Nome: exam.name || '',
        CPF: exam.cpf || '',
        Cidade: exam.city || '',
        'Tipo (Operação)': exam.operationType || '',
        Nota: exam.percentage != null ? (exam.percentage / 10).toFixed(1) : '',
        Status: statusConfig[exam.status]?.label || exam.status || '',
        Tentativas: exam.attempts || 1,
        Data: exam.createdAt ? new Date(exam.createdAt).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' }) : '',
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
  }, [appliedFilters, exportDateStart, exportDateEnd]);

  const handleRowDropdown = useCallback((e) => {
    e.stopPropagation();
    const id = e.currentTarget.dataset.eid;
    const exam = pageData.find((x) => x.id === id);
    if (!exam) return;
    const rect = e.currentTarget.getBoundingClientRect();
    setDropdownPos({ top: rect.bottom + 4, left: rect.right - 180, exam });
  }, [pageData]);

  const statusClass = useCallback((status) => {
    return statusConfig[status] || { cls: 'is-reproved', label: 'Reprovado' };
  }, []);

  const handleModalCardClick = useCallback((e) => e.stopPropagation(), []);

  if (statsLoading && !stats) return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '60vh' }}>
      <Loading />
    </div>
  );

  return (
    <>
    <div className="dashboard-page fade-in">
        <div className="dashboard-header">
          <div className="dashboard-header-info">
            <h1>Dashboard</h1>
            <div className="dashboard-header-sub">
              <span>Visão geral dos treinamentos</span>
              <span className="dashboard-header-badge">Admin</span>
            </div>
          </div>
          <div className="dashboard-header-actions">
            <div style={{ position: 'relative' }}>
              <button className="btn-dhl is-small is-ghost" onClick={() => setExportModal(true)}>
                <span className="icon is-small"><i className="fas fa-download" /></span>
                <span>Exportar</span>
              </button>
            </div>
          </div>
        </div>

        <div className="dashboard-kpi-grid">
          {kpis.map((kpi, i) => (
            <div key={kpi.label} className="dashboard-kpi-column fade-in-up" style={{ animationDelay: `${i * 100}ms` }}>
              <div className="dashboard-kpi-card">
                <div className={`kpi-icon ${kpi.iconClass}`}>
                  <i className={`fas ${kpi.icon}`} />
                </div>
                <div className="kpi-info">
                  <div className="kpi-label">{kpi.label}</div>
                  <div className="kpi-value" style={{ color: kpi.color }}>{kpi.value}{kpi.suffix || ''}</div>
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="dashboard-charts-row">
          <div className="dashboard-chart-col is-half">
            <div className="dashboard-chart-card">
              <h3 className="chart-title">Provas por Mês</h3>
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
          <div className="dashboard-chart-col is-quarter">
            <div className="dashboard-chart-card">
              <h3 className="chart-title">Aprovados x Reprovados</h3>
              <div style={{ position: 'relative' }}>
                <ResponsiveContainer width="100%" height={250}>
                  <PieChart>
                    <Pie data={pieData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={85} innerRadius={60}>
                      <Cell fill="#28A745" />
                      <Cell fill="#D32F2F" />
                    </Pie>
                    <Tooltip />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
                <div style={{
                  position: 'absolute', top: '42%', left: '50%', transform: 'translate(-50%, -50%)',
                  textAlign: 'center', pointerEvents: 'none', width: '100%',
                }}>
                  <div style={{ fontSize: 26, fontWeight: 800, color: '#D40511', lineHeight: 1.1 }}>{stats?.approvalRate ?? 0}%</div>
                  <div style={{ fontSize: 10, color: '#999', fontWeight: 600, letterSpacing: '0.08em', marginTop: 2 }}>APROVAÇÃO</div>
                </div>
              </div>
            </div>
          </div>
          <div className="dashboard-chart-col is-quarter">
            <div className="dashboard-chart-card">
              <h3 className="chart-title">Empresa Diarista</h3>
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

        <div className="dashboard-table-card">
          <div className="dashboard-table-header">
            <h3 className="dashboard-table-title">
              Histórico de Provas
              <span className="has-text-grey is-size-7 ml-2">({stats?.total ?? 0} total)</span>
            </h3>
            <div className="dashboard-filters">
              <input
                type="text"
                className="filter-input"
                placeholder="Buscar nome..."
                value={nameFilter}
                onChange={(e) => setNameFilter(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') applyFilters(); }}
              />
              <select className="filter-select" value={cityFilter} onChange={(e) => setCityFilter(e.target.value)}>
                <option value="">Todas cidades</option>
                {CITIES.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
              <select className="filter-select" value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)}>
                <option value="">Todos tipos</option>
                <option value="TSI">TSI</option>
                <option value="Polly">Polly</option>
              </select>
              <select className="filter-select" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
                <option value="">Todos status</option>
                <option value="approved">Aprovado</option>
                <option value="reproved">Reprovado</option>
                <option value="blocked">Bloqueado</option>
              </select>
              {Object.keys(appliedFilters).length > 0 && (
                <button className="btn-dhl is-small is-ghost" onClick={clearFilters}>
                  <i className="fas fa-times" /> Limpar
                </button>
              )}
              <button className="btn-dhl is-small" onClick={applyFilters}>
                <i className="fas fa-search" />
              </button>
            </div>
          </div>

          <div className="dashboard-table-wrapper">
            <table className="dashboard-table">
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
                {!examsLoading && pageData.map((exam) => {
                  const sc = statusClass(exam.status);
                  return (
                    <tr key={exam.id}>
                      <td data-label="Nome">{exam.name}</td>
                      <td data-label="CPF">{formatCPF(exam.cpf || '')}</td>
                      <td data-label="Cidade">{exam.city}</td>
                      <td data-label="Tipo">{exam.operationType}</td>
                      <td data-label="Nota">{(exam.percentage / 10).toFixed(1)}</td>
                      <td data-label="Tentativas">{exam.attempts || 1}ª</td>
                      <td data-label="Status">
                        <span className={`status-badge ${sc.cls}`}>{sc.label}</span>
                      </td>
                      <td data-label="Data">{exam.createdAt ? new Date(exam.createdAt).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' }) : '-'}</td>
                      <td data-label="Ações">
                        <button
                          className="button is-small is-light"
                          data-eid={exam.id}
                          onClick={handleRowDropdown}
                          style={{ border: 'none', background: 'transparent', cursor: 'pointer', fontSize: '1.1rem', lineHeight: 1 }}
                        >
                          &#8942;
                        </button>
                      </td>
                    </tr>
                  );
                })}
                {examsLoading && (
                  <tr><td colSpan={9} style={{ textAlign: 'center', padding: '2rem' }}><Loading /></td></tr>
                )}
                {!examsLoading && pageData.length === 0 && (
                  <tr><td colSpan={9} style={{ textAlign: 'center', color: '#888', padding: '2rem' }}>Nenhuma prova encontrada</td></tr>
                )}
              </tbody>
            </table>
          </div>

          <div className="dashboard-pagination">
            <button className="btn-dhl is-small is-outline" disabled={cursorStack.length === 0} onClick={prevPage}>Anterior</button>
            <button className="btn-dhl is-small is-outline" disabled={!data?.hasMore} onClick={nextPage}>Próximo</button>
          </div>
        </div>
      </div>

      {exportModal && (
        <div className="dashboard-modal-overlay full-bleed" onClick={() => { setExportModal(false); setExportDateStart(''); setExportDateEnd(''); }}>
          <div className="dashboard-modal is-sm" onClick={(e) => e.stopPropagation()}>
            <h2 style={{ fontSize: '1.1rem', fontWeight: 700, margin: '0 0 4px' }}>Exportar Dados</h2>
            <p style={{ fontSize: '0.85rem', color: '#888', margin: '0 0 20px' }}>Selecione o período para exportar</p>
            <div style={{ display: 'flex', gap: 12, marginBottom: 20 }}>
              <div style={{ flex: 1 }}>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, marginBottom: 4, color: '#555' }}>Data inicial</label>
                <input type="date" className="filter-input" style={{ width: '100%' }} value={exportDateStart} onChange={(e) => setExportDateStart(e.target.value)} />
              </div>
              <div style={{ flex: 1 }}>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, marginBottom: 4, color: '#555' }}>Data final</label>
                <input type="date" className="filter-input" style={{ width: '100%' }} value={exportDateEnd} onChange={(e) => setExportDateEnd(e.target.value)} />
              </div>
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12 }}>
              <button className="btn-dhl is-outline" onClick={() => { setExportModal(false); setExportDateStart(''); setExportDateEnd(''); }}>Cancelar</button>
              <button className="btn-dhl is-success" onClick={() => handleExport('xlsx')}>
                <i className="fas fa-file-excel" /> Excel
              </button>
              <button className="btn-dhl" style={{ background: '#1565C0' }} onClick={() => handleExport('csv')}>
                <i className="fas fa-file-csv" /> CSV
              </button>
            </div>
          </div>
        </div>
      )}

      {dropdownPos && (
        <div className="dashboard-row-dropdown" style={{ top: dropdownPos.top, left: dropdownPos.left }}>
          <Link to={`/admin/exam/detail/${dropdownPos.exam.uid}`} className="dropdown-item">
            <i className="fas fa-eye" /> Visualizar
          </Link>
          {dropdownPos.exam.status === 'blocked' ? (
            <button
              className="dropdown-item"
              onClick={() => { setUnblockModal(dropdownPos.exam); setDropdownPos(null); }}
              style={{ color: '#28A745' }}
            >
              <i className="fas fa-lock-open" /> Desbloquear
            </button>
          ) : (
            <button
              className="dropdown-item"
              onClick={() => { setBlockModal(dropdownPos.exam); setDropdownPos(null); }}
              style={{ color: '#D32F2F' }}
            >
              <i className="fas fa-ban" /> Bloquear
            </button>
          )}
        </div>
      )}

      {blockModal && (
        <div className="dashboard-modal-overlay full-bleed" onClick={() => { setBlockModal(null); setBlockReason(''); }}>
          <div className="dashboard-modal is-md" onClick={handleModalCardClick}>
            <h2 style={{ fontSize: '1.1rem', fontWeight: 700, color: '#D32F2F', margin: '0 0 4px' }}>Bloquear Colaborador</h2>
            <p style={{ fontSize: '0.85rem', color: '#888', margin: '0 0 16px' }}>{blockModal.name} — {formatCPF(blockModal.cpf || '')} — {blockModal.operationType}</p>
            <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: 6, color: '#444' }}>Motivo do bloqueio</label>
            <textarea className="textarea" rows={4} placeholder="Descreva o motivo..." value={blockReason} onChange={(e) => setBlockReason(e.target.value)} style={{ marginBottom: 16, resize: 'vertical' }} />
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12 }}>
              <button className="btn-dhl is-outline" onClick={() => { setBlockModal(null); setBlockReason(''); }} disabled={savingBlock}>Cancelar</button>
              <button className="btn-dhl is-danger" disabled={!blockReason.trim() || savingBlock} onClick={handleBlockConfirm}>
                {savingBlock ? 'Salvando...' : 'Confirmar Bloqueio'}
              </button>
            </div>
          </div>
        </div>
      )}

      {unblockModal && (
        <div className="dashboard-modal-overlay full-bleed" onClick={() => setUnblockModal(null)}>
          <div className="dashboard-modal is-sm" onClick={handleModalCardClick}>
            <h2 style={{ fontSize: '1.1rem', fontWeight: 700, color: '#28A745', margin: '0 0 4px' }}>Desbloquear Colaborador</h2>
            <p style={{ fontSize: '0.85rem', color: '#888', margin: '0 0 16px' }}>{unblockModal.name} — {formatCPF(unblockModal.cpf || '')} — {unblockModal.operationType}</p>
            <p style={{ fontSize: '0.85rem', color: '#555', marginBottom: 20 }}>Tem certeza que deseja desbloquear este colaborador?</p>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12 }}>
              <button className="btn-dhl is-outline" onClick={() => setUnblockModal(null)} disabled={savingBlock}>Cancelar</button>
              <button className="btn-dhl is-success" disabled={savingBlock} onClick={handleUnblockConfirm}>
                {savingBlock ? 'Salvando...' : 'Confirmar Desbloqueio'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
