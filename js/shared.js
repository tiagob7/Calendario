// ═══════════════════════════════════════════════════════════
// js/shared.js — Utilitários JS partilhados por toda a app
// Incluir em TODAS as páginas (depois do Firebase init e auth.js)
// ═══════════════════════════════════════════════════════════

// ── Sanitização HTML ────────────────────────────────────
window.escHtml = function escHtml(str) {
  if (str === null || str === undefined) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
};

// ── Formatação de datas ──────────────────────────────────
window.fmtDate = function fmtDate(dateStr) {
  // Formata 'YYYY-MM-DD' → '12 jan. 2025'
  if (!dateStr) return '—';
  const [y, m, d] = dateStr.split('-').map(Number);
  return new Date(y, m - 1, d).toLocaleDateString('pt-PT', {
    day: 'numeric', month: 'short', year: 'numeric'
  });
};

window.fmtDateFull = function fmtDateFull(ts) {
  // Formata timestamp ms → '12 de janeiro de 2025 às 14:30'
  if (!ts) return '—';
  const d = new Date(ts);
  return d.toLocaleDateString('pt-PT', {
    day: '2-digit', month: 'long', year: 'numeric'
  }) + ' às ' + d.toLocaleTimeString('pt-PT', {
    hour: '2-digit', minute: '2-digit'
  });
};

window.fmtDateShort = function fmtDateShort(ts) {
  // Formata timestamp ms → '12/01/2025'
  if (!ts) return '—';
  return new Date(ts).toLocaleDateString('pt-PT');
};

window.fmtDateRelative = function fmtDateRelative(ts) {
  // Formata timestamp ms → 'há 2 horas', 'há 3 dias', etc.
  if (!ts) return '—';
  const diff = Date.now() - ts;
  const min  = Math.floor(diff / 60000);
  const h    = Math.floor(diff / 3600000);
  const d    = Math.floor(diff / 86400000);
  if (min < 1)  return 'agora mesmo';
  if (min < 60) return `há ${min} min`;
  if (h   < 24) return `há ${h} hora${h > 1 ? 's' : ''}`;
  if (d   < 7)  return `há ${d} dia${d > 1 ? 's' : ''}`;
  return fmtDateShort(ts);
};

// ── Formatação de bytes ──────────────────────────────────
window.fmtBytes = function fmtBytes(b) {
  if (!b) return '';
  if (b < 1024)    return b + ' B';
  if (b < 1048576) return Math.round(b / 1024) + ' KB';
  return (b / 1048576).toFixed(1) + ' MB';
};

// ── Toast ────────────────────────────────────────────────
window.toast = function toast(msg) {
  const el = document.getElementById('toast');
  if (!el) return;
  el.textContent = msg;
  el.classList.add('show');
  setTimeout(() => el.classList.remove('show'), 2800);
};

// ── Debounce ─────────────────────────────────────────────
window.debounce = function debounce(fn, delay) {
  let timer;
  return function (...args) {
    clearTimeout(timer);
    timer = setTimeout(() => fn.apply(this, args), delay);
  };
};

// ── Gerar ID único simples ────────────────────────────────
window.uid = function uid() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
};

// ── Upload de ficheiros para Firebase Storage ─────────────
// Retorna array de { nome, url, tamanho, criadoEm, path }
window.uploadFicheiros = async function uploadFicheiros(files, coleccao, docId) {
  if (!files || !files.length) return [];
  const storage = firebase.storage ? firebase.storage() : null;
  if (!storage) { console.warn('[shared] Firebase Storage não disponível'); return []; }

  const resultado = [];
  for (const file of files) {
    try {
      const path = `${coleccao}/${docId}/${Date.now()}_${file.name}`;
      const ref  = storage.ref(path);
      const snap = await ref.put(file);
      const url  = await snap.ref.getDownloadURL();
      resultado.push({ nome: file.name, url, tamanho: file.size, criadoEm: Date.now(), path });
    } catch (e) {
      console.error('[shared] Erro ao carregar ficheiro:', file.name, e);
      toast('Erro ao carregar: ' + file.name);
    }
  }
  return resultado;
};

// ── Renderizar lista de ficheiros ─────────────────────────
window.renderFicheiros = function renderFicheiros(ficheiros, docId, podeDeletar, onDelete) {
  if (!ficheiros || !ficheiros.length) return '';
  return ficheiros.map((f, i) => `
    <div class="file-item">
      <span class="file-item-name" title="${escHtml(f.nome)}">${escHtml(f.nome)}</span>
      <span class="file-item-size">${fmtBytes(f.tamanho)}</span>
      <a class="file-item-dl" href="${escHtml(f.url)}" target="_blank" rel="noopener">⬇</a>
      ${podeDeletar
        ? `<button class="file-item-del"
             onclick="event.stopPropagation();(${onDelete})('${escHtml(docId)}',${i})"
             title="Remover">✕</button>`
        : ''}
    </div>`).join('');
};

// ── Copiar para clipboard ─────────────────────────────────
window.copiarParaClipboard = async function copiarParaClipboard(texto, mensagem) {
  try {
    await navigator.clipboard.writeText(texto);
    toast(mensagem || '✓ Copiado!');
  } catch (e) {
    toast('Erro ao copiar.');
  }
};
