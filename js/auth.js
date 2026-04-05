// auth.js - autenticacao partilhada
// Foco: sessao, perfil, permissao e eventos authReady.
// A camada de plataforma visual/nav fica em js/app-platform.js.

window.currentUser = null;
window.userProfile = null;

(function() {
  if (localStorage.getItem('darkMode') === '1') {
    document.documentElement.classList.add('dark');
  }
})();

const overlay = document.createElement('div');
overlay.id = 'authOverlay';
const _darkBg = document.documentElement.classList.contains('dark');
overlay.style.cssText = `position:fixed;inset:0;background:${_darkBg ? '#0f0f14' : '#f4f4f6'};display:flex;align-items:center;justify-content:center;z-index:9999;font-family:'DM Mono',monospace;`;
overlay.innerHTML = `<div style="font-size:12px;color:${_darkBg ? '#6868a0' : '#8888a0'};letter-spacing:.05em;">A verificar sessao...</div>`;
document.body.prepend(overlay);

window.isAdmin = function() {
  return window.userProfile && window.userProfile.role === 'admin';
};

window.temPermissao = function(perm) {
  if (window.isAdmin()) return true;
  return !!(window.userProfile && window.userProfile.permissoes && window.userProfile.permissoes[perm] === true);
};

window.setFiltroEscritorio = function(escritorioId) {
  sessionStorage.setItem('filtroEscritorio', escritorioId);
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
  document.querySelectorAll('.dark-toggle-icon').forEach(el => {
    el.textContent = isDark ? '☀️' : '🌙';
  });
};

function getBasicProfile(user) {
  const fallbackName = user.displayName || user.email.split('@')[0];
  return {
    uid: user.uid,
    email: user.email,
    nome: fallbackName,
    apelido: '',
    nomeCompleto: fallbackName,
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
      criarReclamacoes: false,
    },
  };
}

firebase.auth().onAuthStateChanged(async user => {
  if (!user) {
    window.location.href = 'login.html';
    return;
  }

  window.currentUser = user;

  let snap;
  try {
    snap = await firebase.firestore().collection('utilizadores').doc(user.uid).get();
  } catch (readErr) {
    console.error('[auth] Falha ao ler perfil do Firestore:', readErr.code, readErr.message);
    const ov = document.getElementById('authOverlay');
    if (ov) {
      ov.innerHTML = '<div style="font-size:12px;color:#dc2626;letter-spacing:.05em;text-align:center;padding:20px;">Erro ao carregar perfil.<br>Tenta recarregar a pagina.</div>';
    }
    return;
  }

  if (snap && snap.exists) {
    window.userProfile = snap.data();

    if (window.userProfile.ativo === false && window.userProfile.role !== 'admin') {
      await firebase.auth().signOut();
      window.location.href = 'login.html?conta=desativada';
      return;
    }

    if (!window.userProfile.uid) {
      firebase.firestore().collection('utilizadores').doc(user.uid)
        .update({ uid: user.uid })
        .catch(() => {});
    }
  } else {
    const basicProfile = getBasicProfile(user);
    try {
      await firebase.firestore().collection('utilizadores').doc(user.uid).set(basicProfile);
      window.userProfile = basicProfile;
    } catch (writeErr) {
      console.error('[auth] Falha ao criar perfil no Firestore:', writeErr.code, writeErr.message);
      window.userProfile = basicProfile;
    }
  }

  firebase.firestore().collection('utilizadores').doc(user.uid)
    .update({ ultimoAcesso: Date.now() })
    .catch(() => {});

  const ov = document.getElementById('authOverlay');
  if (ov) ov.remove();

  document.dispatchEvent(new CustomEvent('authReady', {
    detail: { user: window.currentUser, profile: window.userProfile },
  }));

  let fsOffline = false;
  firebase.firestore()
    .collection('utilizadores').doc(user.uid)
    .onSnapshot({ includeMetadataChanges: true }, snapShot => {
      const fromCache = snapShot.metadata.fromCache;
      if (fromCache && !fsOffline) {
        fsOffline = true;
        setTimeout(() => {
          if (fsOffline) window.dispatchEvent(new Event('offline'));
        }, 5000);
      } else if (!fromCache && fsOffline) {
        fsOffline = false;
        if (!navigator.onLine) return;
        window.dispatchEvent(new Event('online'));
      }
    }, () => {
      fsOffline = true;
      window.dispatchEvent(new Event('offline'));
    });
});
