# Hub Algartempo

Base limpa da app interna Algartempo, organizada para continuar a crescer com HTML, CSS e JavaScript puro sobre Firebase.

---

## Base ativa

Os modulos atualmente ativos na raiz do projeto sao:

- `dashboard`
- `tarefas`
- `comunicados`
- `admissoes`
- `reclamacoes`
- `calendario`
- `utilizadores`
- `definicoes`
- `gerir-calendarios`
- `auditoria`

Estas paginas vivem na raiz e entram na navegacao principal atraves de [module-registry.js](C:/Users/Tiago/Documents/GitHub/hub-algartempo/js/module-registry.js).

---

## Arquivo de testes

A pasta [testes](C:/Users/Tiago/Documents/GitHub/hub-algartempo/testes) guarda prototipos e paginas fora do fluxo principal.

Neste momento inclui:

- `escalas.html`
- `reclamacao-bot.html`
- `reclamacao-bot2.html`
- `reclamacao-publica.html`
- `reclamacao-publica2.html`
- `seed.html`
- `seed2.html`
- `separador_recibos_v11.2.html`
- `voz-teste.html`

Nada dentro de `testes/` deve ser assumido como parte da base ativa da app.

---

## Estrutura

```text
hub-algartempo/
|
|-- .firebaserc
|-- firebase.json
|-- firestore.rules
|-- storage.rules
|-- styles.css
|-- login.html
|-- dashboard.html
|-- tarefas.html
|-- comunicados.html
|-- admissoes.html
|-- reclamacoes.html
|-- calendario.html
|-- utilizadores.html
|-- definicoes.html
|-- gerir-calendarios.html
|-- auditoria.html
|
|-- css/
|   |-- dashboard.css
|   |-- tarefas.css
|   |-- comunicados.css
|   |-- admissoes.css
|   |-- reclamacoes.css
|   |-- calendario.css
|   |-- definicoes.css
|   |-- utilizadores.css
|   |-- gerir-calendarios.css
|   `-- auditoria.css
|
|-- js/
|   |-- firebase-init.js
|   |-- utils.js
|   |-- auth.js
|   |-- app-platform.js
|   |-- module-registry.js
|   |-- offices-service.js
|   |-- users-service.js
|   |-- tasks-service.js
|   |-- comunicados-service.js
|   |-- admissoes-service.js
|   |-- reclamacoes-service.js
|   |-- calendario-service.js
|   |-- config-escritorios.js
|   |-- auditoria.js
|   |-- dashboard.js
|   |-- tarefas.js
|   |-- comunicados.js
|   |-- admissoes.js
|   |-- reclamacoes.js
|   |-- calendario.js
|   |-- definicoes.js
|   |-- utilizadores.js
|   |-- gerir-calendarios.js
|   |-- auditoria-page.js
|   `-- voz-ai.js
|
|-- templates/
|   |-- module-template.html
|   |-- module-template.js
|   `-- module-template.css
|
`-- testes/
    `-- paginas experimentais e arquivo
```

---

## Firebase

Projeto atual:

- `projectId`: `hub-algartempo`
- config web em [firebase-init.js](C:/Users/Tiago/Documents/GitHub/hub-algartempo/js/firebase-init.js)
- projeto default local em [/.firebaserc](C:/Users/Tiago/Documents/GitHub/hub-algartempo/.firebaserc)

Rules:

- [firestore.rules](C:/Users/Tiago/Documents/GitHub/hub-algartempo/firestore.rules)
- [storage.rules](C:/Users/Tiago/Documents/GitHub/hub-algartempo/storage.rules)

Comandos uteis:

```bash
cmd /c firebase use hub-algartempo
cmd /c firebase deploy --only firestore:rules
cmd /c firebase deploy --only storage
cmd /c firebase emulators:start --only firestore,storage
```

---

## Base comum

Os pilares da arquitetura atual sao:

- [auth.js](C:/Users/Tiago/Documents/GitHub/hub-algartempo/js/auth.js)
- [app-platform.js](C:/Users/Tiago/Documents/GitHub/hub-algartempo/js/app-platform.js)
- [module-registry.js](C:/Users/Tiago/Documents/GitHub/hub-algartempo/js/module-registry.js)
- [offices-service.js](C:/Users/Tiago/Documents/GitHub/hub-algartempo/js/offices-service.js)
- [users-service.js](C:/Users/Tiago/Documents/GitHub/hub-algartempo/js/users-service.js)

Services de dominio ja criados:

- [tasks-service.js](C:/Users/Tiago/Documents/GitHub/hub-algartempo/js/tasks-service.js)
- [comunicados-service.js](C:/Users/Tiago/Documents/GitHub/hub-algartempo/js/comunicados-service.js)
- [admissoes-service.js](C:/Users/Tiago/Documents/GitHub/hub-algartempo/js/admissoes-service.js)
- [reclamacoes-service.js](C:/Users/Tiago/Documents/GitHub/hub-algartempo/js/reclamacoes-service.js)
- [calendario-service.js](C:/Users/Tiago/Documents/GitHub/hub-algartempo/js/calendario-service.js)

---

## Novo modulo

Para criar um modulo novo:

1. Criar HTML, JS e CSS do modulo.
2. Registar o modulo em [module-registry.js](C:/Users/Tiago/Documents/GitHub/hub-algartempo/js/module-registry.js).
3. Usar [module-template.html](C:/Users/Tiago/Documents/GitHub/hub-algartempo/templates/module-template.html) como base.
4. Arrancar a pagina com `window.bootProtectedPage(...)`.
5. Se o modulo tiver dados proprios, criar `js/<modulo>-service.js`.

---

## Objetivo desta base

Esta estrutura foi limpa para servir como base principal de construcao:

- raiz com apenas a app ativa
- testes separados
- Firebase alinhado com o projeto novo
- services por dominio para reduzir acoplamento
- registry e bootstrap comuns para modulos novos
