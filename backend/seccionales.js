// ============================================================
// DATOS DE LAS 19 SECCIONALES DE PECIFA
// ------------------------------------------------------------
// Datos oficiales del sitio web de PECIFA (www.pecifa.org).
// Algunos campos vienen vacíos porque la propia web aún no los
// publica. Completalos cuando tengas la info de cada seccional.
//
// El agente usa esto para:
//   1) Enrutar el email de la consulta a la seccional correcta.
//   2) Darle al afiliado los datos de contacto de su seccional.
// NO cambies el campo "id" (es la clave interna).
// ============================================================

export const EMAIL_GENERAL = 'asistentegremial@pecifa.org';

// Si querés que TODAS las consultas lleguen también con copia a
// Nacional, dejá esto en true. Si no, ponelo en false.
export const COPIA_A_NACIONAL = true;

export const SECCIONALES = [
  {
    id: 'capitalfederal', nombre: 'Capital Federal', sede: 'CABA',
    email: 'consultas@pecifa.org.ar',
    telefono: '011 4925-2739 / 011 4923-0651',
    direccion: 'Av. La Plata 2047 - CABA (CP 1250)',
    horario: '', gremialistas: '',
  },
  {
    id: 'cordoba', nombre: 'Córdoba', sede: 'Córdoba',
    email: 'cordoba@pecifa.org.ar',
    telefono: '0351-4223384',
    direccion: '25 de Mayo 576 - Córdoba Capital (5000)',
    horario: '', gremialistas: '',
  },
  {
    id: 'chamical', nombre: 'Chamical', sede: 'Chamical (La Rioja)',
    email: 'chamical@pecifa.org.ar',
    telefono: '03826-429963',
    direccion: '9 de Julio 439, La Rioja',
    horario: '', gremialistas: '',
  },
  {
    id: 'comodororivadavia', nombre: 'Comodoro Rivadavia', sede: 'Comodoro Rivadavia',
    email: '', telefono: '', direccion: '', horario: '', gremialistas: '',
  },
  {
    id: 'curuzu', nombre: 'Curuzú-Cuatiá', sede: 'Curuzú-Cuatiá (Corrientes)',
    email: 'curuzu@pecifa.org.ar',
    telefono: '3774-440569',
    direccion: 'Sarmiento 1449',
    horario: '', gremialistas: '',
  },
  {
    id: 'granbuenosaires', nombre: 'Gran Buenos Aires', sede: 'Gran Buenos Aires',
    email: 'granbuenosaires@pecifa.org.ar',
    telefono: '4664-1168',
    direccion: '',
    horario: '', gremialistas: '',
  },
  {
    id: 'laplata', nombre: 'La Plata', sede: 'La Plata',
    email: 'lplata@pecifa.org.ar',
    telefono: '', direccion: '', horario: '', gremialistas: '',
  },
  {
    id: 'mendoza', nombre: 'Mendoza', sede: 'Mendoza',
    email: 'mendoza@pecifa.org.ar',
    telefono: '', direccion: '', horario: '', gremialistas: '',
  },
  {
    id: 'misiones', nombre: 'Misiones', sede: 'Posadas',
    email: '', telefono: '', direccion: '', horario: '', gremialistas: '',
  },
  {
    id: 'parana', nombre: 'Paraná', sede: 'Paraná (Entre Ríos)',
    email: 'parana@pecifa.org.ar',
    telefono: '', direccion: '', horario: '', gremialistas: '',
  },
  {
    id: 'puntaalta', nombre: 'Punta Alta', sede: 'Punta Alta',
    email: 'puntaalta@pecifa.org',
    telefono: '02932-424842',
    direccion: 'Pellegrini 550',
    horario: '', gremialistas: '',
  },
  {
    id: 'riocuarto', nombre: 'Río Cuarto', sede: 'Río Cuarto (Córdoba)',
    email: 'riocuarto@pecifa.org.ar',
    telefono: '', direccion: '', horario: '', gremialistas: '',
  },
  {
    id: 'reconquista', nombre: 'Reconquista', sede: 'Reconquista (Santa Fe)',
    email: 'reconquista@pecifa.org.ar',
    telefono: '', direccion: '', horario: '', gremialistas: '',
  },
  {
    id: 'salta', nombre: 'Salta', sede: 'Salta',
    email: 'salta@pecifa.org.ar',
    telefono: '', direccion: '', horario: '', gremialistas: '',
  },
  {
    id: 'santafe', nombre: 'Santa Fe', sede: 'Santa Fe',
    email: 'santafe@pecifa.org.ar',
    telefono: '', direccion: '', horario: '', gremialistas: '',
  },
  {
    id: 'tandil', nombre: 'Tandil', sede: 'Tandil',
    email: 'tandil@pecifa.org.ar',
    telefono: '', direccion: '', horario: '', gremialistas: '',
  },
  {
    id: 'trelew', nombre: 'Trelew', sede: 'Trelew (Chubut)',
    email: 'trelew@pecifa.org.ar',
    telefono: '', direccion: '', horario: '', gremialistas: '',
  },
  {
    id: 'tucuman', nombre: 'Tucumán', sede: 'San Miguel de Tucumán',
    email: 'tucuman@pecifa.org.ar',
    telefono: '', direccion: '', horario: '', gremialistas: '',
  },
  {
    id: 'villamercedes', nombre: 'Villa Mercedes', sede: 'Villa Mercedes (San Luis)',
    email: 'villamercedes@pecifa.org.ar',
    telefono: '', direccion: '', horario: '', gremialistas: '',
  },
];

// --- Funciones de ayuda (no tocar) ---

export function buscarSeccional(texto) {
  if (!texto) return null;
  const normalizar = (s) =>
    s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  const t = normalizar(texto);
  return (
    SECCIONALES.find(
      (s) => normalizar(s.nombre).includes(t) || normalizar(s.sede).includes(t) || t.includes(normalizar(s.nombre))
    ) || null
  );
}

export function emailsDestino(seccional) {
  const destinos = [];
  if (seccional && seccional.email) {
    destinos.push(seccional.email);
    if (COPIA_A_NACIONAL) destinos.push(EMAIL_GENERAL);
  } else {
    destinos.push(EMAIL_GENERAL);
  }
  return [...new Set(destinos)];
}
