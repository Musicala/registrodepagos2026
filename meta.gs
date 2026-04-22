/**************************************
 * meta.gs
 **************************************/
function getPrices_() {
  const sh = SpreadsheetApp.openById(PRECIOS_ID).getSheetByName(TAB_PRECIOS);
  if (!sh) return { tipos: [], servicios: [] };

  const last = sh.getLastRow();
  if (last < 2) return { tipos: [], servicios: [] };

  const data = sh.getRange(2, 1, last - 1, sh.getLastColumn()).getValues();

  const TIPO_NUEVOS = "Nuevos";
  const TIPO_ANTIGUOS = "Antiguos/Convenios";

  const serviciosMap = {};

  data.forEach(r => {
    const servicio = String(r[COL_SERVICIO - 1] || "").trim();
    if (!servicio) return;

    const precioNuevos   = money(r[COL_NUEVOS - 1]);
    const precioAntiguos = money(r[COL_ANTIGUOS - 1]);

    if (!serviciosMap[servicio]) serviciosMap[servicio] = {};
    if (precioNuevos > 0) serviciosMap[servicio][TIPO_NUEVOS] = precioNuevos;
    if (precioAntiguos > 0) serviciosMap[servicio][TIPO_ANTIGUOS] = precioAntiguos;
  });

  return {
    tipos: [TIPO_ANTIGUOS, TIPO_NUEVOS],
    servicios: Object.keys(serviciosMap).map(name => ({ name, prices: serviciosMap[name] }))
  };
}

function getEstudiantes_() {
  const ss = SpreadsheetApp.openById(RIP_ID);
  const sh = ss.getSheetByName(TAB_ESTUDIANTES);
  if (!sh) return [];

  const last = sh.getLastRow();
  if (last < 1) return [];

  const vals = sh.getRange(1, 1, last, 1).getValues().flat();

  return vals
    .map(v => String(v || '').trim())
    .filter(Boolean)
    .filter(v => {
      const low = v.toLowerCase();
      return low !== 'estudiantes' && low !== 'lista de estudiantes';
    });
}

function getMeta_() {
  const cache = CacheService.getScriptCache();
  const key = 'meta:v1';
  const cached = cache.get(key);
  if (cached) return JSON.parse(cached);

  const precios = getPrices_();
  const estudiantes = getEstudiantes_();

  const out = {
    ok: true,
    meta: {
      tiposEstudiante: precios.tipos,
      servicios: precios.servicios,
      estudiantes,
      mediosPago: [
        'Bancolombia M','Nequi M','Bold','Davivienda M','Efectivo',
        'Daviplata C','Fesicol','Mercadopago','Addi'
      ]
    }
  };

  cache.put(key, JSON.stringify(out), 300);
  return out;
}
