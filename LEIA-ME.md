# Algartempo — Gestão Interna

Sistema interno de gestão multi-escritório para RH e operações. Construído com JavaScript puro + Firebase (sem framework).

---

## Funcionalidades

| Módulo | Descrição |
|---|---|
| **Dashboard** | Painel geral com painéis drag-and-drop, filtro por escritório, pesquisa global |
| **Tarefas** | Criação, filtro, estado e prioridade de tarefas por escritório |
| **Comunicados** | Comunicados internos por tipo (Geral, Urgente, Info, Aviso) |
| **Admissões** | Processos de admissão e cessação com anexos e "Modo Gestor" |
| **Reclamações** | Gestão de reclamações de horas, exportação Excel/PDF, anexos |
| **Calendário** | Editor de carga de trabalho por escritório/departamento/mês |
| **Escalas** | Gestão de escalas de trabalho |
| **Portal Público** | Submissão de reclamações sem login (acesso por código pessoal) |
| **Utilizadores** | Gestão de contas, roles e 7 permissões granulares |
| **Auditoria** | Histórico completo com diff campo a campo e paginação |
| **Voz (IA)** | Preenchimento de formulários por voz via Claude AI |

---

## Stack Tecnológico

- **Frontend:** HTML5, CSS3, JavaScript ES6+ (sem framework)
- **Auth:** Firebase Authentication (Email/Password)
- **Base de dados:** Firestore (real-time via `.onSnapshot()`)
- **Storage:** Firebase Storage (anexos)
- **IA:** Claude API (entrada por voz — `js/voz-ai.js`)
- **Tipografia:** DM Mono + Manrope (Google Fonts)

---

## Estrutura de Ficheiros

```
Calendario/
│
├── styles.css                    ← CSS global partilhado
│
├── css/                          ← CSS específico por página
│   ├── login.css
│   ├── dashboard.css
│   ├── tarefas.css
│   ├── comunicados.css
│   ├── admissoes.css
│   ├── reclamacoes.css
│   ├── calendario.css
│   ├── escalas.css
│   ├── definicoes.css
│   ├── utilizadores.css
│   ├── gerir-calendarios.css
│   └── auditoria.css
│
├── js/                           ← JavaScript por módulo
│   ├── firebase-init.js          ← configuração Firebase (partilhado)
│   ├── utils.js                  ← utilitários partilhados
│   ├── auth.js                   ← autenticação e navbar (partilhado)
│   ├── auditoria.js              ← registo de auditoria (partilhado)
│   ├── config-escritorios.js     ← lista de escritórios do Firestore
│   ├── voz-ai.js                 ← integração IA por voz
│   ├── login.js
│   ├── dashboard.js
│   ├── tarefas.js
│   ├── comunicados.js
│   ├── admissoes.js
│   ├── reclamacoes.js
│   ├── calendario.js
│   ├── escalas.js
│   ├── definicoes.js
│   ├── utilizadores.js
│   ├── gerir-calendarios.js
│   └── auditoria-page.js
│
├── login.html                    ← pública
├── reclamacao-publica.html       ← pública (sem login)
├── reclamacao-bot.html           ← portal alternativo (chatbot)
├── voz-teste.html                ← teste de voz
│
├── dashboard.html                ← protegida
├── tarefas.html
├── comunicados.html
├── admissoes.html
├── reclamacoes.html
├── calendario.html
├── escalas.html
│
├── definicoes.html               ← só admins
├── utilizadores.html
├── gerir-calendarios.html
└── auditoria.html
```

---

## Configuração Firebase

### 1. Ativar Authentication

