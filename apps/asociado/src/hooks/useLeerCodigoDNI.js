/**
 * useLeerCodigoDNI
 * Parsea el texto crudo leído por ScannerDNI.
 * El scanner maneja la detección — este hook solo procesa el resultado.
 *
 * Formato DNI argentino:
 * APELLIDO@NOMBRE@SEXO@DNI@EJEMPLAR@FECHA_NAC@FECHA_EMISION@@CUIL
 */

export function parsearCodigoDNI(texto) {
  if (!texto) return null;

  const partes = texto.split("@");
  if (partes.length < 6) return null;

  const apellido    = partes[0]?.trim();
  const nombre      = partes[1]?.trim();
  const dni         = partes[3]?.trim().replace(/\D/g, "");
  const fechaNacRaw = partes[5]?.trim(); // DD/MM/AAAA
  const cuil        = partes[8]?.trim().replace(/\D/g, "") || null;

  if (!apellido || !nombre || !dni || dni.length < 7) return null;

  let cliFecNac = null;
  if (fechaNacRaw && /\d{2}\/\d{2}\/\d{4}/.test(fechaNacRaw)) {
    const [dia, mes, anio] = fechaNacRaw.split("/");
    cliFecNac = `${anio}-${mes}-${dia}`;
  }

  return {
    socNom:    `${apellido} ${nombre}`,
    socDocNro: dni,
    cliFecNac,
    cuil,
  };
}

export function useLeerCodigoDNI() {
  const procesar = (texto) => {
    const datos = parsearCodigoDNI(texto);
    if (!datos) {
      return { ok: false, error: "El código leído no corresponde a un DNI argentino." };
    }
    return { ok: true, datos };
  };

  return { procesar };
}
