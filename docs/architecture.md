# SafeAccess - Arquitetura do Projeto

## Visão Geral

Três fluxos independentes, cada um com seu próprio método de autenticação:

```
┌─────────────────────────────────────────────────────────┐
│                    Cloudflare Worker                     │
│              safeaccess-api.marcelo-a-freitasbr.workers.dev              │
│                                                         │
│  GET/POST /api/exams/*    (público)                     │
│  POST /api/portaria/*     (PIN + HMAC JWT)              │
│  POST /api/exams/*/block  (Firebase Auth + isAdmin)     │
│  POST /api/exams/*/unblock                              │
│  POST /api/admin/users    (Firebase Auth + isAdmin)     │
│  POST /api/recalculate    (Firebase Auth + isAdmin)     │
└──────────────────────┬──────────────────────────────────┘
                       │
                  Firestore (REST API com service account)
```

---

## 1. Fluxo Público — Exam/*

**Finalidade:** Pessoas fazem a provinha antes de entrar na operação.

**Autenticação:** Nenhuma. Rota pública.

**Proteção:** `ExamGuard` controla progresso via `sessionStorage` (navegador). Sem Firebase Auth.

**Endpoints chamados:**
- `POST /api/exams` — cria/submete prova (público)
- `GET /api/questions` — lista questões (público)

**Armazenamento:** Cada prova vira um documento em `latest_exams/{cpf}` no Firestore.

**Escalabilidade:** Não cria usuários no Firebase Auth. 10k+ provas = 10k+ documentos em `latest_exams`, zero usuários.

---

## 2. Fluxo Portaria

**Finalidade:** Portaria consulta se a pessoa pode acessar a operação.

**Autenticação:** PIN numérico de 4+ dígitos. Gera token HMAC-SHA256 JWT com validade de 8h.

**Proteção:**
- PIN configurado no Firestore (`config/portaria.pin`)
- Token armazenado em `sessionStorage`
- Rate limit: 5 tentativas a cada 30s (client-side)

**Endpoints chamados:**
- `POST /api/portaria/verify-pin` — valida PIN, retorna token
- `GET /api/exams/cpf/{cpf}` — consulta resultado (requer token da portaria)

**Armazenamento:** PIN em `config/portaria`. Exames em `latest_exams/{cpf}`.

---

## 3. Fluxo Admin — Login + Dashboard

**Finalidade:** Administradores acessam dados, bloqueiam/desbloqueiam colaboradores.

**Autenticação:** Firebase Auth com email + senha.

**Proteção:**
- `ProtectedRoute` — redireciona para `/login` se não autenticado
- **Server-side:** `requireAdmin()` no Worker valida token + Firestore (`users/{uid}.isAdmin`)

**Endpoints protegidos (requerem `isAdmin = true`):**
| Endpoint | Método | Função |
|----------|--------|--------|
| `/api/exams/{cpf}/block` | POST | Bloquear colaborador |
| `/api/exams/{cpf}/unblock` | POST | Desbloquear colaborador |
| `/api/admin/users` | POST | Criar novo usuário admin |
| `/api/admin/users/{uid}` | DELETE | Remover usuário admin |
| `/api/recalculate` | POST | Recalcular estatísticas |
| `/api/questions/seed` | POST | Semear questões iniciais |

### Auto-Bootstrap do Primeiro Admin

Quando não existe **nenhum** documento na coleção `users` do Firestore, o Worker cria automaticamente o documento do primeiro usuário que chamar um endpoint admin, tornando-o admin.

**Fluxo:**
```
Usuário logado → clica em "Bloquear"
  → Worker recebe POST /api/exams/{cpf}/block
  → requireAdmin() verifica Firebase token
  → Busca users/{uid} no Firestore → não existe
  → Lista coleção users → vazia
  → Cria users/{uid} com isAdmin: true automaticamente
  → Executa o bloqueio
```

**Por que é seguro:**
- O dashboard só é acessível com email+senha válidos (Firebase Auth)
- `ProtectedRoute` bloqueia não autenticados
- Após o primeiro admin ser criado, o auto-bootstrap nunca mais acontece

---

## Admin Layout

O `AdminLayout` é um wrapper usado por todas as páginas admin:
- Navbar com link para Dashboard + botão "Sair"
- Não faz verificação de `isAdmin` (a verificação é server-side no Worker)
- Usa `authService.logout()` → `firebase.auth().signOut()`

---

## Bloqueio de Colaborador

**Frontend:** Modal no Dashboard → `examService.blockUser(cpf, { blockedBy, blockReason })` → `apiService.blockUser()` → `getIdToken()` + `POST /api/exams/{cpf}/block`

**Worker (`handleBlockUser`):**
1. `requireAdmin()` — verifica token + admin
2. Atualiza `latest_exams/{cpf}` com `{ status: 'blocked', blockedAt, blockedBy, blockReason }`

**Desbloqueio:** Mesmo fluxo, `handleUnblockUser` restaura status original (approved/reproved).

---

## Criação de Usuários Admin

Endpoint `POST /api/admin/users` (requer admin):
- Cria usuário no Firebase Auth REST API (`accounts:signUp`)
- Salva documento em `users/{localId}` com `isAdmin: true/false`

---

## Variáveis de Ambiente

### Frontend (`.env`)
```
REACT_APP_API_URL=https://safeaccess-api.marcelo-a-freitasbr.workers.dev
REACT_APP_FIRE_BASE_KEY=...
REACT_APP_FIRE_BASE_PROJECT_ID=safeaccessdhl
...
```

### Worker (`wrangler.toml` + secrets)
```
FIREBASE_PROJECT_ID=safeaccessdhl
FIREBASE_CLIENT_EMAIL=... (secret)
FIREBASE_PRIVATE_KEY=... (secret)
FIREBASE_API_KEY=... (secret)
SESSION_SECRET=... (secret)
CLOUDINARY_API_KEY=... (secret)
CLOUDINARY_API_SECRET=... (secret)
```

---

## Desenvolvimento Local

```bash
# Terminal 1: Frontend React
cd caminho/do/projeto
npm start                    # → localhost:3000

# Terminal 2: Worker (se for testar local)
cd workers/api
npx wrangler dev             # → localhost:8787
# E mudar .env: REACT_APP_API_URL=http://localhost:8787
```

Para deploy do Worker:
```bash
cd workers/api
npm run deploy               # wrangler deploy
```
