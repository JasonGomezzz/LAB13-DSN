const moneda = new Intl.NumberFormat('es-PE', { style: 'currency', currency: 'PEN' });
const fechaCorta = new Intl.DateTimeFormat('es-PE', {
  day: '2-digit',
  month: 'short',
  year: 'numeric',
});

export function formatearSalario(valor) {
  return Number.isFinite(Number(valor)) ? moneda.format(Number(valor)) : '—';
}

/** "2024-03-15" -> "15 mar 2024". Se arma con partes locales para evitar el desfase por zona horaria. */
export function formatearFecha(iso) {
  const partes = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso ?? '');
  if (!partes) return '—';
  const [, anio, mes, dia] = partes.map(Number);
  return fechaCorta.format(new Date(anio, mes - 1, dia)).replace(/\./g, '');
}

export function fechaDeHoy() {
  const ahora = new Date();
  const mes = String(ahora.getMonth() + 1).padStart(2, '0');
  const dia = String(ahora.getDate()).padStart(2, '0');
  return `${ahora.getFullYear()}-${mes}-${dia}`;
}

export function iniciales(nombres = '', apellidos = '') {
  const letra = (texto) => texto.trim().charAt(0).toLocaleUpperCase('es');
  return letra(nombres) + letra(apellidos) || '?';
}

/** Minúsculas y sin tildes, para que "lucia" encuentre a "Lucía". */
export function normalizar(texto = '') {
  return texto
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLocaleLowerCase('es')
    .trim();
}

export function plural(cantidad, singular, pluralTexto) {
  return `${cantidad} ${cantidad === 1 ? singular : pluralTexto}`;
}
