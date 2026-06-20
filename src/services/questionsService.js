import { firestore } from '../firebase';

const COLLECTION = 'questions';

const seedQuestions = [
  {
    question: 'Como deve estar o cabelo dos colaboradores com cabelo abaixo dos ombros?',
    options: ['Solto e preso apenas por elástico', 'Apenas preso em rabo de cavalo', 'Em penteado tipo coque e com touca', 'Coberto por boné'],
    correctAnswer: 'Em penteado tipo coque e com touca',
    category: 'EPI',
  },
  {
    question: 'Onde o crachá deve permanecer durante a operação?',
    options: ['Pendurado para fora da camisa', 'No bolso da calça', 'Para dentro da camiseta', 'No bolso do colete'],
    correctAnswer: 'Para dentro da camiseta',
    category: 'EPI',
  },
  {
    question: 'Qual o motivo da camiseta e do colete permanecerem dentro da calça?',
    options: ['Melhorar a aparência', 'Facilitar a movimentação', 'Evitar que sejam puxados pelas esteiras', 'Facilitar a identificação do colaborador'],
    correctAnswer: 'Evitar que sejam puxados pelas esteiras',
    category: 'EPI',
  },
  {
    question: 'Quais EPIs são indispensáveis na operação?',
    options: ['Óculos e capacete', 'Máscara e avental', 'Luvas, botas de segurança e capacete de proteção', 'Protetor auricular e óculos'],
    correctAnswer: 'Luvas, botas de segurança e capacete de proteção',
    category: 'EPI',
  },
  {
    question: 'O uso de adornos dentro da operação é:',
    options: ['Permitido apenas para mulheres', 'Permitido se estiver usando luvas', 'Permitido em áreas administrativas', 'Proibido'],
    correctAnswer: 'Proibido',
    category: 'Comportamento seguro',
  },
  {
    question: 'Caso a esteira esteja obstruída ou com defeito, deve-se:',
    options: ['Continuar operando com cuidado', 'Desligar e religar a esteira', 'Chamar alguém da manutenção e nunca tentar desobstruir', 'Avisar os colegas e continuar o trabalho'],
    correctAnswer: 'Chamar alguém da manutenção e nunca tentar desobstruir',
    category: 'Esteiras',
  },
  {
    question: 'Em caso de emergência na esteira, qual dispositivo deve ser acionado?',
    options: ['Alarme de incêndio', 'Rádio comunicador', 'Botoeira ou corda de emergência', 'Chave geral da operação'],
    correctAnswer: 'Botoeira ou corda de emergência',
    category: 'Esteiras',
  },
  {
    question: 'As áreas com sinalização zebrada indicam:',
    options: ['Área de descanso', 'Área de circulação livre', 'Área perigosa', 'Área de armazenamento'],
    correctAnswer: 'Área perigosa',
    category: 'Circulação de pedestres',
  },
  {
    question: 'Se um pacote ficar preso na junção da esteira, o colaborador deve:',
    options: ['Colocar a mão rapidamente', 'Subir na esteira', 'Utilizar a haste auxiliar e nunca ultrapassar a proteção', 'Pedir para outro colaborador retirar manualmente'],
    correctAnswer: 'Utilizar a haste auxiliar e nunca ultrapassar a proteção',
    category: 'Esteiras',
  },
  {
    question: 'O que é extremamente proibido nas esteiras?',
    options: ['Trabalhar em dupla', 'Utilizar luvas', 'Apoiar as mãos, sentar ou subir nos módulos', 'Utilizar colete refletivo'],
    correctAnswer: 'Apoiar as mãos, sentar ou subir nos módulos',
    category: 'Esteiras',
  },
  {
    question: 'Durante a movimentação com paleteira, é correto:',
    options: ['Andar de costas', 'Correr para agilizar', 'Verificar se a área está livre para circulação e sempre puxar, nunca empurrar', 'Empurrar o equipamento rapidamente'],
    correctAnswer: 'Verificar se a área está livre para circulação e sempre puxar, nunca empurrar',
    category: 'Movimentação de veículos',
  },
  {
    question: 'Quantas paleteiras podem entrar simultaneamente dentro do caminhão?',
    options: ['3', '2', '1', 'Não há limite'],
    correctAnswer: '1',
    category: 'Movimentação de veículos',
  },
  {
    question: 'Qual ferramenta é permitida para retirada do Stretch Film?',
    options: ['Estilete', 'Tesoura', 'Canivete', 'Bico de pato'],
    correctAnswer: 'Bico de pato',
    category: 'EPI',
  },
  {
    question: 'Qual a altura máxima permitida para empilhamento de paletes montados?',
    options: ['5 paletes', '7 paletes', '8 paletes', '10 paletes empilhados ou 15 entrelaçados'],
    correctAnswer: '10 paletes empilhados ou 15 entrelaçados',
    category: 'Organização',
  },
  {
    question: 'O carregamento manual de paletes deve ser realizado:',
    options: ['Por uma pessoa', 'Por até três pessoas', 'Sempre por duas pessoas e utilizando luvas', 'Apenas pelo líder da área'],
    correctAnswer: 'Sempre por duas pessoas e utilizando luvas',
    category: 'Comportamento seguro',
  },
  {
    question: 'Durante a manobra de caminhões nas docas, é permitido:',
    options: ['Auxiliar o motorista na ré', 'Ficar atrás do caminhão', 'Subir na doca para orientar', 'Não auxiliar o motorista nas manobras'],
    correctAnswer: 'Não auxiliar o motorista nas manobras',
    category: 'Movimentação de veículos',
  },
  {
    question: 'Como deve ser feita a movimentação das gaiolas?',
    options: ['Gaiolas cheias e vazias devem ser empurradas', 'Gaiolas cheias e vazias devem ser puxadas', 'Gaiolas vazias devem ser empurradas e gaiolas cheias devem ser puxadas', 'É permitido movimentar duas gaiolas ao mesmo tempo'],
    correctAnswer: 'Gaiolas vazias devem ser empurradas e gaiolas cheias devem ser puxadas',
    category: 'Comportamento seguro',
  },
  {
    question: 'Caso seja encontrada uma caixa molhada ou com odor forte, o colaborador deve:',
    options: ['Abrir a caixa para verificar', 'Levar a caixa para fora da operação', 'Jogar a caixa fora imediatamente', 'Não movimentar a caixa e acionar a brigada DHL'],
    correctAnswer: 'Não movimentar a caixa e acionar a brigada DHL',
    category: 'Comportamento seguro',
  },
  {
    question: 'O que deve ser feito em caso de acidente de trabalho?',
    options: ['Avisar apenas os colegas', 'Comunicar no final do expediente', 'Registrar somente se houver afastamento', 'Comunicar imediatamente ao líder DHL e à Segurança do Trabalho'],
    correctAnswer: 'Comunicar imediatamente ao líder DHL e à Segurança do Trabalho',
    category: 'Emergência',
  },
  {
    question: 'Qual é a regra para circulação de pedestres?',
    options: ['Andar pelo caminho mais curto', 'Circular próximo às máquinas', 'Utilizar sempre a faixa de pedestres sinalizada', 'Caminhar pela área de carga e descarga'],
    correctAnswer: 'Utilizar sempre a faixa de pedestres sinalizada',
    category: 'Circulação de pedestres',
  },
  {
    question: 'O uso de álcool, drogas ou substâncias que causem sonolência é:',
    options: ['Permitido fora do expediente', 'Permitido mediante autorização médica', 'Tolerado em pequenas quantidades', 'Proibido, devendo o líder DHL ser comunicado imediatamente'],
    correctAnswer: 'Proibido, devendo o líder DHL ser comunicado imediatamente',
    category: 'Comportamento seguro',
  },
  {
    question: 'Quem pode operar veículos, máquinas e equipamentos?',
    options: ['Qualquer colaborador', 'Apenas líderes', 'Colaboradores antigos', 'Apenas colaboradores treinados, certificados e habilitados'],
    correctAnswer: 'Apenas colaboradores treinados, certificados e habilitados',
    category: 'Comportamento seguro',
  },
  {
    question: 'Qual distância mínima deve ser mantida entre pedestres e equipamentos motorizados em movimento?',
    options: ['50 cm', '70 cm', '80 cm', '1 metro'],
    correctAnswer: '1 metro',
    category: 'Circulação de pedestres',
  },
];

async function seedQuestionsToFirestore(force = false) {
  const existing = await firestore.collection(COLLECTION).get();
  if (existing.docs.length > 0 && !force) return;

  if (force) {
    const batch = firestore.batch();
    existing.docs.forEach((doc) => batch.delete(doc.ref));
    await batch.commit();
  }

  const batch = firestore.batch();
  seedQuestions.forEach((q) => {
    const ref = firestore.collection(COLLECTION).doc();
    batch.set(ref, q);
  });
  await batch.commit();
}

export const questionsService = {
  seedQuestions: seedQuestionsToFirestore,

  async getAll() {
    const snapshot = await firestore.collection(COLLECTION).get();
    if (snapshot.docs.length === 0) {
      await seedQuestionsToFirestore();
      const retry = await firestore.collection(COLLECTION).get();
      return retry.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
    }
    return snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
  },
};
