// js/reclamacao-publica.js — Lógica específica de reclamacao-publica.html
// Requer: js/shared.js

firebase.initializeApp({
  apiKey:"AIzaSyBbTDfCCC9o5oxMSMRsvCUC50Iu6L0aqT8",
  authDomain:"calendario-trabalho-39a6c.firebaseapp.com",
  projectId:"calendario-trabalho-39a6c",
  storageBucket:"calendario-trabalho-39a6c.firebasestorage.app",
  messagingSenderId:"596069405321",
  appId:"1:596069405321:web:275bb9da220206d3da6c58"
});
const db = firebase.firestore();
const colPortal = db.collection('trabalhadores_portal');
const colRec    = db.collection('reclamacoes_horas');

// ── STATE ──
let trabalhador = null;
let recsList    = [];
let selCanalVal = 'email';
const expandedIds = new Set();

const MESES = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho',
               'Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'];
const DIAS_SEMANA = ['D','S','T','Q','Q','S','S'];
const ESTADO_LABEL = {
  nova:'Nova', verificacao:'Em Verificação', enviada:'Enviada à Empresa',
  confirmada:'Confirmada', 'aguarda-proc':'Aguarda Processamento',
  paga:'Paga', 'sem-fundamento':'Sem Fundamento', negada:'Negada pela Empresa'
};
const CANAL_LABEL = {email:'📧 Email',telefone:'📞 Telefone',mensagem:'💬 Mensagem',presencial:'🧑 Presencial'};

// ── VISTAS ──
function mostrarVista(id) {
  document.querySelectorAll('.vista').forEach(v => v.classList.remove('active'));
  document.getElementById(id).classList.add('active');
  window.scrollTo(0, 0);
}
function mostrarVistaLista() {
  mostrarVista('vistaLista');
  carregarReclamacoes();
}
function mostrarVistaForm() {
  resetForm();
  adicionarPeriodo();
  mostrarVista('vistaForm');
}
function sair() {
  trabalhador = null;
  recsList = [];
  expandedIds.clear();
  document.getElementById('inNif').value    = '';
  document.getElementById('inNumFunc').value = '';
  document.getElementById('inCodigo').value  = '';
  hideAlert('alertEntrada');
  document.getElementById('codigoReveal').classList.remove('show');
  document.getElementById('formEntrada').style.display = '';
  mostrarVista('vistaEntrada');
}

// ── ALERTAS ──
function showAlert(elId, type, html) {
  const el = document.getElementById(elId);
  const icon = type === 'err' ? '⚠' : type === 'ok' ? '✓' : 'ℹ';
  el.className = 'alert alert-' + type + ' show';
  el.innerHTML = '<span class="alert-icon">' + icon + '</span><span class="alert-text">' + html + '</span>';
}
function hideAlert(elId) {
  document.getElementById(elId).className = 'alert';
}

// ── CÓDIGO ──
function gerarCodigo() {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let r = 'RH-';
  for (let i = 0; i < 6; i++) r += chars.charAt(Math.floor(Math.random() * chars.length));
  return r;
}
function copiarCodigo() {
  const c = (trabalhador && (trabalhador.codigoPublico || trabalhador.id)) || '';
  navigator.clipboard.writeText(c).then(() => toast('Código copiado!')).catch(() => toast(c));
}
function copiarCodigoReveal() {
  const c = document.getElementById('codigoValBig').textContent;
  navigator.clipboard.writeText(c).then(() => toast('Código copiado!')).catch(() => toast(c));
}
function continuarAposRegisto() {
  document.getElementById('codigoReveal').classList.remove('show');
  document.getElementById('formEntrada').style.display = '';
  onEntrou();
}

