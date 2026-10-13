// Capa de datos: usa Firebase si está configurado, o el navegador (modo demo) si no.
import { firebaseConfig } from "./config.js";

const SDK = "https://www.gstatic.com/firebasejs/10.14.1";
export const modoDemo = !firebaseConfig.apiKey || firebaseConfig.apiKey === "PEGA_AQUI";

let fs, db, authMod, auth;

async function init() {
  if (modoDemo || db) return;
  const { initializeApp } = await import(`${SDK}/firebase-app.js`);
  fs = await import(`${SDK}/firebase-firestore.js`);
  const app = initializeApp(firebaseConfig);
  db = fs.getFirestore(app);
}

// ---------- Modo demo (localStorage) ----------
const demo = {
  leer: (k) => {
    try { return JSON.parse(localStorage.getItem("vera_" + k)) || []; } catch { return []; }
  },
  guardar: (k, v) => {
    try { localStorage.setItem("vera_" + k, JSON.stringify(v)); } catch { /* sin almacenamiento */ }
  },
  oyentes: {},
  avisar(k) { (this.oyentes[k] || []).forEach((cb) => cb()); },
  escuchar(k, cb) { (this.oyentes[k] ||= []).push(cb); cb(); },
};

// ---------- Confirmaciones de asistencia ----------
export async function guardarConfirmacion(datos) {
  if (modoDemo) {
    const lista = demo.leer("confirmaciones");
    lista.push({ ...datos, id: crypto.randomUUID(), fecha: new Date().toISOString() });
    demo.guardar("confirmaciones", lista);
    return;
  }
  await init();
  await fs.addDoc(fs.collection(db, "confirmaciones"), { ...datos, fecha: fs.serverTimestamp() });
}

// ---------- Regalos ----------
// Llama a cb(Set de ids reservados) cada vez que cambian.
export async function escucharReservas(cb) {
  if (modoDemo) {
    demo.escuchar("reservas", () => cb(new Set(demo.leer("reservas").map((r) => r.regalo))));
    return;
  }
  await init();
  fs.onSnapshot(fs.collection(db, "reservas"), (snap) => cb(new Set(snap.docs.map((d) => d.id))));
}

export async function reservarRegalo(regalo, nombre) {
  if (modoDemo) {
    const lista = demo.leer("reservas");
    if (lista.some((r) => r.regalo === regalo)) throw new Error("ya-reservado");
    lista.push({ regalo, nombre, fecha: new Date().toISOString() });
    demo.guardar("reservas", lista);
    demo.avisar("reservas");
    return;
  }
  await init();
  // Escritura atómica: si alguien ya lo reservó, las reglas rechazan el lote entero.
  const lote = fs.writeBatch(db);
  lote.set(fs.doc(db, "reservas", regalo), { fecha: fs.serverTimestamp() });
  lote.set(fs.doc(db, "reservasDetalle", regalo), { regalo, nombre, fecha: fs.serverTimestamp() });
  try {
    await lote.commit();
  } catch (e) {
    if (e.code === "permission-denied") throw new Error("ya-reservado");
    throw e;
  }
}

// ---------- Libro de mensajes ----------
export async function escucharMensajes(cb) {
  if (modoDemo) {
    demo.escuchar("mensajes", () => cb(demo.leer("mensajes").slice().reverse()));
    return;
  }
  await init();
  const q = fs.query(fs.collection(db, "mensajes"), fs.orderBy("fecha", "desc"), fs.limit(100));
  fs.onSnapshot(q, (snap) => cb(snap.docs.map((d) => ({ id: d.id, ...d.data() }))));
}

export async function enviarMensaje(nombre, texto) {
  if (modoDemo) {
    const lista = demo.leer("mensajes");
    lista.push({ id: crypto.randomUUID(), nombre, texto, fecha: new Date().toISOString() });
    demo.guardar("mensajes", lista);
    demo.avisar("mensajes");
    return;
  }
  await init();
  await fs.addDoc(fs.collection(db, "mensajes"), { nombre, texto, fecha: fs.serverTimestamp() });
}

// ---------- Fotos de los invitados ----------
// Cada foto se guarda en dos documentos: "fotos" (miniatura, para la galería)
// y "fotosGrandes" (la imagen a buen tamaño, solo se descarga al abrirla).
const demoFotos = { lista: [], grandes: {}, comentarios: {} }; // en modo demo solo viven en memoria

// Llama a cb(lista) con las últimas `limite` fotos. Devuelve una función para dejar de escuchar.
export async function escucharFotos(limite, cb) {
  if (modoDemo) {
    const avisar = () => cb(demoFotos.lista.slice().reverse().slice(0, limite));
    (demo.oyentes.fotos ||= []).push(avisar);
    avisar();
    return () => (demo.oyentes.fotos = demo.oyentes.fotos.filter((f) => f !== avisar));
  }
  await init();
  const q = fs.query(fs.collection(db, "fotos"), fs.orderBy("fecha", "desc"), fs.limit(limite));
  return fs.onSnapshot(q, (snap) => cb(snap.docs.map((d) => ({ id: d.id, ...d.data() }))));
}

export async function subirFoto({ nombre, mini, imagen, ancho, alto }) {
  if (modoDemo) {
    const id = crypto.randomUUID();
    demoFotos.lista.push({ id, nombre, mini, ancho, alto, fecha: new Date().toISOString() });
    demoFotos.grandes[id] = imagen;
    demo.avisar("fotos");
    return;
  }
  await init();
  const ref = fs.doc(fs.collection(db, "fotos"));
  const lote = fs.writeBatch(db);
  lote.set(ref, { nombre, mini, ancho, alto, fecha: fs.serverTimestamp() });
  lote.set(fs.doc(db, "fotosGrandes", ref.id), { imagen, fecha: fs.serverTimestamp() });
  await lote.commit();
}

