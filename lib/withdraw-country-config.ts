export type WithdrawSelectOption = {
  value: string;
  label: string;
};

export type WithdrawCountryConfig = {
  code: string;
  name: string;
  bankOptions: string[];
  bankPlaceholder: string;
  accountTypes: WithdrawSelectOption[];
  accountTypePlaceholder: string;
  accountNumberPlaceholder: string;
  identificationTypes: WithdrawSelectOption[];
  identificationTypePlaceholder: string;
  identificationNumberPlaceholder: string;
  phonePlaceholder: string;
  breveEnabled: boolean;
  breveDescription: string;
  breveKeyPlaceholder: string;
};

const DEFAULT_CONFIG: WithdrawCountryConfig = {
  code: 'DEFAULT',
  name: 'International',
  bankOptions: [],
  bankPlaceholder: 'Bank name',
  accountTypes: [
    { value: 'checking', label: 'Checking account' },
    { value: 'savings', label: 'Savings account' },
  ],
  accountTypePlaceholder: 'Account type',
  accountNumberPlaceholder: 'Account number',
  identificationTypes: [
    { value: 'national_id', label: 'National ID' },
    { value: 'passport', label: 'Passport' },
  ],
  identificationTypePlaceholder: 'Identification type',
  identificationNumberPlaceholder: 'Identification number',
  phonePlaceholder: 'Phone number',
  breveEnabled: false,
  breveDescription: 'Available only for Colombia',
  breveKeyPlaceholder: 'Breve key',
};