// ── AUTENTICAÇÃO ──
async function entrarOuRegistar() {
  const nif     = document.getElementById('inNif').value.trim();
  const numFunc = document.getElementById('inNumFunc').value.trim();
  if (!nif || !numFunc) {
    showAlert('alertEntrada', 'err', 'NIF e nº de colaborador são obrigatórios.');
    return;
  }
  showAlert('alertEntrada', 'info', 'A verificar…');
  try {
    // Query by NIF, filter numFunc client-side (avoids composite index)
    const snap = await colPortal.where('nif', '==', nif).limit(20).get();
    const match = snap.docs.find(d => d.data().numFunc === numFunc);
    if (match) {
      trabalhador = { id: match.id, ...match.data() };
      hideAlert('alertEntrada');
      onEntrou();
    } else {
      // Novo registo
      const codigo = gerarCodigo();
      const doc = { codigoPublico: codigo, nif, numFunc, nome: '', criadoEm: Date.now(), ultimaReclamacao: null };
      await colPortal.doc(codigo).set(doc);
      trabalhador = { id: codigo, ...doc };
      hideAlert('alertEntrada');
      // Mostrar código
      document.getElementById('codigoValBig').textContent = codigo;
      document.getElementById('codigoReveal').classList.add('show');
      document.getElementById('formEntrada').style.display = 'none';
    }
  } catch(e) {
    console.error(e);
    showAlert('alertEntrada', 'err', 'Erro de ligação. Tenta novamente.');
  }
}

async function entrarComCodigo() {
  const codigo = document.getElementById('inCodigo').value.trim().toUpperCase();
  if (!codigo) {
    showAlert('alertEntrada', 'err', 'Introduz o teu código de portal.');
    return;
  }
  showAlert('alertEntrada', 'info', 'A verificar…');
  try {
    const snap = await colPortal.doc(codigo).get();
    if (snap.exists) {
      trabalhador = { id: snap.id, ...snap.data() };
      hideAlert('alertEntrada');
      onEntrou();
    } else {
      showAlert('alertEntrada', 'err', 'Código não encontrado. Verifica e tenta novamente.');
    }
  } catch(e) {
    console.error(e);
    showAlert('alertEntrada', 'err', 'Erro de ligação. Tenta novamente.');
  }
}

function onEntrou() {
  const codigo = trabalhador.codigoPublico || trabalhador.id;
  document.getElementById('listaNome').textContent = trabalhador.nome || 'Trabalhador';
  document.getElementById('listaCodigo').textContent = codigo;
  prefillForm();
  mostrarVistaLista();
}

// ── LISTA ──
function carregarReclamacoes() {
  const listEl = document.getElementById('recList');
  listEl.innerHTML = '<div style="padding:20px;text-align:center;font-size:11px;color:var(--muted);">A carregar…</div>';
  const codigo = trabalhador.codigoPublico || trabalhador.id;
  colRec.where('codigoPortal', '==', codigo).limit(20).get()
    .then(snap => {
      recsList = snap.docs
        .map(d => ({ id: d.id, ...d.data() }))
        .sort((a, b) => (b.criadoEm || 0) - (a.criadoEm || 0));
      renderLista();
    })
    .catch(e => {
      console.error(e);
      listEl.innerHTML = '<div style="padding:20px;text-align:center;font-size:11px;color:var(--red);">Erro ao carregar. Tenta novamente.</div>';
    });
}

function renderLista() {
  const listEl = document.getElementById('recList');
  if (!recsList.length) {
    listEl.innerHTML = `<div class="empty-state">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.2"><circle cx="12" cy="12" r="9"/><path d="M12 8v4l3 3"/></svg>
      <p>Ainda não tens reclamações submetidas.</p>
    </div>`;
    return;
  }
  listEl.innerHTML = recsList.map(r => renderCard(r)).join('');
}

