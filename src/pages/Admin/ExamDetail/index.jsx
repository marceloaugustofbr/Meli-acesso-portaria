import React, { useRef } from 'react';
import { useParams } from 'react-router-dom';
import { useExam } from '../../../hooks';
import AdminLayout from '../../../components/ui/AdminLayout';
import Loading from '../../../components/ui/Loading';
import { formatCPF } from '../../../utils/cpf';

const TERMS_TEXT = `Declaro, para os devidos fins, que participei integralmente do treinamento ministrado pela empresa, tendo recebido as orientações necessárias sobre as atividades a serem desempenhadas, os procedimentos operacionais, as normas de segurança, os riscos inerentes às atividades e as regras de acesso e permanência na operação.

Declaro ainda que compreendi integralmente as instruções recebidas, estou ciente dos riscos envolvidos nas atividades que executarei e comprometo-me a cumprir rigorosamente todas as normas, procedimentos e medidas de segurança estabelecidas pela empresa, utilizando corretamente os equipamentos e recursos disponibilizados.

Reconheço que o descumprimento das normas e procedimentos de segurança poderá acarretar medidas administrativas previstas pela empresa, sem prejuízo das demais responsabilidades cabíveis.

Por fim, concordo que este termo seja firmado por meio de assinatura eletrônica, reconhecendo sua validade jurídica, nos termos da legislação brasileira aplicável, em especial a Lei nº 14.063/2020 e a Medida Provisória nº 2.200-2/2001, sendo registrado eletronicamente com data e hora da assinatura.`;

