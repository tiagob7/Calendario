// ═══════════════════════════════════════════════════════════
// js/voz-ai.js — Assistente de voz / IA partilhado
// Usado em: tarefas.html, admissoes.html
// Requer: shared.js, claude-proxy.js (ou chave direta)
// ═══════════════════════════════════════════════════════════

const VOZ_PROMPTS = {
  tarefa: `Analisa este texto em português e extrai os dados para uma tarefa. Responde APENAS com JSON.
Formato: {"titulo":"...","descricao":"...","prioridade":"urgente|normal|baixa","escritorio":"quarteira|albufeira|lisboa|porto","departamento":"..."}`,
  admissao: `Analisa este texto em português e extrai os dados para uma admissão. Responde APENAS com JSON.
Formato: {"nome":"nome completo","numero":"número de colaborador ou vazio","nif":"NIF ou vazio","empresa":"nome da empresa utilizadora ou vazio","categoria":"categoria profissional em texto livre ou vazio","escritorio":"quarteira|albufeira|lisboa|porto ou vazio","dataEntrada":"YYYY-MM-DD ou vazio","valorBase":"só o número ex: 1200 ou vazio","tipo":"admissao|cessacao"}`
};

const VOZ_LABELS = {
  tarefa:   { titulo:'Título', descricao:'Descrição', prioridade:'Prioridade', escritorio:'Escritório', departamento:'Departamento' },
  admissao: { nome:'Nome', nif:'NIF', empresa:'Empresa', categoria:'Categoria', escritorio:'Escritório', dataEntrada:'Data entrada', valorBase:'Valor base', tipo:'Tipo' }
};

let _vozTipo       = 'tarefa';
let _vozRec        = null;
let _vozGravando   = false;
let _vozTranscricao = '';
let _vozDados      = null;

// ── Abrir modal ──────────────────────────────────────────
window.vozAbrir = function vozAbrir(tipo) {
  if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
    alert('A Web Speech API só funciona no Chrome ou Edge.');
    return;
  }
  _vozTipo        = tipo;
  _vozDados       = null;
  _vozTranscricao = '';

  const overlay = document.getElementById('vozModal');
  overlay.classList.add('open');
  document.getElementById('vozModalTitulo').textContent =
    tipo === 'tarefa' ? 'Nova tarefa por voz' : 'Novo processo por voz';
  document.getElementById('vozTranscript').classList.remove('visible');
  document.getElementById('vozFields').classList.remove('visible');
  document.getElementById('vozFields').innerHTML = '';
  document.getElementById('vozLoading').classList.remove('visible');
  document.getElementById('vozTranscriptFinal').textContent   = '';
  document.getElementById('vozTranscriptInterim').textContent = '';
  document.getElementById('vozStatus').textContent            = 'Clica para falar';
  document.getElementById('vozStatus').className              = 'voz-status';
  document.getElementById('vozMicBtn').classList.remove('recording');
  document.getElementById('vozActions').innerHTML =
    '<button class="voz-btn voz-btn-cancel" onclick="vozFechar()">Cancelar</button>';
  overlay.classList.remove('recording');
};

// ── Fechar modal ─────────────────────────────────────────
window.vozFechar = function vozFechar() {
  if (_vozGravando) vozParar();
  document.getElementById('vozModal').classList.remove('open');
};

window.vozToggle = function vozToggle() {
  if (_vozGravando) vozParar();
  else vozIniciar();
};

// ── Gravação ─────────────────────────────────────────────
function vozIniciar() {
  const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
  _vozRec             = new SR();
  _vozRec.lang        = 'pt-PT';
  _vozRec.continuous  = true;
  _vozRec.interimResults = true;
  _vozTranscricao     = '';

  document.getElementById('vozTranscript').classList.add('visible');
  document.getElementById('vozTranscriptFinal').textContent   = '';
  document.getElementById('vozTranscriptInterim').textContent = '';

  _vozRec.onstart = () => {
    _vozGravando = true;
    document.getElementById('vozMicBtn').classList.add('recording');
    document.getElementById('vozModal').classList.add('recording');
    document.getElementById('vozStatus').textContent = 'A ouvir… (clica para parar)';
    document.getElementById('vozStatus').className   = 'voz-status rec';
    document.getElementById('vozMicIcon').innerHTML  =
      '<rect x="4" y="4" width="8" height="8" rx="1" fill="currentColor" stroke="none"/>';
  };

  _vozRec.onresult = (e) => {
    let interim = '';
    for (let i = e.resultIndex; i < e.results.length; i++) {
      const t = e.results[i][0].transcript;
      if (e.results[i].isFinal) _vozTranscricao += t + ' ';
      else interim = t;
    }
    document.getElementById('vozTranscriptFinal').textContent   = _vozTranscricao;
    document.getElementById('vozTranscriptInterim').textContent = interim;
  };

  _vozRec.onerror = () => vozParar();
  _vozRec.onend   = () => { if (_vozGravando) _vozRec.start(); };
  _vozRec.start();
}