function renderCard(r) {
  const eKey   = r.estado || 'nova';
  const eLabel = ESTADO_LABEL[eKey] || eKey;
  const ePill  = estadoPillClass(eKey);
  const eCard  = estadoClass(eKey);
  const exp    = expandedIds.has(r.id);
  const hist   = r.historico || [];
  const periodos = r.periodos || [];

  const periodosHTML = periodos.length ? `
    <table class="periodos-table">
      <thead><tr><th>Mês/Ano</th><th>Dias</th><th>Turnos</th><th>Total</th><th>🌙 Noc.</th><th>📅 Fer.</th></tr></thead>
      <tbody>${periodos.map(p => {
        const turnos = p.turnos || [];
        const turnosHTML = turnos.length
          ? turnos.map((t, i) => `<span style="white-space:nowrap;margin-right:8px">${turnos.length > 1 ? 'T' + (i+1) + ': ' : ''}${t.entrada||'—'} → ${t.saida||'—'}${t.total ? ' (' + t.total + ')' : ''}</span>`).join('')
          : '—';
        return `<tr>
          <td>${p.mesNome || MESES[p.mes] || ''} ${p.ano}</td>
          <td><div class="dias-chips">${(p.dias||[]).map(d => `<span class="dia-chip">${d}</span>`).join('')}</div></td>
          <td style="font-size:10px">${turnosHTML}</td>
          <td>${p.totalHoras || '—'}</td>
          <td>${p.totalNoturnas || '—'}</td>
          <td>${p.totalFeriado || '—'}</td>
        </tr>`;
      }).join('')}</tbody>
    </table>` : '';

  return `<div class="rec-card estado-${eCard}" id="card-${r.id}">
    <div class="card-header" onclick="toggleCard('${r.id}')">
      <div>
        <div class="card-nome">${escHtml(r.empresa || '—')}${r.categoria ? `<span style="font-size:10px;color:var(--muted);font-weight:400;margin-left:8px;">${escHtml(r.categoria)}</span>` : ''}</div>
        <div class="card-sub">${escHtml(r.resumoPeriodo || '—')} · ${fmtData(r.criadoEm)}</div>
      </div>
      <span class="estado-pill ${ePill}">${eLabel}</span>
      <svg class="chevron ${exp ? 'open' : ''}" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M4 6l4 4 4-4"/></svg>
    </div>
    <div class="card-body ${exp ? 'open' : ''}" id="body-${r.id}">
      <div class="detail-grid">
        ${periodos.length ? `<div class="detail-item span-full"><div class="detail-item-label">Períodos reclamados</div>${periodosHTML}</div>` : ''}
      </div>
      ${hist.length ? `<div class="card-historico">
        <div class="historico-label">Histórico</div>
        <div class="historico-list">${hist.map(h => {
          const hc = estadoPillClass(h.estado || 'nova');
          return `<div class="historico-item">
            <div class="historico-dot ${hc}"></div>
            <div class="historico-content">
              <div class="historico-estado">${ESTADO_LABEL[h.estado] || h.estado}</div>
              ${h.nota ? `<div class="historico-nota">${escHtml(h.nota)}</div>` : ''}
              <div class="historico-meta">${fmtDataHora(h.em)}</div>
            </div>
          </div>`;
        }).join('')}</div>
      </div>` : ''}
    </div>
  </div>`;
}

function toggleCard(id) {
  if (expandedIds.has(id)) expandedIds.delete(id); else expandedIds.add(id);
  renderLista();
}

// ── PERÍODO BLOCKS ──
let periodoCount = 0;
const PS = {};

function adicionarPeriodo(d) {
  const id  = 'p' + (++periodoCount);
  const now = new Date();
  PS[id] = {
    mes: d ? d.mes : now.getMonth(),
    ano: d ? d.ano : now.getFullYear(),
    diasSel: new Set(d ? d.dias : []),
    calOpen: false,
    calViewMes: d ? d.mes : now.getMonth(),
    calViewAno: d ? d.ano : now.getFullYear(),
    rangeStart: null
  };
  const wrap = document.getElementById('periodosWrap');
  const div  = document.createElement('div');
  div.className = 'periodo-block';
  div.id = 'block-' + id;
  div.innerHTML = buildBlockHTML(id, d);
  wrap.appendChild(div);
  if (d) updateTrigger(id);
  if (d && d.turnos && d.turnos.length) d.turnos.forEach(t => adicionarTurno(id, t));
  else adicionarTurno(id);
  syncRemoveBtns();
}

