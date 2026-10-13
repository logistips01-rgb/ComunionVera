import { evento, menus, regalos, aportacion, albumGoogleFotos } from "./config.js";
import * as datos from "./db.js";

const $ = (sel) => document.querySelector(sel);
const $$ = (sel) => document.querySelectorAll(sel);
const obtener = (obj, ruta) => ruta.split(".").reduce((o, k) => o?.[k], obj);

if (datos.modoDemo) $("#aviso-demo").hidden = false;

// ---------- Textos del evento ----------
$$("[data-evento]").forEach((el) => (el.textContent = evento[el.dataset.evento] ?? ""));
$$("[data-lugar]").forEach((el) => (el.textContent = obtener(evento, el.dataset.lugar) ?? ""));
$$("[data-mapa]").forEach((el) => (el.href = evento[el.dataset.mapa].mapa));
$("#foto").src = evento.foto;

// Saludo personalizado: index.html?para=Tíos%20Juan%20y%20Marta
const para = new URLSearchParams(location.search).get("para");
if (para) {
  const saludo = $("#saludo-personal");
  saludo.textContent = `¡Hola, ${para.slice(0, 80)}!`;
  saludo.hidden = false;
  document.querySelector('[name="familia"]').value = para.slice(0, 80);
}

// ---------- Cuenta atrás ----------
const objetivo = new Date(evento.fecha).getTime();
function actualizarCuenta() {
  const resto = Math.max(0, objetivo - Date.now());
  const s = Math.floor(resto / 1000);
  $("#cd-dias").textContent = Math.floor(s / 86400);
  $("#cd-horas").textContent = Math.floor((s % 86400) / 3600);
  $("#cd-min").textContent = Math.floor((s % 3600) / 60);
  $("#cd-seg").textContent = s % 60;
  if (resto === 0) $("#cuenta-atras").innerHTML = '<p class="hoy">¡Hoy es el gran día! 🎉</p>';
}
actualizarCuenta();
setInterval(actualizarCuenta, 1000);

// ---------- Calendario y compartir ----------
const fmtCal = (d) => d.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
const inicio = new Date(evento.fecha);
const fin = new Date(inicio.getTime() + 7 * 3600 * 1000);
$("#btn-calendario").href =
  "https://calendar.google.com/calendar/render?action=TEMPLATE" +
  `&text=${encodeURIComponent(`Primera Comunión de ${evento.nombre}`)}` +
  `&dates=${fmtCal(inicio)}/${fmtCal(fin)}` +
  `&location=${encodeURIComponent(`${evento.ceremonia.lugar}, ${evento.ceremonia.direccion}`)}` +
  `&details=${encodeURIComponent(`Celebración: ${evento.celebracion.lugar} (${evento.celebracion.hora})\n${location.origin}`)}`;

const urlBase = location.origin + location.pathname;
const textoInvitacion = (url) =>
  `¡Hola! Te invito a la Primera Comunión de ${evento.nombre} el ${evento.fechaTexto.toLowerCase()}. ` +
  `Toda la información y la confirmación aquí: ${url}`;

$("#btn-compartir").addEventListener("click", async () => {
  const url = para ? location.href : urlBase;
  if (navigator.share) {
    try { await navigator.share({ title: `Comunión de ${evento.nombre}`, text: textoInvitacion(url) }); } catch { /* cancelado */ }
  } else {
    window.open(`https://wa.me/?text=${encodeURIComponent(textoInvitacion(url))}`, "_blank");
  }
});

$("#inv-generar").addEventListener("click", () => {
  const nombre = $("#inv-nombre").value.trim();
  if (!nombre) return $("#inv-nombre").focus();
  const url = `${urlBase}?para=${encodeURIComponent(nombre)}`;
  $("#inv-enlace").value = url;
  $("#inv-whatsapp").href = `https://wa.me/?text=${encodeURIComponent(textoInvitacion(url))}`;
  $("#inv-resultado").hidden = false;
});
$("#inv-copiar").addEventListener("click", async () => {
  try {
    await navigator.clipboard.writeText($("#inv-enlace").value);
    $("#inv-copiar").textContent = "¡Copiado!";
  } catch {
    $("#inv-enlace").select();
  }
});

// ---------- Menús ----------
$("#lista-menus").innerHTML = menus
  .map(
    (m) => `
    <article class="tarjeta tarjeta-menu">
      <div class="icono-grande">${m.icono}</div>
      <h3>${m.nombre}</h3>
      <ul>${m.platos.map((p) => `<li>${p}</li>`).join("")}</ul>
    </article>`
  )
  .join("");

// ---------- Formulario de confirmación ----------
const opcionesMenu = menus.map((m) => `<option value="${m.id}">${m.icono} ${m.nombre}</option>`).join("");

function anadirPersona() {
  const fila = document.createElement("div");
  fila.className = "persona";
  fila.innerHTML = `
    <input type="text" class="p-nombre" placeholder="Nombre" maxlength="60" required />
    <select class="p-menu" aria-label="Menú">${opcionesMenu}</select>
    <button type="button" class="quitar" aria-label="Quitar persona">✕</button>`;
  fila.querySelector(".quitar").addEventListener("click", () => {
    if ($$(".persona").length > 1) fila.remove();
  });
  $("#personas").append(fila);
}
anadirPersona();
$("#btn-anadir").addEventListener("click", anadirPersona);

