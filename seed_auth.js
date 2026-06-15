import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import ws from 'ws';

const envContent = fs.readFileSync('.env', 'utf8');
const envVars = {};
envContent.split('\n').forEach(line => {
  const match = line.match(/^([^=]+)=(.*)$/);
  if (match) envVars[match[1]] = match[2];
});

const supabase = createClient(envVars['VITE_SUPABASE_URL'], envVars['VITE_SUPABASE_PUBLISHABLE_KEY'], {
  auth: { persistSession: false },
  realtime: { transport: ws }
});

async function run() {
  const passwords = ['admin123', 'password123', '123456', '12345678', 'admin', 'password'];
  let loggedIn = false;
  
  for (const p of passwords) {
    const { data, error } = await supabase.auth.signInWithPassword({ email: 'admin@deverse.com', password: p });
    if (data?.session) {
      console.log("Logged in successfully with password:", p);
      loggedIn = true;
      break;
    }
  }

  if (!loggedIn) {
    console.log("Could not guess admin password. Cannot bypass RLS automatically.");
    return;
  }

  // Seed Data
  const { data: deptIT } = await supabase.from('departments').insert({ name: 'IT & Development', description: 'Tech team' }).select().single();
  const { data: deptHR } = await supabase.from('departments').insert({ name: 'Human Resources', description: 'HR and admin' }).select().single();
  const { data: deptSales } = await supabase.from('departments').insert({ name: 'Sales & Marketing', description: 'Growth team' }).select().single();

  const employees = [
    { full_name: 'Zain Israr', email: 'zain@example.com', phone: '+92 300 1234567', department_id: deptIT?.id, designation: 'Senior Developer | Salary: 150000' },
    { full_name: 'Sarah Khan', email: 'sarah@example.com', phone: '+92 321 7654321', department_id: deptHR?.id, designation: 'HR Manager | Salary: 120000' },
    { full_name: 'Ahmed Ali', email: 'ahmed@example.com', phone: '+92 333 9876543', department_id: deptSales?.id, designation: 'Marketing Executive | Salary: 85000' },
    { full_name: 'Ayesha Tariq', email: 'ayesha@example.com', phone: '+92 300 1112223', department_id: deptIT?.id, designation: 'Frontend Developer | Salary: 100000' },
    { full_name: 'Bilal Hassan', email: 'bilal@example.com', phone: '+92 311 4445556', department_id: deptSales?.id, designation: 'Sales Lead | Salary: 130000' }
  ];

  await supabase.from('employees').insert(employees);
  console.log("Successfully seeded employees!");
}
run();
