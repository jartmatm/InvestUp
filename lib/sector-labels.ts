const LEGACY_SECTOR_LABELS: Record<string, string> = {
  Administracion: 'Administration',
  Comercio: 'Commerce',
  Finanzas: 'Finance',
  Tecnologia: 'Technology',
  Manufactura: 'Manufacturing',
  Agroindustria: 'Agribusiness',
  Salud: 'Healthcare',
  Educacion: 'Education',
  Turismo: 'Tourism',
  Logistica: 'Logistics',
  Construccion: 'Construction',
  'Servicios profesionales': 'Professional services',
};

export const SECTOR_OPTIONS_ENGLISH = [
  'Administration',
  'Commerce',
  'Finance',
  'Technology',
  'Manufacturing',
  'Agribusiness',
  'Healthcare',
  'Education',
  'Tourism',
  'Logistics',
  'Construction',
  'Professional services',
] as const;

export const toEnglishSector = (value?: string | null) => {
  const trimmed = value?.trim() ?? '';
  if (!trimmed) return '';
  return LEGACY_SECTOR_LABELS[trimmed] ?? trimmed;
};