$$('[name="asiste"]').forEach((r) =>
  r.addEventListener("change", () => {
    $("#bloque-personas").hidden = $('[name="asiste"]:checked').value === "no";
  })
);

$("#form-rsvp").addEventListener("submit", async (e) => {
  e.preventDefault();
  const f = e.target;
  const estado = $("#estado-rsvp");
  const asiste = f.asiste.value === "si";
  const personas = asiste
    ? [...$$(".persona")]
        .map((p) => ({ nombre: p.querySelector(".p-nombre").value.trim(), menu: p.querySelector(".p-menu").value }))
        .filter((p) => p.nombre)
    : [];

  if (!f.familia.value.trim()) return mostrar(estado, "Escribe vuestro nombre, por favor.", true);
  if (asiste && personas.length === 0) return mostrar(estado, "Añade al menos una persona con su nombre.", true);

  const boton = f.querySelector("button[type=submit]");
  boton.disabled = true;
  mostrar(estado, "Enviando…");
  try {
    await datos.guardarConfirmacion({
      familia: f.familia.value.trim(),
      asiste,
      personas,
      alergias: f.alergias.value.trim(),
      telefono: f.telefono.value.trim(),
      comentarios: f.comentarios.value.trim(),
    });
    f.innerHTML = `<div class="gracias">
      <div class="icono-grande">${asiste ? "🎉" : "🤍"}</div>
      <h3>${asiste ? "¡Muchas gracias! Os esperamos con mucha ilusión." : "¡Gracias por avisar! Os echaremos de menos."}</h3>
    </div>`;
  } catch (err) {
    console.error(err);
    boton.disabled = false;
    mostrar(estado, "No se ha podido enviar. Inténtalo de nuevo en un momento.", true);
  }
});

function mostrar(el, texto, error = false) {
  el.textContent = texto;
  el.classList.toggle("error", error);
}

// ---------- Regalos ----------
let reservados = new Set();
function pintarRegalos() {
  $("#lista-regalos").innerHTML = regalos
    .map((r) => {
      const ocupado = reservados.has(r.id);
      return `
      <article class="tarjeta regalo ${ocupado ? "reservado" : ""}">
        <div class="icono-grande">${r.icono || "🎁"}</div>
        <h3>${r.nombre}</h3>
        <p class="suave">${r.detalle || ""}</p>
        ${r.enlace ? `<a href="${r.enlace}" target="_blank" rel="noopener" class="enlace">Ver ejemplo</a>` : ""}
        ${
          ocupado
            ? `<span class="etiqueta-reservado">✓ Reservado</span>`
            : `<button class="boton boton-peque" data-regalo="${r.id}" type="button">Lo regalo yo</button>`
        }
      </article>`;
    })
    .join("");
}
pintarRegalos();
datos.escucharReservas((set) => {
  reservados = set;
  pintarRegalos();
});

if (aportacion.dato) {
  $("#aportacion").innerHTML = `${aportacion.texto}<br /><strong></strong>`;
  $("#aportacion strong").textContent = aportacion.dato;
  $("#aportacion").hidden = false;
}

const dialogo = $("#dialogo-regalo");
let regaloElegido = null;
$("#lista-regalos").addEventListener("click", (e) => {
  const id = e.target.dataset?.regalo;
  if (!id) return;
  regaloElegido = regalos.find((r) => r.id === id);
  $("#regalo-nombre").textContent = regaloElegido.nombre;
  dialogo.showModal();
});
dialogo.addEventListener("close", async () => {
  const nombre = $("#form-regalo").nombre.value.trim();
  if (dialogo.returnValue !== "ok" || !nombre || !regaloElegido) return;
  try {
    await datos.reservarRegalo(regaloElegido.id, nombre);
    alert(`¡Gracias, ${nombre}! Has reservado: ${regaloElegido.nombre}.`);
  } catch (err) {
    alert(err.message === "ya-reservado" ? "Vaya, alguien acaba de reservar ese regalo. ¡Elige otro!" : "No se ha podido reservar. Inténtalo de nuevo.");
  }
  $("#form-regalo").reset();
});

// ---------- Libro de mensajes ----------
datos.escucharMensajes((lista) => {
  const muro = $("#muro");
  muro.innerHTML = "";
  if (!lista.length) {
    muro.innerHTML = '<p class="suave centrado">Sé el primero en escribirle algo bonito ✨</p>';
    return;
  }
  for (const m of lista) {
    const nota = document.createElement("article");
    nota.className = "nota";
    const texto = document.createElement("p");
    texto.textContent = m.texto;
    const firma = document.createElement("p");
    firma.className = "firma";
    firma.textContent = `— ${m.nombre}`;
    nota.append(texto, firma);
    muro.append(nota);
  }
});

