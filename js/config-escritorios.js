// Configuração partilhada de escritórios
// Lê a lista de escritórios de Firestore (config/escritorios)
// e expõe helpers globais para o resto da app.

(function() {
  const DEFAULT_ESCRITORIOS = [
    { id: 'quarteira', nome: 'Quarteira', cor: '#2563eb', default: true },
    { id: 'albufeira', nome: 'Albufeira', cor: '#7c3aed', default: true },
    { id: 'lisboa',    nome: 'Lisboa',    cor: '#db2777', default: true },
    { id: 'porto',     nome: 'Porto',     cor: '#16a34a', default: true },
  ];

  let cache = null;
  let promise = null;

  function normalizarLista(lista) {
    if (!Array.isArray(lista) || !lista.length) return DEFAULT_ESCRITORIOS.slice();
    return lista.map(e => ({
      id: String(e.id || '').trim().toLowerCase(),
      nome: e.nome || e.id || '',
      cor: e.cor || '#2563eb',
      default: !!e.default,
    })).filter(e => e.id);
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

  // Carrega do Firestore (uma vez) e guarda em cache
  window.loadEscritorios = function loadEscritorios() {
    if (promise) return promise;
    if (cache) return Promise.resolve(cache);

    if (typeof firebase === 'undefined' || !firebase.firestore) {
      // Firebase ainda não pronto — devolve defaults
      cache = DEFAULT_ESCRITORIOS.slice();
      return Promise.resolve(cache);
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
        return cache;
      })
      .catch(() => {
        cache = DEFAULT_ESCRITORIOS.slice();
        return cache;
      });

    return promise;
  };

  // Versão síncrona — pode devolver defaults se ainda não carregou
  window.getEscritoriosSync = function getEscritoriosSync() {
    return cache ? cache.slice() : DEFAULT_ESCRITORIOS.slice();
  };

  // Nome legível para um ID de escritório
  window.nomeEscritorio = function nomeEscritorio(id) {
    if (!id) return '';
    const lista = cache || DEFAULT_ESCRITORIOS;
    const found = lista.find(e => e.id === id);
    if (found && found.nome) return found.nome;
    return capitalizarId(id);
  };

  // Lista simples de IDs válidos (baseada na cache ou defaults)
  window.escritoriosValidos = function escritoriosValidos() {
    const lista = cache || DEFAULT_ESCRITORIOS;
    return lista.map(e => e.id);
  };
})();

