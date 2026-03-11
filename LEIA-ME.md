# 📁 Estrutura do Projeto — Calendário de Trabalho

## Onde colocar os ficheiros

Todos os ficheiros devem ficar na MESMA PASTA do teu projeto GitHub.
Não cries subpastas — tudo na raiz.

```
Calendario/               ← pasta raiz do teu repositório GitHub
│
├── auth.js               ← ⭐ NOVO — módulo de autenticação partilhado
├── login.html            ← ⭐ NOVO — página de login/registo
│
├── dashboard.html        ← ✅ ATUALIZADO — filtra por escritório
├── tarefas.html          ← ✅ ATUALIZADO — filtra por escritório
├── comunicados.html      ← ✅ ATUALIZADO — filtra por escritório
├── admissoes.html        ← ✅ ATUALIZADO — filtra por escritório
│
├── calendario_albufeira.html   ← por atualizar (fase seguinte)
├── calendario_lisboa.html      ← por atualizar (fase seguinte)
├── calendario_porto.html       ← por atualizar (fase seguinte)
└── calendario_quarteira.html   ← por atualizar (fase seguinte)
```

---

## ⚙️ Configuração Firebase (obrigatório antes de testar)

### 1. Ativar Firebase Authentication

1. Vai a https://console.firebase.google.com
2. Abre o projeto "calendario-trabalho-39a6c"
3. No menu lateral → **Authentication** → **Sign-in method**
4. Ativa **Email/Password**
5. Guarda

### 2. Criar o primeiro utilizador Admin

Tens duas opções:

**Opção A — Pelo login.html (mais fácil)**
1. Abre login.html no browser
2. Clica em "Criar conta"
3. Preenche os dados e escolhe o escritório
4. A conta é criada como "Colaborador" por defeito

**Opção B — Pelo Firebase Console**
1. Authentication → Users → Add user
2. Preenche email e password

**Depois tens de promover a Admin:**
1. Vai ao Firebase Console → Firestore Database
2. Abre a coleção `utilizadores`
3. Encontra o documento do teu utilizador (pelo email)
4. Edita o campo `role` de `"colaborador"` para `"admin"`
5. Guarda

---

## 🧪 Como testar localmente

Se tens o VS Code com a extensão "Live Server":
1. Abre a pasta do projeto no VS Code
2. Clica com botão direito em `login.html`
3. "Open with Live Server"
4. O browser abre em http://127.0.0.1:5500/login.html

Se não tens Live Server, instala a extensão:
VS Code → Extensions → pesquisa "Live Server" → Instalar

---

## 🔄 O que mudou em cada ficheiro

### auth.js (NOVO)
- Verifica se o utilizador está logado em TODAS as páginas
- Se não estiver → redireciona para login.html
- Expõe window.userProfile com os dados do utilizador
- Injeta a navbar no topo com nome, role e botão logout
- Admin: mostra filtros de escritório na navbar

### login.html (NOVO)
- Formulário de login (email + password)
- Formulário de registo (nome, escritório, função, password)
- Recuperação de password por email
- Redireciona automaticamente para dashboard.html se já estiver logado

### dashboard.html
- Agora requer login
- Filtra tarefas, comunicados e calendário pelo escritório do utilizador
- Admin pode ver todos os escritórios ou filtrar por um

### tarefas.html
- Agora requer login
- Preenche automaticamente o nome do utilizador no formulário
- Filtra tarefas pelo escritório
- Admin vê controlos de gestão sem precisar de PIN
- Novas tarefas ficam marcadas com o escritório do utilizador

### comunicados.html
- Agora requer login
- Só Admin vê o botão "Novo comunicado" (sem PIN)
- Filtra comunicados pelo escritório
- Novos comunicados ficam marcados com o escritório

### admissoes.html
- Agora requer login
- Preenche automaticamente o campo "submetido por"
- Admin entra automaticamente em modo gestor
- Filtra processos pelo escritório
- Novos processos ficam marcados com o escritório

---

## 📋 Campos novos no Firestore

Todos os documentos criados a partir de agora terão:
- `escritorio` — ex: "lisboa", "porto", "albufeira", "quarteira"
- `criadoPor` — UID do utilizador que criou

Os documentos antigos que não têm estes campos continuam a aparecer
para o Admin (sem filtro), mas podem não aparecer para Colaboradores.
Para corrigir, podes editar manualmente no Firebase Console.

---

## ❓ Próximos passos

1. [ ] Ativar Firebase Auth (Email/Password)
2. [ ] Colocar os ficheiros na pasta do projeto
3. [ ] Criar o primeiro utilizador e promover a Admin
4. [ ] Testar login e navegação
5. [ ] Unificar os 4 calendários num só (fase seguinte)
