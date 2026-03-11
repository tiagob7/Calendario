/**
 * auth.js — Módulo de autenticação partilhado
 * Incluir em TODAS as páginas protegidas antes do script principal.
 *
 * Uso:
 *   <script src="auth.js"></script>
 *   <script>
 *     // Após carregar, tens acesso a:
 *     //   window.currentUser   → dados do Firebase Auth
 *     //   window.userProfile   → perfil do Firestore { nome, role, escritorio, ... }
 *     //   window.isAdmin()     → true se role === 'admin'
 *     //   window.escritorioAtivo() → escritório do utilizador (ou filtro ativo)
 *     //   window.logout()      → faz logout e vai para login.html
 *   </script>
 */

(function() {
  'use strict';

  // ── ESTADO GLOBAL ──
  window.currentUser   = null;
  window.userProfile   = null;

  window.isAdmin = function() {
    return window.userProfile && window.userProfile.role === 'admin';
  };

  window.escritorioAtivo = function() {
    // Admin pode ter um filtro de escritório ativo guardado em sessionStorage
    if (window.isAdmin()) {
      return sessionStorage.getItem('filtroEscritorio') || 'todos';
    }
    return window.userProfile ? window.userProfile.escritorio : null;
  };

  window.logout = async function() {
    await firebase.auth().signOut();
    sessionStorage.clear();
    window.location.href = 'login.html';
  };

  // ── INJETAR NAVBAR ──
  // Chama esta função no body de cada página para mostrar a barra de utilizador
  window.renderNavbar = function(paginaAtiva) {
    const profile = window.userProfile;
    if (!profile) return;

    const escritorios = ['lisboa','porto','albufeira','quarteira'];
    const nomeLabel   = profile.nome || profile.email || '—';
    const roleBadge   = profile.role === 'admin'
      ? '<span style="background:#fef3c7;color:#d97706;border:1px solid #fde68a;font-size:9px;padding:2px 7px;border-radius:10px;text-transform:uppercase;letter-spacing:.07em;font-weight:500;">Admin</span>'
      : '<span style="background:#eff6ff;color:#2563eb;border:1px solid #bfdbfe;font-size:9px;padding:2px 7px;border-radius:10px;text-transform:uppercase;letter-spacing:.07em;font-weight:500;">Colaborador</span>';

    // filtro de escritório (só admin vê)
    let filtroHtml = '';
    if (window.isAdmin()) {
      const atual = window.escritorioAtivo();
      filtroHtml = `
        <div style="display:flex;align-items:center;gap:6px;flex-wrap:wrap;">
          <span style="font-size:9px;color:#8888a0;text-transform:uppercase;letter-spacing:.08em;">Escritório:</span>
          <button onclick="setFiltroEscritorio('todos')" style="padding:3px 10px;border-radius:20px;border:1px solid ${atual==='todos'?'#1a1a22':'#e2e2e8'};background:${atual==='todos'?'#1a1a22':'transparent'};color:${atual==='todos'?'#fff':'#8888a0'};font-family:'DM Mono',monospace;font-size:9px;cursor:pointer;text-transform:uppercase;letter-spacing:.05em;">Todos</button>
          ${escritorios.map(e => `
            <button onclick="setFiltroEscritorio('${e}')" style="padding:3px 10px;border-radius:20px;border:1px solid ${atual===e?'#1a1a22':'#e2e2e8'};background:${atual===e?'#1a1a22':'transparent'};color:${atual===e?'#fff':'#8888a0'};font-family:'DM Mono',monospace;font-size:9px;cursor:pointer;text-transform:uppercase;letter-spacing:.05em;">${e}</button>
          `).join('')}
        </div>`;
    }

    const html = `
      <div id="authNavbar" style="
        background:#fff;border-bottom:1px solid #e2e2e8;
        padding:10px 20px;margin-bottom:0;
        display:flex;align-items:center;gap:12px;flex-wrap:wrap;
        font-family:'DM Mono',monospace;font-size:11px;
        position:sticky;top:0;z-index:100;
      ">
        <span style="font-weight:500;">${nomeLabel}</span>
        ${roleBadge}
        ${!window.isAdmin() ? `<span style="font-size:10px;color:#8888a0;background:#f7f7f9;border:1px solid #e2e2e8;padding:2px 8px;border-radius:8px;">${profile.escritorio||'—'}</span>` : ''}
        <div style="flex:1;min-width:0;">${filtroHtml}</div>
        <button onclick="window.logout()" style="
          padding:5px 12px;border:1px solid #e2e2e8;background:transparent;
          font-family:'DM Mono',monospace;font-size:10px;color:#8888a0;
          border-radius:20px;cursor:pointer;text-transform:uppercase;letter-spacing:.07em;
          transition:all .15s;
        " onmouseover="this.style.borderColor='#dc2626';this.style.color='#dc2626';"
           onmouseout="this.style.borderColor='#e2e2e8';this.style.color='#8888a0';">
          Sair
        </button>
      </div>`;

    document.body.insertAdjacentHTML('afterbegin', html);
  };

  // Mudar filtro de escritório (só admin)
  window.setFiltroEscritorio = function(escritorio) {
    sessionStorage.setItem('filtroEscritorio', escritorio);
    window.location.reload(); // recarrega a página com o novo filtro
  };

  // ── PROTEÇÃO DE PÁGINA ──
  // Esta função é chamada automaticamente ao carregar auth.js
  function protegerPagina() {
    // Mostrar overlay de loading enquanto verifica autenticação
    const overlay = document.createElement('div');
    overlay.id = 'authOverlay';
    overlay.style.cssText = `
      position:fixed;inset:0;background:#f4f4f6;
      display:flex;align-items:center;justify-content:center;
      z-index:9999;font-family:'DM Mono',monospace;font-size:11px;color:#8888a0;
    `;
    overlay.innerHTML = `
      <div style="text-align:center;">
        <div style="width:20px;height:20px;border:2px solid #e2e2e8;border-top-color:#2563eb;border-radius:50%;animation:spin .6s linear infinite;margin:0 auto 12px;"></div>
        <div>A verificar acesso…</div>
      </div>
      <style>@keyframes spin{to{transform:rotate(360deg);}}</style>
    `;
    document.body.appendChild(overlay);

    firebase.auth().onAuthStateChanged(async function(user) {
      if (!user) {
        // Não está logado → ir para login
        window.location.href = 'login.html';
        return;
      }

      window.currentUser = user;

      try {
        // Carregar perfil do Firestore
        const doc = await firebase.firestore().collection('utilizadores').doc(user.uid).get();

        if (doc.exists) {
          window.userProfile = doc.data();
        } else {
          // Perfil não existe — criar um básico (pode acontecer se o admin criou o user direto no Firebase Console)
          window.userProfile = {
            nome: user.displayName || user.email.split('@')[0],
            apelido: '',
            nomeCompleto: user.displayName || user.email,
            email: user.email,
            escritorio: 'quarteira',
            funcao: '',
            role: 'colaborador',
            ativo: true,
            criadoEm: Date.now(),
            ultimoAcesso: Date.now()
          };
          await firebase.firestore().collection('utilizadores').doc(user.uid).set(window.userProfile);
        }

        // Verificar se conta está ativa
        if (window.userProfile.ativo === false) {
          await firebase.auth().signOut();
          window.location.href = 'login.html?erro=conta_desativada';
          return;
        }

        // Atualizar último acesso
        firebase.firestore().collection('utilizadores').doc(user.uid).update({
          ultimoAcesso: Date.now()
        }).catch(() => {});

        // Remover overlay e deixar a página carregar
        overlay.remove();

        // Disparar evento para a página saber que o perfil está pronto
        document.dispatchEvent(new CustomEvent('authReady', {
          detail: { user, profile: window.userProfile }
        }));

      } catch (err) {
        console.error('Erro ao carregar perfil:', err);
        overlay.remove();
        document.dispatchEvent(new CustomEvent('authReady', {
          detail: { user, profile: window.userProfile }
        }));
      }
    });
  }

  // Iniciar proteção quando o DOM estiver pronto
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', protegerPagina);
  } else {
    protegerPagina();
  }

})();
