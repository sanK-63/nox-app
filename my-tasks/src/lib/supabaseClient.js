import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://vblsdetkmonwxrzkknki.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZibHNkZXRrb254d3p6a2tua2tpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDYxOTM0NzMsImV4cCI6MjA2MTc2OTQ3M30.sb_publishable_vgjNBw6wxzqlMKNa23eUsg_rXhZwJNp';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);