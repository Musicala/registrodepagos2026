// =========================
// Musicala Pagos 2026 — app.js (FULL) v3.1
// =========================
// - Tipo de estudiante: botones Antiguos/Convenios vs Nuevos
// - Precio sugerido: funciona con el tipo seleccionado + botones "Sugerido"
// - Total general: en vivo
// - Debug servidor: action=debug
// - ✅ Guarda y limpia automático
// - ✅ NUEVO: buscador de servicios/usuarios permite MODIFICAR después de buscar
//    (sin perder selección cuando aplica, y sincroniza input <-> select)

// 1) URL Web App (Apps Script)
const WEBAPP_URL = "https://script.google.com/macros/s/AKfycbzHW7Pnz39SKihDDHprCyvcSXzzDg9wnxvGwxud9o6KBCgpjFd95G5eUf8r8MTDdnyFzQ/exec";

let META = { estudiantes: [], servicios: [], tiposEstudiante: [], mediosPago: [] };

// DOM helper
const $ = (id) => document.getElementById(id);

function setStatus(msg){
  const el = $("status");
  if (el) el.textContent = msg || "";
}

// =========================
// UI helpers
// =========================
function fillSelect(selectId, items, placeholder="Seleccionar...") {
  const sel = $(selectId);
  if (!sel) return;
  sel.innerHTML = `<option value="">${placeholder}</option>`;
  (items || []).forEach(x => {
    const opt = document.createElement("option");
    opt.value = x;
    opt.textContent = x;
    sel.appendChild(opt);
  });
}

/**
 * Filtra un select basado en un input, PERO:
 * - preserva la selección si aún existe en el filtrado
 * - no “bloquea” la posibilidad de cambiar después
 */
function filterToSelect(inputId, selectId, items, placeholder="Seleccionar...") {
  const input = $(inputId);
  const sel   = $(selectId);
  if (!sel) return;

  const prev = sel.value || "";
  const q = (input?.value || "").toLowerCase().trim();

  const filtered = !q
    ? (items || [])
    : (items || []).filter(x => String(x).toLowerCase().includes(q));

  fillSelect(selectId, filtered, placeholder);

  // Preservar selección si todavía existe dentro del filtro
  if (prev && filtered.includes(prev)) {
    sel.value = prev;
  } else {
    sel.value = ""; // vuelve a placeholder si ya no aplica
  }
}

function normalizeMoneyInput(val){
  return String(val || "").replace(/[^\d]/g,'');
}

function serviciosNames(){
  return (META.servicios || []).map(s => s.name);
}

function formatCOP(n){
  const x = Number(n || 0);
  return "$" + x.toLocaleString("es-CO");
}

// =========================
// JSONP for GET (avoid CORS)
// =========================
function jsonp(url) {
  return new Promise((resolve, reject) => {
    const cbName = "cb_" + Math.random().toString(36).slice(2);

    const cleanup = () => {
      try { delete window[cbName]; } catch {}
      try { script.remove(); } catch {}
    };

    window[cbName] = (data) => {
      try { resolve(data); }
      finally { cleanup(); }
    };

    const script = document.createElement("script");
    script.src = url + (url.includes("?") ? "&" : "?") + "callback=" + cbName;
    script.onerror = () => {
      cleanup();
      reject(new Error("JSONP falló cargando: " + url));
    };

    document.body.appendChild(script);
  });
}

// =========================
// Buscador input <-> select (NUEVO)
// =========================
function bindSearchableSelect_(inputId, selectId, getItemsFn, placeholder="Seleccionar..."){
  const input = $(inputId);
  const sel = $(selectId);
  if (!sel) return;

  const itemsNow = () => (typeof getItemsFn === "function" ? (getItemsFn() || []) : (getItemsFn || []));

  // 1) Escribir filtra
  input?.addEventListener("input", () => {
    filterToSelect(inputId, selectId, itemsNow(), placeholder);
  });

  // 2) Cambiar en select => copia al input (para poder editar y volver a filtrar fácil)
  sel.addEventListener("change", () => {
    if (input) input.value = sel.value || "";
  });

  // 3) Focus: selecciona texto para cambiar rápido
  input?.addEventListener("focus", () => {
    try { input.select(); } catch {}
  });

  // 4) ESC: limpia búsqueda y repuebla todo
  input?.addEventListener("keydown", (ev) => {
    if (ev.key === "Escape") {
      input.value = "";
      fillSelect(selectId, itemsNow(), placeholder);
      // no tocamos sel.value aquí, que el usuario decida
      ev.preventDefault();
    }
  });
}

