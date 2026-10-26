import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'in.nbkristieee.nexusverse',
  appName: 'NexusVerse 2K26',
  webDir: 'dist',
  server: {
    androidScheme: 'https',
    cleartext: true,
  },
  plugins: {
    StatusBar: {
      backgroundColor: '#0a0a0d',
      style: 'DARK',
    },
  },
};

export default config;
