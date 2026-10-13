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