function vozParar() {
  _vozGravando = false;
  if (_vozRec) { _vozRec.onend = null; _vozRec.stop(); }
  document.getElementById('vozMicBtn').classList.remove('recording');
  document.getElementById('vozModal').classList.remove('recording');
  document.getElementById('vozStatus').textContent = 'Clica para falar';
  document.getElementById('vozStatus').className   = 'voz-status';
  document.getElementById('vozMicIcon').innerHTML  =
    '<rect x="5" y="1" width="6" height="9" rx="3"/><path d="M2 8c0 3.3 2.7 6 6 6s6-2.7 6-6"/><path d="M8 14v2"/>';
  const texto = _vozTranscricao.trim();
  if (texto) vozProcessar(texto);
}

// ── Processar com Claude ─────────────────────────────────
async function vozProcessar(texto) {
  document.getElementById('vozLoading').classList.add('visible');
  document.getElementById('vozFields').classList.remove('visible');
  document.getElementById('vozActions').innerHTML = '';

  try {
    let dados;

    if (typeof window.chamarClaude === 'function') {
      // Via proxy seguro (recomendado — claude-proxy.js)
      const raw = await window.chamarClaude(
        'Texto: "' + texto + '"',
        VOZ_PROMPTS[_vozTipo],
        { max_tokens: 800 }
      );
      dados = JSON.parse(raw.replace(/```json|```/g, '').trim());
    } else {
      // Fallback: simulação offline
      await new Promise(r => setTimeout(r, 1200));
      dados = vozSimular(texto, _vozTipo);
    }

    _vozDados = dados;
    vozMostrarCampos(dados);

  } catch(e) {
    document.getElementById('vozLoading').classList.remove('visible');
    document.getElementById('vozStatus').textContent = 'Erro: ' + e.message;
    document.getElementById('vozActions').innerHTML =
      '<button class="voz-btn voz-btn-retry" onclick="vozProcessar(_vozTranscricao.trim())">Tentar novamente</button>' +
      '<button class="voz-btn voz-btn-cancel" onclick="vozFechar()">Cancelar</button>';
  }
}

// ── Mostrar campos extraídos ─────────────────────────────
function vozMostrarCampos(dados) {
  document.getElementById('vozLoading').classList.remove('visible');
  const labels    = VOZ_LABELS[_vozTipo];
  const fields    = document.getElementById('vozFields');
  const fullFields = _vozTipo === 'tarefa' ? ['descricao'] : ['empresa'];

  fields.innerHTML = Object.entries(dados).map(([k, v]) => {
    if (!(k in labels)) return '';
    const empty = !v || v === '' || v === 'vazio';
    const full  = fullFields.includes(k);
    return `<div class="voz-field${full ? ' full' : ''}">
      <div class="voz-field-key">${labels[k]}</div>
      <div class="voz-field-val${empty ? ' empty' : ''}">${empty ? '—' : escHtml(String(v))}</div>
    </div>`;
  }).join('');

  fields.classList.add('visible');
  document.getElementById('vozActions').innerHTML = `
    <button class="voz-btn voz-btn-confirm" onclick="vozConfirmar()">
      <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 8l3.5 3.5L13 4"/></svg>
      Preencher formulário
    </button>
    <button class="voz-btn voz-btn-retry" onclick="vozToggle()">
      <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M2 8A6 6 0 1114 8"/><path d="M2 8V4H6"/></svg>
      Regravar
    </button>`;
}

