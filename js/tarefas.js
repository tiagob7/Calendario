// js/tarefas.js — Lógica específica de tarefas.html
// Requer: js/shared.js

const db = firebase.firestore();
const storage = firebase.storage();
let col;
let tasks = [], selPrioVal = 'normal', sortMode = 'prio', filterMode = 'activos', filterPessoa = '';
let pendingFiles = [];
window._files = {};
const expandedIds = new Set();
const PRIO_ORDER = { urgente:0, normal:1, baixa:2 };
const ESTADO_ORDER = { progresso:0, aguardar:1, pendente:2, cancelado:3, concluido:4 };
const ESTADO_LABEL = { aguardar:'A aguardar', progresso:'Em progresso', concluido:'Concluído', cancelado:'Cancelado', pendente:'Pendente' };
const PRIO_LABEL = { urgente:'Urgente', normal:'Normal', baixa:'Baixa' };

let filterEscritorio = '';

document.addEventListener('authReady', ({ detail }) => {
  window.renderNavbar('tarefas');

  const profile    = detail.profile;
  const isAdmin    = window.isAdmin();
  const escritorio = window.escritorioAtivo();

  // mostrar/esconder form de criar tarefa
  const canCreate = window.temPermissao('criarTarefas');
  const formPanel = document.querySelector('.novo-pedido-panel');
  if (formPanel) formPanel.style.display = canCreate ? '' : 'none';

  // preencher info do utilizador no form
  if (profile) {
    const nome = profile.nomeCompleto || profile.nome || profile.email || '?';
    const userNameEl   = document.getElementById('userName');
    const userAvatarEl = document.getElementById('userAvatar');
    if (userNameEl)   userNameEl.textContent   = nome;
    if (userAvatarEl) userAvatarEl.textContent = nome.charAt(0).toUpperCase();
  }

  // carregar escritórios dinamicamente (do Firestore via config-escritorios.js)
  window.loadEscritorios().then(lista => {
    const selEsc = document.getElementById('fEscritorio');
    const selFil = document.getElementById('filterEscritorio');

    // popular select do formulário
    if (selEsc) {
      selEsc.innerHTML = lista.map(e => `<option value="${e.id}">${e.nome}</option>`).join('');
      if (profile && profile.escritorio && lista.find(e => e.id === profile.escritorio)) {
        selEsc.value = profile.escritorio;
      }
    }

    // popular select do filtro (mantém a opção "Todos os escritórios")
    if (selFil) {
      selFil.innerHTML = '<option value="">Todos os escritórios</option>' +
        lista.map(e => `<option value="${e.id}">${e.nome}</option>`).join('');
      if (filterEscritorio) selFil.value = filterEscritorio;
    }
  });

  // subtitle
  const nomeAtivo = filterEscritorio
    ? (window.nomeEscritorio ? window.nomeEscritorio(filterEscritorio) : filterEscritorio)
    : 'Todos os escritórios';
  document.getElementById('pageSubtitle').textContent = nomeAtivo;

  // filtro escritório: por defeito = escritório do utilizador (para todos)
  // admin vê "todos" por defeito, colaborador vê o seu escritório
  const fe = document.getElementById('filterEscritorio');
  if (isAdmin) {
    filterEscritorio = (escritorio && escritorio !== 'todos') ? escritorio : '';
  } else {
    filterEscritorio = profile ? (profile.escritorio || '') : '';
  }
  if (filterEscritorio && fe) fe.value = filterEscritorio;

  // carregar tudo (filtro é feito no cliente para permitir ver outros escritórios)
  col = db.collection('tarefas_todo');

  setStatus('A ligar…', '#f59e0b');
  col.orderBy('ordemChegada', 'asc').onSnapshot(snap => {
    tasks = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    render();
    setStatus('✓ Sincronizado', '#16a34a');
    setTimeout(() => setStatus(''), 3000);
  }, err => {
    console.error('tarefas (orderBy):', err);
    // Fallback sem orderBy — evita página em branco se o índice falhar
    col.onSnapshot(snap => {
      tasks = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      render();
      setStatus('✓ Sincronizado', '#16a34a');
      setTimeout(() => setStatus(''), 3000);
    }, err2 => { console.error('tarefas fallback:', err2); setStatus('Erro de ligação', '#dc2626'); });
  });
});

