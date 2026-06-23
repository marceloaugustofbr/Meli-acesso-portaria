# Migração de Segurança: Firebase → CloudFlare Workers

## Motivação

O projeto estava no plano **Firebase Spark** (gratuito), que **não suporta Cloud Functions**. Isso deixava toda a validação server-side de lado — PIN da portaria, cálculo de notas, bloqueio de usuários, exposição de respostas corretas, etc. — executada diretamente no navegador do cliente, com regras do Firestore permissivas demais.

## O que foi feito

### 1. Análise de Segurança (Auditoria)

Foram identificados **7 pontos críticos**, **6 altos** e **7 médios**. Os principais:

| # | Problema | Risco |
|---|----------|-------|
| C-1 | PIN da portaria em Firestore com leitura pública | Qualquer um na internet lê o PIN |
| C-2 | `latest_exams` com criação mundial | Qualquer um pode criar/falsificar exames |
| C-3 | Nota do exame calculada 100% no cliente | Alguém com DevTools pode se auto-aprovar |
| C-4 | Mapeamento UID → CPF exposto | Vazamento de CPFs (LGPD) |
| C-5 | Bloqueio/desbloqueio sem autorização | Qualquer user logado pode bloquear colega |
| C-6 | `questions` expõe `correctAnswer` | Aluno lê as respostas corretas pelo DevTools |
| C-7 | Cloud Functions existem mas nunca rodam (Spark) | Criação de usuário quebrada, admin claims nunca setados |

### 2. Arquitetura Implementada

```
Antes:  React App ──→ Firestore (regras frouxas, cliente faz tudo)
Depois: React App ──→ CloudFlare Worker ──→ Firestore (Admin SDK)
                      (valida tudo server-side)
```

O Worker usa **Service Account JWT** para autenticar via **Firestore REST API**, ganhando acesso de administrador (bypassa as regras de segurança, usa IAM).

### 3. Estrutura de Arquivos Criados

```
workers/
  api/
    wrangler.toml              # Config do Worker (nome, rotas, vars)
    package.json               # Dependências (wrangler)
    .env.example               # Exemplo de variáveis de ambiente
    src/
      index.js                 # Worker principal (14 handlers)
      firestore.js             # Cliente Firestore REST API (JWT + OAuth2)
      auth.js                  # Verificação de tokens Firebase (JWKS)
      cloudinary.js            # Geração de assinatura SHA-1 para uploads

src/services/
  apiService.js                # [NOVO] Interface frontend → Worker
  examService.js               # [REFATORADO] Delega tudo ao apiService
  storageService.js            # [REFATORADO] Upload assinado via Worker
  questionsService.js          # [REFATORADO] Questões sem correctAnswer
```

### 4. Endpoints do Worker

| Método | Rota | Função | Segurança |
|--------|------|--------|-----------|
| `POST` | `/api/portaria/verify-pin` | Validar PIN da portaria | PIN nunca sai do servidor |
| `GET` | `/api/questions` | Listar questões (sem `correctAnswer`) | Respostas nunca vão pro cliente |
| `POST` | `/api/questions/seed` | Popular questões no Firestore | - |
| `POST` | `/api/exams` | Criar exame com cálculo server-side | Nota é calculada no servidor |
| `GET` | `/api/exams/cpf/:cpf` | Buscar exame por CPF | - |
| `GET` | `/api/exams/uid/:uid` | Buscar exame por UID | - |
| `GET` | `/api/exams` | Listar exames (paginado + filtros) | - |
| `POST` | `/api/exams/:cpf/block` | Bloquear usuário | Requer token Firebase admin |
| `POST` | `/api/exams/:cpf/unblock` | Desbloquear usuário | Requer token Firebase admin |
| `GET` | `/api/aggregation` | Estatísticas do dashboard | - |
| `POST` | `/api/recalculate` | Recalcular agregações | Requer token Firebase admin |
| `POST` | `/api/cloudinary/sign` | Assinatura para upload no Cloudinary | Upload assinado, não anônimo |
| `POST` | `/api/admin/users` | Criar usuário | Requer token Firebase admin |
| `DELETE` | `/api/admin/users/:uid` | Deletar usuário | Requer token Firebase admin |

### 5. Arquivos Modificados no Frontend

| Arquivo | Mudança |
|---------|---------|
| `src/services/examService.js` | Antes: lia/escrevia Firestore direto. Agora: delega tudo ao `apiService` (que chama o Worker) |
| `src/services/storageService.js` | Antes: upload unsigned para Cloudinary. Agora: pega assinatura do Worker e faz upload signed |
| `src/services/questionsService.js` | Antes: lia `questions` do Firestore (com `correctAnswer`). Agora: chama Worker que retorna sem `correctAnswer` |
| `src/services/index.js` | + export `apiService` |
| `src/pages/Login/index.jsx` | Removeu `seedPortariaPin()` e import do firestore |
| `src/pages/Portaria/index.jsx` | PIN agora validado via Worker, não lê Firestore direto |
| `firestore.rules` | Regras restritivas (só Admin SDK via Worker consegue escrever) |
| `.env` | + `REACT_APP_API_URL` |
| `.gitignore` | + `workers/**/.env`, node_modules |

### 6. Passos para Configurar o Worker

#### 6.1 Firebase — Service Account

1. Firebase Console → Configurações → Contas de serviço → Gerar nova chave privada
2. Extrair `client_email` e `private_key` do JSON baixado

#### 6.2 Cloudinary — API Key e Secret

1. Dashboard do Cloudinary → Account Details
2. Copiar `API Key` e `API Secret`

#### 6.3 Configurar Secrets no Worker

```bash
cd workers/api
npx wrangler secret put FIREBASE_CLIENT_EMAIL
npx wrangler secret put FIREBASE_PRIVATE_KEY
npx wrangler secret put FIREBASE_API_KEY
npx wrangler secret put CLOUDINARY_API_KEY
npx wrangler secret put CLOUDINARY_API_SECRET
npx wrangler secret put CLOUDINARY_CLOUD_NAME
npx wrangler secret put CLOUDINARY_UPLOAD_PRESET
```

#### 6.4 Deploy

```bash
npx wrangler deploy
```

#### 6.5 Atualizar Frontend

```env
REACT_APP_API_URL=https://safeaccess-api.seusubdominio.workers.dev
```

### 7. Tecnologias Utilizadas

- **CloudFlare Workers** — runtime serverless (V8 isolates)
- **Firestore REST API** — comunicação via HTTP, sem SDK
- **Service Account JWT** — autenticação OAuth2 para acesso admin ao Firestore
- **JWKS (JSON Web Key Set)** — verificação de tokens Firebase ID
- **SHA-1** — assinatura de uploads Cloudinary

### 8. Benefícios

| Antes | Depois |
|-------|--------|
| PIN da portaria legível por qualquer um | PIN validado server-side |
| Nota do exame fraudável via DevTools | Nota calculada no Worker |
| Respostas corretas expostas no cliente | `correctAnswer` nunca chega ao frontend |
| Bloqueio/desbloqueio sem autorização | Requer token Firebase com role admin |
| Upload anônimo no Cloudinary | Upload assinado (signed) |
| Firestore rules permissivas | Regras bloqueadas, só Admin SDK acessa |
| Dependência de Cloud Functions (Spark) | Zero dependência, Worker gratuito |
