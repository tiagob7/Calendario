// ═══════════════════════════════════════════════════════════
// auth.js — Autenticação partilhada
// Incluir em TODAS as páginas protegidas (depois do Firebase init)
// ═══════════════════════════════════════════════════════════

window.currentUser  = null;
window.userProfile  = null;

// ── Dark mode: restaurar preferência guardada ──
(function(){
  if (localStorage.getItem('darkMode') === '1') {
    document.documentElement.classList.add('dark');
  }
})();

// ── Injetar overlay de loading ──
const overlay = document.createElement('div');
overlay.id = 'authOverlay';
const _darkBg = document.documentElement.classList.contains('dark');
overlay.style.cssText = `position:fixed;inset:0;background:${_darkBg?'#0f0f14':'#f4f4f6'};display:flex;align-items:center;justify-content:center;z-index:9999;font-family:'DM Mono',monospace;`;
overlay.innerHTML = `<div style="font-size:12px;color:${_darkBg?'#6868a0':'#8888a0'};letter-spacing:.05em;">A verificar sessão…</div>`;
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

window.toggleDarkMode = function() {
  const isDark = document.documentElement.classList.toggle('dark');
  localStorage.setItem('darkMode', isDark ? '1' : '0');
  // Atualizar ícone em qualquer botão de dark mode na página
  document.querySelectorAll('.dark-toggle-icon').forEach(el => {
    el.textContent = isDark ? '☀️' : '🌙';
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
      .mini-header { background:#fff; border-bottom:1px solid #e2e2e8; font-family:'DM Mono',monospace; height:46px; display:flex; align-items:stretch; position:sticky; top:0; z-index:500; transition:background .2s,border-color .2s; }
      html.dark .mini-header { background:#18181f; border-bottom-color:#2c2c3e; }
      .mini-header-inner { width:100%; margin:0 auto; padding:0 20px; display:flex; align-items:center; gap:8px; }
      .mini-header-back { display:inline-flex; align-items:center; gap:5px; padding:5px 12px; border:1px solid #e2e2e8; border-radius:8px; font-size:10px; text-transform:uppercase; letter-spacing:.07em; color:#8888a0; text-decoration:none; font-family:'DM Mono',monospace; background:#f7f7f9; transition:all .15s; white-space:nowrap; }
      html.dark .mini-header-back { border-color:#2c2c3e; background:#222230; color:#6868a0; }
      .mini-header-back:hover { border-color:#2563eb; color:#2563eb; background:#eff6ff; }
      html.dark .mini-header-back:hover { background:#0c1a30; }
      .mini-header-back svg { width:11px; height:11px; }
      .mini-header-title { font-family:'Manrope',sans-serif; font-weight:800; font-size:13px; letter-spacing:-.02em; color:#1a1a22; flex:1; }
      html.dark .mini-header-title { color:#e4e4f0; }
      .mini-header-user { font-size:10px; color:#8888a0; white-space:nowrap; }
      html.dark .mini-header-user { color:#6868a0; }
      .mini-header-role { font-size:9px; text-transform:uppercase; letter-spacing:.07em; padding:2px 8px; border-radius:10px; font-weight:500; white-space:nowrap; }
      .mini-header-role.admin  { background:#eff6ff; color:#2563eb; border:1px solid #bfdbfe; }
      .mini-header-role.colab  { background:#f4f4f6; color:#8888a0; border:1px solid #e2e2e8; }
      html.dark .mini-header-role.admin { background:#0c1a30; color:#4f8eff; border-color:#1a3060; }
      html.dark .mini-header-role.colab { background:#222230; color:#6868a0; border-color:#2c2c3e; }
      .mini-header-logout { display:inline-flex; align-items:center; gap:4px; padding:5px 10px; border:1px solid #e2e2e8; background:none; font-family:'DM Mono',monospace; font-size:10px; text-transform:uppercase; letter-spacing:.07em; color:#8888a0; border-radius:8px; cursor:pointer; transition:all .15s; }
      html.dark .mini-header-logout { border-color:#2c2c3e; color:#6868a0; }
      .mini-header-logout:hover { border-color:#dc2626; color:#dc2626; }
      .mini-header-logout svg { width:11px; height:11px; }
      .mini-nav-wrap { position:relative; }
      .mini-nav-btn { display:inline-flex; align-items:center; gap:4px; padding:5px 10px; border:1px solid #e2e2e8; border-radius:8px; font-family:'DM Mono',monospace; font-size:10px; text-transform:uppercase; letter-spacing:.07em; color:#8888a0; background:#f7f7f9; cursor:pointer; transition:all .15s; white-space:nowrap; }
      html.dark .mini-nav-btn { border-color:#2c2c3e; background:#222230; color:#6868a0; }
      .mini-nav-btn:hover,.mini-nav-btn.open { border-color:#2563eb; color:#2563eb; background:#eff6ff; }
      html.dark .mini-nav-btn:hover, html.dark .mini-nav-btn.open { border-color:#4f8eff; color:#4f8eff; background:#0c1a30; }
      .mini-nav-btn svg { width:10px; height:10px; transition:transform .15s; }
      .mini-nav-btn.open svg { transform:rotate(180deg); }
      .mini-nav-drop { display:none; position:absolute; top:calc(100% + 6px); left:0; background:#fff; border:1px solid #e2e2e8; border-radius:12px; box-shadow:0 8px 32px rgba(0,0,0,.12); min-width:180px; padding:6px; z-index:600; }
      html.dark .mini-nav-drop { background:#18181f; border-color:#2c2c3e; box-shadow:0 8px 32px rgba(0,0,0,.5); }
      .mini-nav-drop.open { display:block; animation:navDropIn .15s ease; }
      @keyframes navDropIn { from{opacity:0;transform:translateY(-4px)} to{opacity:1;transform:translateY(0)} }
      .mini-nav-item { display:flex; align-items:center; gap:8px; padding:7px 10px; border-radius:8px; font-family:'DM Mono',monospace; font-size:10px; text-transform:uppercase; letter-spacing:.06em; color:#8888a0; text-decoration:none; transition:all .12s; cursor:pointer; }
      html.dark .mini-nav-item { color:#6868a0; }
      .mini-nav-item:hover { background:#f7f7f9; color:#1a1a22; }
      html.dark .mini-nav-item:hover { background:#222230; color:#e4e4f0; }
      .mini-nav-item.active { background:#eff6ff; color:#2563eb; }
      html.dark .mini-nav-item.active { background:#0c1a30; color:#4f8eff; }
      .mini-nav-item svg { width:11px; height:11px; flex-shrink:0; }
      .mini-nav-sep { height:1px; background:#e2e2e8; margin:4px 0; }
      html.dark .mini-nav-sep { background:#2c2c3e; }
      .mini-dark-btn { display:inline-flex; align-items:center; justify-content:center; width:30px; height:30px; border:1px solid #e2e2e8; border-radius:8px; background:#f7f7f9; cursor:pointer; font-size:13px; transition:all .15s; flex-shrink:0; }
      html.dark .mini-dark-btn { border-color:#2c2c3e; background:#222230; }
      .mini-dark-btn:hover { border-color:#2563eb; background:#eff6ff; }
      html.dark .mini-dark-btn:hover { border-color:#4f8eff; background:#0c1a30; }
      @media(max-width:640px) { .mini-header-user { display:none; } .mini-header-role { display:none; } .mini-header-title { font-size:12px; } }
      @media(max-width:480px) { .mini-nav-btn span { display:none; } .mini-nav-btn { padding:5px 8px; } }
    `;
    document.head.appendChild(style);
  }

  const PAGE_TITLES = {
    calendario:          'Calendário',
    tarefas:             'Tarefas',
    comunicados:         'Comunicados',
    admissoes:           'Admissões',
    reclamacoes:         'Reclamações de Horas',
    escalas:             'Escalas',
    definicoes:          'Definições',
    utilizadores:        'Utilizadores',
    'gerir-calendarios': 'Gerir Calendários',
    auditoria:           'Auditoria',
  };
  const titulo = PAGE_TITLES[activePage] || activePage;

  // Módulos de navegação
  const NAV_MODULES = [
    { id:'tarefas',     label:'Tarefas',      href:'tarefas.html',     icon:'<rect x="3" y="4" width="10" height="10" rx="1.5"/><path d="M6 7l1.5 1.5L10 6"/>' },
    { id:'comunicados', label:'Comunicados',  href:'comunicados.html', icon:'<path d="M13 2H3a1 1 0 00-1 1v9a1 1 0 001 1h3l2 2 2-2h3a1 1 0 001-1V3a1 1 0 00-1-1z"/>' },
    { id:'calendario',  label:'Calendário',   href:'calendario.html',  icon:'<rect x="2" y="3" width="12" height="11" rx="1.5"/><path d="M5 1v3M11 1v3M2 7h12"/>' },
    { id:'admissoes',   label:'Admissões',    href:'admissoes.html',   icon:'<circle cx="8" cy="5" r="3"/><path d="M2 14c0-3 2.7-5 6-5s6 2 6 5"/>' },
    { id:'reclamacoes', label:'Reclamações',  href:'reclamacoes.html', icon:'<circle cx="8" cy="8" r="6.5"/><path d="M8 5v4"/><circle cx="8" cy="11.5" r=".6" fill="currentColor"/>' },
    { id:'escalas',     label:'Escalas',      href:'escalas.html',     icon:'<rect x="2" y="2" width="12" height="12" rx="1.5"/><path d="M5 8h6M5 5h6M5 11h4"/>' },
  ];
  const ADMIN_MODULES = [
    { id:'definicoes',          label:'Definições',        href:'definicoes.html',          icon:'<circle cx="8" cy="8" r="2"/><path d="M8 1v2M8 13v2M1 8h2M13 8h2M3.3 3.3l1.4 1.4M11.3 11.3l1.4 1.4M3.3 12.7l1.4-1.4M11.3 4.7l1.4-1.4"/>' },
    { id:'utilizadores',        label:'Utilizadores',      href:'utilizadores.html',        icon:'<circle cx="8" cy="5" r="3"/><path d="M2 14c0-3 2.7-5 6-5s6 2 6 5"/>' },
    { id:'gerir-calendarios',   label:'Gerir Calendários', href:'gerir-calendarios.html',   icon:'<rect x="2" y="3" width="12" height="11" rx="1.5"/><path d="M5 1v3M11 1v3M2 7h12M5 10h6"/>' },
    { id:'auditoria',           label:'Auditoria',         href:'auditoria.html',           icon:'<path d="M3 4h10M3 8h8M3 12h6"/><circle cx="13" cy="12" r="2.5"/><path d="M15 14l1.5 1.5"/>' },
  ];

  const navItemsHtml = NAV_MODULES.map(m => `
    <a class="mini-nav-item${activePage === m.id ? ' active' : ''}" href="${m.href}">
      <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5">${m.icon}</svg>
      ${m.label}
    </a>
  `).join('');
  const adminNavItemsHtml = isAdmin ? `
    <div class="mini-nav-sep"></div>
    ${ADMIN_MODULES.map(m => `
      <a class="mini-nav-item${activePage === m.id ? ' active' : ''}" href="${m.href}">
        <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5">${m.icon}</svg>
        ${m.label}
      </a>
    `).join('')}
  ` : '';

  const isDark = document.documentElement.classList.contains('dark');

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
      <div class="mini-nav-wrap">
        <button class="mini-nav-btn" id="miniNavBtn" onclick="window._toggleMiniNav(event)">
          <span>Módulos</span>
          <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M4 6l4 4 4-4"/></svg>
        </button>
        <div class="mini-nav-drop" id="miniNavDrop">
          ${navItemsHtml}${adminNavItemsHtml}
        </div>
      </div>
      <button class="mini-dark-btn" onclick="window.toggleDarkMode()" title="Alternar modo escuro">
        <span class="dark-toggle-icon">${isDark ? '☀️' : '🌙'}</span>
      </button>
      <span class="mini-header-user">${escHtml(nome)}</span>
      <span class="mini-header-role ${roleClass}">${role}</span>
      <button class="mini-header-logout" onclick="window.logout()">
        <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M6 14H3a1 1 0 01-1-1V3a1 1 0 011-1h3M11 11l3-3-3-3M14 8H6"/></svg>
        Sair
      </button>
    </div>
  `;

  // Fechar dropdown ao clicar fora
  window._toggleMiniNav = function(e) {
    e.stopPropagation();
    const btn = document.getElementById('miniNavBtn');
    const drop = document.getElementById('miniNavDrop');
    btn.classList.toggle('open');
    drop.classList.toggle('open');
  };
  document.addEventListener('click', function() {
    const btn = document.getElementById('miniNavBtn');
    const drop = document.getElementById('miniNavDrop');
    if (btn) btn.classList.remove('open');
    if (drop) drop.classList.remove('open');
  }, { capture: true, passive: true });
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

  // ── Detector de conectividade Firestore ──
  // Monitoriza o documento do próprio utilizador com metadados para
  // detectar quando o Firestore passa a servir dados de cache (offline).
  let _fsOffline = false;
  firebase.firestore()
    .collection('utilizadores').doc(user.uid)
    .onSnapshot({ includeMetadataChanges: true }, snap => {
      const fromCache = snap.metadata.fromCache;
      if (fromCache && !_fsOffline) {
        _fsOffline = true;
        // Só mostrar banner se o browser também não tiver rede,
        // ou se o Firestore estiver em cache por mais de 5s
        setTimeout(() => {
          if (_fsOffline) window.dispatchEvent(new Event('offline'));
        }, 5000);
      } else if (!fromCache && _fsOffline) {
        _fsOffline = false;
        if (!navigator.onLine) return; // browser ainda offline, não esconder
        window.dispatchEvent(new Event('online'));
      }
    }, () => {
      // Erro no listener (provavelmente offline) — forçar banner imediato
      _fsOffline = true;
      window.dispatchEvent(new Event('offline'));
    });
});
