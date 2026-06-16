import React, { useMemo, useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts';
import { useExamStats, useRecentExams } from '../../../hooks';
import AdminLayout from '../../../components/ui/AdminLayout';
import Loading from '../../../components/ui/Loading';
import { formatCPF } from '../../../utils/cpf';

const COLORS = ['#D40511', '#FFCC00', '#D9D9D9', '#222222'];

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

function statColor(label) {
  if (label === 'approved' || label === 'Aprovados') return '#28A745';
  if (label === 'reproved' || label === 'Reprovados') return '#D32F2F';
  return '#222';
}

export default function AdminDashboard() {
  const { data: stats, isLoading: statsLoading } = useExamStats();
  const { data: exams, isLoading: examsLoading } = useRecentExams(20);

  const [cityFilter, setCityFilter] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

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

  const filteredExams = useMemo(() => {
    if (!exams) return [];
    return exams.filter((e) => {
      if (cityFilter && e.city !== cityFilter) return false;
      if (typeFilter && e.operationType !== typeFilter) return false;
      if (statusFilter && e.status !== statusFilter) return false;
      return true;
    });
  }, [exams, cityFilter, typeFilter, statusFilter]);

  const cities = useMemo(() => {
    if (!exams) return [];
    return [...new Set(exams.map((e) => e.city))];
  }, [exams]);

  const types = useMemo(() => {
    if (!exams) return [];
    return [...new Set(exams.map((e) => e.operationType))];
  }, [exams]);

  const pieData = useMemo(() => [
    { name: 'Aprovados', value: stats?.approved || 0 },
    { name: 'Reprovados', value: stats?.reproved || 0 },
  ], [stats]);

  const kpis = useMemo(() => [
    { label: 'Total Provas', value: stats?.total || 0, color: '#222' },
    { label: 'Aprovados', value: stats?.approved || 0, color: '#28A745' },
    { label: 'Reprovados', value: stats?.reproved || 0, color: '#D32F2F' },
    { label: 'Taxa Aprovação', value: stats?.approvalRate || 0, suffix: '%', color: '#D40511' },
  ], [stats]);

  if (statsLoading || examsLoading) return <AdminLayout><Loading fullPage /></AdminLayout>;

  return (
    <AdminLayout>
      <div className="fade-in">
        <div style={{ marginBottom: '1.5rem' }}>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 700, margin: 0 }}>Dashboard</h1>
          <p style={{ fontSize: '0.85rem', color: '#888', margin: '4px 0 0' }}>Visão geral dos treinamentos</p>
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
                  <YAxis tick={{ fontSize: 12 }} />
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
                  <Pie data={pieData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}>
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
            <h3 style={{ fontSize: '0.9rem', fontWeight: 700, margin: 0, color: '#444' }}>Últimas Provas</h3>
            <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
              <select className="select-dhl" style={{ width: 'auto', padding: '0.4rem 0.75rem', fontSize: '0.8rem' }} value={cityFilter} onChange={(e) => setCityFilter(e.target.value)}>
                <option value="">Todas cidades</option>
                {cities.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
              <select className="select-dhl" style={{ width: 'auto', padding: '0.4rem 0.75rem', fontSize: '0.8rem' }} value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)}>
                <option value="">Todos tipos</option>
                {types.map((t) => <option key={t} value={t}>{t}</option>)}
              </select>
              <select className="select-dhl" style={{ width: 'auto', padding: '0.4rem 0.75rem', fontSize: '0.8rem' }} value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
                <option value="">Todos status</option>
                <option value="approved">Aprovado</option>
                <option value="reproved">Reprovado</option>
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
                  <th>Status</th>
                  <th>Data</th>
                  <th>Ações</th>
                </tr>
              </thead>
              <tbody>
                {filteredExams.slice(0, 20).map((exam) => (
                  <tr key={exam.id} className="hover-card" style={{ cursor: 'default' }}>
                    <td data-label="Nome">{exam.name}</td>
                    <td data-label="CPF">{formatCPF(exam.cpf || '')}</td>
                    <td data-label="Cidade">{exam.city}</td>
                    <td data-label="Tipo">{exam.operationType}</td>
                    <td data-label="Nota">{exam.score}</td>
                    <td data-label="Status">
                      <span style={{
                        display: 'inline-block',
                        padding: '2px 10px',
                        borderRadius: 12,
                        fontSize: '0.75rem',
                        fontWeight: 600,
                        background: exam.status === 'approved' ? '#E8F5E9' : '#FFEBEE',
                        color: exam.status === 'approved' ? '#28A745' : '#D32F2F',
                      }}>
                        {exam.status === 'approved' ? 'Aprovado' : 'Reprovado'}
                      </span>
                    </td>
                    <td data-label="Data">{exam.createdAt ? new Date(exam.createdAt).toLocaleDateString('pt-BR') : '-'}</td>
                    <td data-label="Ações">
                      <Link to={`/admin/exam/${exam.id}`} className="btn-dhl" style={{ padding: '0.3rem 1rem', fontSize: '0.78rem' }}>
                        Visualizar
                      </Link>
                    </td>
                  </tr>
                ))}
                {filteredExams.length === 0 && (
                  <tr><td colSpan={8} style={{ textAlign: 'center', color: '#888', padding: '2rem' }}>Nenhuma prova encontrada</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}