export default function AdminExamDetail() {
  const { uid } = useParams();
  const { data: exam, isLoading } = useExam(uid);
  const printRef = useRef(null);

  if (isLoading) return <AdminLayout><Loading fullPage /></AdminLayout>;
  if (!exam) return <AdminLayout><p>Prova não encontrada</p></AdminLayout>;

  const minutes = Math.floor((exam.duration || 0) / 60);
  const seconds = (exam.duration || 0) % 60;
  const sigDate = exam.signatureDate || exam.createdAt;
  const signatureDateStr = sigDate ? new Date(sigDate).toLocaleString('pt-BR') : '-';
  const createdDateStr = exam.createdAt ? new Date(exam.createdAt).toLocaleDateString('pt-BR') : '-';
  const createdTimeStr = exam.createdAt ? new Date(exam.createdAt).toLocaleTimeString('pt-BR') : '-';

  let statusColor;
  let statusLabel;
  let statusBg;
  let statusBorder;
  if (exam.status === 'approved') {
    statusColor = '#1B5E20'; statusLabel = 'APROVADO'; statusBg = '#E8F5E9'; statusBorder = '#A5D6A7';
  } else if (exam.status === 'blocked') {
    statusColor = '#E65100'; statusLabel = 'BLOQUEADO'; statusBg = '#FFF3E0'; statusBorder = '#FFCC80';
  } else {
    statusColor = '#B71C1C'; statusLabel = 'REPROVADO'; statusBg = '#FFEBEE'; statusBorder = '#EF9A9A';
  }

  const handlePrint = async () => {
    // eslint-disable-next-line import/no-unresolved, import/no-extraneous-dependencies
    const html2canvas = (await import(/* webpackChunkName: "html2canvas" */ 'html2canvas')).default;
    // eslint-disable-next-line import/no-unresolved, import/no-extraneous-dependencies
    const JsPDF = (await import(/* webpackChunkName: "jspdf" */ 'jspdf')).jsPDF;

    const element = printRef.current;
    const canvas = await html2canvas(element, {
      scale: 1.5,
      useCORS: true,
      backgroundColor: '#ffffff',
    });
    const imgData = canvas.toDataURL('image/jpeg', 0.7);

    const pdf = new JsPDF('p', 'mm', 'a4');
    const pdfWidth = pdf.internal.pageSize.getWidth();
    const pdfHeight = pdf.internal.pageSize.getHeight();
    const imgWidth = pdfWidth - 20;
    const imgHeight = (canvas.height * imgWidth) / canvas.width;

    let heightLeft = imgHeight;
    let position = 10;

    pdf.addImage(imgData, 'JPEG', 10, position, imgWidth, imgHeight);
    heightLeft -= (pdfHeight - 20);

    while (heightLeft > 0) {
      position = heightLeft - imgHeight + 10;
      pdf.addPage();
      pdf.addImage(imgData, 'JPEG', 10, position, imgWidth, imgHeight);
      heightLeft -= (pdfHeight - 20);
    }

    pdf.save(`prova-${exam.cpf || 'colaborador'}.pdf`);
  };

  return (
    <AdminLayout>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <h1 className="title is-4" style={{ margin: 0 }}>Detalhes da Prova</h1>
        <button className="button is-link" onClick={handlePrint}>
          <span className="icon"><i className="fas fa-file-pdf" /></span>
          <span>Gerar PDF</span>
        </button>
      </div>

      <div ref={printRef} style={{ background: '#fff', padding: 20, borderRadius: 8 }}>
        {/* Status banner */}
        <div style={{
          background: statusBg, borderBottom: `2px solid ${statusBorder}`,
          padding: '14px 20px', borderRadius: '8px 8px 0 0',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <span className="icon is-medium"><i className="fas fa-user-circle" style={{ fontSize: '1.8rem', color: '#D40511' }} /></span>
            <div>
              <p style={{ fontWeight: 700, fontSize: '0.95rem', color: '#1a1a2e', margin: 0 }}>{exam.name}</p>
              <p style={{ fontSize: '0.78rem', color: '#666', margin: '2px 0 0' }}>CPF: {formatCPF(exam.cpf || '')}</p>
            </div>
          </div>
          <div style={{
            background: statusColor, color: '#fff', padding: '5px 14px',
            borderRadius: 6, fontWeight: 700, fontSize: '0.8rem', letterSpacing: '0.5px',
          }}>
            {statusLabel}
          </div>
        </div>

        {/* Metrics */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10, padding: '16px 0', borderBottom: '1px solid #E8E8E8' }}>
          {[
            { label: 'Acertos', value: `${exam.correctAnswers}/${exam.answers?.length || 23}`, color: '#2E7D32' },
            { label: 'Erros', value: exam.wrongAnswers, color: '#C62828' },
            { label: 'Nota', value: (exam.percentage / 10).toFixed(1), color: exam.percentage >= 70 ? '#2E7D32' : '#C62828' },
            { label: 'Tempo', value: `${minutes}min ${seconds}s`, color: '#37474F' },
          ].map((item) => (
            <div key={item.label} style={{ textAlign: 'center', padding: '10px 6px', background: '#F9FAFB', borderRadius: 6, border: '1px solid #E8E8E8' }}>
              <p style={{ fontSize: '0.6rem', color: '#999', textTransform: 'uppercase', letterSpacing: '0.5px', margin: '0 0 4px' }}>{item.label}</p>
              <p style={{ fontSize: '1.1rem', fontWeight: 800, color: item.color, margin: 0 }}>{item.value}</p>
            </div>
          ))}
        </div>

        {/* Info grid */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1px', background: '#E8E8E8', margin: '16px 0', borderRadius: 6, overflow: 'hidden' }}>
          {[
            { label: 'Cidade', value: exam.city },
            { label: 'Empresa', value: exam.operationType },
            { label: 'Data', value: createdDateStr },
            { label: 'Horário', value: createdTimeStr },
            { label: 'Duração', value: `${minutes}min ${seconds}s` },
            { label: 'Tentativa', value: `${(exam.attempts || 1)}ª vez` },
          ].map((item) => (
            <div key={item.label} style={{ background: '#fff', padding: '8px 12px' }}>
              <p style={{ fontSize: '0.6rem', color: '#999', textTransform: 'uppercase', letterSpacing: '0.3px', margin: 0 }}>{item.label}</p>
              <p style={{ fontSize: '0.8rem', fontWeight: 600, color: '#333', margin: '2px 0 0' }}>{item.value || '-'}</p>
            </div>
          ))}
        </div>

        {/* Block info */}
        {exam.status === 'blocked' && (
          <div style={{ background: '#FFF3E0', border: '1px solid #FFCC80', borderRadius: 6, padding: 12, marginBottom: 16 }}>
            <p style={{ color: '#E65100', fontWeight: 700, fontSize: '0.8rem', margin: '0 0 6px' }}>
              <i className="fas fa-ban" style={{ marginRight: 6 }} />Dados do Bloqueio
            </p>
            <p style={{ fontSize: '0.8rem', margin: '2px 0' }}><strong>Motivo:</strong> {exam.blockReason || 'Não informado'}</p>
            {exam.blockedAt && <p style={{ fontSize: '0.8rem', margin: '2px 0' }}><strong>Data:</strong> {new Date(exam.blockedAt).toLocaleString('pt-BR')}</p>}
            {exam.blockedBy && <p style={{ fontSize: '0.8rem', margin: '2px 0' }}><strong>Bloqueado por:</strong> {exam.blockedBy}</p>}
          </div>
        )}

        {/* Answers */}
        <div style={{ marginBottom: 16 }}>
          <h3 style={{ fontSize: '0.85rem', fontWeight: 700, color: '#333', margin: '0 0 8px', textTransform: 'uppercase', borderBottom: '2px solid #D40511', paddingBottom: 4 }}>
            Respostas
          </h3>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.78rem' }}>
            <thead>
              <tr style={{ borderBottom: '2px solid #E8E8E8' }}>
                <th style={{ padding: '6px 8px', textAlign: 'left', fontWeight: 600, color: '#666', fontSize: '0.7rem', textTransform: 'uppercase' }}>#</th>
                <th style={{ padding: '6px 8px', textAlign: 'left', fontWeight: 600, color: '#666', fontSize: '0.7rem', textTransform: 'uppercase' }}>Pergunta</th>
                <th style={{ padding: '6px 8px', textAlign: 'left', fontWeight: 600, color: '#666', fontSize: '0.7rem', textTransform: 'uppercase' }}>Selecionada</th>
                <th style={{ padding: '6px 8px', textAlign: 'left', fontWeight: 600, color: '#666', fontSize: '0.7rem', textTransform: 'uppercase' }}>Correta</th>
                <th style={{ padding: '6px 8px', textAlign: 'center', fontWeight: 600, color: '#666', fontSize: '0.7rem', textTransform: 'uppercase' }}>Resultado</th>
              </tr>
            </thead>
            <tbody>
              {(exam.answers || []).map((answer, idx) => (
                <tr key={idx} style={{ borderBottom: '1px solid #F0F0F0' }}>
                  <td style={{ padding: '5px 8px', color: '#999' }}>{idx + 1}</td>
                  <td style={{ padding: '5px 8px' }}>{answer.question}</td>
                  <td style={{ padding: '5px 8px', fontWeight: 500 }}>{answer.selectedAnswer}</td>
                  <td style={{ padding: '5px 8px', fontWeight: 500 }}>{answer.correctAnswer}</td>
                  <td style={{ padding: '5px 8px', textAlign: 'center' }}>
                    <span style={{
                      display: 'inline-block', padding: '1px 8px', borderRadius: 4, fontSize: '0.7rem', fontWeight: 600,
                      background: answer.isCorrect ? '#E8F5E9' : '#FFEBEE',
                      color: answer.isCorrect ? '#2E7D32' : '#C62828',
                    }}>
                      {answer.isCorrect ? 'Correto' : 'Incorreto'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Terms */}
        <div style={{ marginBottom: 16 }}>
          <h3 style={{ fontSize: '0.85rem', fontWeight: 700, color: '#333', margin: '0 0 8px', textTransform: 'uppercase', borderBottom: '2px solid #D40511', paddingBottom: 4 }}>
            Termo de Ciência e Responsabilidade
          </h3>
          <div style={{ padding: 12, background: '#F9FAFB', borderRadius: 6, border: '1px solid #E8E8E8', fontSize: '0.8rem', color: '#555', lineHeight: 1.6 }}>
            {TERMS_TEXT.split('\n\n').map((paragraph, i) => (
              <p key={i} style={{ margin: '0 0 8px' }}>{paragraph}</p>
            ))}
          </div>
        </div>

        {/* Signature */}
        {(exam.signature || exam.signatureUrl) && (
          <div>
            <h3 style={{ fontSize: '0.85rem', fontWeight: 700, color: '#333', margin: '0 0 8px', textTransform: 'uppercase', borderBottom: '2px solid #D40511', paddingBottom: 4 }}>
              Assinatura Digital
            </h3>
            <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', padding: 12, background: '#F9FAFB', borderRadius: 6, border: '1px solid #E8E8E8' }}>
              <img
                src={exam.signature || exam.signatureUrl}
                alt="Assinatura"
                style={{ maxHeight: 80, border: '1px solid #ddd', borderRadius: 4, padding: 4, background: '#fff' }}
              />
              <div style={{ flex: 1, minWidth: 200, fontSize: '0.8rem' }}>
                <p><strong>Assinado por:</strong> {exam.name}</p>
                <p><strong>CPF:</strong> {formatCPF(exam.cpf || '')}</p>
                <p><strong>Data/Hora:</strong> {signatureDateStr}</p>
                <p><strong>IP:</strong> {exam.signatureIp || '-'}</p>
                {exam.signatureUserAgent && (
                  <p style={{ fontSize: '0.7rem', wordBreak: 'break-all' }}><strong>Dispositivo:</strong> {exam.signatureUserAgent}</p>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
