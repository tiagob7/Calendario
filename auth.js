// ═══════════════════════════════════════════════════════════
// auth.js — Autenticação + Navbar partilhada
// Incluir em TODAS as páginas protegidas (depois do Firebase init)
// ═══════════════════════════════════════════════════════════

window.currentUser   = null;
window.userProfile   = null;

// ── Injetar estilos da navbar ──
(function injectNavbarStyles() {
  const style = document.createElement('style');
  style.textContent = `
    /* ── AUTH OVERLAY ── */
    #authOverlay {
      position:fixed;inset:0;background:#f4f4f6;
      display:flex;align-items:center;justify-content:center;
      z-index:9999;font-family:'DM Mono',monospace;
    }
    #authOverlay .auth-msg {
      font-size:12px;color:#8888a0;letter-spacing:.05em;
    }

    /* ── NAVBAR ── */
    #appNavbar {
      position:sticky;top:0;z-index:500;
      background:#fff;border-bottom:1px solid #e2e2e8;
      font-family:'DM Mono',monospace;
    }
    .nav-inner {
      max-width:1320px;margin:0 auto;
      padding:0 20px;height:48px;
      display:flex;align-items:center;gap:4px;
    }

    /* logo / home */
    .nav-logo {
      font-family:'Manrope',sans-serif;font-weight:800;
      font-size:14px;letter-spacing:-.02em;color:#1a1a22;
      text-decoration:none;margin-right:12px;white-space:nowrap;
    }
    .nav-logo span { color:#2563eb; }

    /* nav links */
    .nav-link {
      display:flex;align-items:center;gap:5px;
      padding:5px 10px;border-radius:8px;
      font-size:10px;text-transform:uppercase;letter-spacing:.07em;
      color:#8888a0;text-decoration:none;
      transition:all .15s;white-space:nowrap;border:none;background:none;cursor:pointer;
      font-family:'DM Mono',monospace;
    }
    .nav-link:hover { background:#f4f4f6;color:#1a1a22; }
    .nav-link.active { background:#eff6ff;color:#2563eb; }
    .nav-link svg { width:13px;height:13px;flex-shrink:0; }

    /* separador */
    .nav-sep { width:1px;height:20px;background:#e2e2e8;margin:0 4px;flex-shrink:0; }

    /* admin: filtro escritório */
    .nav-escritorio-select {
      padding:4px 8px;border:1px solid #e2e2e8;
      background:#f7f7f9;font-family:'DM Mono',monospace;
      font-size:10px;border-radius:8px;color:#1a1a22;
      outline:none;cursor:pointer;text-transform:capitalize;
      transition:border-color .15s;
    }
    .nav-escritorio-select:focus { border-color:#2563eb; }

    /* user info */
    .nav-right { margin-left:auto;display:flex;align-items:center;gap:8px; }
    .nav-user-name {
      font-size:10px;color:#8888a0;letter-spacing:.05em;
      white-space:nowrap;
    }
    .nav-role-badge {
      font-size:9px;text-transform:uppercase;letter-spacing:.07em;
      padding:2px 8px;border-radius:10px;font-weight:500;
    }
    .nav-role-badge.admin {
      background:#eff6ff;color:#2563eb;border:1px solid #bfdbfe;
    }
    .nav-role-badge.colaborador {
      background:#f4f4f6;color:#8888a0;border:1px solid #e2e2e8;
    }
    .nav-logout {
      display:flex;align-items:center;gap:4px;
      padding:5px 10px;border:1px solid #e2e2e8;
      background:none;font-family:'DM Mono',monospace;
      font-size:10px;text-transform:uppercase;letter-spacing:.07em;
      color:#8888a0;border-radius:8px;cursor:pointer;
      transition:all .15s;white-space:nowrap;
    }
    .nav-logout:hover { border-color:#dc2626;color:#dc2626; }
    .nav-logout svg { width:12px;height:12px; }

    /* mobile: esconder labels */
    @media(max-width:640px) {
      .nav-link-label { display:none; }
      .nav-user-name  { display:none; }
      .nav-logo       { margin-right:4px; }
    }
  `;
  document.head.appendChild(style);
})();

// ── Injetar overlay de loading ──
const overlay = document.createElement('div');
overlay.id = 'authOverlay';
overlay.innerHTML = '<div class="auth-msg">A verificar sessão…</div>';
document.body.prepend(overlay);

// ── Mapear página activa ──
const NAV_PAGES = {
  'dashboard'  : { href:'dashboard.html',   label:'Dashboard',   icon:'<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5"><rect x="2" y="2" width="5" height="5" rx="1"/><rect x="9" y="2" width="5" height="5" rx="1"/><rect x="2" y="9" width="5" height="5" rx="1"/><rect x="9" y="9" width="5" height="5" rx="1"/></svg>' },
  'calendario' : { href:'calendario.html',  label:'Calendário',  icon:'<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5"><rect x="2" y="3" width="12" height="11" rx="1.5"/><path d="M5 1v3M11 1v3M2 7h12"/></svg>' },
  'tarefas'    : { href:'tarefas.html',     label:'Tarefas',     icon:'<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5"><rect x="3" y="2" width="10" height="12" rx="1.5"/><path d="M6 6h4M6 9h4M6 12h2"/></svg>' },
  'comunicados': { href:'comunicados.html', label:'Comunicados', icon:'<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M13 2H3a1 1 0 00-1 1v9a1 1 0 001 1h3l2 2 2-2h3a1 1 0 001-1V3a1 1 0 00-1-1z"/></svg>' },
  'admissoes'  : { href:'admissoes.html',   label:'Admissões',   icon:'<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5"><circle cx="8" cy="6" r="2.5"/><path d="M3 13c0-2.5 2.2-4.5 5-4.5s5 2 5 4.5"/><path d="M11 4l2 2-2 2"/></svg>' },
};

