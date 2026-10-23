import PocketBase from 'pocketbase';

// --- KONFIGURASJON ---
// PocketBase køyrer på 8090 i docker-oppsettet vårt.
// Ved lokal utvikling kan du bruke localhost, men i prod bør det vere domenet ditt.
const PB_URL = import.meta.env.VITE_POCKETBASE_URL || 'http://localhost:8090';

// --- KOBLING ---
export const pb = new PocketBase(PB_URL);