// ── Confirmar e preencher formulário ─────────────────────
window.vozConfirmar = function vozConfirmar() {
  if (!_vozDados) return;
  if (_vozTipo === 'tarefa')    vozPreencherTarefa(_vozDados);
  else                          vozPreencherAdmissao(_vozDados);
  vozFechar();
  document.querySelector('.novo-pedido-panel, .form-panel')
    ?.scrollIntoView({ behavior: 'smooth', block: 'start' });
};

function vozPreencherTarefa(d) {
  if (d.titulo)    document.getElementById('fTitulo').value    = d.titulo;
  if (d.descricao) document.getElementById('fDescricao').value = d.descricao;
  if (d.escritorio) {
    const sel = document.getElementById('fEscritorio');
    if (sel) [...sel.options].forEach(o => { if (o.value === d.escritorio.toLowerCase()) sel.value = o.value; });
  }
  if (d.prioridade) {
    const p = d.prioridade.toLowerCase();
    if (typeof selPrio === 'function') selPrio(p);
  }
  toast('Formulário preenchido por voz ✓');
}

function vozPreencherAdmissao(d) {
  if (d.nome)       { const el = document.getElementById('fNome');       if (el) el.value = d.nome; }
  if (d.nif)        { const el = document.getElementById('fNif');        if (el) el.value = d.nif; }
  if (d.empresa)    { const el = document.getElementById('fEmpresa');    if (el) el.value = d.empresa; }
  if (d.categoria)  { const el = document.getElementById('fCategoria');  if (el) el.value = d.categoria; }
  if (d.valorBase)  { const el = document.getElementById('fValorBase');  if (el) el.value = d.valorBase; }
  if (d.dataEntrada){ const el = document.getElementById('fDataEntrada');if (el) { el.value = d.dataEntrada; if (typeof updatePrioPreview === 'function') updatePrioPreview(); } }
  if (d.escritorio) {
    const sel = document.getElementById('fEscritorioAdm');
    if (sel) [...sel.options].forEach(o => { if (o.value === d.escritorio.toLowerCase()) sel.value = o.value; });
  }
  if (d.tipo === 'cessacao' && typeof selTipo === 'function') selTipo('cessacao');
  toast('Formulário preenchido por voz ✓');
}

// ── Simulação offline ─────────────────────────────────────
function vozSimular(texto, tipo) {
  const t    = texto.toLowerCase();
  const nome = (texto.match(/\b([A-ZÁÉÍÓÚÀÂÊÔÃÕÇ][a-záéíóúàâêôãõç]+ [A-ZÁÉÍÓÚÀÂÊÔÃÕÇ][a-záéíóúàâêôãõç]+)\b/) || [])[1] || '';
  const esc  = (window.getEscritoriosSync ? window.getEscritoriosSync() : [])
                 .map(e => e.id).find(e => t.includes(e)) || '';
  const data = (texto.match(/\b(\d{4}-\d{2}-\d{2}|\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4})\b/) || [])[1] || '';

  if (tipo === 'tarefa') {
    return {
      titulo:      texto.split(' ').slice(0, 7).join(' ').replace(/^\w/, c => c.toUpperCase()),
      descricao:   texto.length > 50 ? texto : '',
      prioridade:  t.includes('urgente') ? 'urgente' : t.includes('baixa') ? 'baixa' : 'normal',
      escritorio:  esc,
      departamento: t.includes('contabil') ? 'Contabilidade' : t.includes('payroll') || t.includes('rh') ? 'Payroll' : '',
    };
  }
  return {
    nome,
    nif:        (texto.match(/\b\d{9}\b/) || [])[0] || '',
    empresa:    '',
    categoria:  t.includes('contabil') ? 'Técnico de Contabilidade' : t.includes('payroll') ? 'Técnico de Payroll' : '',
    escritorio: esc,
    dataEntrada: data,
    valorBase:  (texto.match(/\b\d{3,4}([.,]\d{2})?\s*€?\b/) || [])[0]?.replace(/[^0-9.]/g, '') || '',
    tipo:       t.includes('cessa') || t.includes('saída') || t.includes('saida') ? 'cessacao' : 'admissao',
  };
}

// ── Fechar ao clicar fora / Escape ────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  const modal = document.getElementById('vozModal');
  if (modal) {
    modal.addEventListener('click', function(e) { if (e.target === this) vozFechar(); });
  }
  document.addEventListener('keydown', e => { if (e.key === 'Escape') vozFechar(); });
});