const COUNTRY_CONFIGS: Record<string, WithdrawCountryConfig> = {
  CO: {
    code: 'CO',
    name: 'Colombia',
    bankOptions: [
      'Bancolombia',
      'Banco de Bogotá',
      'Davivienda',
      'BBVA Colombia',
      'Banco de Occidente',
      'Banco Popular',
      'Banco AV Villas',
      'Scotiabank Colpatria',
      'Nequi',
      'Daviplata',
    ],
    bankPlaceholder: 'Selecciona tu banco',
    accountTypes: [
      { value: 'ahorros', label: 'Cuenta de ahorros' },
      { value: 'corriente', label: 'Cuenta corriente' },
    ],
    accountTypePlaceholder: 'Tipo de cuenta',
    accountNumberPlaceholder: 'Número de cuenta',
    identificationTypes: [
      { value: 'cc', label: 'Cédula de ciudadanía' },
      { value: 'ce', label: 'Cédula de extranjería' },
      { value: 'pasaporte', label: 'Pasaporte' },
    ],
    identificationTypePlaceholder: 'Tipo de identificación',
    identificationNumberPlaceholder: 'Número de identificación',
    phonePlaceholder: 'Número de celular',
    breveEnabled: true,
    breveDescription: 'Llave inmediata disponible en Colombia',
    breveKeyPlaceholder: 'Llave Bre-B / Breve',
  },
  MX: {
    code: 'MX',
    name: 'Mexico',
    bankOptions: [
      'BBVA México',
      'Banorte',
      'Santander México',
      'Citibanamex',
      'HSBC México',
      'Scotiabank México',
      'Nu México',
    ],
    bankPlaceholder: 'Selecciona tu banco',
    accountTypes: [
      { value: 'cheques', label: 'Cuenta de cheques' },
      { value: 'debito', label: 'Cuenta de débito' },
    ],
    accountTypePlaceholder: 'Tipo de cuenta',
    accountNumberPlaceholder: 'CLABE o número de cuenta',
    identificationTypes: [
      { value: 'ine', label: 'INE / IFE' },
      { value: 'curp', label: 'CURP' },
      { value: 'pasaporte', label: 'Pasaporte' },
    ],
    identificationTypePlaceholder: 'Tipo de identificación',
    identificationNumberPlaceholder: 'Folio o número de identificación',
    phonePlaceholder: 'Número celular',
    breveEnabled: false,
    breveDescription: 'Not available outside Colombia',
    breveKeyPlaceholder: 'Breve key',
  },
  PE: {
    code: 'PE',
    name: 'Peru',
    bankOptions: ['BCP', 'Interbank', 'BBVA Perú', 'Scotiabank Perú', 'Banco de la Nación'],
    bankPlaceholder: 'Selecciona tu banco',
    accountTypes: [
      { value: 'ahorros', label: 'Cuenta de ahorros' },
      { value: 'corriente', label: 'Cuenta corriente' },
    ],
    accountTypePlaceholder: 'Tipo de cuenta',
    accountNumberPlaceholder: 'Número de cuenta o CCI',
    identificationTypes: [
      { value: 'dni', label: 'DNI' },
      { value: 'ce', label: 'Carné de extranjería' },
      { value: 'pasaporte', label: 'Pasaporte' },
    ],
    identificationTypePlaceholder: 'Tipo de documento',
    identificationNumberPlaceholder: 'Número de documento',
    phonePlaceholder: 'Número de celular',
    breveEnabled: false,
    breveDescription: 'Not available outside Colombia',
    breveKeyPlaceholder: 'Breve key',
  },
  CL: {
    code: 'CL',
    name: 'Chile',
    bankOptions: ['BancoEstado', 'Banco de Chile', 'Santander Chile', 'BCI', 'Scotiabank Chile'],
    bankPlaceholder: 'Selecciona tu banco',
    accountTypes: [
      { value: 'corriente', label: 'Cuenta corriente' },
      { value: 'vista', label: 'Cuenta vista' },
      { value: 'rut', label: 'CuentaRUT' },
    ],
    accountTypePlaceholder: 'Tipo de cuenta',
    accountNumberPlaceholder: 'Número de cuenta o RUT',
    identificationTypes: [
      { value: 'rut', label: 'RUT / Cédula chilena' },
      { value: 'pasaporte', label: 'Pasaporte' },
    ],
    identificationTypePlaceholder: 'Tipo de identificación',
    identificationNumberPlaceholder: 'Número de identificación',
    phonePlaceholder: 'Teléfono',
    breveEnabled: false,
    breveDescription: 'Not available outside Colombia',
    breveKeyPlaceholder: 'Breve key',
  },
  AR: {
    code: 'AR',
    name: 'Argentina',
    bankOptions: ['Banco Nación', 'Santander Argentina', 'Galicia', 'BBVA Argentina', 'Banco Macro'],
    bankPlaceholder: 'Selecciona tu banco',
    accountTypes: [
      { value: 'caja_ahorro', label: 'Caja de ahorro' },
      { value: 'corriente', label: 'Cuenta corriente' },
    ],
    accountTypePlaceholder: 'Tipo de cuenta',
    accountNumberPlaceholder: 'CBU o número de cuenta',
    identificationTypes: [
      { value: 'dni', label: 'DNI' },
      { value: 'cuil', label: 'CUIL' },
      { value: 'cuit', label: 'CUIT' },
      { value: 'pasaporte', label: 'Pasaporte' },
    ],
    identificationTypePlaceholder: 'Tipo de identificación',
    identificationNumberPlaceholder: 'Número de identificación',
    phonePlaceholder: 'Teléfono',
    breveEnabled: false,
    breveDescription: 'Not available outside Colombia',
    breveKeyPlaceholder: 'Breve key',
  },
  US: {
    code: 'US',
    name: 'United States',
    bankOptions: ['Chase', 'Bank of America', 'Wells Fargo', 'Citi', 'Capital One'],
    bankPlaceholder: 'Select your bank',
    accountTypes: [
      { value: 'checking', label: 'Checking account' },
      { value: 'savings', label: 'Savings account' },
    ],
    accountTypePlaceholder: 'Account type',
    accountNumberPlaceholder: 'Account number',
    identificationTypes: [
      { value: 'drivers_license', label: "Driver's license" },
      { value: 'state_id', label: 'State ID' },
      { value: 'passport', label: 'Passport' },
      { value: 'ssn_itin', label: 'SSN / ITIN' },
    ],
    identificationTypePlaceholder: 'Identification type',
    identificationNumberPlaceholder: 'Identification number',
    phonePlaceholder: 'Phone number',
    breveEnabled: false,
    breveDescription: 'Not available outside Colombia',
    breveKeyPlaceholder: 'Breve key',
  },
};

const COUNTRY_ALIASES: Record<string, string> = {
  co: 'CO',
  colombia: 'CO',
  mx: 'MX',
  mexico: 'MX',
  méxico: 'MX',
  pe: 'PE',
  peru: 'PE',
  perú: 'PE',
  cl: 'CL',
  chile: 'CL',
  ar: 'AR',
  argentina: 'AR',
  us: 'US',
  usa: 'US',
  'united states': 'US',
  'estados unidos': 'US',
};

const normalizeCountryKey = (value: string) =>
  value
    .trim()
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase();

export const resolveWithdrawCountryCode = (value: string | null | undefined) => {
  if (!value) return '';
  const trimmed = value.trim();
  if (trimmed.length === 2 && COUNTRY_CONFIGS[trimmed.toUpperCase()]) {
    return trimmed.toUpperCase();
  }

  return COUNTRY_ALIASES[normalizeCountryKey(trimmed)] ?? '';
};

export const getWithdrawCountryConfig = (
  value: string | null | undefined
): WithdrawCountryConfig => {
  const countryCode = resolveWithdrawCountryCode(value);
  return COUNTRY_CONFIGS[countryCode] ?? DEFAULT_CONFIG;
};

