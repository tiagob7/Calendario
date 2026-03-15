// ═══════════════════════════════════════════════════════════
// auth.js — Autenticação partilhada
// Incluir em TODAS as páginas protegidas (depois do Firebase init)
// ═══════════════════════════════════════════════════════════

window.currentUser  = null;
window.userProfile  = null;

// ── Injetar overlay de loading ──
const overlay = document.createElement('div');
overlay.id = 'authOverlay';
overlay.style.cssText = 'position:fixed;inset:0;background:#f4f4f6;display:flex;align-items:center;justify-content:center;z-index:9999;font-family:\'DM Mono\',monospace;';
overlay.innerHTML = '<div style="font-size:12px;color:#8888a0;letter-spacing:.05em;">A verificar sessão…</div>';
document.body.prepend(overlay);

// ── Helpers ──
window.isAdmin = function() {
  return window.userProfile && window.userProfile.role === 'admin';
};

window.temPermissao = function(perm) {
  if (window.isAdmin()) return true;
  return !!(window.userProfile && window.userProfile.permissoes && window.userProfile.permissoes[perm] === true);
};

window.escritorioAtivo = function() {
  if (window.isAdmin()) {
    return sessionStorage.getItem('filtroEscritorio') || 'todos';
  }
  return window.userProfile ? window.userProfile.escritorio : '';
};

window.setFiltroEscritorio = function(e) {
  sessionStorage.setItem('filtroEscritorio', e);
  location.reload();
};

window.logout = function() {
  firebase.auth().signOut().then(() => {
    window.location.href = 'login.html';
  });
};

// ── renderNavbar ──
window.renderNavbar = function(activePage) {
  if (activePage === 'dashboard') return;

  const profile  = window.userProfile;
  const isAdmin  = window.isAdmin();
  const nome     = profile ? (profile.nomeCompleto || profile.nome || profile.email || '') : '';
  const role     = isAdmin ? 'Admin' : 'Colaborador';
  const roleClass = isAdmin ? 'admin' : 'colab';

  if (!document.getElementById('miniHeaderStyle')) {
    const style = document.createElement('style');
    style.id = 'miniHeaderStyle';
    style.textContent = `
      .mini-header { background:#fff; border-bottom:1px solid #e2e2e8; font-family:'DM Mono',monospace; height:46px; display:flex; align-items:stretch; position:sticky; top:0; z-index:500; }
      .mini-header-inner { width:100%; margin:0 auto; padding:0 20px; display:flex; align-items:center; gap:10px; }
      .mini-header-back { display:inline-flex; align-items:center; gap:5px; padding:5px 12px; border:1px solid #e2e2e8; border-radius:8px; font-size:10px; text-transform:uppercase; letter-spacing:.07em; color:#8888a0; text-decoration:none; font-family:'DM Mono',monospace; background:#f7f7f9; transition:all .15s; white-space:nowrap; }
      .mini-header-back:hover { border-color:#2563eb; color:#2563eb; background:#eff6ff; }
      .mini-header-back svg { width:11px; height:11px; }
      .mini-header-title { font-family:'Manrope',sans-serif; font-weight:800; font-size:13px; letter-spacing:-.02em; color:#1a1a22; flex:1; }
      .mini-header-user { font-size:10px; color:#8888a0; white-space:nowrap; }
      .mini-header-role { font-size:9px; text-transform:uppercase; letter-spacing:.07em; padding:2px 8px; border-radius:10px; font-weight:500; white-space:nowrap; }
      .mini-header-role.admin  { background:#eff6ff; color:#2563eb; border:1px solid #bfdbfe; }
      .mini-header-role.colab  { background:#f4f4f6; color:#8888a0; border:1px solid #e2e2e8; }
      .mini-header-logout { display:inline-flex; align-items:center; gap:4px; padding:5px 10px; border:1px solid #e2e2e8; background:none; font-family:'DM Mono',monospace; font-size:10px; text-transform:uppercase; letter-spacing:.07em; color:#8888a0; border-radius:8px; cursor:pointer; transition:all .15s; }
      .mini-header-logout:hover { border-color:#dc2626; color:#dc2626; }
      .mini-header-logout svg { width:11px; height:11px; }
      @media(max-width:480px) { .mini-header-user { display:none; } .mini-header-role { display:none; } .mini-header-title { font-size:12px; } }
    `;
    document.head.appendChild(style);
  }

  const PAGE_TITLES = {
    calendario:  'Calendário',
    tarefas:     'Tarefas',
    comunicados: 'Comunicados',
    admissoes:        'Admissões',
    definicoes:       'Definições',
    'gerir-calendarios': 'Gerir Calendários',
    reclamacoes:      'Reclamações de Horas',
  };
  const titulo = PAGE_TITLES[activePage] || activePage;

  const pageEl = document.querySelector('.page');
  const pgMaxWidth = pageEl ? window.getComputedStyle(pageEl).maxWidth : 'none';

  const header = document.createElement('div');
  header.className = 'mini-header';
  header.innerHTML = `
    <div class="mini-header-inner" style="max-width:${pgMaxWidth}">
      <a href="dashboard.html" class="mini-header-back">
        <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M10 12L6 8l4-4"/></svg>
        Dashboard
      </a>
      <div class="mini-header-title">${titulo}</div>
      <span class="mini-header-user">${escHtml(nome)}</span>
      <span class="mini-header-role ${roleClass}">${role}</span>
      <button class="mini-header-logout" onclick="window.logout()">
        <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M6 14H3a1 1 0 01-1-1V3a1 1 0 011-1h3M11 11l3-3-3-3M14 8H6"/></svg>
        Sair
      </button>
    </div>
  `;
  document.body.insertBefore(header, document.body.firstChild);
};