export async function leerFotoGrande(id) {
  if (modoDemo) return demoFotos.grandes[id];
  await init();
  const snap = await fs.getDoc(fs.doc(db, "fotosGrandes", id));
  return snap.data()?.imagen;
}

export async function leerTodasLasFotos() {
  if (modoDemo) return demoFotos.lista.slice().reverse();
  const snap = await fs.getDocs(fs.query(fs.collection(db, "fotos"), fs.orderBy("fecha", "desc")));
  return snap.docs.map((d) => {
    const x = d.data();
    return { id: d.id, ...x, fecha: x.fecha?.toDate?.().toISOString() ?? "" };
  });
}

export async function borrarFoto(id) {
  if (modoDemo) {
    demoFotos.lista = demoFotos.lista.filter((f) => f.id !== id);
    delete demoFotos.grandes[id];
    delete demoFotos.comentarios[id];
    demo.avisar("fotos");
    return;
  }
  const comentarios = await fs.getDocs(fs.collection(db, "fotos", id, "comentarios"));
  const lote = fs.writeBatch(db);
  comentarios.docs.forEach((c) => lote.delete(c.ref));
  lote.delete(fs.doc(db, "fotos", id));
  lote.delete(fs.doc(db, "fotosGrandes", id));
  await lote.commit();
}

// ---------- Comentarios de las fotos ----------
export async function escucharComentariosFoto(fotoId, cb) {
  if (modoDemo) {
    const avisar = () => cb(demoFotos.comentarios[fotoId] || []);
    (demo.oyentes.fotos ||= []).push(avisar);
    avisar();
    return () => (demo.oyentes.fotos = demo.oyentes.fotos.filter((f) => f !== avisar));
  }
  await init();
  const q = fs.query(fs.collection(db, "fotos", fotoId, "comentarios"), fs.orderBy("fecha", "asc"));
  return fs.onSnapshot(q, (snap) => cb(snap.docs.map((d) => ({ id: d.id, ...d.data() }))));
}

export async function comentarFoto(fotoId, nombre, texto) {
  if (modoDemo) {
    (demoFotos.comentarios[fotoId] ||= []).push({ id: crypto.randomUUID(), nombre, texto, fecha: new Date().toISOString() });
    const foto = demoFotos.lista.find((f) => f.id === fotoId);
    if (foto) foto.comentarios = (foto.comentarios || 0) + 1;
    demo.avisar("fotos");
    return;
  }
  await init();
  const lote = fs.writeBatch(db);
  lote.set(fs.doc(fs.collection(db, "fotos", fotoId, "comentarios")), { nombre, texto, fecha: fs.serverTimestamp() });
  lote.update(fs.doc(db, "fotos", fotoId), { comentarios: fs.increment(1) });
  await lote.commit();
}

export async function leerComentariosFotos() {
  if (modoDemo) {
    return Object.entries(demoFotos.comentarios).flatMap(([fotoId, lista]) => lista.map((c) => ({ ...c, fotoId })));
  }
  const snap = await fs.getDocs(fs.collectionGroup(db, "comentarios"));
  return snap.docs.map((d) => {
    const x = d.data();
    return { id: d.id, fotoId: d.ref.parent.parent.id, ...x, fecha: x.fecha?.toDate?.().toISOString() ?? "" };
  });
}

export async function borrarComentarioFoto(fotoId, id) {
  if (modoDemo) {
    demoFotos.comentarios[fotoId] = (demoFotos.comentarios[fotoId] || []).filter((c) => c.id !== id);
    return;
  }
  const lote = fs.writeBatch(db);
  lote.delete(fs.doc(db, "fotos", fotoId, "comentarios", id));
  lote.update(fs.doc(db, "fotos", fotoId), { comentarios: fs.increment(-1) });
  await lote.commit();
}

// ---------- Panel de organización ----------
export async function iniciarSesion() {
  if (modoDemo) return { email: "demo" };
  await init();
  authMod = await import(`${SDK}/firebase-auth.js`);
  auth = authMod.getAuth();
  const res = await authMod.signInWithPopup(auth, new authMod.GoogleAuthProvider());
  return res.user;
}

export async function cerrarSesion() {
  if (auth) await authMod.signOut(auth);
}

async function leerColeccion(nombre) {
  if (modoDemo) return demo.leer(nombre === "reservasDetalle" ? "reservas" : nombre);
  const snap = await fs.getDocs(fs.collection(db, nombre));
  return snap.docs.map((d) => {
    const x = d.data();
    return { id: d.id, ...x, fecha: x.fecha?.toDate?.().toISOString() ?? "" };
  });
}

export const leerConfirmaciones = () => leerColeccion("confirmaciones");
export const leerReservasDetalle = () => leerColeccion("reservasDetalle");
export const leerMensajes = () => leerColeccion("mensajes");

export async function borrarMensaje(id) {
  if (modoDemo) {
    demo.guardar("mensajes", demo.leer("mensajes").filter((m) => m.id !== id));
    return;
  }
  await fs.deleteDoc(fs.doc(db, "mensajes", id));
}

export async function liberarRegalo(id) {
  if (modoDemo) {
    demo.guardar("reservas", demo.leer("reservas").filter((r) => r.regalo !== id));
    return;
  }
  const lote = fs.writeBatch(db);
  lote.delete(fs.doc(db, "reservas", id));
  lote.delete(fs.doc(db, "reservasDetalle", id));
  await lote.commit();
}
