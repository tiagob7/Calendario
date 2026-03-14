// js/definicoes.js — Lógica específica de definicoes.html
// Requer: js/shared.js

const CORES = [
  '#2563eb','#7c3aed','#db2777','#dc2626',
  '#d97706','#16a34a','#0891b2','#374151',
  '#6366f1','#059669','#ea580c','#9333ea',
];

const ESC_DEFAULT = [
  { id:'quarteira', nome:'Quarteira', cor:'#2563eb', default:true },
  { id:'albufeira', nome:'Albufeira', cor:'#7c3aed', default:true },
  { id:'lisboa',    nome:'Lisboa',    cor:'#db2777', default:true },
  { id:'porto',     nome:'Porto',     cor:'#16a34a', default:true },
];

let db;
let paineis = { Utilizadores: false, Escritorios: false };
let escritoriosData = [];
let utilizadoresAll = [];
let escEditandoId = null;
let escApagarId   = null;
let corSel = CORES[0];

document.addEventListener('authReady', () => {
  window.renderNavbar('definicoes');
  if (!window.isAdmin()) {
    document.querySelector('.page').innerHTML =
      '<div style="text-align:center;padding:80px 20px;font-size:13px;color:var(--muted);">Acesso restrito a administradores.</div>';
    return;
  }
  db = firebase.firestore();
  renderColorSwatches();

  // Auto-gerar ID a partir do nome (só em modo criação)
  document.getElementById('escNome').addEventListener('input', function() {
    if (!escEditandoId) {
      document.getElementById('escId').value = this.value
        .toLowerCase()
        .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-z0-9]/g, '');
    }
  });

  // Fechar modais com Escape / Enter
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape') fecharModal();
    if (e.key === 'Enter' && document.getElementById('modalEscritorio').classList.contains('open')) guardarEscritorio();
  });

  // Fechar ao clicar fora
  document.querySelectorAll('.modal-overlay').forEach(o =>
    o.addEventListener('click', e => { if (e.target === o) fecharModal(); })
  );
});

// ── TOGGLE PAINÉIS ──
function togglePainel(nome) {
  const jaAberto = paineis[nome];
  Object.keys(paineis).forEach(k => {
    paineis[k] = false;
    document.getElementById('panel' + k).classList.remove('open');
    document.getElementById('card'  + k).classList.remove('active');
  });
  if (!jaAberto) {
    paineis[nome] = true;
    document.getElementById('panel' + nome).classList.add('open');
    document.getElementById('card'  + nome).classList.add('active');
    setTimeout(() => document.getElementById('panel' + nome).scrollIntoView({ behavior:'smooth', block:'start' }), 60);
    if (nome === 'Utilizadores') carregarUtilizadores();
    if (nome === 'Escritorios') carregarEscritorios();
  }
}

// ══════════════════════════════════════════
// UTILIZADORES
// ══════════════════════════════════════════
async function carregarUtilizadores() {
  const body = document.getElementById('utilizadoresBody');
  try {
    const snap = await db.collection('utilizadores').get();
    const users = snap.docs.map(d => ({ id: d.id, ...d.data() }))
      .sort((a,b) => (a.nomeCompleto||'').localeCompare(b.nomeCompleto||''));

    if (!users.length) {
      body.innerHTML = '<p style="font-size:11px;color:var(--muted);text-align:center;padding:16px 0;">Sem utilizadores.</p>';
      return;
    }
    body.innerHTML = `
      <div style="overflow-x:auto;">
        <table>
          <thead><tr><th>Nome</th><th>Email</th><th>Escritório</th><th>Role</th><th>Estado</th></tr></thead>
          <tbody>${users.map(u => `
            <tr>
              <td>${u.nomeCompleto || u.nome || '—'}</td>
              <td style="color:var(--muted);">${u.email || '—'}</td>
              <td style="text-transform:capitalize;">${u.escritorio || '—'}</td>
              <td><span class="badge ${u.role==='admin'?'badge-admin':'badge-colab'}">${u.role==='admin'?'Admin':'Colaborador'}</span></td>
              <td><span class="badge ${u.ativo!==false?'badge-ativo':'badge-inativo'}">${u.ativo!==false?'Ativo':'Inativo'}</span></td>
            </tr>`).join('')}
          </tbody>
        </table>
      </div>
      <div style="margin-top:14px;text-align:right;">
        <a href="utilizadores.html" class="btn btn-primary">Gerir utilizadores →</a>
      </div>`;
    utilizadoresAll = users;
  } catch(e) {
    body.innerHTML = `<p style="font-size:11px;color:#dc2626;text-align:center;padding:16px 0;">Erro: ${e.message}</p>`;
  }
}

// ══════════════════════════════════════════
// ESCRITÓRIOS
// ══════════════════════════════════════════
async function carregarEscritorios() {
  const wrap = document.getElementById('escritoriosList');
  wrap.innerHTML = '<p style="font-size:11px;color:var(--muted);text-align:center;padding:16px 0;">A carregar…</p>';
  try {
    // Carregar lista do Firestore
    const snap = await db.collection('config').doc('escritorios').get();
    if (snap.exists && snap.data().lista?.length) {
      escritoriosData = snap.data().lista;
    } else {
      // Primeira vez — inicializar com defaults
      escritoriosData = JSON.parse(JSON.stringify(ESC_DEFAULT));
      await db.collection('config').doc('escritorios').set({ lista: escritoriosData });
    }
    // Contar utilizadores por escritório
    if (!utilizadoresAll.length) {
      const usSnap = await db.collection('utilizadores').get();
      utilizadoresAll = usSnap.docs.map(d => d.data());
    }
  } catch(e) {
    escritoriosData = JSON.parse(JSON.stringify(ESC_DEFAULT));
  }
  renderLista();
}

