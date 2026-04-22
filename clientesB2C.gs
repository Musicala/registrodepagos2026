/**************************************
 * clientesB2C.gs
 **************************************/
function appendClienteB2C_(shCli, payload) {
  const fecha = payload.fecha || "";
  const usuarios = payload.usuarios || [];
  const recargo = Number(payload.recargo || 0);
  const descuento = Number(payload.descuento || 0);
  const total = Number(payload.total || 0);
  const medio = payload.medio || "";
  const fevm = Number(payload.fevm || 0);

  const servicio6 = payload.servicio6 || "";
  const precio6 = (payload.precio6 === "" || payload.precio6 == null) ? "" : Number(payload.precio6 || 0);

  // Próxima fila libre real en B (rápido + cacheado)
  const newRowIndex = nextDataRowByDisplayCached_(shCli, 2, 2);

  ensureRowExists_(shCli, newRowIndex);

  // D..AC (26 cols)
  const d_to_ac = new Array(26).fill("");

  d_to_ac[0] = usuarios[0]?.u || "";
  d_to_ac[1] = usuarios[0]?.s || "";
  d_to_ac[2] = usuarios[0]?.p || "";

  d_to_ac[3] = "U2";
  d_to_ac[4] = usuarios[1]?.u || "";
  d_to_ac[5] = usuarios[1]?.s || "";
  d_to_ac[6] = usuarios[1]?.p || "";

  d_to_ac[7]  = "U3";
  d_to_ac[8]  = usuarios[2]?.u || "";
  d_to_ac[9]  = usuarios[2]?.s || "";
  d_to_ac[10] = usuarios[2]?.p || "";

  d_to_ac[11] = "U4";
  d_to_ac[12] = usuarios[3]?.u || "";
  d_to_ac[13] = usuarios[3]?.s || "";
  d_to_ac[14] = usuarios[3]?.p || "";

  d_to_ac[15] = "U5";
  d_to_ac[16] = usuarios[4]?.u || "";
  d_to_ac[17] = usuarios[4]?.s || "";
  d_to_ac[18] = usuarios[4]?.p || "";

  d_to_ac[19] = servicio6;
  d_to_ac[20] = (precio6 === 0 ? "" : precio6);

  d_to_ac[21] = recargo;
  d_to_ac[22] = descuento;
  d_to_ac[23] = total;
  d_to_ac[24] = medio;
  d_to_ac[25] = fevm;

  // NO tocar A ni C
  shCli.getRange(newRowIndex, 2).setValue(fecha);            // B
  shCli.getRange(newRowIndex, 4, 1, 26).setValues([d_to_ac]); // D..AC

  rememberNextDataRow_(shCli, 2, newRowIndex, 2);
  return { newRowIndex };
}
