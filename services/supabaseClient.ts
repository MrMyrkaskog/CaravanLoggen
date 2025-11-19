import { createClient } from '@supabase/supabase-js';

// --- KONFIGURASJON ---

// 1. Din Project ID
const PROJECT_ID = 'rulzpxgwrdhfpvtwmigz';

// 2. Fyll inn din 'anon' Public Key her.
// VIKTIG: Bruk nøkkelen som starter med "ey..." (den ligger ofte under API Keys -> anon / public).
// Dette sikrer at sikkerhetsreglene (RLS) i databasen fungerer som de skal.
const PUBLIC_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJ1bHpweGd3cmRoZnB2dHdtaWd6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjM1MTM1MDcsImV4cCI6MjA3OTA4OTUwN30.3HZtvx21l_DGGIwL7lshmoquJa0D1YJIzH2UHot6J7g';

// --- KOBLING ---

const SUPABASE_URL = `https://${PROJECT_ID}.supabase.co`;

export const supabase = createClient(SUPABASE_URL, PUBLIC_KEY);