// ── renderNavbar(activePage) ──
window.renderNavbar = function(activePage) {
  const profile   = window.userProfile;
  const isAdmin   = window.isAdmin();
  const escritorio = window.escritorioAtivo();

  const navbar = document.createElement('nav');
  navbar.id = 'appNavbar';

  const inner = document.createElement('div');
  inner.className = 'nav-inner';

  // logo
  inner.innerHTML = `<a href="dashboard.html" class="nav-logo">Cal<span>.</span>Work</a>`;

  // links de navegação
  Object.entries(NAV_PAGES).forEach(([key, page]) => {
    const link = document.createElement('a');
    link.href = page.href;
    link.className = 'nav-link' + (activePage === key ? ' active' : '');
    link.innerHTML = `${page.icon}<span class="nav-link-label">${page.label}</span>`;
    inner.appendChild(link);
  });

  // separador
  const sep = document.createElement('div');
  sep.className = 'nav-sep';
  inner.appendChild(sep);

  // filtro de escritório (só admin)
  if (isAdmin) {
    const select = document.createElement('select');
    select.className = 'nav-escritorio-select';
    select.title = 'Filtrar por escritório';
    const opts = [
      { value:'todos',      label:'Todos' },
      { value:'quarteira',  label:'Quarteira' },
      { value:'albufeira',  label:'Albufeira' },
      { value:'lisboa',     label:'Lisboa' },
      { value:'porto',      label:'Porto' },
    ];
    opts.forEach(o => {
      const opt = document.createElement('option');
      opt.value = o.value;
      opt.textContent = o.label;
      if (o.value === escritorio) opt.selected = true;
      select.appendChild(opt);
    });
    select.addEventListener('change', () => window.setFiltroEscritorio(select.value));
    inner.appendChild(select);
    inner.appendChild(Object.assign(document.createElement('div'), {className:'nav-sep'}));
  }

  // user info + logout
  const right = document.createElement('div');
  right.className = 'nav-right';
  if (profile) {
    right.innerHTML = `
      <span class="nav-user-name">${profile.nomeCompleto || profile.nome || ''}</span>
      <span class="nav-role-badge ${profile.role || 'colaborador'}">${profile.role === 'admin' ? 'Admin' : 'Colaborador'}</span>
    `;
  }
  const logoutBtn = document.createElement('button');
  logoutBtn.className = 'nav-logout';
  logoutBtn.innerHTML = `<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M6 14H3a1 1 0 01-1-1V3a1 1 0 011-1h3M11 11l3-3-3-3M14 8H6"/></svg><span class="nav-link-label">Sair</span>`;
  logoutBtn.onclick = window.logout;
  right.appendChild(logoutBtn);
  inner.appendChild(right);

  navbar.appendChild(inner);
  document.body.insertBefore(navbar, document.body.firstChild);
};

// ── Helpers ──
window.isAdmin = function() {
  return window.userProfile && window.userProfile.role === 'admin';
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

// ── Verificar autenticação ──
firebase.auth().onAuthStateChanged(async (user) => {
  if (!user) {
    window.location.href = 'login.html';
    return;
  }

  window.currentUser = user;

  // carregar perfil do Firestore
  try {
    const snap = await firebase.firestore()
      .collection('utilizadores').doc(user.uid).get();

    if (snap.exists) {
      window.userProfile = snap.data();
    } else {
      // perfil não existe — criar um básico
      const basicProfile = {
        email: user.email,
        nome: user.displayName || user.email.split('@')[0],
        apelido: '',
        nomeCompleto: user.displayName || user.email.split('@')[0],
        escritorio: '',
        funcao: '',
        role: 'colaborador',
        ativo: true,
        criadoEm: Date.now(),
        ultimoAcesso: Date.now()
      };
      await firebase.firestore()
        .collection('utilizadores').doc(user.uid).set(basicProfile);
      window.userProfile = basicProfile;
    }

    // atualizar último acesso
    firebase.firestore().collection('utilizadores').doc(user.uid)
      .update({ ultimoAcesso: Date.now() }).catch(() => {});

  } catch(e) {
    console.error('Erro ao carregar perfil:', e);
  }

  // remover overlay e disparar evento
  const ov = document.getElementById('authOverlay');
  if (ov) ov.remove();

  document.dispatchEvent(new CustomEvent('authReady', {
    detail: { user: window.currentUser, profile: window.userProfile }
  }));
});
