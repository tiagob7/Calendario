# 📁 Estrutura do Projeto — Algartempo · Gestão Interna

## Onde colocar os ficheiros

Todos os ficheiros devem ficar na **mesma pasta** do teu projeto GitHub.
Não cries subpastas — tudo na raiz.

```
Calendario/                    ← pasta raiz do teu repositório GitHub
│
├── firebase-init.js           ← configuração partilhada do Firebase
├── auth.js                    ← módulo de autenticação partilhado
├── auditoria.js               ← módulo de audit log partilhado
├── config-escritorios.js      ← lista de escritórios (lida do Firestore)
├── utils.js                   ← utilitários partilhados
├── styles.css                 ← CSS partilhado entre todas as páginas
│
├── login.html                 ← página de login/registo (pública)
├── reclamacao-publica.html    ← portal do trabalhador (público, sem login)
│
├── dashboard.html             ← painel geral
├── tarefas.html               ← gestão de tarefas
├── comunicados.html           ← comunicados internos
├── admissoes.html             ← admissões e cessações
├── reclamacoes.html           ← reclamações de horas (área interna)
├── calendario.html            ← calendário de carga de trabalho
│
├── definicoes.html            ← administração do sistema (só admins)
├── utilizadores.html          ← gestão de utilizadores (só admins)
├── gerir-calendarios.html     ← gestão avançada de calendários (só admins)
└── auditoria.html             ← histórico de alterações (só admins)
```

---

## ⚙️ Configuração Firebase (obrigatório antes de testar)

### 1. Ativar Firebase Authentication

1. Vai a https://console.firebase.google.com
2. Abre o projeto
3. Menu lateral → **Authentication** → **Sign-in method**
4. Ativa **Email/Password**
5. Guarda

### 2. Criar o primeiro utilizador Admin

**Opção A — Pelo login.html (mais fácil)**
1. Abre `login.html` no browser
2. Clica em "Criar conta"
3. Preenche os dados e escolhe o escritório
4. A conta é criada como "Colaborador" por defeito

**Opção B — Pelo Firebase Console**
1. Authentication → Users → Add user
2. Preenche email e password

**Promover a Admin:**
1. Firebase Console → Firestore Database → coleção `utilizadores`
2. Encontra o documento pelo email
3. Edita o campo `role` de `"colaborador"` para `"admin"`
4. Guarda

### 3. Configurar os escritórios

Os escritórios por defeito são: **Quarteira, Albufeira, Lisboa, Porto**.
Para personalizar, vai a `definicoes.html` → secção **Escritórios** (ou edita
diretamente `Firestore → config/escritorios`). Todos os módulos lêem esta
lista dinamicamente via `config-escritorios.js`.

---

## 🧪 Como testar localmente

Com a extensão "Live Server" no VS Code:
1. Abre a pasta do projeto no VS Code
2. Clica com botão direito em `login.html`
3. "Open with Live Server"
4. O browser abre em `http://127.0.0.1:5500/login.html`

---

## 📄 Descrição de cada ficheiro

### Módulos partilhados (JS)

| Ficheiro | Função |
|---|---|
| `firebase-init.js` | Inicializa o Firebase (evita duplicações). Expõe `window.firebaseAuth` e `window.firebaseDb`. |
| `utils.js` | Utilitários partilhados: `escHtml()`, `toast()`, `setStatus()`, `fmtShort()`, `fmtDateFull()`, `fmtData()`, `fmtDataHora()`, `confirmar()`. Incluir antes de `auth.js` em todas as páginas. |
| `auth.js` | Verifica sessão em todas as páginas protegidas. Redireciona para `login.html` se não autenticado. Expõe `window.userProfile`, `window.isAdmin()`, `window.temPermissao()`, `window.escritorioAtivo()`. Injeta a mini-navbar com nome, role e botão logout. |
| `auditoria.js` | Módulo de audit log. Expõe `window.registarAuditoria()`. Calcula automaticamente o diff antes/depois. Incluir depois de `auth.js` em todas as páginas protegidas. |
| `config-escritorios.js` | Carrega a lista de escritórios do Firestore (`config/escritorios`). Expõe `window.loadEscritorios()`, `window.getEscritoriosSync()`, `window.nomeEscritorio()` e `window.escritoriosValidos()`. |
| `styles.css` | CSS partilhado: variáveis, botões, formulários, toasts, modais e outros componentes comuns. |

**Ordem de carregamento obrigatória em cada página protegida:**
```html
<!-- 1. SDKs Firebase (CDN) -->
<script src="https://www.gstatic.com/firebasejs/9.23.0/firebase-app-compat.js"></script>
<script src="https://www.gstatic.com/firebasejs/9.23.0/firebase-auth-compat.js"></script>
<script src="https://www.gstatic.com/firebasejs/9.23.0/firebase-firestore-compat.js"></script>
<!-- 2. Módulos partilhados -->
<script src="firebase-init.js"></script>
<script src="utils.js"></script>
<script src="auth.js"></script>
<script src="auditoria.js"></script>
<script src="config-escritorios.js"></script>
```

### Páginas públicas (sem login)

**`login.html`**
- Formulário de login (email + password)
- Formulário de registo (nome, apelido, escritório, função, password)
- Recuperação de password por email
- Redireciona automaticamente para `dashboard.html` se já autenticado