function buildBlockHTML(id, d) {
  const s = PS[id];
  const mesOpts = MESES.map((m, i) => `<option value="${i}" ${i === s.mes ? 'selected' : ''}>${m}</option>`).join('');
  const tot = d ? (d.totalHoras || '') : '';
  return `
    <div class="periodo-block-header">
      <span class="periodo-block-title">Período</span>
      <button class="btn-remove-periodo" onclick="removerPeriodo('${id}')" title="Remover">×</button>
    </div>
    <div class="periodo-grid">
      <div>
        <label class="field-label">Dias<span class="req">*</span></label>
        <div class="cal-wrap" id="cw-${id}">
          <button type="button" class="cal-trigger" id="ct-${id}" onclick="toggleCal('${id}')">Selecionar dias…</button>
          <div class="cal-popup" id="cp-${id}">
            <div class="cal-nav">
              <button class="cal-nav-btn" onclick="calNav('${id}',-1)"><svg width="10" height="10" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="2"><path d="M10 12L6 8l4-4"/></svg></button>
              <span class="cal-month-label" id="cm-${id}"></span>
              <button class="cal-nav-btn" onclick="calNav('${id}',1)"><svg width="10" height="10" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="2"><path d="M6 12l4-4-4-4"/></svg></button>
            </div>
            <div class="cal-grid" id="cg-${id}"></div>
            <div class="cal-footer">
              <span class="cal-hint">Clique · Shift+clique para intervalo</span>
              <button class="cal-clear" onclick="calClear('${id}')">Limpar</button>
            </div>
          </div>
        </div>
      </div>
      <div>
        <label class="field-label">Mês</label>
        <select class="form-select" id="mes-${id}" onchange="onMesAno('${id}')">${mesOpts}</select>
      </div>
      <div>
        <label class="field-label">Ano</label>
        <input type="number" class="form-input" id="ano-${id}" value="${s.ano}" min="2020" max="2035" onchange="onMesAno('${id}')">
      </div>
    </div>
    <div style="margin-top:10px;">
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:6px;">
        <label class="field-label" style="margin:0">Turnos</label>
        <button class="btn-add-turno" onclick="adicionarTurno('${id}')">
          <svg width="10" height="10" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="2"><path d="M8 2v12M2 8h12"/></svg>
          Adicionar turno
        </button>
      </div>
      <div class="turnos-wrap" id="turnos-${id}"></div>
    </div>
    <div class="periodo-totais">
      <div class="total-chip horas"><span class="total-chip-label">Total</span><input type="text" class="turno-input-sm" id="th-${id}" value="${tot}" placeholder="—" style="width:70px;font-weight:600;" autocomplete="off" title="Total horas (editável)"></div>
      <div class="total-chip noturnas"><span class="total-chip-label">🌙 Noturnas</span><input type="text" class="turno-input-sm" id="thn-${id}" placeholder="—" style="width:64px;" autocomplete="off" readonly></div>
      <div class="total-chip feriado"><span class="total-chip-label">📅 Feriado</span><input type="text" class="turno-input-sm" id="thf-${id}" placeholder="—" style="width:64px;" autocomplete="off" readonly></div>
    </div>`;
}

function removerPeriodo(id) {
  if (document.querySelectorAll('.periodo-block').length <= 1) { toast('Tem de existir pelo menos um período.'); return; }
  document.getElementById('block-' + id).remove();
  delete PS[id];
  syncRemoveBtns();
}
function syncRemoveBtns() {
  const bl = document.querySelectorAll('.periodo-block');
  bl.forEach(b => { const btn = b.querySelector('.btn-remove-periodo'); if (btn) btn.style.display = bl.length > 1 ? '' : 'none'; });
}
function onMesAno(id) {
  const s = PS[id];
  s.mes = parseInt(document.getElementById('mes-' + id).value);
  s.ano = parseInt(document.getElementById('ano-' + id).value) || new Date().getFullYear();
  s.calViewMes = s.mes; s.calViewAno = s.ano;
  s.diasSel.clear(); s.rangeStart = null;
  updateTrigger(id);
  if (s.calOpen) renderCal(id);
}

