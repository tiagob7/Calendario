// js/utilizadores.js — Lógica específica de utilizadores.html
// Requer: js/shared.js

const db = firebase.firestore();

let users = [];
let roleFilter = '';
let escritorioFilter = '';
let searchFilter = '';

function setStatus(msg, color) {
  const el = document.getElementById('syncStatus');
  if (el) { el.textContent = msg; el.style.color = color || 'var(--muted)'; }
}

function setRoleFilter(v) {
  roleFilter = v || '';
  renderUsers();
}

function setEscritorioFilter(v) {
  escritorioFilter = v || '';
  renderUsers();
}

function setSearch(v) {
  searchFilter = (v || '').toLowerCase().trim();
  renderUsers();
}

function filteredUsers() {
  let list = users;
  if (roleFilter)       list = list.filter(u => u.role === roleFilter);
  if (escritorioFilter) list = list.filter(u => u.escritorio === escritorioFilter);
  if (searchFilter)     list = list.filter(u =>
    (u.nomeCompleto || u.nome || '').toLowerCase().includes(searchFilter) ||
    (u.email || '').toLowerCase().includes(searchFilter)
  );
  return list;
}

async function updateUser(uid, patch) {
  try {
    await db.collection('utilizadores').doc(uid).update(patch);
    toast('Alterações guardadas.');
  } catch (e) {
    console.error(e);
    toast('Erro ao guardar alterações.');
  }
}

function togglePerms(uid) {
  const row = document.getElementById('permsRow_' + uid);
  const btn = document.getElementById('btnPerms_' + uid);
  if (!row) return;
  const isOpen = row.classList.contains('open');
  // fechar todos os outros
  document.querySelectorAll('.perms-row.open').forEach(r => r.classList.remove('open'));
  document.querySelectorAll('.btn-perms.active').forEach(b => b.classList.remove('active'));
  if (!isOpen) {
    row.classList.add('open');
    if (btn) btn.classList.add('active');
  }
}

async function setPermissao(uid, perm, val) {
  const item = document.getElementById('permItem_' + uid + '_' + perm);
  if (item) item.classList.toggle('on', val);
  const patch = {};
  patch['permissoes.' + perm] = val;
  try {
    await db.collection('utilizadores').doc(uid).update(patch);
    toast('Permissão ' + (val ? 'activada' : 'removida') + '.');
  } catch (e) {
    console.error(e);
    toast('Erro ao actualizar permissão.');
  }
}