$("#form-mensaje").addEventListener("submit", async (e) => {
  e.preventDefault();
  const f = e.target;
  const nombre = f.nombre.value.trim();
  const texto = f.texto.value.trim();
  const estado = $("#estado-mensaje");
  if (!nombre || !texto) return mostrar(estado, "Escribe tu nombre y tu mensaje.", true);
  try {
    await datos.enviarMensaje(nombre, texto);
    f.reset();
    mostrar(estado, "¡Mensaje enviado! 💛");
  } catch (err) {
    console.error(err);
    mostrar(estado, "No se ha podido enviar el mensaje.", true);
  }
});

// ---------- Fotos de los invitados ----------
if (albumGoogleFotos) {
  $("#btn-album").href = albumGoogleFotos;
  $("#btn-album").hidden = false;
}

// Reduce la foto en el navegador antes de subirla (para que quepa en el plan gratuito).
async function reducir(archivo, maxLado, calidad) {
  const url = URL.createObjectURL(archivo);
  try {
    const img = new Image();
    img.src = url;
    await img.decode();
    const escala = Math.min(1, maxLado / Math.max(img.naturalWidth, img.naturalHeight));
    const lienzo = document.createElement("canvas");
    lienzo.width = Math.round(img.naturalWidth * escala);
    lienzo.height = Math.round(img.naturalHeight * escala);
    lienzo.getContext("2d").drawImage(img, 0, 0, lienzo.width, lienzo.height);
    return { lienzo, ancho: lienzo.width, alto: lienzo.height, calidad };
  } finally {
    URL.revokeObjectURL(url);
  }
}

async function prepararFoto(archivo) {
  const grande = await reducir(archivo, 1600, 0.82);
  let imagen = grande.lienzo.toDataURL("image/jpeg", 0.82);
  // Si aún pesa demasiado, bajamos la calidad poco a poco
  for (let q = 0.7; imagen.length > 950000 && q > 0.3; q -= 0.1) {
    imagen = grande.lienzo.toDataURL("image/jpeg", q);
  }
  if (imagen.length > 950000) throw new Error("demasiado-grande");
  const mini = (await reducir(archivo, 400, 0.7)).lienzo.toDataURL("image/jpeg", 0.7);
  return { imagen, mini, ancho: grande.ancho, alto: grande.alto };
}

$("#fotos-input").addEventListener("change", async (e) => {
  const archivos = [...e.target.files].slice(0, 20);
  e.target.value = "";
  if (!archivos.length) return;
  const estado = $("#estado-fotos");
  const nombre = $("#fotos-nombre").value.trim();
  let subidas = 0;
  let fallos = 0;
  for (const [i, archivo] of archivos.entries()) {
    mostrar(estado, `Subiendo ${i + 1} de ${archivos.length}…`);
    try {
      await datos.subirFoto({ nombre, ...(await prepararFoto(archivo)) });
      subidas++;
    } catch (err) {
      console.error(err);
      fallos++;
    }
  }
  if (fallos === 0) mostrar(estado, subidas === 1 ? "¡Foto subida! Gracias 💛" : `¡${subidas} fotos subidas! Gracias 💛`);
  else mostrar(estado, `Subidas ${subidas}, no se han podido subir ${fallos}. Prueba con otras o en otro navegador.`, true);
});

let limiteFotos = 24;
let dejarDeEscuchar = null;
let fotosVisibles = [];

async function cargarFotos() {
  dejarDeEscuchar?.();
  dejarDeEscuchar = await datos.escucharFotos(limiteFotos, (lista) => {
    fotosVisibles = lista;
    const galeria = $("#galeria");
    galeria.innerHTML = "";
    if (!lista.length) {
      galeria.innerHTML = '<p class="suave centrado" style="grid-column:1/-1">Aún no hay fotos. ¡Sube la primera! ✨</p>';
    }
    for (const f of lista) {
      const boton = document.createElement("button");
      boton.type = "button";
      boton.dataset.foto = f.id;
      const img = document.createElement("img");
      img.src = f.mini;
      img.alt = f.nombre ? `Foto de ${f.nombre}` : "Foto de la comunión";
      img.loading = "lazy";
      boton.append(img);
      galeria.append(boton);
    }
    $("#btn-mas-fotos").hidden = lista.length < limiteFotos;
  });
}
cargarFotos();

$("#btn-mas-fotos").addEventListener("click", () => {
  limiteFotos += 24;
  cargarFotos();
});

const visor = $("#visor");
$("#galeria").addEventListener("click", async (e) => {
  const id = e.target.closest("[data-foto]")?.dataset.foto;
  if (!id) return;
  const foto = fotosVisibles.find((f) => f.id === id);
  $("#visor-img").src = foto.mini; // se ve al momento y luego se cambia por la grande
  $("#visor-pie").textContent = foto.nombre ? `📸 ${foto.nombre}` : "";
  visor.showModal();
  try {
    const grande = await datos.leerFotoGrande(id);
    if (grande && visor.open) $("#visor-img").src = grande;
  } catch (err) {
    console.error(err);
  }
});
$("#visor-cerrar").addEventListener("click", () => visor.close());
visor.addEventListener("click", (e) => e.target === visor && visor.close());