// ── CALENDÁRIO ──
function toggleCal(id) {
  Object.keys(PS).forEach(k => { if (k !== id && PS[k].calOpen) closeCal(k); });
  const s = PS[id]; s.calOpen = !s.calOpen;
  document.getElementById('cp-' + id).classList.toggle('open', s.calOpen);
  document.getElementById('ct-' + id).classList.toggle('open', s.calOpen);
  if (s.calOpen) renderCal(id);
}
function closeCal(id) {
  if (!PS[id]) return;
  PS[id].calOpen = false;
  document.getElementById('cp-' + id)?.classList.remove('open');
  document.getElementById('ct-' + id)?.classList.remove('open');
}
function calNav(id, dir) {
  const s = PS[id]; s.calViewMes += dir;
  if (s.calViewMes < 0)  { s.calViewMes = 11; s.calViewAno--; }
  if (s.calViewMes > 11) { s.calViewMes = 0;  s.calViewAno++; }
  renderCal(id);
}
function renderCal(id) {
  const s = PS[id];
  document.getElementById('cm-' + id).textContent = MESES[s.calViewMes] + ' ' + s.calViewAno;
  const first = new Date(s.calViewAno, s.calViewMes, 1).getDay();
  const dim   = new Date(s.calViewAno, s.calViewMes + 1, 0).getDate();
  const td    = new Date();
  let html = DIAS_SEMANA.map(d => `<div class="cal-dow">${d}</div>`).join('');
  for (let i = 0; i < first; i++) html += `<div class="cal-day other-month empty"></div>`;
  for (let d = 1; d <= dim; d++) {
    const sel   = s.diasSel.has(d);
    const today = d === td.getDate() && s.calViewMes === td.getMonth() && s.calViewAno === td.getFullYear();
    html += `<div class="cal-day${sel ? ' sel' : ''}${today ? ' today' : ''}" onclick="dayClick('${id}',${d},event)">${d}</div>`;
  }
  document.getElementById('cg-' + id).innerHTML = html;
}
function dayClick(id, day, evt) {
  const s = PS[id];
  if (evt.shiftKey && s.rangeStart !== null) {
    const from = Math.min(s.rangeStart, day), to = Math.max(s.rangeStart, day);
    const dim  = new Date(s.calViewAno, s.calViewMes + 1, 0).getDate();
    for (let d = from; d <= Math.min(to, dim); d++) s.diasSel.add(d);
    s.rangeStart = null;
  } else {
    if (s.diasSel.has(day)) { s.diasSel.delete(day); s.rangeStart = null; }
    else { s.diasSel.add(day); s.rangeStart = day; }
  }
  document.getElementById('mes-' + id).value = s.calViewMes;
  document.getElementById('ano-' + id).value = s.calViewAno;
  s.mes = s.calViewMes; s.ano = s.calViewAno;
  updateTrigger(id); renderCal(id);
}
function calClear(id) { PS[id].diasSel.clear(); PS[id].rangeStart = null; updateTrigger(id); renderCal(id); }
function updateTrigger(id) {
  const s = PS[id], btn = document.getElementById('ct-' + id); if (!btn) return;
  const dias = [...s.diasSel].sort((a, b) => a - b);
  if (!dias.length) { btn.textContent = 'Selecionar dias…'; btn.classList.remove('has-days'); }
  else { btn.textContent = dias.length === 1 ? `Dia ${dias[0]}` : `${dias.length} dias: ${dias.slice(0, 5).join(', ')}${dias.length > 5 ? ' …' : ''}`; btn.classList.add('has-days'); }
}
document.addEventListener('click', e => {
  Object.keys(PS).forEach(id => {
    if (!PS[id].calOpen) return;
    const w = document.getElementById('cw-' + id);
    if (w && !w.contains(e.target)) closeCal(id);
  });
});