1. [Firebase Console](https://console.firebase.google.com) → projeto
2. **Authentication → Sign-in method → Email/Password** → Ativar

### 2. Criar o primeiro Admin

**Via login.html (mais fácil):**
1. Abre `login.html` → "Criar conta"
2. Preenche os dados — conta criada como "Colaborador"

**Promover a Admin:**
1. Firestore → `utilizadores/{uid}` → campo `role`: `"colaborador"` → `"admin"`

**Via Firebase Console:**
1. Authentication → Users → Add user
2. Depois promover conforme acima

### 3. Configurar Escritórios

Escritórios por defeito: **Quarteira, Albufeira, Lisboa, Porto**

Para personalizar: `definicoes.html` → Escritórios
Ou editar diretamente: Firestore → `config/escritorios → lista`

---

## Testar Localmente

Com **VS Code + Live Server:**
1. Abre a pasta no VS Code
2. Botão direito em `login.html` → "Open with Live Server"
3. Abre em `http://127.0.0.1:5500/login.html`

---

## Ordem de Carregamento (páginas protegidas)

```html
<!-- 1. Firebase SDKs -->
<script src="https://www.gstatic.com/firebasejs/9.23.0/firebase-app-compat.js"></script>
<script src="https://www.gstatic.com/firebasejs/9.23.0/firebase-auth-compat.js"></script>
<script src="https://www.gstatic.com/firebasejs/9.23.0/firebase-firestore-compat.js"></script>
<!-- 2. CSS específico da página -->
<link rel="stylesheet" href="css/[pagina].css">
<!-- 3. Módulos partilhados (esta ordem é obrigatória) -->
<script src="js/firebase-init.js"></script>
<script src="js/utils.js"></script>
<script src="js/auth.js"></script>
<script src="js/auditoria.js"></script>
<script src="js/config-escritorios.js"></script>
<!-- 4. Script da página -->
<script src="js/[pagina].js"></script>
```

---

## Módulos Partilhados

| Ficheiro | Expõe | Função |
|---|---|---|
| `js/firebase-init.js` | `window.firebaseAuth`, `window.firebaseDb` | Inicializa Firebase (evita duplicados) |
| `js/utils.js` | `escHtml`, `toast`, `setStatus`, `fmtShort`, `fmtDateFull`, `fmtData`, `fmtDataHora`, `confirmar` | Utilitários: XSS escape, notificações, formatação de datas, modal de confirmação |
| `js/auth.js` | `window.userProfile`, `isAdmin()`, `temPermissao()`, `escritorioAtivo()`, `logout()`, `renderNavbar()` | Verifica sessão, redireciona para login, injeta navbar |
| `js/auditoria.js` | `registarAuditoria(modulo, acao, dados, antes, depois)` | Grava alterações no Firestore com diff automático |
| `js/config-escritorios.js` | `loadEscritorios()`, `getEscritoriosSync()`, `nomeEscritorio(id)`, `escritoriosValidos()` | Carrega lista de escritórios do Firestore |

---

## Sistema de Permissões

Admins têm todas as permissões automaticamente. Colaboradores têm apenas as permissões atribuídas em `utilizadores.html`.

| Permissão | Permite |
|---|---|
| `criarTarefas` | Criar novas tarefas |
| `resolverTarefas` | Alterar estado de tarefas |
| `gerirComunicados` | Criar, editar e arquivar comunicados |
| `criarAdmissoes` | Criar processos de admissão/cessação |
| `resolverAdmissoes` | Alterar estado de admissões/cessações |
| `editarCalendario` | Editar calendário de trabalho |
| `criarReclamacoes` | Criar reclamações internas de horas |

---

## Estrutura de Dados (Firestore)

| Coleção | Campos principais |
|---|---|
| `utilizadores/{uid}` | `nome`, `email`, `escritorio`, `role`, `ativo`, `permissoes{}` |
| `tarefas_todo/{id}` | `titulo`, `estado`, `prioridade`, `escritorio`, `ordemChegada`, `criadoPor` |
| `comunicados/{id}` | `titulo`, `tipo`, `escritorio`, `destinosEscritorio[]`, `arquivado` |
| `admissoes/{id}` | `tipo` (admissao/cessacao), `nome`, `estado`, `escritorio`, `ficheiros[]` |
| `reclamacoes_horas/{id}` | `nif`, `nome`, `periodos[]`, `turnos[]`, `estado`, `ficheiros[]` |
| `calendarios/{id}` | ID: `calendario_{esc}_{ano}_{mm}` — `intensidade{}`, `eventos[]`, `departamentos{}` |
| `config/escritorios` | `lista: [{id, nome, cor, default}]` |
| `auditoria/{id}` | `modulo`, `acao`, `diffAntes{}`, `diffDepois{}`, `criadoPor`, `ts` |

---

## Segurança e Limitações Conhecidas

| Item | Estado |
|---|---|
| Autenticação Firebase | Ativa em todas as páginas protegidas |
| Roles e permissões granulares | Implementados no frontend |
| Firestore Security Rules | **Não configuradas** — implementar antes de produção |
| Firebase App Check | **Não ativo** — necessário para `reclamacao-publica.html` |
| Portal público sem login | Rate limiting apenas por sessão (reset ao recarregar) |
| Documentos antigos sem `escritorio` | Visíveis só para admins; migrar manualmente se necessário |

> **Atenção:** As Firestore Security Rules são obrigatórias antes de colocar em produção. Sem elas, qualquer pessoa com as credenciais Firebase pode ler/escrever na base de dados.

---

## Próximos Passos

- [ ] **Firestore Security Rules** — restringir leitura/escrita por role e escritório
- [ ] **Firebase App Check** — proteger `reclamacao-publica.html` contra bots
- [ ] **Migração de dados** — adicionar campo `escritorio` a documentos antigos
- [ ] **Notificações push** — alertar utilizadores sobre novas tarefas/comunicados
- [ ] **Modo offline** — sincronização quando a ligação é restaurada
- [ ] **Exportação de relatórios** — expandir para admissões e calendário
- [ ] **Testes automatizados** — cobertura das funções de negócio críticas