// =========================
// Tipo de estudiante (UI: botones)
// =========================
let TIPO_UI = "";

function pickTipoByKeywords_(keywords){
  const tipos = META.tiposEstudiante || [];
  const low = tipos.map(t => String(t).toLowerCase());
  for (let i = 0; i < tipos.length; i++){
    const t = low[i];
    if (keywords.some(k => t.includes(k))) return tipos[i];
  }
  return tipos[0] || "";
}

function setTipoUI_(tipo){
  TIPO_UI = tipo || "";

  const a = $("btnAntiguos");
  const n = $("btnNuevos");
  const help = $("tipoHelp");

  // Estado activo
  a?.classList.toggle("isActive", /antigu|conven/i.test(TIPO_UI));
  n?.classList.toggle("isActive", /nuevo/i.test(TIPO_UI));

  if (help) help.textContent = TIPO_UI ? `Tipo seleccionado: ${TIPO_UI}` : "Selecciona el tipo para sugerir precios.";

  // Recalcula sugeridos (solo si no están en manual)
  ["1","2","3"].forEach(k => {
    const sel = $("servicio"+k+"Dropdown");
    const price = $("precioServicio"+k);
    if (!sel || !price) return;
    if (price.dataset.manual === "1") return;

    const sug = getPrecioSugerido(sel.value, TIPO_UI);
    if (sug !== "") price.value = sug;
  });

  calcTotalGeneral_();
}

function bindTipoButtons_(){
  const a = $("btnAntiguos");
  const n = $("btnNuevos");

  if (a){
    a.addEventListener("click", () => {
      const t = pickTipoByKeywords_(["antigu", "conven"]);
      setTipoUI_(t);
    });
  }

  if (n){
    n.addEventListener("click", () => {
      const t = pickTipoByKeywords_(["nuevo"]);
      setTipoUI_(t);
    });
  }
}

// =========================
// Precios sugeridos
// =========================
function getTipoActual_() {
  // 1) Botones
  if (TIPO_UI) return TIPO_UI;

  // 2) Fallback por si un día pones un select real
  const el = $("tipoEstudiante");
  const v = el?.value || "";

  // 3) Default
  return v || (META.tiposEstudiante?.[0] || "");
}

function getPrecioSugerido(servicioName, tipo) {
  if (!servicioName) return "";
  const s = (META.servicios || []).find(x => x?.name === servicioName);
  if (!s || !s.prices) return "";

  const t = tipo || getTipoActual_();
  const p = s.prices[t];

  return (typeof p === "number" && p > 0) ? String(p) : "";
}

function bindPrecioAuto(servicioSelectId, precioInputId){
  const sel = $(servicioSelectId);
  const price = $(precioInputId);
  if (!sel || !price) return;

  // Normaliza input a solo números y marca como manual
  price.addEventListener("input", () => {
    price.dataset.manual = "1";
    price.value = normalizeMoneyInput(price.value);
    calcTotalGeneral_();
  });

  const apply = () => {
    const servicio = sel.value || "";
    const tipoSel = getTipoActual_();
    if (!servicio || !tipoSel) return;

    // si el usuario lo editó manualmente, no lo toques
    if (price.dataset.manual === "1") return;

    const sug = getPrecioSugerido(servicio, tipoSel);
    if (sug !== "") price.value = sug;
  };

  // Cambio de servicio: sugiere sí o sí (resetea manual)
  sel.addEventListener("change", () => {
    price.dataset.manual = "";
    apply();
    calcTotalGeneral_();
  });

  // ✅ aplica una vez al cargar por si ya hay defaults
  setTimeout(() => { apply(); calcTotalGeneral_(); }, 0);
}

function bindSugBtn_(k){
  const btn = $("btnSug" + k);
  const sel = $("servicio" + k + "Dropdown");
  const price = $("precioServicio" + k);
  if (!btn || !sel || !price) return;

  btn.addEventListener("click", () => {
    price.dataset.manual = "";
    const sug = getPrecioSugerido(sel.value, getTipoActual_());
    if (sug !== "") price.value = sug;
    calcTotalGeneral_();
  });
}