function renderUsers() {
  const tbody = document.getElementById('usersTbody');
  const meUid = window.currentUser ? window.currentUser.uid : null;
  const list = filteredUsers().sort((a,b) => {
    const na = (a.nomeCompleto || a.nome || a.email || '').toLowerCase();
    const nb = (b.nomeCompleto || b.nome || b.email || '').toLowerCase();
    return na.localeCompare(nb,'pt-PT');
  });

  document.getElementById('countBadge').textContent =
    list.length + ' utilizador' + (list.length !== 1 ? 'es' : '');

  if (!list.length) {
    tbody.innerHTML = '<tr><td colspan="6" class="empty">Nenhum utilizador encontrado.</td></tr>';
    return;
  }

  tbody.innerHTML = '';
  list.forEach(u => {
    const tr = document.createElement('tr');
    if (u.uid === meUid) tr.classList.add('me-row');

    const nome = u.nomeCompleto || u.nome || '';
    const email = u.email || '';
    const escritorio = u.escritorio || '';
    const role = u.role || 'colaborador';
    const ativo = u.ativo !== false;

    tr.innerHTML = `
      <td>
        <div class="name-cell">${escHtml(nome || email)}</div>
        <div class="email-cell">${escHtml(email)}</div>
      </td>
      <td>
        <select class="select-small" data-escritorio-select="${u.uid}" onchange="updateUser('${u.uid}', { escritorio: this.value })">
          <option value="">—</option>
        </select>
      </td>
      <td>
        <div style="display:flex;align-items:center;gap:6px;">
          <span class="chip-role ${role==='admin'?'chip-admin':'chip-colab'}">
            ${role==='admin'?'Admin':'Colaborador'}
          </span>
          <select class="select-small" onchange="updateUser('${u.uid}', { role: this.value })">
            <option value="colaborador" ${role==='colaborador'?'selected':''}>Colaborador</option>
            <option value="admin"       ${role==='admin'?'selected':''}>Admin</option>
          </select>
        </div>
      </td>
      <td>
        <div style="display:flex;align-items:center;gap:8px;">
          <div class="toggle ${ativo?'on':''}" onclick="const on=!${ativo};updateUser('${u.uid}', { ativo: !${ativo} })">
            <div class="toggle-thumb"></div>
          </div>
          ${ativo
            ? '<span class="chip-ativo">Ativo</span>'
            : (Date.now() - (u.criadoEm||0) < 7*24*60*60*1000
                ? '<span class="chip-pendente">Pendente</span>'
                : '<span class="chip-inativo">Inativo</span>')
          }
        </div>
      </td>
      <td>
        <div>${fmtDateShort(u.ultimoAcesso)}</div>
      </td>
      <td>
        <button class="btn-perms" id="btnPerms_${u.uid}" onclick="togglePerms('${u.uid}')">Config</button>
      </td>
    `;

    // corrigir toggle para pegar estado atual ao clicar
    const toggle = tr.querySelector('.toggle');
    toggle.onclick = () => {
      const nowOn = toggle.classList.contains('on');
      const novo = !nowOn;
      toggle.classList.toggle('on', novo);
      updateUser(u.uid, { ativo: novo });
    };

    tbody.appendChild(tr);

    // Linha de permissões (collapsível)
    const perms = u.permissoes || {};
    const trPerms = document.createElement('tr');
    trPerms.className = 'perms-row';
    trPerms.id = 'permsRow_' + u.uid;

    const PERMS_DEF = [
      { key: 'criarTarefas',     label: 'Criar Tarefas' },
      { key: 'resolverTarefas',  label: 'Resolver Tarefas' },
      { key: 'gerirComunicados', label: 'Gerir Comunicados' },
      { key: 'criarAdmissoes',   label: 'Criar Admissões' },
      { key: 'resolverAdmissoes',label: 'Resolver Admissões' },
      { key: 'editarCalendario', label: 'Editar Calendário' },
      { key: 'criarReclamacoes',  label: 'Reclamações de Horas' },
    ];

    const isAdminUser = role === 'admin';
    let innerHtml;
    if (isAdminUser) {
      innerHtml = `<span class="perm-all-badge">Admin — todas as permissões activas</span>`;
    } else {
      innerHtml = PERMS_DEF.map(p => {
        const checked = perms[p.key] === true;
        return `<div class="perm-item ${checked?'on':''}" id="permItem_${u.uid}_${p.key}">
          <input type="checkbox" id="perm_${u.uid}_${p.key}" ${checked?'checked':''} onchange="setPermissao('${u.uid}','${p.key}',this.checked)">
          <label for="perm_${u.uid}_${p.key}">${p.label}</label>
        </div>`;
      }).join('');
    }

    trPerms.innerHTML = `<td colspan="6" class="perms-cell">
      <div class="perms-label">Permissões específicas</div>
      <div class="perms-grid">${innerHtml}</div>
    </td>`;
    tbody.appendChild(trPerms);
  });
}

// ── Modal Novo Utilizador ──
function abrirModalNovo() {
  document.getElementById('modalNovoUser').classList.add('open');
  document.getElementById('newNome').value = '';
  document.getElementById('newApelido').value = '';
  document.getElementById('newEmail').value = '';
  document.getElementById('newEscritorio').value = '';
  document.getElementById('newRole').value = 'colaborador';
  document.getElementById('newPassword').value = '';
  const errEl2 = document.getElementById('modalNovoErr');
  errEl2.textContent = '';
  errEl2.style.display = 'none';
  document.getElementById('btnSalvarNovo').disabled = false;
  document.getElementById('btnSalvarNovo').textContent = 'Criar conta';
  document.getElementById('newNome').focus();
}

function fecharModalNovo() {
  document.getElementById('modalNovoUser').classList.remove('open');
}

