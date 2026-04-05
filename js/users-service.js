(function() {
  const DEFAULT_PERMISSIONS = {
    criarTarefas: false,
    resolverTarefas: false,
    gerirComunicados: false,
    criarAdmissoes: false,
    resolverAdmissoes: false,
    editarCalendario: false,
    criarReclamacoes: false,
  };

  function getDb() {
    if (typeof firebase === 'undefined' || !firebase.firestore) return null;
    return firebase.firestore();
  }

  function usersCollection() {
    const db = getDb();
    if (!db) throw new Error('Firestore indisponivel.');
    return db.collection('utilizadores');
  }

  function buildProfile(data) {
    const nome = String(data.nome || '').trim();
    const apelido = String(data.apelido || '').trim();
    const nomeCompleto = (data.nomeCompleto || (nome + ' ' + apelido)).trim();

    return {
      uid: data.uid,
      email: String(data.email || '').trim(),
      nome,
      apelido,
      nomeCompleto,
      escritorio: data.escritorio || '',
      funcao: data.funcao || '',
      role: data.role || 'colaborador',
      ativo: data.ativo !== false,
      criadoEm: data.criadoEm || Date.now(),
      ultimoAcesso: data.ultimoAcesso || Date.now(),
      permissoes: {
        ...DEFAULT_PERMISSIONS,
        ...(data.permissoes || {}),
      },
    };
  }

  async function listAll() {
    const snap = await usersCollection().get();
    return snap.docs.map(doc => ({ uid: doc.id, ...doc.data() }));
  }

  function listenAll(options) {
    const cfg = options || {};
    let query = usersCollection();
    if (cfg.limit) query = query.limit(cfg.limit);

    return query.onSnapshot(snap => {
      const users = snap.docs.map(doc => ({ uid: doc.id, ...doc.data() }));
      if (typeof cfg.onData === 'function') cfg.onData(users, snap);
    }, err => {
      if (typeof cfg.onError === 'function') cfg.onError(err);
    });
  }

  async function update(uid, patch) {
    if (!uid) throw new Error('UID em falta.');
    await usersCollection().doc(uid).update(patch);
  }

  async function setPermission(uid, permission, value) {
    if (!permission) throw new Error('Permissao em falta.');
    const patch = {};
    patch['permissoes.' + permission] = !!value;
    await update(uid, patch);
  }

  async function clearOffice(officeId) {
    if (!officeId) return;

    const snap = await usersCollection().where('escritorio', '==', officeId).get();
    if (snap.empty) return;

    const db = getDb();
    const batch = db.batch();
    snap.docs.forEach(doc => {
      batch.update(doc.ref, { escritorio: '' });
    });
    await batch.commit();
  }

  async function create(data) {
    const email = String(data.email || '').trim();
    const password = String(data.password || '');
    const nome = String(data.nome || '').trim();

    if (!nome || !email || !password) {
      throw new Error('Nome, email e password sao obrigatorios.');
    }

    const appName = 'adminCreate_' + Date.now();
    let secondaryApp = null;

    try {
      secondaryApp = firebase.initializeApp(firebase.app().options, appName);
      const secondaryAuth = secondaryApp.auth();
      const cred = await secondaryAuth.createUserWithEmailAndPassword(email, password);
      const uid = cred.user.uid;

      await secondaryAuth.signOut();

      const profile = buildProfile({
        ...data,
        uid,
        email,
      });

      await usersCollection().doc(uid).set(profile);
      return profile;
    } finally {
      if (secondaryApp) {
        secondaryApp.delete().catch(() => {});
      }
    }
  }

  window.UsersService = {
    DEFAULT_PERMISSIONS: { ...DEFAULT_PERMISSIONS },
    buildProfile,
    listAll,
    listenAll,
    update,
    setPermission,
    clearOffice,
    create,
  };
})();