**`reclamacao-publica.html`** *(sem autenticação)*
- Portal do trabalhador para submeter reclamações de horas
- Acesso por código pessoal (não requer conta Firebase)
- Preenche períodos e turnos detalhados
- Escolhe escritório a partir da lista dinâmica do Firestore
- Reclamações submetidas ficam visíveis em `reclamacoes.html`
- Rate limiting por sessão: máx. 3 submissões, cooldown de 60s entre submissões

### Páginas protegidas

**`dashboard.html`**
- Painel geral com resumo de todos os módulos
- Painéis com drag-and-drop (layout personalizável, guardado localmente)
- Mostra: comunicados recentes, tarefas ativas, admissões/cessações, reclamações em aberto
- 6 listeners com `.limit()` e gestão de `unsubscribe` via `unsubFns[]`
- Admin: filtro de escritório; Colaborador: vê só o seu escritório

**`tarefas.html`**
- Listagem e criação de tarefas, filtro por escritório
- Permissões: `criarTarefas`, `resolverTarefas`
- Audit log: criação, estado, eliminação ✔
- Listener com `.limit(200)` + `unsubscribe` no `beforeunload`

**`comunicados.html`**
- Comunicados internos, filtro por escritório
- Só quem tem `gerirComunicados` (ou admin) pode criar
- Audit log: criação, arquivar/restaurar, eliminação ✔
- Listener com `.limit(200)`

**`admissoes.html`**
- Processos de admissão e cessação, suporte a anexos
- Permissões: `criarAdmissoes`, `resolverAdmissoes`
- Audit log: criação, atualização, estado, eliminação ✔
- Listener com `.limit(200)` + `unsubscribe` no `beforeunload`

**`reclamacoes.html`**
- Gestão interna de reclamações de horas, exportação Excel/PDF, anexos
- Permissão: `criarReclamacoes`
- Audit log: criação, estado, eliminação ✔
- Listener com `.limit(200)` + `unsubscribe` no `beforeunload`

**`calendario.html`**
- Calendário de carga de trabalho por escritório, navegação por mês
- Editor de intensidade por departamento, eventos e cores
- Permissão de edição: `editarCalendario`
- Audit log: intensidade, eventos, departamentos ✔

### Páginas de administração (só admins)

**`definicoes.html`**
- Hub de administração: utilizadores, escritórios, calendários, auditoria

**`utilizadores.html`**
- Listagem, edição de role/escritório/função/estado e permissões granulares
- Audit log: permissões ✔
- Listener com `.limit(500)` + `unsubscribe` no `beforeunload`

**`gerir-calendarios.html`**
- Publicar feriados e eventos em múltiplos calendários de uma vez
- Apagar eventos em massa, ver/pesquisar por escritório
- Operações protegidas com `try/catch/finally` — botões sempre reativados

**`auditoria.html`**
- Histórico completo com filtros e diff campo a campo
- Paginação com `startAfter` (carrega por páginas)
- Acesso restrito a admins

---

## 🔐 Sistema de permissões

| Permissão | O que permite |
|---|---|
| `criarTarefas` | Criar novas tarefas |
| `resolverTarefas` | Marcar tarefas como resolvidas / alterar estado |
| `gerirComunicados` | Criar, editar e arquivar comunicados |
| `criarAdmissoes` | Criar novos processos de admissão/cessação |
| `resolverAdmissoes` | Alterar estado de processos de admissão/cessação |
| `editarCalendario` | Editar eventos no calendário de trabalho |
| `criarReclamacoes` | Criar reclamações de horas na área interna |

Os admins têm todas as permissões automaticamente.

---

## 📋 Estrutura de dados no Firestore

| Coleção / Documento | Conteúdo |
|---|---|
| `utilizadores/{uid}` | Perfil: nome, email, escritório, role, ativo, permissoes |
| `tarefas_todo/{id}` | Tarefas com escritório, estado, ordemChegada, criadoPor |
| `comunicados/{id}` | Comunicados com escritório, destinosEscritorio, tipo, arquivado |
| `admissoes/{id}` | Processos com escritório, estado, ficheiros |
| `reclamacoes_horas/{id}` | Reclamações com períodos, turnos, histórico, ficheiros |
| `calendarios/{id}` | Calendário por escritório/ano/mês — ID: `calendario_{esc}_{ano}_{mm}` |
| `config/escritorios` | Lista: `{ lista: [{id, nome, cor, default}] }` |
| `auditoria/{id}` | Entradas do log com diff, módulo, ação, uid, ts |

Todos os documentos incluem `escritorio` (ex: `"lisboa"`) e `criadoPor` (UID).

---

## ⚠️ Pontos de atenção atuais

- **Documentos antigos sem `escritorio`** — aparecem apenas para admins. Editar manualmente no Firestore se necessário.
- **`reclamacao-publica.html`** — rate limiting apenas por sessão (reset ao recarregar). Sem Firestore Security Rules nem Firebase App Check (a implementar futuramente).

---

## ✅ Próximos passos sugeridos (por prioridade)

- [ ] Implementar Firestore Security Rules
- [ ] Adicionar Firebase App Check a `reclamacao-publica.html`
- [ ] Migrar documentos antigos sem campo `escritorio`
