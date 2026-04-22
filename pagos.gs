/**************************************
 * pagos.gs
 **************************************/
function guardarPago_(d) {
  return withScriptLock_(function () {
    const ss = SpreadsheetApp.openById(RIP_ID);
    const shReg = ss.getSheetByName(TAB_REGISTRO);
    const shCli = ss.getSheetByName(TAB_CLIENTES);

    if (!shReg) throw new Error('No existe pestaña: ' + TAB_REGISTRO);
    if (!shCli) throw new Error('No existe pestaña: ' + TAB_CLIENTES);

    const fecha = d.fechaPago || '';
    const comentario = d.comentario || '';
    const medio = d.medioPago || '';

    const recargo = money(d.recargo);
    const descuento = money(d.descuento);
    const fevm = money(d.FEVM);

    const rawUsuarios = [
      { u: (d.usuario1 || d.usuarioNoRegistrado || '').trim(), s: (d.servicio1 || '').trim(), p: money(d.precioServicio1) },
      { u: (d.usuario2 || '').trim(),                         s: (d.servicio2 || '').trim(), p: money(d.precioServicio2) },
      { u: (d.usuario3 || '').trim(),                         s: (d.servicio3 || '').trim(), p: money(d.precioServicio3) },
      { u: (d.usuario4 || '').trim(),                         s: (d.servicio4 || '').trim(), p: money(d.precioServicio4) },
      { u: (d.usuario5 || '').trim(),                         s: (d.servicio5 || '').trim(), p: money(d.precioServicio5) }
    ];

    const usuariosValidos = rawUsuarios.filter(x => x.u && x.s && x.p > 0);
    if (!usuariosValidos.length) throw new Error('No hay usuarios válidos (usuario/servicio/precio)');

    const total = usuariosValidos.reduce((a, b) => a + b.p, 0) + recargo - descuento;

    // 1) Clientes B2C primero (para no dejar el registro “cojo”)
    const rCli = appendClienteB2C_(shCli, {
      fecha,
      usuarios: rawUsuarios,
      recargo,
      descuento,
      total,
      medio,
      fevm,
      servicio6: (d.servicio6 || "").trim(),
      precio6: money(d.precioServicio6 || d.precio6 || "")
    });

    // 2) Registro 2026
    const rowsReg = usuariosValidos.map(it => [
      '', '', 'Pago', it.u, fecha, it.s, '', '', it.p, comentario
    ]);
    const regStartRow = shReg.getLastRow() + 1;
    shReg.getRange(regStartRow, 1, rowsReg.length, rowsReg[0].length).setValues(rowsReg);

    return { ok: true, clientesB2C: rCli, registroStartRow: regStartRow };
  }, 30000);
}
