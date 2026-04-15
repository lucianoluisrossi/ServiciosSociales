/**
 * useLeerCodigoDNI
 * Parsea el texto crudo leído por ScannerDNI.
 *
 * Formato real del DNI argentino (confirmado):
 * 00710802830 @ ROSSI @ LUCIANO LUIS @ M @ 23692560 @ B @ 23/12/1973 @ 19/09/2023 @ 239
 * [0] CUIL_PARCIAL [1] APELLIDO [2] NOMBRE [3] SEXO [4] DNI [5] EJEMPLAR [6] FECHA_NAC [7] FECHA_EMISION [8] ...
 *
 * Algunos DNI más viejos no tienen el campo CUIL al inicio:
 * APELLIDO @ NOMBRE @ SEXO @ DNI @ EJEMPLAR @ FECHA_NAC @ FECHA_EMISION ...
 */

export function parsearCodigoDNI(texto) {
  if (!texto) return null;

  const partes = texto.split("@");
  if (partes.length < 7) return null;

  let apellido, nombre, dni, fechaNacRaw;

  // Detectar formato por el primer campo
  const primerCampo = partes[0]?.trim();
  const esFormatoConCuil   = /^\d+$/.test(primerCampo);
  // Formato antiguo con @ al inicio: "" @ DNI @ EJEMPLAR @ N @ APELLIDO @ NOMBRE @ PAIS @ FECHA_NAC ...
  const esFormatoArrobaPrimero = primerCampo === "" && /^\d+$/.test(partes[1]?.trim());

  if (esFormatoArrobaPrimero) {
    apellido    = partes[4]?.trim();
    nombre      = partes[5]?.trim();
    dni         = partes[1]?.trim().replace(/\D/g, "");
    fechaNacRaw = partes[7]?.trim();
  } else if (esFormatoConCuil) {
    // Formato nuevo: CUIL @ APELLIDO @ NOMBRE @ SEXO @ DNI @ EJEMPLAR @ FECHA_NAC ...
    apellido    = partes[1]?.trim();
    nombre      = partes[2]?.trim();
    dni         = partes[4]?.trim().replace(/\D/g, "");
    fechaNacRaw = partes[6]?.trim();
  } else {
    // Formato viejo: APELLIDO @ NOMBRE @ SEXO @ DNI @ EJEMPLAR @ FECHA_NAC ...
    apellido    = partes[0]?.trim();
    nombre      = partes[1]?.trim();
    dni         = partes[3]?.trim().replace(/\D/g, "");
    fechaNacRaw = partes[5]?.trim();
  }

  if (!apellido || !nombre || !dni || dni.length < 7) return null;

  // Convertir DD/MM/AAAA → YYYY-MM-DD
  let cliFecNac = null;
  if (fechaNacRaw && /\d{2}\/\d{2}\/\d{4}/.test(fechaNacRaw)) {
    const [dia, mes, anio] = fechaNacRaw.split("/");
    cliFecNac = `${anio}-${mes}-${dia}`;
  }

  return {
    socNom:    `${apellido} ${nombre}`,
    socDocNro: dni,
    cliFecNac,
    cuil:      null,
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