function setStatus(msg, color) {
  const el = document.getElementById('syncStatus');
  if (el) { el.textContent = msg; el.style.color = color || 'var(--muted)'; }
}

async function submitTarefa() {
  const titulo    = document.getElementById('fTitulo').value.trim();
  const descricao = document.getElementById('fDescricao').value.trim();
  const destino   = document.getElementById('fEscritorio').value;
  if (!titulo) { toast('Introduz o título da tarefa!'); return; }

  const profile     = window.userProfile;
  const solicitante = profile ? (profile.nomeCompleto || profile.nome || profile.email) : '—';
  const escritorioOrigem = profile && profile.escritorio ? profile.escritorio : '';

  const maxOrdem = tasks.length ? Math.max(...tasks.map(t => t.ordemChegada || 0)) : 0;
  try {
    const docRef = await col.add({
      titulo, descricao, solicitante,
      prioridade: selPrioVal, estado: 'aguardar', notas: '',
      criadaEm: Date.now(), ordemChegada: maxOrdem + 1,
      escritorio: destino,
      escritorioOrigem,
      criadoPor: window.currentUser ? window.currentUser.uid : ''
    });

    // Upload pending files
    if (pendingFiles.length) {
      const statusEl = document.getElementById('formUploadStatus');
      if (statusEl) statusEl.textContent = 'A carregar anexos…';
      const ficheiros = [];
      for (const file of pendingFiles) {
        const path = `tarefas/${docRef.id}/${Date.now()}_${file.name}`;
        try {
          const ref  = storage.ref(path);
          const snap = await ref.put(file);
          const url  = await snap.ref.getDownloadURL();
          ficheiros.push({ nome: file.name, url, tamanho: file.size, criadoEm: Date.now(), path });
        } catch(e) { console.error(e); toast('Erro ao carregar: ' + file.name); }
      }
      if (ficheiros.length) await docRef.update({ ficheiros });
      if (statusEl) statusEl.textContent = '';
    }

    pendingFiles = [];
    renderPendingFilesList();
    document.getElementById('fTitulo').value    = '';
    document.getElementById('fDescricao').value = '';
    selPrio('normal');
    toast('✓ Tarefa adicionada em ' + destino.charAt(0).toUpperCase() + destino.slice(1) + '!');
  } catch(e) { console.error(e); toast('Erro ao adicionar.'); }
}

async function updateEstado(id, val) {
  try { await col.doc(id).update({ estado: val }); } catch(e) { toast('Erro.'); }
}
async function updateNotas(id, val) {
  try { await col.doc(id).update({ notas: val }); } catch(e) {}
}
async function deleteTask(id) {
  if (!confirm('Eliminar esta tarefa?')) return;
  expandedIds.delete(id);
  try { await col.doc(id).delete(); toast('Eliminada.'); } catch(e) { toast('Erro.'); }
}

function getSorted(list) {
  const copy = [...list];
  if (sortMode === 'fifo') return copy.sort((a,b) => (a.ordemChegada||0)-(b.ordemChegada||0));
  if (sortMode === 'prio') return copy.sort((a,b) => {
    const aDone = (a.estado==='concluido'||a.estado==='cancelado')?1:0;
    const bDone = (b.estado==='concluido'||b.estado==='cancelado')?1:0;
    if (aDone!==bDone) return aDone-bDone;
    const pd = (PRIO_ORDER[a.prioridade]??1)-(PRIO_ORDER[b.prioridade]??1);
    return pd!==0?pd:(a.ordemChegada||0)-(b.ordemChegada||0);
  });
  return copy.sort((a,b) => {
    const ed=(ESTADO_ORDER[a.estado]??1)-(ESTADO_ORDER[b.estado]??1);
    return ed!==0?ed:(PRIO_ORDER[a.prioridade]??1)-(PRIO_ORDER[b.prioridade]??1);
  });
}

function getFiltered(list) {
  let out = list;
  if (filterMode==='activos')   out=out.filter(t=>t.estado!=='concluido'&&t.estado!=='cancelado');
  if (filterMode==='concluido') out=out.filter(t=>t.estado==='concluido'||t.estado==='cancelado');
  if (filterPessoa)             out=out.filter(t=>t.solicitante===filterPessoa);
  if (filterEscritorio)         out=out.filter(t=>t.escritorio===filterEscritorio);
  return out;
}

