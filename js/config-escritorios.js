// Configuracao partilhada de escritorios
// Le a lista de escritorios de Firestore (config/escritorios)
// e expoe helpers globais para o resto da app.

(function() {
  const DEFAULT_ESCRITORIOS = [
    { id: 'quarteira', nome: 'Quarteira', cor: '#2563eb', default: true,  ativo: true, ordem: 10 },
    { id: 'albufeira', nome: 'Albufeira', cor: '#7c3aed', default: false, ativo: true, ordem: 20 },
    { id: 'lisboa',    nome: 'Lisboa',    cor: '#db2777', default: false, ativo: true, ordem: 30 },
    { id: 'porto',     nome: 'Porto',     cor: '#16a34a', default: false, ativo: true, ordem: 40 },
  ];

  let cache = null;
  let promise = null;

  function normalizarLista(lista) {
    if (!Array.isArray(lista) || !lista.length) return DEFAULT_ESCRITORIOS.slice();

    return lista
      .map((e, index) => ({
        id: String(e.id || '').trim().toLowerCase(),
        nome: e.nome || e.id || '',
        cor: e.cor || '#2563eb',
        default: !!e.default,
        ativo: e.ativo !== false,
        ordem: Number.isFinite(e.ordem) ? e.ordem : (index + 1) * 10,
      }))
      .filter(e => e.id)
      .sort((a, b) => a.ordem - b.ordem || a.nome.localeCompare(b.nome, 'pt-PT'));
  }

  function capitalizarId(id) {
    if (!id) return '';
    if (id.indexOf('-') !== -1 || id.indexOf('_') !== -1) {
      return id
        .split(/[-_]/g)
        .map(p => p.charAt(0).toUpperCase() + p.slice(1))
        .join(' ');
    }
    return id.charAt(0).toUpperCase() + id.slice(1);
  }

  function getLista(options) {
    const cfg = options || {};
    const lista = (cache || DEFAULT_ESCRITORIOS).slice();
    if (cfg.includeInactive) return lista;
    return lista.filter(e => e.ativo !== false);
  }

  window.loadEscritorios = function loadEscritorios(options) {
    const cfg = options || {};

    if (promise) return promise.then(() => getLista(cfg));
    if (cache) return Promise.resolve(getLista(cfg));

    if (typeof firebase === 'undefined' || !firebase.firestore) {
      cache = DEFAULT_ESCRITORIOS.slice();
      return Promise.resolve(getLista(cfg));
    }

    const db = firebase.firestore();
    promise = db
      .collection('config')
      .doc('escritorios')
      .get()
      .then(snap => {
        if (snap.exists && snap.data() && Array.isArray(snap.data().lista)) {
          cache = normalizarLista(snap.data().lista);
        } else {
          cache = DEFAULT_ESCRITORIOS.slice();
        }
        return getLista(cfg);
      })
      .catch(() => {
        cache = DEFAULT_ESCRITORIOS.slice();
        return getLista(cfg);
      });

    return promise;
  };

  window.getEscritoriosSync = function getEscritoriosSync(options) {
    return getLista(options).slice();
  };

  window.nomeEscritorio = function nomeEscritorio(id) {
    if (!id) return '';
    const lista = cache || DEFAULT_ESCRITORIOS;
    const found = lista.find(e => e.id === id);
    if (found && found.nome) return found.nome;
    return capitalizarId(id);
  };

  window.escritoriosValidos = function escritoriosValidos() {
    return getLista().map(e => e.id);
  };

  window.escritorioExiste = function escritorioExiste(id, options) {
    if (!id) return false;
    return getLista(options).some(e => e.id === id);
  };

  window.getEscritorioDefault = function getEscritorioDefault(options) {
    const lista = getLista(options);
    return lista.find(e => e.default) || lista[0] || null;
  };

  window.getEscritoriosAtivosSync = function getEscritoriosAtivosSync() {
    return getLista().slice();
  };

  window.getEscritoriosDisponiveisParaUser = function getEscritoriosDisponiveisParaUser(profile, options) {
    const user = profile || window.userProfile || null;
    const lista = getLista(options);

    if (!user) return [];
    if (user.role === 'admin') return lista;

    if (user.escritorio && lista.some(e => e.id === user.escritorio)) {
      return lista.filter(e => e.id === user.escritorio);
    }

    const fallback = window.getEscritorioDefault(options);
    return fallback ? [fallback] : [];
  };
})();
