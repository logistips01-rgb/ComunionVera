import { admins, menus, regalos } from "./config.js";
import * as datos from "./db.js";

const $ = (sel) => document.querySelector(sel);
const esc = (t) =>
  String(t ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
const nombreMenu = (id) => menus.find((m) => m.id === id)?.nombre ?? id;
const fecha = (iso) => (iso ? new Date(iso).toLocaleString("es-ES", { dateStyle: "short", timeStyle: "short" }) : "");

let confirmaciones = [];

$("#btn-entrar").addEventListener("click", async () => {
  try {
    const usuario = await datos.iniciarSesion();
    if (!datos.modoDemo && !admins.includes(usuario.email)) {
      await datos.cerrarSesion();
      $("#error-acceso").textContent = `${usuario.email} no tiene permiso. Añádelo en config.js y firestore.rules.`;
      return;
    }
    $("#acceso").hidden = true;
    $("#panel").hidden = false;
    cargar();
  } catch (e) {
    console.error(e);
    $("#error-acceso").textContent = "No se ha podido iniciar sesión.";
  }
});

$("#btn-salir").addEventListener("click", async () => {
  await datos.cerrarSesion();
  location.reload();
});
$("#btn-recargar").addEventListener("click", cargar);

async function cargar() {
  const [conf, reservas, mensajes] = await Promise.all([
    datos.leerConfirmaciones(),
    datos.leerReservasDetalle(),
    datos.leerMensajes(),
  ]);
  confirmaciones = conf.sort((a, b) => (a.fecha < b.fecha ? 1 : -1));

  // Resumen
  const si = confirmaciones.filter((c) => c.asiste);
  const personas = si.flatMap((c) => c.personas || []);
  const porMenu = menus.map((m) => ({ ...m, total: personas.filter((p) => p.menu === m.id).length }));
  $("#resumen").innerHTML = [
    ["Familias que vienen", si.length],
    ["Personas en total", personas.length],
    ["No pueden venir", confirmaciones.length - si.length],
    ...porMenu.map((m) => [`${m.icono} ${m.nombre}`, m.total]),
    ["Regalos reservados", `${reservas.length}/${regalos.length}`],
  ]
    .map(([t, n]) => `<div class="tarjeta"><strong>${n}</strong>${esc(t)}</div>`)
    .join("");

  // Confirmaciones
  $("#tabla-confirmaciones").innerHTML =
    "<tr><th>Familia</th><th>¿Viene?</th><th>Personas y menú</th><th>Alergias</th><th>Teléfono</th><th>Comentarios</th><th>Fecha</th></tr>" +
    confirmaciones
      .map(
        (c) => `<tr>
          <td>${esc(c.familia)}</td>
          <td>${c.asiste ? "✅ Sí" : "❌ No"}</td>
          <td>${(c.personas || []).map((p) => `${esc(p.nombre)} — ${esc(nombreMenu(p.menu))}`).join("<br>")}</td>
          <td>${esc(c.alergias)}</td>
          <td>${esc(c.telefono)}</td>
          <td>${esc(c.comentarios)}</td>
          <td>${fecha(c.fecha)}</td>
        </tr>`
      )
      .join("");

  // Regalos
  $("#tabla-regalos").innerHTML =
    "<tr><th>Regalo</th><th>Reservado por</th><th>Fecha</th><th></th></tr>" +
    reservas
      .map(
        (r) => `<tr>
          <td>${esc(regalos.find((g) => g.id === r.regalo)?.nombre ?? r.regalo)}</td>
          <td>${esc(r.nombre)}</td>
          <td>${fecha(r.fecha)}</td>
          <td><button class="boton boton-suave boton-peque" data-liberar="${esc(r.regalo)}">Liberar</button></td>
        </tr>`
      )
      .join("");

  // Mensajes
  $("#tabla-mensajes").innerHTML =
    "<tr><th>Nombre</th><th>Mensaje</th><th>Fecha</th><th></th></tr>" +
    mensajes
      .map(
        (m) => `<tr>
          <td>${esc(m.nombre)}</td>
          <td>${esc(m.texto)}</td>
          <td>${fecha(m.fecha)}</td>
          <td><button class="boton boton-suave boton-peque" data-borrar="${esc(m.id)}">Borrar</button></td>
        </tr>`
      )
      .join("");
}

document.addEventListener("click", async (e) => {
  const { liberar, borrar } = e.target.dataset ?? {};
  if (liberar && confirm("¿Liberar este regalo para que otro invitado pueda reservarlo?")) {
    await datos.liberarRegalo(liberar);
    cargar();
  }
  if (borrar && confirm("¿Borrar este mensaje?")) {
    await datos.borrarMensaje(borrar);
    cargar();
  }
});

// Exportar a CSV (se abre con Excel): una fila por persona
$("#btn-csv").addEventListener("click", () => {
  const filas = [["Familia", "Viene", "Persona", "Menú", "Alergias", "Teléfono", "Comentarios"]];
  for (const c of confirmaciones) {
    const personas = c.personas?.length ? c.personas : [{ nombre: "", menu: "" }];
    for (const p of personas) {
      filas.push([c.familia, c.asiste ? "Sí" : "No", p.nombre, p.menu ? nombreMenu(p.menu) : "", c.alergias, c.telefono, c.comentarios]);
    }
  }
  const csv = filas.map((f) => f.map((v) => `"${String(v ?? "").replace(/"/g, '""')}"`).join(";")).join("\r\n");
  const blob = new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = "confirmaciones-comunion-vera.csv";
  a.click();
});