// ── TURNOS ──
let turnoCount = 0;
function adicionarTurno(pid, d) {
  const tid  = 't' + (++turnoCount);
  const wrap = document.getElementById('turnos-' + pid);
  if (!wrap) return;
  const row = document.createElement('div');
  row.className = 'turno-row'; row.id = 'tr-' + tid;
  row.innerHTML = `
    <span class="turno-num">Turno</span>
    <div class="turno-fields">
      <label class="field-label" style="margin:0;white-space:nowrap">Entrada</label>
      <input type="time" class="turno-input" id="te-${tid}" value="${d ? d.entrada : ''}" oninput="calcTurno('${pid}','${tid}')">
      <span class="turno-sep">→</span>
      <label class="field-label" style="margin:0;white-space:nowrap">Saída</label>
      <input type="time" class="turno-input" id="ts-${tid}" value="${d ? d.saida : ''}" oninput="calcTurno('${pid}','${tid}')">
      <span class="turno-sep" style="color:var(--muted);font-size:10px">=</span>
      <input type="text" class="turno-input" id="tt-${tid}" value="${d ? d.total : ''}" placeholder="—" style="max-width:64px;color:var(--blue);" autocomplete="off" title="Total (editável)">
      <span class="turno-sep" style="width:1px;height:16px;background:var(--border);margin:0 4px;"></span>
      <div class="turno-extra"><span class="turno-extra-label">🌙 Noturnas</span><input type="text" class="turno-input-sm" id="tn-${tid}" value="${d ? d.noturnas : ''}" placeholder="—" oninput="calcTotaisPeriodo('${pid}')" autocomplete="off"></div>
      <div class="turno-extra"><span class="turno-extra-label">📅 Feriado</span><input type="text" class="turno-input-sm" id="tf-${tid}" value="${d ? d.feriado : ''}" placeholder="—" oninput="calcTotaisPeriodo('${pid}')" autocomplete="off"></div>
    </div>
    <button class="btn-rm-turno" onclick="removerTurno('${pid}','${tid}')" title="Remover">×</button>`;
  wrap.appendChild(row);
  renumTurnos(pid);
}
function removerTurno(pid, tid) { document.getElementById('tr-' + tid)?.remove(); renumTurnos(pid); }
function renumTurnos(pid) {
  const rows = document.querySelectorAll(`#turnos-${pid} .turno-row`);
  rows.forEach((r, i) => { const n = r.querySelector('.turno-num'); if (n) n.textContent = rows.length === 1 ? 'Turno' : 'Turno ' + (i + 1); });
}
function calcTotaisPeriodo(pid) {
  const rows = [...document.querySelectorAll(`#turnos-${pid} .turno-row`)];
  let totMin = 0, notMin = 0, ferMin = 0;
  rows.forEach(r => {
    const tid = r.id.replace('tr-', '');
    const parseFn = v => { if (!v) return 0; const m = v.match(/(\d+)h(\d+)?/i); if (m) return parseInt(m[1]) * 60 + (parseInt(m[2] || 0)); const n = parseFloat(v.replace(',', '.')); return isNaN(n) ? 0 : Math.round(n * 60); };
    totMin += parseFn(document.getElementById('tt-' + tid)?.value);
    notMin += parseFn(document.getElementById('tn-' + tid)?.value);
    ferMin += parseFn(document.getElementById('tf-' + tid)?.value);
  });
  const fmt = m => { if (!m) return ''; const h = Math.floor(m / 60), mn = m % 60; return mn ? `${h}h${String(mn).padStart(2, '0')}` : `${h}h`; };
  const ht  = document.getElementById('th-' + pid);
  const tnt = document.getElementById('thn-' + pid);
  const tft = document.getElementById('thf-' + pid);
  if (ht  && !ht.dataset.manual) ht.value  = fmt(totMin);
  if (tnt) tnt.value = fmt(notMin);
  if (tft) tft.value = fmt(ferMin);
}
function calcTurno(pid, tid) {
  const e = document.getElementById('te-' + tid)?.value;
  const s = document.getElementById('ts-' + tid)?.value;
  if (!e || !s) return;
  const [eh, em] = e.split(':').map(Number), [sh, sm] = s.split(':').map(Number);
  let mins = (sh * 60 + sm) - (eh * 60 + em); if (mins <= 0) return;
  const h = Math.floor(mins / 60), m = mins % 60;
  const tot = document.getElementById('tt-' + tid);
  if (tot) tot.value = m ? `${h}h${String(m).padStart(2, '0')}` : `${h}h`;
  calcTotaisPeriodo(pid);
}
function getTurnos(pid) {
  return [...document.querySelectorAll(`#turnos-${pid} .turno-row`)].map(r => {
    const tid = r.id.replace('tr-', '');
    return { entrada: document.getElementById('te-' + tid)?.value || '', saida: document.getElementById('ts-' + tid)?.value || '', total: document.getElementById('tt-' + tid)?.value || '', noturnas: document.getElementById('tn-' + tid)?.value || '', feriado: document.getElementById('tf-' + tid)?.value || '' };
  }).filter(t => t.entrada || t.saida);
}
function getPeriodos() {
  return [...document.querySelectorAll('.periodo-block')].map(bl => {
    const id = bl.id.replace('block-', ''), s = PS[id]; if (!s) return null;
    return { dias: [...s.diasSel].sort((a, b) => a - b), mes: s.mes, mesNome: MESES[s.mes], ano: s.ano, turnos: getTurnos(id), totalHoras: document.getElementById('th-' + id).value, totalNoturnas: document.getElementById('thn-' + id)?.value || '', totalFeriado: document.getElementById('thf-' + id)?.value || '' };
  }).filter(Boolean);
}

