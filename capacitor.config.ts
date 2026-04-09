import type { CapacitorConfig } from '@capacitor/cli';

const defaultServerUrl = 'https://investup.onrender.com';
const serverUrl = process.env.CAP_SERVER_URL?.trim() || defaultServerUrl;

const config: CapacitorConfig = {
  appId: 'com.investapp.app',
  appName: 'InvestApp',
  webDir: 'capacitor-shell',
  server: {
    url: serverUrl,
    cleartext: serverUrl.startsWith('http://'),
    allowNavigation: ['investup.onrender.com', 'www.investup.onrender.com'],
  },
};

export default config;
