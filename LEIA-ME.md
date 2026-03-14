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
2. Abre o projeto `calendario-trabalho-39a6c`
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
| `auth.js` | Verifica sessão em todas as páginas protegidas. Redireciona para `login.html` se não autenticado. Expõe `window.userProfile`, `window.isAdmin()`, `window.temPermissao()`, `window.escritorioAtivo()`. Injeta a mini-navbar com nome, role e botão logout. |
| `auditoria.js` | Módulo de audit log. Expõe `window.registarAuditoria()`. Calcula automaticamente o diff antes/depois. Deve ser incluído depois de `auth.js` em todas as páginas protegidas. |
| `config-escritorios.js` | Carrega a lista de escritórios do Firestore (`config/escritorios`). Expõe `window.loadEscritorios()`, `window.getEscritoriosSync()`, `window.nomeEscritorio()` e `window.escritoriosValidos()`. |

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

### Páginas protegidas

**`dashboard.html`**
- Painel geral com resumo de todos os módulos
- Painéis com drag-and-drop (layout personalizável e guardado localmente)
- Cada painel pode ser alargado/estreitado individualmente
- Mostra: comunicados recentes, tarefas ativas, processos de admissão/cessação, reclamações em aberto
- Admin: filtro de escritório na navbar (ver todos ou filtrar por um)
- Colaborador: vê apenas dados do seu escritório

**`tarefas.html`**
- Listagem e criação de tarefas
- Filtro por escritório (dinâmico)
- Permissões: `criarTarefas`, `resolverTarefas`
- Audit log: criação, atualização de estado, eliminação ✔

**`comunicados.html`**
- Comunicados internos por escritório
- Só quem tem `gerirComunicados` (ou admin) vê o botão "Novo comunicado"
- Filtro por escritório (dinâmico)
- ⚠️ Audit log ainda não implementado neste módulo

**`admissoes.html`**
- Processos de admissão e cessação de colaboradores
- Suporte a anexos de ficheiros
- Permissões: `criarAdmissoes`, `resolverAdmissoes`
- Filtro por escritório (dinâmico)
- Audit log: criação, atualização, mudança de estado, eliminação ✔

**`reclamacoes.html`**
- Área interna de gestão das reclamações de horas
- Exportação para Excel e PDF
- Suporte a anexos de ficheiros
- Permissão: `criarReclamacoes`
- Filtro por escritório (dinâmico)
- Audit log: criação, atualização, eliminação ✔

**`calendario.html`**
- Calendário de carga de trabalho por escritório
- Permissão de edição: `editarCalendario`
- Lê o escritório ativo dinamicamente; admin pode alternar entre escritórios

### Páginas de administração (só admins)

**`definicoes.html`**
- Hub de administração com acesso rápido a:
  - Gestão de utilizadores (preview + link para `utilizadores.html`)
  - Gestão de escritórios (edição inline da lista no Firestore)
  - Gestão de calendários (link para `gerir-calendarios.html`)
  - Auditoria (link para `auditoria.html`)

**`utilizadores.html`**
- Listagem completa de utilizadores com filtros por role e escritório
- Edição de role, escritório, função e estado (ativo/inativo)
- Gestão individual de permissões granulares
- Audit log: alterações de permissão ✔ (via `auditoria.js`)

**`gerir-calendarios.html`**
- Publicar feriados nacionais em múltiplos calendários de uma vez
- Publicar eventos personalizados em múltiplos calendários
- Apagar eventos em massa
- Ver e pesquisar eventos por escritório

**`auditoria.html`**
- Histórico completo de alterações em todos os módulos
- Filtros por módulo, ação, escritório e intervalo de datas
- Mostra diff campo a campo (antes → depois)
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

Os admins têm todas as permissões automaticamente (sem necessidade de as ativar).

---

## 📋 Estrutura de dados no Firestore

| Coleção / Documento | Conteúdo |
|---|---|
| `utilizadores/{uid}` | Perfil do utilizador: nome, email, escritório, role, ativo, permissoes, etc. |
| `tarefas/{id}` | Tarefas com escritório, estado, criadoPor, etc. |
| `comunicados/{id}` | Comunicados com escritório e estado |
| `admissoes/{id}` | Processos de admissão/cessação com escritório |
| `reclamacoes/{id}` | Reclamações de horas com períodos, turnos e ficheiros |
| `config/escritorios` | Lista de escritórios: `{ lista: [{id, nome, cor, default}] }` |
| `auditoria/{id}` | Entradas do audit log com diff, módulo, ação, uid, ts |

Todos os documentos criados a partir de agora incluem:
- `escritorio` — ex: `"lisboa"`, `"porto"`, `"albufeira"`, `"quarteira"`
- `criadoPor` — UID do utilizador que criou

---

## ⚠️ Estado atual e pontos de atenção

- **Audit log em `comunicados.html`** — ainda não implementado (os restantes módulos já têm).
- **Audit log em `calendario.html`** — ainda não implementado.
- **`reclamacao-publica.html`** — página pública sem autenticação; qualquer pessoa com o link pode aceder. Confirma que o link não está exposto publicamente se não for essa a intenção.
- **Documentos antigos sem `escritorio`** — continuam a aparecer apenas para admins. Para os tornar visíveis a colaboradores, edita o campo `escritorio` manualmente no Firestore.

---

## ✅ Próximos passos sugeridos

- [ ] Adicionar audit log a `comunicados.html`
- [ ] Adicionar audit log a `calendario.html`
- [ ] Rever exposição pública de `reclamacao-publica.html`
- [ ] Migrar documentos antigos sem campo `escritorio`
- [ ] Testar fluxo completo com utilizador colaborador (sem permissões de admin)