// =========================
// Total general
// =========================
function num_(id){
  return Number(normalizeMoneyInput($(id)?.value) || 0);
}

function calcTotalGeneral_(){
  const p1 = num_("precioServicio1");
  const p2 = num_("precioServicio2");
  const p3 = num_("precioServicio3");

  const rec = num_("recargo");
  const desc = num_("descuento");

  const total = (p1 + p2 + p3) + rec - desc;
  const el = $("totalGeneral");
  if (el) el.textContent = formatCOP(total);

  return total;
}

// =========================
// Load META
// =========================
async function loadMeta() {
  setStatus("Cargando listas...");

  const resp = await jsonp(`${WEBAPP_URL}?action=meta`);
  if (!resp || !resp.ok) throw new Error(resp?.error || "Meta inválida");

  META = resp.meta || META;

  // Botones tipo
  bindTipoButtons_();
  const defaultTipo = pickTipoByKeywords_(["antigu", "conven"]) || (META.tiposEstudiante?.[0] || "");
  setTipoUI_(defaultTipo);

  // Estudiantes
  fillSelect("usuario1Dropdown", META.estudiantes || []);
  fillSelect("usuario2Dropdown", META.estudiantes || []);
  fillSelect("usuario3Dropdown", META.estudiantes || []);

  // Servicios
  const sn = serviciosNames();
  fillSelect("servicio1Dropdown", sn);
  fillSelect("servicio2Dropdown", sn);
  fillSelect("servicio3Dropdown", sn);

  // Medios de pago
  fillSelect("medioPago", META.mediosPago || []);

  // ✅ Buscadores inteligentes (NUEVO)
  bindSearchableSelect_("usuario1Input", "usuario1Dropdown", () => (META.estudiantes || []));
  bindSearchableSelect_("usuario2Input", "usuario2Dropdown", () => (META.estudiantes || []));
  bindSearchableSelect_("usuario3Input", "usuario3Dropdown", () => (META.estudiantes || []));

  bindSearchableSelect_("servicio1Input", "servicio1Dropdown", () => serviciosNames());
  bindSearchableSelect_("servicio2Input", "servicio2Dropdown", () => serviciosNames());
  bindSearchableSelect_("servicio3Input", "servicio3Dropdown", () => serviciosNames());

  // Auto-precios según tipo (DESPUÉS de llenar selects)
  bindPrecioAuto("servicio1Dropdown", "precioServicio1");
  bindPrecioAuto("servicio2Dropdown", "precioServicio2");
  bindPrecioAuto("servicio3Dropdown", "precioServicio3");

  // Botones Sugerido
  bindSugBtn_(1);
  bindSugBtn_(2);
  bindSugBtn_(3);

  // Normalizar otros campos dinero + total
  ["recargo","descuento","FEVM"].forEach(id=>{
    const el = $(id);
    if (!el) return;
    el.addEventListener("input", ()=>{
      el.value = normalizeMoneyInput(el.value);
      calcTotalGeneral_();
    });
  });

  // Debug meta pill
  const dm = $("debugMeta");
  if (dm){
    dm.textContent = `Meta: ${META.estudiantes?.length || 0} estudiantes · ${META.servicios?.length || 0} servicios · ${META.tiposEstudiante?.length || 0} tipos`;
  }

  setStatus("Listo ✅");
  calcTotalGeneral_();
}

// =========================
// Read + Validate
// =========================
function readForm() {
  return {
    fechaPago: $("fechaPago")?.value || "",
    tipoEstudiante: getTipoActual_(),

    usuario1: $("usuario1Dropdown")?.value || "",
    usuarioNoRegistrado: ($("usuarioNoRegistrado")?.value || "").trim(),
    servicio1: $("servicio1Dropdown")?.value || "",
    precioServicio1: $("precioServicio1")?.value || "",
    ciclo1: $("ciclo1")?.value || "",

    usuario2: $("usuario2Dropdown")?.value || "",
    servicio2: $("servicio2Dropdown")?.value || "",
    precioServicio2: $("precioServicio2")?.value || "",
    ciclo2: $("ciclo2")?.value || "",

    usuario3: $("usuario3Dropdown")?.value || "",
    servicio3: $("servicio3Dropdown")?.value || "",
    precioServicio3: $("precioServicio3")?.value || "",
    ciclo3: $("ciclo3")?.value || "",

    medioPago: $("medioPago")?.value || "",
    recargo: $("recargo")?.value || "",
    descuento: $("descuento")?.value || "",
    FEVM: $("FEVM")?.value || "",
    comentario: ($("comentario")?.value || "").trim()
  };
}