// ── Verificar autenticação ──
firebase.auth().onAuthStateChanged(async (user) => {
  if (!user) {
    window.location.href = 'login.html';
    return;
  }

  window.currentUser = user;

  let snap;
  try {
    snap = await firebase.firestore()
      .collection('utilizadores').doc(user.uid).get();
  } catch(readErr) {
    console.error('[auth] Falha ao LER perfil do Firestore:', readErr.code, readErr.message);
    // CORRECÇÃO: sem perfil não é possível determinar permissões nem escritório.
    // Antes, o catch era silencioso e o código continuava com snap=undefined,
    // entrando no bloco else e criando um perfil com escritorio:'' — o que
    // fazia a query das reclamações disparar com .where('escritorio','==','').
    const ov = document.getElementById('authOverlay');
    if (ov) ov.innerHTML = '<div style="font-size:12px;color:#dc2626;letter-spacing:.05em;text-align:center;padding:20px;">Erro ao carregar perfil.<br>Tenta recarregar a página.</div>';
    return;
  }

  if (snap && snap.exists) {
    window.userProfile = snap.data();
    // Conta desativada — logout e redirecionar (admins nunca bloqueados)
    if (window.userProfile.ativo === false && window.userProfile.role !== 'admin') {
      await firebase.auth().signOut();
      window.location.href = 'login.html?conta=desativada';
      return;
    }
    // garantir que o campo uid existe no documento (retrocompatibilidade)
    if (!window.userProfile.uid) {
      firebase.firestore().collection('utilizadores').doc(user.uid)
        .update({ uid: user.uid }).catch(() => {});
    }
  } else {
    // Documento não existe — só deve acontecer na primeira vez
    const basicProfile = {
      uid: user.uid,
      email: user.email,
      nome: user.displayName || user.email.split('@')[0],
      apelido: '',
      nomeCompleto: user.displayName || user.email.split('@')[0],
      escritorio: '',
      funcao: '',
      role: 'colaborador',
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
    try {
      await firebase.firestore()
        .collection('utilizadores').doc(user.uid).set(basicProfile);
      console.log('[auth] Perfil criado no Firestore para:', user.email);
      window.userProfile = basicProfile;
    } catch(writeErr) {
      console.error('[auth] Falha ao CRIAR perfil no Firestore:', writeErr.code, writeErr.message);
      window.userProfile = basicProfile;
    }
  }

  firebase.firestore().collection('utilizadores').doc(user.uid)
    .update({ ultimoAcesso: Date.now() }).catch(() => {});

  const ov = document.getElementById('authOverlay');
  if (ov) ov.remove();

  document.dispatchEvent(new CustomEvent('authReady', {
    detail: { user: window.currentUser, profile: window.userProfile }
  }));
});
