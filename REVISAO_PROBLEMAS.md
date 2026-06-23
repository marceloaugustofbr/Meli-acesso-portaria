# Revisão de Problemas — Meli Acesso Portaria

> Gerado em 22/06/2026 após migração para Cloudflare Workers

## 🔴 Crítico

| # | Problema | Local | Impacto |
|---|----------|-------|---------|
| CR-1 | **Token de sessão da portaria sem assinatura criptográfica** | `workers/api/src/index.js:164-168` | `btoa(JSON.stringify(...))` é base64, não assinatura. Qualquer um pode decodificar e forjar tokens com qualquer `expiresAt`. |
| CR-2 | **PIN armazenado e comparado em plaintext** | `workers/api/src/index.js:152-158` | PINs são comparados diretamente (`!==`). Sem hash (bcrypt/PBKDF2). Se o banco vazar, todos os PINs são legíveis. |
| CR-3 | **CRUD de usuários ainda é client-side via Realtime Database** | `src/state/actions/users.js` + `src/state/api/rtdb.js` | Operações de usuário (criar, listar, editar, deletar) bypassam o Worker completamente. O Worker só valida exames/portaria. |

## 🟠 Alto

| # | Problema | Local | Impacto |
|---|----------|-------|---------|
| HR-1 | `REACT_APP_PORTARIA_PIN=1234` no `.env` compilado no bundle JS | `.env:10` | PIN do portaria embutido no código-fonte do frontend. Embora não seja mais referenciado, qualquer pessoa com DevTools pode ler. |
| HR-2 | Endpoints `seed` e `cloudinary/sign` sem autenticação | `index.js:186` e `index.js:488` | `handleSeedQuestions` e `handleCloudinarySign` não exigem `requireAdmin`. Qualquer um pode semear questões ou obter assinatura Cloudinary. |
| HR-3 | `handleDeleteUser` não revoga conta Firebase Auth | `index.js:552-558` | Deleta apenas o documento Firestore. O usuário ainda consegue fazer login com email/senha. |
| HR-4 | CSP discrepante entre meta tag e header HTTP | `public/index.html` vs `firebase.json` | Meta tag tem `'unsafe-eval'`, header HTTP não. O navegador aplica a política mais restritiva — se o app depender de `eval()`, quebra em produção. |
| HR-5 | `mapFirestoreDoc` duplicado com `FirestoreClient._docToObj` | `index.js:598-620` e `firestore.js:171-194` | Duas implementações quase idênticas do mesmo mapeador Firestore → JS. Qualquer mudança precisa ser replicada em ambos. |

## 🟡 Médio

| # | Problema | Local | Descrição |
|---|----------|-------|-----------|
| MR-1 | SHA-1 manual de 98 linhas desnecessário | `cloudinary.js:22-119` | Workers suportam `crypto.subtle.digest('SHA-1', ...)`. A implementação manual é maior, mais lenta e não trata surrogate pairs. |
| MR-2 | `request.json()` sem proteção em 5 endpoints | `index.js:147,227,392,489,515` | Se o body for JSON inválido, jogam exceção não tratada. Só o `try/catch` genérico do router salva. |
| MR-3 | Paginação ineficiente em `handleListExams` | `index.js:339-387` | Busca TODOS os documentos (~1000) via `pageSize=1000`, depois filtra em memória. Acima de 1000 documentos, a paginação quebra. |
| MR-4 | `generateSessionToken` exportado mas nunca usado | `auth.js:114-122` | Código morto. Gera pseudo-JWT fraco (concatenação de string, não HMAC). |
| MR-5 | `requireAuth` definido mas nunca chamado | `index.js:132-139` | Código morto. Todos os endpoints protegidos usam `requireAdmin`. |
| MR-6 | 23 questões de seed hardcoded no `index.js` | `index.js:192-216` | Poderiam estar em arquivo JSON separado para manter `index.js` mais enxuto. |
| MR-7 | Pasta `workers/api/` sem `.gitignore` | `workers/api/` | Arquivos locais do wrangler (`.wrangler/`, `node_modules/`) podem vazar no versionamento. |

## 🔵 Organização / Qualidade

| # | Problema | Local | Descrição |
|---|----------|-------|-----------|
| OR-1 | `index.js` monolítico (632 linhas) | `workers/api/src/index.js` | Roteador + 14 handlers + utils + mappers tudo no mesmo arquivo. Dificulta manutenção. |
| OR-2 | `questionsService.js` é pass-through sem valor | `src/services/questionsService.js` | 7 linhas, 1 método que delega 1:1 para `apiService.getQuestions()`. Poderia ser removido. |
| OR-3 | `examService.js` tem 8/10 métodos que são 1:1 delegates | `src/services/examService.js` | Apenas `getLatestPage` e `countByCpf` agregam valor. O resto é camada de indireção desnecessária. |
| OR-4 | 5 blocos de resultado quase idênticos na Portaria | `src/pages/Portaria/index.jsx:278-492` | apto/reprovado/bloqueado/nao_encontrado/erro têm mesma estrutura (ícone + heading + texto + botão). |
| OR-5 | `.env` com `databaseURL` vazio e typo `MEASURMENT_ID` | `.env` | `REACT_APP_FIRE_BASE_DB_URL` está vazio. `REACT_APP_FIRE_BASE_MEASURMENT_ID` tem typo (MEASUREMENT). |
| OR-6 | `REACT_APP_LOGIN_PAGE_URL=http://localhost:3000` fixo | `.env` | Links de criação de usuário apontam para localhost em produção. |
| OR-7 | TODO não resolvido em `firestore.rules` | `firestore.rules:6` | `// TODO: Apos deploy do Worker, remover accessos diretos do cliente` — indica migração incompleta. |
| OR-8 | Configuração residual de Cloud Functions | `firebase.json:50-56` | `"source": "functions"` ainda presente, mas Cloud Functions não são usadas (plano Spark). |

## Resumo

| Severidade | Quantidade |
|------------|-----------|
| 🔴 Crítico | 3 |
| 🟠 Alto | 5 |
| 🟡 Médio | 7 |
| 🔵 Organização | 8 |
| **Total** | **23** |