// ── SUBMIT ──
async function submitReclamacao() {
  if (!trabalhador) return;
  const nome    = document.getElementById('fNome').value.trim();
  const nif     = document.getElementById('fNif').value.trim();
  const numFunc = document.getElementById('fNumFunc').value.trim();
  const empresa = document.getElementById('fEmpresa').value.trim();
  if (!nome)    { showAlert('alertForm', 'err', 'Nome obrigatório.'); return; }
  if (!empresa) { showAlert('alertForm', 'err', 'Empresa utilizadora obrigatória.'); return; }
  const periodos = getPeriodos();
  if (!periodos.length || periodos.every(p => p.dias.length === 0)) {
    showAlert('alertForm', 'err', 'Seleciona pelo menos um dia num período.');
    return;
  }
  hideAlert('alertForm');
  const codigo         = trabalhador.codigoPublico || trabalhador.id;
  const resumoPeriodo  = periodos.map(p => `${p.dias.length} dia(s) — ${p.mesNome} ${p.ano}`).join(' | ');
  try {
    await colRec.add({
      numFunc, nif, nome, empresa,
      categoria: document.getElementById('fCategoria').value.trim(),
      escritorio: document.getElementById('fEscritorio').value,
      canal:  selCanalVal,
      notas:  document.getElementById('fNotas').value.trim(),
      periodos, resumoPeriodo,
      codigoPortal: codigo,
      estado:    'nova',
      criadoPor: nome,
      criadoEm:  Date.now(),
      historico: [{ estado: 'nova', nota: 'Submetido pelo trabalhador', por: nome, em: Date.now() }]
    });
    // Actualizar nome e ultimaReclamacao no portal
    const updates = { ultimaReclamacao: Date.now() };
    if (!trabalhador.nome) updates.nome = nome;
    await colPortal.doc(codigo).update(updates);
    if (!trabalhador.nome) {
      trabalhador.nome = nome;
      document.getElementById('listaNome').textContent = nome;
    }
    toast('✓ Reclamação submetida com sucesso!');
    mostrarVistaLista();
  } catch(e) {
    console.error(e);
    showAlert('alertForm', 'err', 'Erro ao submeter. Tenta novamente.');
  }
}

function prefillForm() {
  document.getElementById('fNif').value    = trabalhador.nif || '';
  document.getElementById('fNumFunc').value = trabalhador.numFunc || '';
  document.getElementById('fNome').value   = trabalhador.nome || '';
}

function resetForm() {
  document.getElementById('periodosWrap').innerHTML = '';
  Object.keys(PS).forEach(k => delete PS[k]);
  periodoCount = 0;
  turnoCount   = 0;
  prefillForm();
  document.getElementById('fCategoria').value = '';
  document.getElementById('fEmpresa').value   = '';
  document.getElementById('fNotas').value     = '';
  document.getElementById('fEscritorio').value = '';
  hideAlert('alertForm');
}

// ── HELPERS ──
function fmtData(ts) { if (!ts) return '—'; return new Date(ts).toLocaleDateString('pt-PT', { day:'2-digit', month:'2-digit', year:'numeric' }); }
function fmtDataHora(ts) { if (!ts) return '—'; const d = new Date(ts); return d.toLocaleDateString('pt-PT', {day:'2-digit',month:'2-digit',year:'numeric'}) + ' ' + d.toLocaleTimeString('pt-PT', {hour:'2-digit',minute:'2-digit'}); }
function estadoClass(e) { return (e || 'nova').replace(/-/g, ''); }
function estadoPillClass(e) { const c = estadoClass(e); return c === 'aguardaproc' ? 'aguarda-proc' : c === 'semfundamento' ? 'sem-fundamento' : c; }

// ── INIT: carregar escritórios ──
const ESCRITORIOS_FALLBACK = [
  {id:'quarteira',nome:'Quarteira'},{id:'albufeira',nome:'Albufeira'},
  {id:'lisboa',nome:'Lisboa'},{id:'porto',nome:'Porto'}
];
function popularEscritorios(lista) {
  const sel = document.getElementById('fEscritorio');
  sel.innerHTML = '<option value="">— Selecionar —</option>' + lista.map(e => `<option value="${e.id}">${e.nome}</option>`).join('');
}
db.collection('config').doc('escritorios').get()
  .then(snap => {
    const lista = (snap.exists && snap.data() && Array.isArray(snap.data().lista))
      ? snap.data().lista : ESCRITORIOS_FALLBACK;
    popularEscritorios(lista);
  })
  .catch(() => popularEscritorios(ESCRITORIOS_FALLBACK));
