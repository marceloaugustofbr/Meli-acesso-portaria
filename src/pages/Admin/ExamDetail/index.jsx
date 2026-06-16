import React from 'react';
import { useParams } from 'react-router-dom';
import { useExam } from '../../../hooks';
import AdminLayout from '../../../components/ui/AdminLayout';
import Loading from '../../../components/ui/Loading';
import { formatCPF } from '../../../utils/cpf';

export default function AdminExamDetail() {
  const { id } = useParams();
  const { data: exam, isLoading } = useExam(id);

  if (isLoading) return <AdminLayout><Loading fullPage /></AdminLayout>;
  if (!exam) return <AdminLayout><p>Prova não encontrada</p></AdminLayout>;

  const minutes = Math.floor((exam.duration || 0) / 60);
  const seconds = (exam.duration || 0) % 60;

  return (
    <AdminLayout>
      <h1 className="title is-4 mb-4">Detalhes da Prova</h1>

      <div className="columns">
        <div className="column is-6">
          <div className="box">
            <h2 className="title is-6 mb-3">Dados Pessoais</h2>
            <p><strong>Nome:</strong> {exam.name}</p>
            <p><strong>CPF:</strong> {formatCPF(exam.cpf || '')}</p>
            <p><strong>Cidade:</strong> {exam.city}</p>
            <p><strong>Tipo Operação:</strong> {exam.operationType}</p>
            <p><strong>Data:</strong> {exam.createdAt ? new Date(exam.createdAt).toLocaleString('pt-BR') : '-'}</p>
          </div>
        </div>
        <div className="column is-6">
          <div className="box">
            <h2 className="title is-6 mb-3">Resultado</h2>
            <p><strong>Acertos:</strong> {exam.correctAnswers}</p>
            <p><strong>Erros:</strong> {exam.wrongAnswers}</p>
            <p><strong>Percentual:</strong> {exam.percentage}%</p>
            <p><strong>Tempo:</strong> {minutes}min {seconds}s</p>
            <p>
              <strong>Status:</strong>{' '}
              <span className={`tag ${exam.status === 'approved' ? 'is-success' : 'is-danger'}`}>
                {exam.status === 'approved' ? 'APROVADO' : 'REPROVADO'}
              </span>
            </p>
          </div>
        </div>
      </div>

      <div className="box">
        <h2 className="title is-6 mb-3">Respostas</h2>
        <div className="b-table">
          <div className="table-container">
            <table className="table is-fullwidth is-striped has-mobile-cards">
              <thead>
                <tr>
                  <th>Pergunta</th>
                  <th>Selecionada</th>
                  <th>Correta</th>
                  <th>Resultado</th>
                </tr>
              </thead>
              <tbody>
                {(exam.answers || []).map((answer, idx) => (
                  <tr key={idx}>
                    <td data-label="Pergunta" style={{ maxWidth: 300 }}>{answer.question}</td>
                    <td data-label="Selecionada">{answer.selectedAnswer}</td>
                    <td data-label="Correta">{answer.correctAnswer}</td>
                    <td data-label="Resultado">
                      <span className={`icon ${answer.isCorrect ? 'has-text-success' : 'has-text-danger'}`}>
                        <i className={`fas ${answer.isCorrect ? 'fa-check' : 'fa-times'}`} />
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {exam.signature && (
        <div className="box">
          <h2 className="title is-6 mb-3">Assinatura</h2>
          <img src={exam.signatureUrl} alt="Assinatura" style={{ maxHeight: 120, border: '1px solid #ddd', borderRadius: 4 }} />
        </div>
      )}

      <button className="button is-light" onClick={() => window.print()}>
        <span className="icon"><i className="fas fa-print" /></span>
        <span>Imprimir</span>
      </button>
    </AdminLayout>
  );
}
