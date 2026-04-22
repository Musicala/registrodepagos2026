/**************************************
 * webapp.gs
 **************************************/
function doGet(e) {
  try {
    const action = e?.parameter?.action || '';
    const cb = e?.parameter?.callback;

    if (action === 'meta')  return jsonOut(getMeta_(), cb);
    if (action === 'debug') return jsonOut(getMeta_(), cb);

    return jsonOut({ ok: true }, cb);
  } catch (err) {
    return jsonOut({ ok: false, error: err.message }, e?.parameter?.callback);
  }
}

function doPost(e) {
  try {
    const body = JSON.parse(e.postData.contents || '{}');
    if (body.action === 'guardarPago') return jsonOut(guardarPago_(body.datos || {}));
    return jsonOut({ ok: false, error: 'Acción inválida' });
  } catch (err) {
    return jsonOut({ ok: false, error: err.message });
  }
}