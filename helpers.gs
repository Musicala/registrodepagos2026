/**************************************
 * helpers.gs
 **************************************/
function money(v) {
  if (typeof v === 'number') return Math.round(v);
  return Number(String(v || '').replace(/[^\d]/g, '')) || 0;
}

function jsonOut(data, cb) {
  const txt = cb ? `${cb}(${JSON.stringify(data)})` : JSON.stringify(data);
  return ContentService.createTextOutput(txt)
    .setMimeType(cb ? ContentService.MimeType.JAVASCRIPT : ContentService.MimeType.JSON);
}

function withScriptLock_(fn, timeoutMs) {
  const lock = LockService.getScriptLock();
  lock.waitLock(timeoutMs || 30000);
  try {
    return fn();
  } finally {
    lock.releaseLock();
  }
}

/**
 * Última fila con dato REAL (visible) en una columna.
 * Ignora fórmulas que devuelven "".
 */
function lastRealDataRowByDisplay_(sh, col, startRow = 2) {
  const lastRow = sh.getLastRow();
  if (lastRow < startRow) return startRow - 1;

  const n = lastRow - startRow + 1;
  const vals = sh.getRange(startRow, col, n, 1).getDisplayValues();

  for (let i = vals.length - 1; i >= 0; i--) {
    const v = String(vals[i][0] || "").trim();
    if (v) return startRow + i;
  }
  return startRow - 1;
}

/**
 * Busca la última fila real leyendo bloques desde abajo (más rápido en hojas grandes).
 */
function lastRealDataRowByDisplayFast_(sh, col, startRow = 2, chunkSize = 1000) {
  const lastRow = sh.getLastRow();
  if (lastRow < startRow) return startRow - 1;

  for (let blockEnd = lastRow; blockEnd >= startRow; blockEnd -= chunkSize) {
    const blockStart = Math.max(startRow, blockEnd - chunkSize + 1);
    const rows = blockEnd - blockStart + 1;
    const vals = sh.getRange(blockStart, col, rows, 1).getDisplayValues();

    for (let i = vals.length - 1; i >= 0; i--) {
      const v = String(vals[i][0] || "").trim();
      if (v) return blockStart + i;
    }
  }
  return startRow - 1;
}

/**
 * Calcula la próxima fila libre en una columna usando cache de propiedades.
 */
function nextDataRowByDisplayCached_(sh, col, startRow = 2) {
  const props = PropertiesService.getScriptProperties();
  const key = `nextRow:${sh.getSheetId()}:c${col}:s${startRow}`;
  const cached = Number(props.getProperty(key) || 0);

  if (cached >= startRow) {
    const probeSize = 300;
    const maxRows = sh.getMaxRows();
    const rows = Math.max(1, Math.min(probeSize, maxRows - cached + 1));
    const probe = sh.getRange(cached, col, rows, 1).getDisplayValues();

    for (let i = 0; i < probe.length; i++) {
      const v = String(probe[i][0] || "").trim();
      if (!v) return cached + i;
    }
  }

  const last = lastRealDataRowByDisplayFast_(sh, col, startRow);
  return Math.max(startRow, last + 1);
}

function rememberNextDataRow_(sh, col, rowUsed, startRow = 2) {
  const props = PropertiesService.getScriptProperties();
  const key = `nextRow:${sh.getSheetId()}:c${col}:s${startRow}`;
  props.setProperty(key, String(Math.max(startRow, Number(rowUsed || 0) + 1)));
}

/** Asegura que la fila exista (por si newRowIndex = maxRows+1) */
function ensureRowExists_(sh, rowIndex) {
  const max = sh.getMaxRows();
  if (rowIndex > max) sh.insertRowsAfter(max, rowIndex - max);
}
