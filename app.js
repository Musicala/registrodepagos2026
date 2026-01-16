// 1) Pega aquí la URL de tu Web App (Apps Script)
const WEBAPP_URL = "https://script.google.com/macros/s/AKfycbzrQfOzlTu9RI4XX_KMdb_-Tuw8mV6IAcmwzriyBwUw_WO-NaBA9bOAAg6x5lRkQHu7/exec"; 
// Ej: https://script.google.com/macros/s/AKfycb.../exec

let META = { estudiantes: [], servicios: [], mediosPago: [] };

const $ = (id) => document.getElementById(id);

function setStatus(msg){ $("status").textContent = msg || ""; }

function fillSelect(selectId, items) {
  const sel = $(selectId);
  sel.innerHTML = `<option value="">Seleccionar...</option>`;
  items.forEach(x => {
    const opt = document.createElement("option");
    opt.value = x;
    opt.textContent = x;
    sel.appendChild(opt);
  });
}

function filterToSelect(inputId, selectId, items) {
  const q = ($(inputId).value || "").toLowerCase().trim();
  const filtered = !q ? items : items.filter(x => String(x).toLowerCase().includes(q));
  fillSelect(selectId, filtered);
}

function jsonp(url) {
  return new Promise((resolve, reject) => {
    const cbName = "cb_" + Math.random().toString(36).slice(2);
    window[cbName] = (data) => {
      try { resolve(data); }
      finally {
        delete window[cbName];
        script.remove();
      }
    };

    const script = document.createElement("script");
    script.src = url + (url.includes("?") ? "&" : "?") + "callback=" + cbName;
    script.onerror = () => {
      delete window[cbName];
      script.remove();
      reject(new Error("JSONP falló cargando: " + url));
    };
    document.body.appendChild(script);
  });
}

async function loadMeta() {
  setStatus("Cargando listas...");
  const url = `${WEBAPP_URL}?action=meta`;
  const resp = await jsonp(url);

  if (!resp || !resp.ok) throw new Error(resp?.error || "Meta inválida");
  META = resp.meta;

  // Poblar selects completos
  fillSelect("usuario1Dropdown", META.estudiantes);
  fillSelect("usuario2Dropdown", META.estudiantes);
  fillSelect("usuario3Dropdown", META.estudiantes);

  fillSelect("servicio1Dropdown", META.servicios);
  fillSelect("servicio2Dropdown", META.servicios);
  fillSelect("servicio3Dropdown", META.servicios);

  fillSelect("medioPago", META.mediosPago);

  // Wiring filtros
  $("usuario1Input").addEventListener("input", () => filterToSelect("usuario1Input", "usuario1Dropdown", META.estudiantes));
  $("usuario2Input").addEventListener("input", () => filterToSelect("usuario2Input", "usuario2Dropdown", META.estudiantes));
  $("usuario3Input").addEventListener("input", () => filterToSelect("usuario3Input", "usuario3Dropdown", META.estudiantes));

  $("servicio1Input").addEventListener("input", () => filterToSelect("servicio1Input", "servicio1Dropdown", META.servicios));
  $("servicio2Input").addEventListener("input", () => filterToSelect("servicio2Input", "servicio2Dropdown", META.servicios));
  $("servicio3Input").addEventListener("input", () => filterToSelect("servicio3Input", "servicio3Dropdown", META.servicios));

  setStatus("Listo ✅");
}

function readForm() {
  return {
    fechaPago: $("fechaPago").value,

    usuario1: $("usuario1Dropdown").value,
    usuarioNoRegistrado: $("usuarioNoRegistrado").value.trim(),
    servicio1: $("servicio1Dropdown").value,
    precioServicio1: $("precioServicio1").value,
    ciclo1: $("ciclo1").value,

    usuario2: $("usuario2Dropdown").value,
    servicio2: $("servicio2Dropdown").value,
    precioServicio2: $("precioServicio2").value,
    ciclo2: $("ciclo2").value,

    usuario3: $("usuario3Dropdown").value,
    servicio3: $("servicio3Dropdown").value,
    precioServicio3: $("precioServicio3").value,
    ciclo3: $("ciclo3").value,

    medioPago: $("medioPago").value,
    recargo: $("recargo").value,
    descuento: $("descuento").value,
    FEVM: $("FEVM").value,
    comentario: $("comentario").value.trim()
  };
}

function validate(datos) {
  // Obligatorios: fechaPago, servicio1, precioServicio1, medioPago
  if (!datos.fechaPago) return "Falta Fecha de Pago.";
  if (!datos.servicio1) return "Falta Servicio 1.";
  if (!String(datos.precioServicio1 || "").trim()) return "Falta Precio del Servicio 1.";
  if (!datos.medioPago) return "Falta Medio de Pago.";
  // Usuario: o selecciona usuario1 o escribe no registrado
  if (!datos.usuario1 && !datos.usuarioNoRegistrado) return "Falta Usuario 1 o 'Usuario no registrado'.";
  return "";
}

async function submitPago(datos) {
  // fetch no-cors: manda pero no deja leer respuesta (CORS)
  // Igual, Apps Script lo recibe y guarda.
  const payload = {
    action: "guardarPago",
    datos
  };

  await fetch(WEBAPP_URL, {
    method: "POST",
    mode: "no-cors",
    headers: { "Content-Type": "text/plain;charset=utf-8" },
    body: JSON.stringify(payload)
  });
}

function resetForm() {
  $("formPago").reset();
  // reponer selects completos
  fillSelect("usuario1Dropdown", META.estudiantes);
  fillSelect("usuario2Dropdown", META.estudiantes);
  fillSelect("usuario3Dropdown", META.estudiantes);
  fillSelect("servicio1Dropdown", META.servicios);
  fillSelect("servicio2Dropdown", META.servicios);
  fillSelect("servicio3Dropdown", META.servicios);
  fillSelect("medioPago", META.mediosPago);
  setStatus("");
}

async function init() {
  $("btnReset").addEventListener("click", resetForm);

  $("formPago").addEventListener("submit", async (ev) => {
    ev.preventDefault();
    const datos = readForm();
    const err = validate(datos);
    if (err) { setStatus("⚠️ " + err); return; }

    $("btnSend").disabled = true;
    setStatus("Guardando...");

    try {
      await submitPago(datos);
      setStatus("Guardado ✅");
      // opcional: reset
      // resetForm();
    } catch (e) {
      setStatus("❌ Error enviando: " + (e?.message || e));
    } finally {
      $("btnSend").disabled = false;
    }
  });

  await loadMeta();
}

init().catch(err => setStatus("❌ No cargó meta: " + (err?.message || err)));