async function criarUtilizador() {
  const nome      = document.getElementById('newNome').value.trim();
  const apelido   = document.getElementById('newApelido').value.trim();
  const email     = document.getElementById('newEmail').value.trim();
  const escritorio= document.getElementById('newEscritorio').value;
  const role      = document.getElementById('newRole').value;
  const password  = document.getElementById('newPassword').value;
  const errEl     = document.getElementById('modalNovoErr');
  const btnSalvar = document.getElementById('btnSalvarNovo');

  errEl.textContent = '';
  errEl.style.display = 'none';

  if (!nome || !email || !password) {
    errEl.textContent = 'Nome, email e password são obrigatórios.';
    errEl.style.display = 'block';
    return;
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    errEl.textContent = 'Email inválido.';
    errEl.style.display = 'block';
    return;
  }
  if (password.length < 6) {
    errEl.textContent = 'A password deve ter pelo menos 6 caracteres.';
    errEl.style.display = 'block';
    return;
  }

  btnSalvar.disabled = true;
  btnSalvar.textContent = 'A criar…';
  const appName = 'adminCreate_' + Date.now();
  let secondaryApp = null;

  try {
    // Criar utilizador numa instância secundária para não desligar o admin
    secondaryApp = firebase.initializeApp(firebase.app().options, appName);
    const secondaryAuth = secondaryApp.auth();

    const cred = await secondaryAuth.createUserWithEmailAndPassword(email, password);
    const uid = cred.user.uid;

    await secondaryAuth.signOut();

    const nomeCompleto = (nome + ' ' + apelido).trim();

    const profile = {
      uid,
      email,
      nome,
      apelido,
      nomeCompleto,
      escritorio,
      funcao: '',
      role,
      ativo: true,
      criadoEm: Date.now(),
      ultimoAcesso: Date.now(),
      permissoes: {
        criarTarefas: false,
        resolverTarefas: false,
        gerirComunicados: false,
        criarAdmissoes: false,
        resolverAdmissoes: false,
        editarCalendario: false,
        criarReclamacoes: false
      }
    };

    await db.collection('utilizadores').doc(uid).set(profile);

    fecharModalNovo();
    alert('Conta criada com sucesso para ' + email + '.');
  } catch(err) {
    console.error('[criarUtilizador]', err);
    const msgs = {
      'auth/email-already-in-use': 'Este email já está registado.',
      'auth/invalid-email':        'Email inválido.',
      'auth/weak-password':        'Erro interno ao gerar password temporária.',
    };
    errEl.textContent = msgs[err.code] || 'Erro: ' + (err.message || err.code);
    errEl.style.display = 'block';
    btnSalvar.disabled = false;
    btnSalvar.textContent = 'Criar conta';
  } finally {
    if (secondaryApp) {
      secondaryApp.delete().catch(() => {});
    }
  }
}

document.addEventListener('authReady', ({ detail }) => {
  // proteger rota — só admin
  if (!window.isAdmin || !window.isAdmin()) {
    window.location.href = 'dashboard.html';
    return;
  }

  window.renderNavbar('dashboard');

  const profile = detail.profile;
  const me = profile ? (profile.nomeCompleto || profile.nome || profile.email || '') : '';
  const meInfo = document.getElementById('meInfo');
  if (meInfo) meInfo.textContent = 'Sessão iniciada como Admin: ' + me;

  setStatus('A ligar…', '#f59e0b');

  db.collection('utilizadores').onSnapshot(snap => {
    users = snap.docs.map(d => ({ uid: d.id, ...d.data() }));
    console.log('[utilizadores] Total de documentos no Firestore:', users.length, users.map(u => u.email));
    renderUsers();
    setStatus('✓ Sincronizado — ' + users.length + ' doc(s) no Firestore', '#16a34a');
    setTimeout(() => setStatus(''), 5000);
  }, err => {
    console.error('[utilizadores] Erro no onSnapshot:', err);
    setStatus('Erro ao carregar: ' + err.code, '#dc2626');
  });

  // Preencher selects de escritórios (filtro + modal novo) de forma dinâmica
  if (window.loadEscritorios) {
    loadEscritorios().then(lista => {
      const filtro = document.getElementById('escritorioFilter');
      if (filtro) {
        filtro.innerHTML = '<option value=\"\">Todos os escritórios</option>' +
          lista.map(e => `<option value=\"${e.id}\">${e.nome}</option>`).join('');
      }
      const novoEsc = document.getElementById('newEscritorio');
      if (novoEsc) {
        novoEsc.innerHTML = '<option value=\"\">Selecionar…</option>' +
          lista.map(e => `<option value=\"${e.id}\">${e.nome}</option>`).join('');
      }
      // atualizar selects de linha já renderizados
      document.querySelectorAll('select[data-escritorio-select]').forEach(sel => {
        const uid = sel.getAttribute('data-escritorio-select');
        const u   = users.find(x => x.uid === uid);
        const atual = u && u.escritorio ? u.escritorio : '';
        sel.innerHTML = '<option value=\"\">—</option>' +
          lista.map(e => `<option value=\"${e.id}\" ${atual===e.id?'selected':''}>${e.nome}</option>`).join('');
      });
    });
  }
});
