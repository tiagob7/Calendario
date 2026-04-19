(function () {
  const STORAGE_KEY = 'onboarding_v1_seen';

  function esc(str) {
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function showWelcomeModal(profile) {
    const nome = (profile && (profile.nome || profile.nomeCompleto || profile.email)) || 'utilizador';
    const firstName = nome.split(' ')[0];

    const overlay = document.createElement('div');
    overlay.className = 'onboarding-overlay';
    overlay.id = 'onboardingOverlay';
    overlay.innerHTML = `
      <div class="onboarding-modal">
        <div class="onboarding-wave">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8">
            <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/>
            <polyline points="9 22 9 12 15 12 15 22"/>
          </svg>
        </div>
        <h2>Bem-vindo, ${esc(firstName)}!</h2>
        <p class="onboarding-sub">Este é o teu espaço de trabalho Algartempo.</p>
        <div class="onboarding-steps">
          <div class="onboarding-step">
            <div class="onboarding-step-icon">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8">
                <rect x="3" y="3" width="7" height="7" rx="1.5"/>
                <rect x="14" y="3" width="7" height="7" rx="1.5"/>
                <rect x="3" y="14" width="7" height="7" rx="1.5"/>
                <rect x="14" y="14" width="7" height="7" rx="1.5"/>
              </svg>
            </div>
            <div class="onboarding-step-title">Dashboard</div>
            <div class="onboarding-step-desc">Vê tudo num só lugar: tarefas, comunicados, admissões e mais.</div>
          </div>
          <div class="onboarding-step">
            <div class="onboarding-step-icon">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8">
                <line x1="3" y1="6" x2="21" y2="6"/>
                <line x1="3" y1="12" x2="21" y2="12"/>
                <line x1="3" y1="18" x2="15" y2="18"/>
              </svg>
            </div>
            <div class="onboarding-step-title">Navega</div>
            <div class="onboarding-step-desc">Usa o menu lateral para aceder a cada módulo do sistema.</div>
          </div>
          <div class="onboarding-step">
            <div class="onboarding-step-icon">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8">
                <path d="M12 20h9"/>
                <path d="M16.5 3.5a2.121 2.121 0 013 3L7 19l-4 1 1-4L16.5 3.5z"/>
              </svg>
            </div>
            <div class="onboarding-step-title">Começa já</div>
            <div class="onboarding-step-desc">Cria a tua primeira tarefa ou consulta os comunicados da equipa.</div>
          </div>
        </div>
        <div class="onboarding-footer">
          <button class="onboarding-btn" id="btnOnboardingStart">Começar</button>
        </div>
      </div>`;

    document.body.appendChild(overlay);

    overlay.querySelector('#btnOnboardingStart').addEventListener('click', function () {
      localStorage.setItem(STORAGE_KEY, '1');
      overlay.remove();
    });
  }

  document.addEventListener('authReady', function (e) {
    if (!localStorage.getItem(STORAGE_KEY)) {
      showWelcomeModal(e.detail && e.detail.profile);
    }
  });
})();
