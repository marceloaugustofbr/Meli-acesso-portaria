// CloudFlare Worker - SafeAccess API
// Substitui operações que exigiam Cloud Functions do Firebase

import { FirestoreClient } from './firestore';
import { verifyFirebaseToken } from './auth';
import { generateCloudinarySignature } from './cloudinary';

const ALLOWED_ORIGINS = [
  'http://localhost:3000',
  'https://safeaccessdhl.web.app',
  'https://safeaccessdhl.firebaseapp.com',
];

const CORS_COMMON = {
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Access-Control-Max-Age': '86400',
};

function corsOrigin(request) {
  const origin = request.headers.get('Origin');
  if (origin && ALLOWED_ORIGINS.includes(origin)) {
    return origin;
  }
  return null;
}

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

function error(msg, status = 400) {
  return json({ error: msg }, status);
}

class AuthError extends Error {
  constructor(msg) {
    super(msg);
    this.name = 'AuthError';
  }
}

function extractCpfDigits(cpf) {
  return (cpf || '').replace(/\D/g, '');
}

function sanitize(str) {
  return (str || '').replace(/<[^>]*>/g, '').replace(/[<>"']/g, '').trim();
}

// Rate limiter simples (in-memory, por isolate do Worker)
const rateLimitStore = new Map();
const RATE_LIMIT_WINDOW = 60000;

function checkRateLimit(ip, key, maxRequests) {
  const now = Date.now();
  const storeKey = `${ip}:${key}`;
  const entry = rateLimitStore.get(storeKey);
  if (!entry || now > entry.windowStart + RATE_LIMIT_WINDOW) {
    rateLimitStore.set(storeKey, { count: 1, windowStart: now });
    return true;
  }
  if (entry.count >= maxRequests) {
    return false;
  }
  entry.count++;
  return true;
}

// Projeções seguras dos dados do exame
function projectPublicStatus(doc) {
  if (!doc) return { found: false };
  return {
    found: true,
    name: doc.name,
    cpf: doc.cpf,
    city: doc.city,
    operationType: doc.operationType,
    status: doc.status,
    percentage: doc.percentage,
    score: doc.score,
    correctAnswers: doc.correctAnswers,
    wrongAnswers: doc.wrongAnswers,
    createdAt: doc.createdAt,
    attempts: doc.attempts,
  };
}

function projectPortariaView(doc) {
  if (!doc) return null;
  return {
    id: doc.cpf ? extractCpfDigits(doc.cpf) : null,
    name: doc.name,
    cpf: doc.cpf,
    city: doc.city,
    operationType: doc.operationType,
    percentage: doc.percentage,
    score: doc.score,
    status: doc.status,
    createdAt: doc.createdAt,
    attempts: doc.attempts,
    blockReason: doc.blockReason,
    blockedAt: doc.blockedAt,
    blockedBy: doc.blockedBy,
  };
}

function isValidCpf(cpf) {
  const digits = extractCpfDigits(cpf);
  return digits.length === 11 && /^\d{11}$/.test(digits);
}

// Token de sessão com HMAC-SHA256 (CR-1)
async function _hmacKey(secret) {
  return crypto.subtle.importKey(
    'raw', new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false, ['sign', 'verify']
  );
}

function _b64url(buf) {
  return btoa(buf).replace(/=+$/, '').replace(/\+/g, '-').replace(/\//g, '_');
}
function _b64urlDecode(str) {
  return atob(str.replace(/-/g, '+').replace(/_/g, '/'));
}

function _sessionSecret(env) {
  const secret = env.SESSION_SECRET;
  if (!secret) {
    throw new Error('SESSION_SECRET não configurado no Worker');
  }
  return secret;
}

async function generateSessionToken(env) {
  const secret = _sessionSecret(env);
  const header = { alg: 'HS256', typ: 'JWT' };
  const payload = {
    type: 'portaria',
    exp: Math.floor(Date.now() / 1000) + 8 * 60 * 60,
    v: '1',
  };
  const h = _b64url(JSON.stringify(header));
  const p = _b64url(JSON.stringify(payload));
  const key = await _hmacKey(secret);
  const sig = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(`${h}.${p}`));
  const s = _b64url(String.fromCharCode(...new Uint8Array(sig)));
  return `${h}.${p}.${s}`;
}

async function verifySessionToken(token, env) {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    const secret = _sessionSecret(env);
    const key = await _hmacKey(secret);
    const sig = Uint8Array.from(_b64urlDecode(parts[2]), c => c.charCodeAt(0));
    const valid = await crypto.subtle.verify(
      'HMAC', key, sig,
      new TextEncoder().encode(`${parts[0]}.${parts[1]}`)
    );
    if (!valid) return null;
    const payload = JSON.parse(_b64urlDecode(parts[1]));
    if (payload.type !== 'portaria' || Date.now() >= payload.exp * 1000) return null;
    return payload;
  } catch {
    return null;
  }
}

// ─────────────────────────────────────────────
//  Router
// ─────────────────────────────────────────────
async function handleRequest(request, env) {
  const url = new URL(request.url);
  const path = url.pathname;
  const method = request.method;

  const db = new FirestoreClient(env);

  try {
    // ─── PIN / Portaria ─────────────────────
    if (path === '/api/portaria/verify-pin' && method === 'POST') {
      return await handleVerifyPin(request, db, env);
    }

    // ─── Questions ──────────────────────────
    if (path === '/api/questions' && method === 'GET') {
      return await handleGetQuestions(request, db);
    }
    if (path === '/api/questions/seed' && method === 'POST') {
      return await handleSeedQuestions(request, db, env);
    }

    // ─── Exams ──────────────────────────────
    if (path === '/api/exams' && method === 'POST') {
      return await handleCreateExam(request, db, env);
    }
    if (path === '/api/exams/check-status' && method === 'POST') {
      return await handleCheckExamStatus(request, db, env);
    }
    if (path === '/api/exams' && method === 'GET') {
      return await handleListExams(request, db, env);
    }
    if (path.match(/^\/api\/exams\/(\d{11})\/block$/) && method === 'POST') {
      const cpf = path.match(/^\/api\/exams\/(\d{11})\/block$/)[1];
      return await handleBlockUser(request, cpf, db, env);
    }
    if (path.match(/^\/api\/exams\/(\d{11})\/unblock$/) && method === 'POST') {
      const cpf = path.match(/^\/api\/exams\/(\d{11})\/unblock$/)[1];
      return await handleUnblockUser(request, cpf, db, env);
    }
    if (path.match(/^\/api\/exams\/cpf\/(\d{11})$/) && method === 'GET') {
      const cpf = path.match(/^\/api\/exams\/cpf\/(\d{11})$/)[1];
      return await handleGetExamByCpf(request, cpf, db, env);
    }
    if (path.match(/^\/api\/exams\/uid\/(.+)$/) && method === 'GET') {
      const uid = path.match(/^\/api\/exams\/uid\/(.+)$/)[1];
      return await handleGetExamByUid(request, uid, db, env);
    }

    // ─── Aggregation ────────────────────────
    if (path === '/api/aggregation' && method === 'GET') {
      return await handleGetAggregation(request, db, env);
    }
    if (path === '/api/recalculate' && method === 'POST') {
      return await handleRecalculate(request, db, env);
    }

    // ─── Cloudinary ─────────────────────────
    if (path === '/api/cloudinary/sign' && method === 'POST') {
      return await handleCloudinarySign(request, env, db);
    }

    // ─── Admin / Me ─────────────────────────
    if (path === '/api/admin/me' && method === 'GET') {
      return await handleAdminMe(request, env, db);
    }

    // ─── Admin / Users ──────────────────────
    if (path === '/api/admin/users' && method === 'GET') {
      return await handleListUsers(request, db, env);
    }
    if (path === '/api/admin/users' && method === 'POST') {
      return await handleCreateUser(request, db, env);
    }
    if (path.match(/^\/api\/admin\/users\/(.+)$/) && method === 'DELETE') {
      const uid = path.match(/^\/api\/admin\/users\/(.+)$/)[1];
      return await handleDeleteUser(request, uid, db, env);
    }
    if (path.match(/^\/api\/admin\/users\/(.+)$/) && method === 'PUT') {
      const uid = path.match(/^\/api\/admin\/users\/(.+)$/)[1];
      return await handleUpdateUser(request, uid, db, env);
    }
    return error('Rota não encontrada', 404);
  } catch (err) {
    console.error('Erro no worker:', err);
    if (err instanceof AuthError) {
      return error(err.message, 403);
    }
    return error(err.message || 'Erro interno', 500);
  }
}

// ─────────────────────────────────────────────
//  Auth helper
// ─────────────────────────────────────────────
async function requireAdmin(request, env, db) {
  const authHeader = request.headers.get('Authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    throw new AuthError('Token de autenticação necessário');
  }
  const token = authHeader.slice(7);
  const decoded = await verifyFirebaseToken(token, env);
  if (!decoded) {
    throw new AuthError('Token inválido');
  }

  // Busca documento do usuário no Firestore
  let userDoc = await db.getDocument('users', decoded.uid);

  // Auto-bootstrap: se não existe documento e users está vazio, cria admin
  if (!userDoc) {
    const existingUsers = await db.listCollection('users');
    if (!existingUsers || existingUsers.length === 0) {
      await db.setDocument('users', decoded.uid, {
        email: decoded.email,
        displayName: decoded.name || decoded.email,
        isAdmin: true,
        cities: [],
        createdAt: new Date().toISOString(),
      });
      decoded.isAdmin = true;
      decoded.cities = [];
      return decoded;
    }
    throw new AuthError('Usuário não encontrado no Firestore');
  }

  decoded.isAdmin = userDoc.isAdmin === true;
  decoded.cities = userDoc.cities || [];
  return decoded;
}

async function requireFullAdmin(request, env, db) {
  const decoded = await requireAdmin(request, env, db);
  if (!decoded.isAdmin) {
    throw new AuthError('Acesso negado: apenas administradores');
  }
  return decoded;
}

// ─────────────────────────────────────────────
//  Handlers
// ─────────────────────────────────────────────

// 1. Verificar PIN da portaria (C-1)
async function handleVerifyPin(request, db, env) {
  const { pin } = await request.json();
  if (!pin || typeof pin !== 'string') {
    return error('PIN é obrigatório');
  }

  const doc = await db.getDocument('config', 'portaria');
  if (!doc) {
    return error('PIN não configurado', 500);
  }

  const storedPin = doc.pin;
  if (pin !== storedPin) {
    return error('PIN incorreto', 401);
  }

  const sessionToken = await generateSessionToken(env);

  return json({ success: true, token: sessionToken });
}

// 2. Listar questões SEM correctAnswer (C-6)
async function handleGetQuestions(request, db) {
  const ip = request.headers.get('CF-Connecting-IP') || request.headers.get('X-Forwarded-For') || 'unknown';
  if (!checkRateLimit(ip, 'questions', 30)) {
    return error('Muitas requisições. Tente novamente em 1 minuto.', 429);
  }
  const docs = await db.listCollection('questions') || [];
  const questions = docs.map((doc) => ({
    id: doc.name.split('/').pop(),
    question: doc.fields.question.stringValue,
    options: doc.fields.options.arrayValue.values.map((v) => v.stringValue),
    category: doc.fields.category.stringValue,
  }));
  return json(questions);
}

// 3. Seed de questões (admin apenas)
async function handleSeedQuestions(request, db, env) {
  await requireFullAdmin(request, env, db);
  const existing = await db.listCollection('questions');
  if (existing.length > 0) {
    return json({ message: 'Questões já existem' });
  }

  const seedData = [
    { question: 'Como deve estar o cabelo dos colaboradores com cabelo abaixo dos ombros?', options: ['Solto e preso apenas por elástico', 'Apenas preso em rabo de cavalo', 'Em penteado tipo coque e com touca', 'Coberto por boné'], correctAnswer: 'Em penteado tipo coque e com touca', category: 'EPI' },
    { question: 'Onde o crachá deve permanecer durante a operação?', options: ['Pendurado para fora da camisa', 'No bolso da calça', 'Para dentro da camiseta', 'No bolso do colete'], correctAnswer: 'Para dentro da camiseta', category: 'EPI' },
    { question: 'Qual o motivo da camiseta e do colete permanecerem dentro da calça?', options: ['Melhorar a aparência', 'Facilitar a movimentação', 'Evitar que sejam puxados pelas esteiras', 'Facilitar a identificação do colaborador'], correctAnswer: 'Evitar que sejam puxados pelas esteiras', category: 'EPI' },
    { question: 'Quais EPIs são indispensáveis na operação?', options: ['Óculos e capacete', 'Máscara e avental', 'Luvas, botas de segurança e capacete de proteção', 'Protetor auricular e óculos'], correctAnswer: 'Luvas, botas de segurança e capacete de proteção', category: 'EPI' },
    { question: 'O uso de adornos dentro da operação é:', options: ['Permitido apenas para mulheres', 'Permitido se estiver usando luvas', 'Permitido em áreas administrativas', 'Proibido'], correctAnswer: 'Proibido', category: 'Comportamento seguro' },
    { question: 'Caso a esteira esteja obstruída ou com defeito, deve-se:', options: ['Continuar operando com cuidado', 'Desligar e religar a esteira', 'Chamar alguém da manutenção e nunca tentar desobstruir', 'Avisar os colegas e continuar o trabalho'], correctAnswer: 'Chamar alguém da manutenção e nunca tentar desobstruir', category: 'Esteiras' },
    { question: 'Em caso de emergência na esteira, qual dispositivo deve ser acionado?', options: ['Alarme de incêndio', 'Rádio comunicador', 'Botoeira ou corda de emergência', 'Chave geral da operação'], correctAnswer: 'Botoeira ou corda de emergência', category: 'Esteiras' },
    { question: 'As áreas com sinalização zebrada indicam:', options: ['Área de descanso', 'Área de circulação livre', 'Área perigosa', 'Área de armazenamento'], correctAnswer: 'Área perigosa', category: 'Circulação de pedestres' },
    { question: 'Se um pacote ficar preso na junção da esteira, o colaborador deve:', options: ['Colocar a mão rapidamente', 'Subir na esteira', 'Utilizar a haste auxiliar e nunca ultrapassar a proteção', 'Pedir para outro colaborador retirar manualmente'], correctAnswer: 'Utilizar a haste auxiliar e nunca ultrapassar a proteção', category: 'Esteiras' },
    { question: 'O que é extremamente proibido nas esteiras?', options: ['Trabalhar em dupla', 'Utilizar luvas', 'Apoiar as mãos, sentar ou subir nos módulos', 'Utilizar colete refletivo'], correctAnswer: 'Apoiar as mãos, sentar ou subir nos módulos', category: 'Esteiras' },
    { question: 'Durante a movimentação com paleteira, é correto:', options: ['Andar de costas', 'Correr para agilizar', 'Verificar se a área está livre para circulação e sempre puxar, nunca empurrar', 'Empurrar o equipamento rapidamente'], correctAnswer: 'Verificar se a área está livre para circulação e sempre puxar, nunca empurrar', category: 'Movimentação de veículos' },
    { question: 'Quantas paleteiras podem entrar simultaneamente dentro do caminhão?', options: ['3', '2', '1', 'Não há limite'], correctAnswer: '1', category: 'Movimentação de veículos' },
    { question: 'Qual ferramenta é permitida para retirada do Stretch Film?', options: ['Estilete', 'Tesoura', 'Canivete', 'Bico de pato'], correctAnswer: 'Bico de pato', category: 'EPI' },
    { question: 'Qual a altura máxima permitida para empilhamento de paletes montados?', options: ['5 paletes', '7 paletes', '8 paletes', '10 paletes empilhados ou 15 entrelaçados'], correctAnswer: '10 paletes empilhados ou 15 entrelaçados', category: 'Organização' },
    { question: 'O carregamento manual de paletes deve ser realizado:', options: ['Por uma pessoa', 'Por até três pessoas', 'Sempre por duas pessoas e utilizando luvas', 'Apenas pelo líder da área'], correctAnswer: 'Sempre por duas pessoas e utilizando luvas', category: 'Comportamento seguro' },
    { question: 'Durante a manobra de caminhões nas docas, é permitido:', options: ['Auxiliar o motorista na ré', 'Ficar atrás do caminhão', 'Subir na doca para orientar', 'Não auxiliar o motorista nas manobras'], correctAnswer: 'Não auxiliar o motorista nas manobras', category: 'Movimentação de veículos' },
    { question: 'Como deve ser feita a movimentação das gaiolas?', options: ['Gaiolas cheias e vazias devem ser empurradas', 'Gaiolas cheias e vazias devem ser puxadas', 'Gaiolas vazias devem ser empurradas e gaiolas cheias devem ser puxadas', 'É permitido movimentar duas gaiolas ao mesmo tempo'], correctAnswer: 'Gaiolas vazias devem ser empurradas e gaiolas cheias devem ser puxadas', category: 'Comportamento seguro' },
    { question: 'Caso seja encontrada uma caixa molhada ou com odor forte, o colaborador deve:', options: ['Abrir a caixa para verificar', 'Levar a caixa para fora da operação', 'Jogar a caixa fora imediatamente', 'Não movimentar a caixa e acionar a brigada DHL'], correctAnswer: 'Não movimentar a caixa e acionar a brigada DHL', category: 'Comportamento seguro' },
    { question: 'O que deve ser feito em caso de acidente de trabalho?', options: ['Avisar apenas os colegas', 'Comunicar no final do expediente', 'Registrar somente se houver afastamento', 'Comunicar imediatamente ao líder DHL e à Segurança do Trabalho'], correctAnswer: 'Comunicar imediatamente ao líder DHL e à Segurança do Trabalho', category: 'Emergência' },
    { question: 'Qual é a regra para circulação de pedestres?', options: ['Andar pelo caminho mais curto', 'Circular próximo às máquinas', 'Utilizar sempre a faixa de pedestres sinalizada', 'Caminhar pela área de carga e descarga'], correctAnswer: 'Utilizar sempre a faixa de pedestres sinalizada', category: 'Circulação de pedestres' },
    { question: 'O uso de álcool, drogas ou substâncias que causem sonolência é:', options: ['Permitido fora do expediente', 'Permitido mediante autorização médica', 'Tolerado em pequenas quantidades', 'Proibido, devendo o líder DHL ser comunicado imediatamente'], correctAnswer: 'Proibido, devendo o líder DHL ser comunicado imediatamente', category: 'Comportamento seguro' },
    { question: 'Quem pode operar veículos, máquinas e equipamentos?', options: ['Qualquer colaborador', 'Apenas líderes', 'Colaboradores antigos', 'Apenas colaboradores treinados, certificados e habilitados'], correctAnswer: 'Apenas colaboradores treinados, certificados e habilitados', category: 'Comportamento seguro' },
    { question: 'Qual distância mínima deve ser mantida entre pedestres e equipamentos motorizados em movimento?', options: ['50 cm', '70 cm', '80 cm', '1 metro'], correctAnswer: '1 metro', category: 'Circulação de pedestres' },
  ];

  for (const q of seedData) {
    await db.createDocument('questions', q);
  }

  return json({ message: `${seedData.length} questões criadas` });
}

// 4. Consulta pública de status do exame (rate-limited, sem dados sensíveis)
async function handleCheckExamStatus(request, db, env) {
  const ip = request.headers.get('CF-Connecting-IP') || request.headers.get('X-Forwarded-For') || 'unknown';
  if (!checkRateLimit(ip, 'check-status', 10)) {
    return error('Muitas requisições. Tente novamente em 1 minuto.', 429);
  }

  const { cpf } = await request.json();
  if (!cpf || typeof cpf !== 'string') {
    return error('CPF é obrigatório');
  }

  const digits = extractCpfDigits(cpf);
  if (!isValidCpf(digits)) {
    return error('CPF inválido');
  }

  const doc = await db.getDocument('latest_exams', digits);
  return json(projectPublicStatus(doc));
}

// 5. Criar exame com validação SERVER-SIDE (C-3, C-6)
async function handleCreateExam(request, db, env) {
  // Valida tamanho do payload
  const text = await request.text();
  if (text.length > 100 * 1024) {
    return error('Payload muito grande', 413);
  }
  const data = JSON.parse(text);

  // Valida campos obrigatórios
  if (!data.name || typeof data.name !== 'string') {
    return error('Nome é obrigatório');
  }
  if (!data.cpf || typeof data.cpf !== 'string') {
    return error('CPF é obrigatório');
  }
  if (!data.city || typeof data.city !== 'string') {
    return error('Cidade é obrigatória');
  }
  if (!data.operationType || typeof data.operationType !== 'string') {
    return error('Tipo de operação é obrigatório');
  }
  if (!Array.isArray(data.answers)) {
    return error('Respostas devem ser um array');
  }
  if (data.answers.length > 30) {
    return error('Máximo de 30 respostas');
  }

  const cpfDigits = extractCpfDigits(data.cpf);
  if (!isValidCpf(cpfDigits)) {
    return error('CPF inválido');
  }

  const now = new Date().toISOString();
  const existing = await db.getDocument('latest_exams', cpfDigits);

  // Verifica bloqueio
  if (existing && existing.status === 'blocked') {
    return error('Colaborador bloqueado não pode realizar a prova.', 403);
  }

  // Cooldown de 5 min
  if (existing && existing.createdAt) {
    const lastAttempt = new Date(existing.createdAt).getTime();
    const elapsed = Date.now() - lastAttempt;
    const cooldown = 5 * 60 * 1000;
    if (elapsed < cooldown) {
      const remaining = Math.ceil((cooldown - elapsed) / 60000);
      return error(`Aguarde ${remaining} minuto(s) para refazer a prova.`, 429);
    }
  }

  // Busca TODAS as questões COM correctAnswer (server-side)
  const allQuestions = await db.listCollection('questions');
  const questionsMap = {};
  allQuestions.forEach((doc) => {
    const id = doc.name.split('/').pop();
    questionsMap[id] = {
      question: doc.fields.question.stringValue,
      options: doc.fields.options.arrayValue.values.map((v) => v.stringValue),
      correctAnswer: doc.fields.correctAnswer.stringValue,
      category: doc.fields.category.stringValue,
    };
  });

  // Valida respostas e calcula nota NO SERVIDOR
  const validatedAnswers = (data.answers || []).map((a) => {
    const q = questionsMap[a.questionId];
    const isCorrect = q ? a.selectedAnswer === q.correctAnswer : false;
    return {
      questionId: a.questionId,
      selectedAnswer: a.selectedAnswer || '',
      question: q ? q.question : '',
      correctAnswer: q ? q.correctAnswer : '',
      isCorrect,
    };
  });

  const correctCount = validatedAnswers.filter((a) => a.isCorrect).length;
  const wrongCount = validatedAnswers.length - correctCount;
  const total = validatedAnswers.length;
  const percentage = total > 0 ? Math.round((correctCount / total) * 100) : 0;
  const computedStatus = percentage >= 70 ? 'approved' : 'reproved';

  // Gera UID se não existir
  let uid = existing ? existing.uid : null;
  if (!uid) {
    uid = crypto.randomUUID();
    await db.setDocument('exam_uids', uid, { cpf: data.cpf });
  }

  // Salva resultado no Firestore
  const examDoc = {
    uid,
    name: sanitize(data.name),
    cpf: data.cpf || '',
    city: sanitize(data.city),
    operationType: sanitize(data.operationType),
    startTime: data.startTime || null,
    endTime: data.endTime || null,
    duration: data.duration || 0,
    score: correctCount,
    correctAnswers: correctCount,
    wrongAnswers: wrongCount,
    percentage,
    status: computedStatus,
    signature: data.signature || null,
    signatureIp: data.signatureIp || null,
    signatureDate: data.signatureDate || now,
    signatureUserAgent: data.signatureUserAgent || null,
    answers: validatedAnswers,
    createdAt: now,
    attempts: (existing ? (existing.attempts || 0) : 0) + 1,
  };

  await db.setDocument('latest_exams', cpfDigits, examDoc);

  return json({ id: cpfDigits, status: computedStatus, percentage, score: correctCount });
}

// 5. Buscar exame por CPF (portaria via HMAC ou admin via Firebase)
async function handleGetExamByCpf(request, cpf, db, env) {
  const authHeader = request.headers.get('Authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return error('Token de autenticação necessário', 401);
  }
  const token = authHeader.slice(7);

  // Tenta admin auth primeiro (Firebase ID token)
  try {
    const decoded = await verifyFirebaseToken(token, env);
    if (decoded) {
      const userDoc = await db.getDocument('users', decoded.uid);
      if (userDoc && userDoc.isAdmin === true) {
        const digits = extractCpfDigits(cpf);
        const doc = await db.getDocument('latest_exams', digits);
        if (!doc) return json(null);
        return json({ id: digits, ...doc });
      }
    }
  } catch {} // eslint-disable-line no-empty

  // Tenta HMAC session token (portaria)
  const session = await verifySessionToken(token, env);
  if (!session) {
    return error('Token inválido ou expirado', 403);
  }

  const digits = extractCpfDigits(cpf);
  const doc = await db.getDocument('latest_exams', digits);
  if (!doc) return json(null);
  return json(projectPortariaView(doc));
}

// 6. Buscar exame por UID (admin)
async function handleGetExamByUid(request, uid, db, env) {
  const admin = await requireAdmin(request, env, db);
  const lookup = await db.getDocument('exam_uids', uid);
  if (!lookup) return json(null);
  const digits = extractCpfDigits(lookup.cpf);
  const doc = await db.getDocument('latest_exams', digits);
  if (!doc) return json(null);
  const adminCities = admin.cities || [];
  if (adminCities.length > 0 && !adminCities.includes(doc.city)) {
    return json(null, 403);
  }
  return json({ id: digits, ...doc });
}

// 7. Listar exames com paginação e filtros (admin)
async function handleListExams(request, db, env) {
  const admin = await requireAdmin(request, env, db);
  const url = new URL(request.url);
  const params = url.searchParams;

  let allDocs = await db.listCollectionObjects('latest_exams');

  // Filtro automático por cidades que o admin gerencia
  const adminCities = admin.cities || [];
  const requestedCity = params.get('city');
  if (adminCities.length > 0) {
    allDocs = allDocs.filter((d) => adminCities.includes(d.city));
  }
  if (requestedCity && adminCities.includes(requestedCity)) {
    allDocs = allDocs.filter((d) => d.city === requestedCity);
  } else if (requestedCity) {
    allDocs = allDocs.filter((d) => d.city === requestedCity);
  }
  if (params.get('status')) {
    allDocs = allDocs.filter((d) => d.status === params.get('status'));
  }
  if (params.get('name')) {
    const nameFilter = params.get('name').toUpperCase();
    allDocs = allDocs.filter((d) => (d.name || '').toUpperCase().includes(nameFilter));
  }
  if (params.get('operationType')) {
    allDocs = allDocs.filter((d) => d.operationType === params.get('operationType'));
  }

  allDocs.sort((a, b) => {
    const aTime = a.createdAt || '0';
    const bTime = b.createdAt || '0';
    return bTime.localeCompare(aTime);
  });

  const pageSize = parseInt(params.get('pageSize') || '20', 10);
  const page = parseInt(params.get('page') || '0', 10);
  const start = page * pageSize;
  const pageDocs = allDocs.slice(start, start + pageSize);

  return json({
    data: pageDocs,
    hasMore: start + pageSize < allDocs.length,
    total: allDocs.length,
    page,
  });
}

// 8. Bloquear usuário (requer admin) (C-5)
async function handleBlockUser(request, cpf, db, env) {
  await requireAdmin(request, env, db);
  const data = await request.json();
  const now = new Date().toISOString();

  await db.setDocument('latest_exams', cpf, {
    status: 'blocked',
    blockedAt: now,
    blockedBy: data.blockedBy || 'Admin',
    blockReason: data.blockReason || '',
    blockSignature: data.blockSignature || null,
  });

  return json({ success: true, cpf });
}

// 9. Desbloquear usuário (requer admin) (C-5)
async function handleUnblockUser(request, cpf, db, env) {
  await requireAdmin(request, env, db);
  const existing = await db.getDocument('latest_exams', cpf);
  if (!existing) return error('Usuário não encontrado', 404);

  const percentage = existing.percentage || 0;
  await db.setDocument('latest_exams', cpf, {
    status: percentage >= 70 ? 'approved' : 'reproved',
    blockedAt: null,
    blockedBy: null,
    blockReason: null,
    blockSignature: null,
  });

  return json({ success: true, cpf });
}

// 10. Agregação
async function handleGetAggregation(request, db, env) {
  const admin = await requireAdmin(request, env, db);
  const adminCities = admin.cities || [];

  // Se admin tem restrição de cidades, calcula on-the-fly
  if (adminCities.length > 0) {
    const allDocs = await db.listCollectionObjects('latest_exams');
    const filtered = allDocs.filter((d) => adminCities.includes(d.city));
    const monthlyCounts = {};
    const typeCounts = {};
    const cpfSet = new Set();
    let approvedCount = 0;
    let reprovedCount = 0;

    filtered.forEach((d) => {
      const month = d.createdAt ? d.createdAt.substring(0, 7) : 'unknown';
      monthlyCounts[month] = (monthlyCounts[month] || 0) + 1;
      const type = d.operationType || 'unknown';
      typeCounts[type] = (typeCounts[type] || 0) + 1;
      cpfSet.add(d.cpf);
      if (d.status === 'approved') approvedCount += 1;
      else if (d.status === 'reproved') reprovedCount += 1;
    });

    const totalPeople = cpfSet.size;
    return json({
      total: filtered.length,
      totalPeople,
      approvedPeople: approvedCount,
      reprovedPeople: reprovedCount,
      monthlyCounts,
      typeCounts,
      approvalRate: totalPeople > 0 ? Math.round((approvedCount / totalPeople) * 100) : 0,
    });
  }

  const doc = await db.getDocument('aggregations', 'examStats');
  if (!doc) {
    return json({
      total: 0, totalPeople: 0, approvedPeople: 0, reprovedPeople: 0,
      monthlyCounts: {}, typeCounts: {}, approvalRate: 0,
    });
  }

  const aggregation = {
    total: doc.total ?? 0,
    totalPeople: doc.totalPeople ?? 0,
    approvedPeople: doc.approvedPeople ?? 0,
    reprovedPeople: doc.reprovedPeople ?? 0,
    monthlyCounts: doc.monthlyCounts ?? {},
    typeCounts: doc.typeCounts ?? {},
  };

  return json({
    ...aggregation,
    approvalRate: aggregation.totalPeople > 0
      ? Math.round((aggregation.approvedPeople / aggregation.totalPeople) * 100)
      : 0,
  });
}

// 11. Recalcular agregação (admin)
async function handleRecalculate(request, db, env) {
  const admin = await requireAdmin(request, env, db);

  const allDocs = await db.listCollectionObjects('latest_exams');
  const adminCities = admin.cities || [];
  const docs = adminCities.length > 0
    ? allDocs.filter((d) => adminCities.includes(d.city))
    : allDocs;

  const monthlyCounts = {};
  const typeCounts = {};
  const cpfSet = new Set();
  let approvedCount = 0;
  let reprovedCount = 0;

  docs.forEach((d) => {
    const month = d.createdAt ? d.createdAt.substring(0, 7) : 'unknown';
    monthlyCounts[month] = (monthlyCounts[month] || 0) + 1;

    const type = d.operationType || 'unknown';
    typeCounts[type] = (typeCounts[type] || 0) + 1;

    cpfSet.add(d.cpf);
    if (d.status === 'approved') approvedCount += 1;
    else if (d.status === 'reproved') reprovedCount += 1;
  });

  await db.setDocument('aggregations', 'examStats', {
    total: docs.length,
    totalPeople: cpfSet.size,
    approvedPeople: approvedCount,
    reprovedPeople: reprovedCount,
    monthlyCounts,
    typeCounts,
  });

  return json({ total: docs.length, totalPeople: cpfSet.size });
}

// 12. Cloudinary signed upload (admin apenas)
async function handleCloudinarySign(request, env, db) {
  await requireAdmin(request, env, db);
  const body = await request.json();
  const timestamp = Math.round(Date.now() / 1000);
  const publicId = `signatures/${body.examId || 'unknown'}`;
  const folder = 'signatures';

  const signature = await generateCloudinarySignature({
    timestamp,
    public_id: publicId,
    folder,
    upload_preset: env.CLOUDINARY_UPLOAD_PRESET || 'meli_preset',
  }, env);

  return json({
    signature,
    timestamp,
    public_id: publicId,
    folder,
    upload_preset: env.CLOUDINARY_UPLOAD_PRESET || 'meli_preset',
    cloudName: env.CLOUDINARY_CLOUD_NAME,
    apiKey: env.CLOUDINARY_API_KEY,
  });
}

// 12b. Retorna dados do admin autenticado
async function handleAdminMe(request, env, db) {
  const decoded = await requireAdmin(request, env, db);
  return json({ isAdmin: decoded.isAdmin, cities: decoded.cities || [] });
}

// 13. Listar usuários (admin)
async function handleListUsers(request, db, env) {
  await requireFullAdmin(request, env, db);
  const docs = await db.listCollectionObjects('users');
  return json(docs);
}

// 14. Criar usuário admin (C-7)
async function handleCreateUser(request, db, env) {
  await requireFullAdmin(request, env, db);
  const data = await request.json();

  // Usa Firebase Auth REST API para criar usuário
  const response = await fetch(
    `https://identitytoolkit.googleapis.com/v1/accounts:signUp?key=${env.FIREBASE_API_KEY}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: data.email,
        password: data.password,
        returnSecureToken: true,
      }),
    }
  );

  const result = await response.json();
  if (!response.ok) {
    return error(result.error?.message || 'Erro ao criar usuário', 400);
  }

  const cities = Array.isArray(data.cities) ? data.cities : [];

  await db.setDocument('users', result.localId, {
    email: data.email,
    displayName: data.name || data.email,
    isAdmin: data.isAdmin || false,
    cities,
    createdAt: new Date().toISOString(),
  });

  return json({
    uid: result.localId,
    email: data.email,
    isAdmin: data.isAdmin || false,
    cities,
  });
}

// 15. Deletar usuário + auth (C-7)
async function handleDeleteUser(request, uid, db, env) {
  const decoded = await requireFullAdmin(request, env, db);

  if (decoded.uid === uid) {
    throw new AuthError('Você não pode excluir o próprio usuário');
  }

  // Remove do Firestore
  await db.deleteDocument('users', uid);

  return json({ success: true, uid });
}

// 16. Atualizar usuário (admin)
async function handleUpdateUser(request, uid, db, env) {
  const decoded = await requireFullAdmin(request, env, db);

  if (decoded.uid === uid) {
    throw new AuthError('Você não pode alterar o próprio usuário por aqui');
  }

  const data = await request.json();
  const updates = {};

  if (data.cities !== undefined) {
    updates.cities = Array.isArray(data.cities) ? data.cities : [];
  }
  if (data.isAdmin !== undefined) {
    updates.isAdmin = !!data.isAdmin;
  }
  if (data.displayName !== undefined) {
    updates.displayName = data.displayName;
  }

  if (Object.keys(updates).length === 0) {
    return error('Nenhum campo para atualizar', 400);
  }

  await db.setDocument('users', uid, updates);

  const updated = await db.getDocument('users', uid);

  return json(updated);
}

// ─────────────────────────────────────────────
//  Entry point
// ─────────────────────────────────────────────
function addCors(response, request) {
  const origin = corsOrigin(request);
  if (origin) {
    response.headers.set('Access-Control-Allow-Origin', origin);
  }
  for (const [key, value] of Object.entries(CORS_COMMON)) {
    response.headers.set(key, value);
  }
  return response;
}

export default {
  async fetch(request, env) {
    if (request.method === 'OPTIONS') {
      const headers = { ...CORS_COMMON };
      const origin = corsOrigin(request);
      if (origin) {
        headers['Access-Control-Allow-Origin'] = origin;
      }
      return new Response(null, { headers });
    }
    const response = await handleRequest(request, env);
    return addCors(response, request);
  },
};
