import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.EXPO_PUBLIC_SUPABASE_KEY!;

export const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
    detectSessionInUrl: false,
  },
});

export type WashContact = {
  id: string;
  wash_record_id: string;
  customer_name: string;
  customer_type: 'owner' | 'driver';
  phone_number: string;
  created_at: string;
};

export type WashRecord = {
  id: string;
  vehicle_number: string;
  vehicle_type?: string;
  mobile_number: string;
  amount: number;
  payment_status: 'paid' | 'pending';
  created_at: string;
  wash_contacts?: WashContact[];
};