function setSort(mode) { sortMode=mode; document.querySelectorAll('.sort-btn').forEach(b=>b.classList.toggle('active',b.dataset.sort===mode)); renderList(); }
function setFilter(mode) { filterMode=mode; document.querySelectorAll('.filter-btn').forEach(b=>b.classList.toggle('active',b.dataset.f===mode)); renderList(); }
function setFilterPessoa(val) { filterPessoa=val; renderList(); }
function setFilterEscritorio(val) {
  filterEscritorio = val;
  const nome = val
    ? (window.nomeEscritorio ? window.nomeEscritorio(val) : val)
    : 'Todos os escritórios';
  document.getElementById('pageSubtitle').textContent = nome;
  renderList();
}

function render() {
  renderStats();
  updatePessoaSelect();
  renderList();
}

function renderStats() {
  const total=tasks.length, prog=tasks.filter(t=>t.estado==='progresso').length;
  const urg=tasks.filter(t=>t.prioridade==='urgente'&&t.estado!=='concluido'&&t.estado!=='cancelado').length;
  const conc=tasks.filter(t=>t.estado==='concluido').length;
  document.getElementById('statsBar').innerHTML = `
    <div class="stat-chip"><span class="stat-val">${total}</span><span class="stat-lbl">Total</span></div>
    <div class="stat-chip s-progresso"><span class="stat-val">${prog}</span><span class="stat-lbl">Em progresso</span></div>
    <div class="stat-chip s-urgente"><span class="stat-val">${urg}</span><span class="stat-lbl">Urgentes</span></div>
    <div class="stat-chip s-ok"><span class="stat-val">${conc}</span><span class="stat-lbl">Concluídas</span></div>`;
}

function updatePessoaSelect() {
  const names=[...new Set(tasks.map(t=>t.solicitante).filter(Boolean))].sort();
  const sel=document.getElementById('filterPessoa'), cur=filterPessoa;
  sel.innerHTML='<option value="">Todos os nomes</option>';
  names.forEach(n=>{ const o=document.createElement('option'); o.value=n; o.textContent=n; if(n===cur) o.selected=true; sel.appendChild(o); });
}

function renderList() {
  const container=document.getElementById('tasksList');
  const filtered=getFiltered(getSorted(tasks));
  document.getElementById('countBadge').textContent=filtered.length+' tarefa'+(filtered.length!==1?'s':'');
  if (!filtered.length) { container.innerHTML='<div class="empty-state"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.2"><rect x="3" y="4" width="18" height="18" rx="2"/><path d="M8 2v4M16 2v4M3 10h18M8 14h4M8 18h8"/></svg><p>Nenhuma tarefa encontrada.</p></div>'; return; }
  container.innerHTML='';
  const canResolve = window.temPermissao && window.temPermissao('resolverTarefas');
  filtered.forEach((task,idx)=>{
    const isOpen=expandedIds.has(task.id), isDone=task.estado==='concluido'||task.estado==='cancelado';
    const estadoKey=task.estado||'aguardar';
    const card=document.createElement('div');
    card.className=`task-card estado-${estadoKey}`;
    card.innerHTML=`
      <div class="card-header" onclick="toggleCard('${task.id}')">
        <div class="card-num ${task.prioridade}">#${task.ordemChegada||(idx+1)}</div>
        <div class="card-title${isDone?' done':''}">${escHtml(task.titulo)}</div>
        <div class="card-person">${escHtml(task.solicitante)}</div>
        <div class="card-prio-col"><span class="prio-tag ${task.prioridade}">${PRIO_LABEL[task.prioridade]||task.prioridade}</span></div>
        <div class="card-estado-col"><span class="estado-pill ${estadoKey}">${ESTADO_LABEL[estadoKey]||estadoKey}</span></div>
        <svg class="chevron ${isOpen?'open':''}" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M4 6l4 4 4-4"/></svg>
      </div>
      <div class="card-body ${isOpen?'open':''}">
        ${task.descricao?`<div class="card-desc">${escHtml(task.descricao)}</div>`:''}
        <div class="card-detail-row">
          <span class="detail-item"><svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5"><circle cx="8" cy="6" r="2.5"/><path d="M3 13c0-2.5 2.2-4.5 5-4.5s5 2 5 4.5"/></svg>${escHtml(task.solicitante)}</span>
          <span class="detail-item"><svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5"><rect x="2" y="3" width="12" height="11" rx="1.5"/><path d="M5 1v3M11 1v3M2 7h12"/></svg>${fmtDateFull(task.criadaEm)}</span>
          ${task.escritorio?`<span class="escritorio-tag">${escHtml(task.escritorio)}</span>`:''}
        </div>
        ${task.notas?`<div class="card-notas"><div class="card-notas-label">Nota do gestor</div>${escHtml(task.notas)}</div>`:''}
        <div class="card-gestor ${canResolve?'show':''}">
          <div class="card-gestor-row">
            <select class="estado-select" onchange="updateEstado('${task.id}',this.value)">
              <option value="aguardar" ${estadoKey==='aguardar'?'selected':''}>⬜ A aguardar</option>
              <option value="progresso" ${estadoKey==='progresso'?'selected':''}>🔵 Em progresso</option>
              <option value="concluido" ${estadoKey==='concluido'?'selected':''}>✅ Concluído</option>
              <option value="cancelado" ${estadoKey==='cancelado'?'selected':''}>🔴 Cancelado</option>
              <option value="pendente" ${estadoKey==='pendente'?'selected':''}>🟠 Pendente</option>
            </select>
            <textarea class="notas-input" rows="1" placeholder="Nota interna…" onchange="updateNotas('${task.id}',this.value)">${escHtml(task.notas||'')}</textarea>
            <button class="icon-btn del" onclick="event.stopPropagation();deleteTask('${task.id}')">🗑</button>
          </div>
        </div>
        ${(task.ficheiros && task.ficheiros.length) ? `<div class="card-files">
          <div class="files-header">
            <span class="files-lbl">📎 Anexos</span>
          </div>
          ${renderFicheiros(task.id, task.ficheiros, canResolve)}
        </div>` : ''}
      </div>`;
    container.appendChild(card);
  });
}