function validate(datos) {
  if (!datos.fechaPago) return "Falta Fecha de Pago.";
  if (!datos.tipoEstudiante) return "Falta Tipo de estudiante.";

  // Usuario 1: o seleccionado o no registrado
  if (!datos.usuario1 && !datos.usuarioNoRegistrado) return "Falta Usuario 1 o 'Usuario no registrado'.";

  if (!datos.servicio1) return "Falta Servicio 1.";
  if (!String(datos.precioServicio1 || "").trim()) return "Falta Precio del Servicio 1.";
  if (!datos.medioPago) return "Falta Medio de Pago.";

  return "";
}

// =========================
// Submit
// =========================
async function submitPago(datos) {
  const payload = { action: "guardarPago", datos };

  await fetch(WEBAPP_URL, {
    method: "POST",
    mode: "no-cors",
    headers: { "Content-Type": "text/plain;charset=utf-8" },
    body: JSON.stringify(payload)
  });
}

// =========================
// Reset
// =========================
function resetForm(opts={}) {
  const keepStatus = !!opts.keepStatus;

  $("formPago")?.reset();

  // reset manual flags para que vuelva a sugerir
  ["precioServicio1","precioServicio2","precioServicio3"].forEach(id=>{
    const el = $(id);
    if (el) el.dataset.manual = "";
  });

  // repoblar selects completos
  fillSelect("medioPago", META.mediosPago || []);

  fillSelect("usuario1Dropdown", META.estudiantes || []);
  fillSelect("usuario2Dropdown", META.estudiantes || []);
  fillSelect("usuario3Dropdown", META.estudiantes || []);

  const sn = serviciosNames();
  fillSelect("servicio1Dropdown", sn);
  fillSelect("servicio2Dropdown", sn);
  fillSelect("servicio3Dropdown", sn);

  // limpia inputs de búsqueda (para que no se queden filtrando)
  ["usuario1Input","usuario2Input","usuario3Input","servicio1Input","servicio2Input","servicio3Input"].forEach(id=>{
    const el = $(id);
    if (el) el.value = "";
  });

  // vuelve a default tipo
  const defaultTipo = pickTipoByKeywords_(["antigu", "conven"]) || (META.tiposEstudiante?.[0] || "");
  setTipoUI_(defaultTipo);

  // limpia debug server
  const dbg = $("debugServer");
  if (dbg) dbg.textContent = "";

  if (!keepStatus) setStatus("");
  calcTotalGeneral_();
}

// =========================
// Debug servidor
// =========================
async function runServerDebug_(){
  const out = $("debugServer");
  if (out) out.textContent = "Consultando debug...";

  try{
    const resp = await jsonp(`${WEBAPP_URL}?action=debug`);
    if (out) out.textContent = JSON.stringify(resp, null, 2);
  } catch (e){
    if (out) out.textContent = "❌ " + (e?.message || e);
  }
}

// =========================
// Init
// =========================
async function init() {
  $("btnReset")?.addEventListener("click", resetForm);
  $("btnDebug")?.addEventListener("click", runServerDebug_);

  // Total en vivo cuando cambian inputs de dinero
  ["precioServicio1","precioServicio2","precioServicio3","recargo","descuento"].forEach(id=>{
    $(id)?.addEventListener("input", calcTotalGeneral_);
  });

  $("formPago")?.addEventListener("submit", async (ev) => {
    ev.preventDefault();

    const datos = readForm();
    const err = validate(datos);
    if (err) { setStatus("⚠️ " + err); return; }

    const btn = $("btnSend");
    if (btn) btn.disabled = true;

    setStatus("Guardando...");

    try {
      await submitPago(datos);
      resetForm({ keepStatus: true }); // ✅ limpia automático sin borrar el status
      setStatus("Guardado ✅");
      $("fechaPago")?.focus?.();
    } catch (e) {
      setStatus("❌ Error enviando: " + (e?.message || e));
    } finally {
      if (btn) btn.disabled = false;
    }
  });

  await loadMeta();
}

init().catch(err => setStatus("❌ No cargó meta: " + (err?.message || err)));