function renderLista() {
  const wrap = document.getElementById('escritoriosList');
  if (!escritoriosData.length) {
    wrap.innerHTML = '<p style="font-size:11px;color:var(--muted);text-align:center;padding:16px 0;">Nenhum escritório.</p>';
    return;
  }
  wrap.innerHTML = escritoriosData.map(esc => {
    const n = utilizadoresAll.filter(u => u.escritorio === esc.id).length;
    return `
      <div class="esc-row">
        <div class="esc-dot" style="background:${esc.cor||'#aaa'};"></div>
        <span class="esc-nome">${esc.nome}</span>
        <span class="esc-id">${esc.id}</span>
        <span class="esc-users">${n} utilizador${n!==1?'es':''}</span>
        <div class="esc-actions">
          <button class="btn btn-secondary btn-sm" onclick='abrirEditar(${JSON.stringify(esc)})'>
            <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" style="width:10px;height:10px;"><path d="M11 2.5l2 2L5 13H3v-2L11 2.5z"/></svg>
            Editar
          </button>
          ${!esc.default ? `
          <button class="btn btn-danger btn-sm" onclick="pedirApagar('${esc.id}','${esc.nome}',${n})">
            <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" style="width:10px;height:10px;"><path d="M3 5h10l-1 9H4L3 5z"/><path d="M1 5h14M6 5V3h4v2"/></svg>
            Apagar
          </button>` : `<span style="font-size:9px;color:#bbb;padding:0 6px;">base</span>`}
        </div>
      </div>`;
  }).join('');
}

// ── MODAL NOVO ──
function abrirModalNovo() {
  escEditandoId = null;
  document.getElementById('modalTitulo').textContent = 'Novo Escritório';
  document.getElementById('escNome').value = '';
  document.getElementById('escId').value = '';
  document.getElementById('escId').readOnly = false;
  corSel = CORES[0];
  renderColorSwatches();
  document.getElementById('modalEscritorio').classList.add('open');
  setTimeout(() => document.getElementById('escNome').focus(), 80);
}

// ── MODAL EDITAR ──
function abrirEditar(esc) {
  escEditandoId = esc.id;
  document.getElementById('modalTitulo').textContent = 'Editar Escritório';
  document.getElementById('escNome').value = esc.nome;
  document.getElementById('escId').value = esc.id;
  document.getElementById('escId').readOnly = true;
  corSel = esc.cor || CORES[0];
  renderColorSwatches();
  document.getElementById('modalEscritorio').classList.add('open');
  setTimeout(() => document.getElementById('escNome').focus(), 80);
}

// ── GUARDAR ──
async function guardarEscritorio() {
  const nome = document.getElementById('escNome').value.trim();
  const id   = document.getElementById('escId').value.trim().toLowerCase();

  if (!nome) { alert('Introduz o nome do escritório.'); return; }
  if (!id || !/^[a-z0-9]+$/.test(id)) { alert('O ID só pode ter letras minúsculas e números, sem espaços.'); return; }

  const btn = document.getElementById('btnGuardar');
  btn.disabled = true; btn.textContent = 'A guardar…';

  try {
    if (escEditandoId) {
      const idx = escritoriosData.findIndex(e => e.id === escEditandoId);
      if (idx !== -1) escritoriosData[idx] = { ...escritoriosData[idx], nome, cor: corSel };
    } else {
      if (escritoriosData.find(e => e.id === id)) {
        alert('Já existe um escritório com esse ID.'); btn.disabled=false; btn.textContent='Guardar'; return;
      }
      escritoriosData.push({ id, nome, cor: corSel, default: false });
    }
    await db.collection('config').doc('escritorios').set({ lista: escritoriosData });
    fecharModal();
    renderLista();
  } catch(e) {
    alert('Erro ao guardar: ' + e.message);
  }
  btn.disabled = false; btn.textContent = 'Guardar';
}

// ── APAGAR ──
function pedirApagar(id, nome, nUsers) {
  escApagarId = id;
  let msg = `Tens a certeza que queres apagar o escritório <b>${nome}</b>?`;
  if (nUsers > 0) msg += `<br><br><span style="color:#dc2626;">⚠ Tem <b>${nUsers} utilizador(es)</b> associado(s). O campo escritório deles ficará vazio.</span>`;
  document.getElementById('confirmarTexto').innerHTML = msg;
  document.getElementById('modalConfirmar').classList.add('open');
}

async function confirmarApagar() {
  if (!escApagarId) return;
  const btn = document.getElementById('btnConfirmar');
  btn.disabled = true;
  try {
    escritoriosData = escritoriosData.filter(e => e.id !== escApagarId);
    await db.collection('config').doc('escritorios').set({ lista: escritoriosData });
    fecharModal();
    renderLista();
  } catch(e) {
    alert('Erro ao apagar: ' + e.message);
  }
  btn.disabled = false; escApagarId = null;
}

// ── CORES ──
function renderColorSwatches() {
  document.getElementById('colorSwatches').innerHTML = CORES.map(c => `
    <div class="swatch ${c===corSel?'selected':''}" style="background:${c};" onclick="selecionarCor('${c}')"></div>
  `).join('');
}
function selecionarCor(c) { corSel = c; renderColorSwatches(); }

// ── FECHAR MODAL ──
function fecharModal() {
  document.querySelectorAll('.modal-overlay').forEach(m => m.classList.remove('open'));
  escEditandoId = null;
}