function toggleCard(id) { if(expandedIds.has(id)) expandedIds.delete(id); else expandedIds.add(id); renderList(); }
function selPrio(p) { selPrioVal=p; document.querySelectorAll('.prio-pill').forEach(b=>b.classList.toggle('sel',b.dataset.p===p)); }

// ── PENDING FILES (form) ──
function onPendingFilesChange(input) {
  Array.from(input.files).forEach(f => {
    if (f.size > 15 * 1024 * 1024) { toast('Ficheiro demasiado grande (máx 15 MB): ' + f.name); return; }
    pendingFiles.push(f);
  });
  input.value = '';
  renderPendingFilesList();
}

function renderPendingFilesList() {
  const container = document.getElementById('pendingFilesList');
  if (!container) return;
  if (!pendingFiles.length) { container.innerHTML = ''; return; }
  container.innerHTML = pendingFiles.map((f, i) => `
    <div class="file-item">
      <span>📄</span>
      <span class="file-item-name" title="${escHtml(f.name)}">${escHtml(f.name)}</span>
      <span class="file-item-size">${fmtBytes(f.size)}</span>
      <button class="file-item-del" onclick="removePendingFile(${i})" title="Remover">✕</button>
    </div>`).join('');
}

function removePendingFile(i) {
  pendingFiles.splice(i, 1);
  renderPendingFilesList();
}

// ── FILE UPLOADS ──
function renderFicheiros(docId, ficheiros, canDel) {
  window._files[docId] = ficheiros;
  if (!ficheiros.length) return '<div class="files-empty">Sem anexos</div>';
  return ficheiros.map((f, i) => `
    <div class="file-item">
      <span>📄</span>
      <span class="file-item-name" title="${escHtml(f.nome)}">${escHtml(f.nome)}</span>
      <span class="file-item-size">${fmtBytes(f.tamanho)}</span>
      <a class="file-item-dl" href="${escHtml(f.url)}" target="_blank" rel="noopener">⬇ Download</a>
      ${canDel ? `<button class="file-item-del" onclick="event.stopPropagation();deleteFicheiro('${escHtml(docId)}',${i})" title="Remover">✕</button>` : ''}
    </div>`).join('');
}

async function deleteFicheiro(docId, index) {
  const f = (window._files[docId] || [])[index];
  if (!f || !confirm('Remover este anexo?')) return;
  try {
    if (f.path) await storage.ref(f.path).delete().catch(()=>{});
    await col.doc(docId).update({ ficheiros: firebase.firestore.FieldValue.arrayRemove(f) });
    toast('Ficheiro removido.');
  } catch(e) { toast('Erro ao remover.'); }
}
---VOZ---
