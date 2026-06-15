import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Read .env file manually
const envPath = path.resolve(__dirname, '.env');
const envContent = fs.readFileSync(envPath, 'utf8');
const envVars = {};
envContent.split('\n').forEach(line => {
  const match = line.match(/^([^=]+)=(.*)$/);
  if (match) {
    envVars[match[1]] = match[2];
  }
});

import ws from 'ws';

const supabaseUrl = envVars['VITE_SUPABASE_URL'];
const supabaseKey = envVars['VITE_SUPABASE_PUBLISHABLE_KEY'];

if (!supabaseUrl || !supabaseKey) {
  console.error("Missing Supabase credentials in .env");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: { persistSession: false },
  realtime: { transport: ws }
});

async function seed() {
  console.log("Seeding started...");

  // 1. Insert Departments
  const { data: deptIT, error: errIT } = await supabase.from('departments').insert({ name: 'IT & Development', description: 'Tech team' }).select().single();
  const { data: deptHR, error: errHR } = await supabase.from('departments').insert({ name: 'Human Resources', description: 'HR and admin' }).select().single();
  const { data: deptSales, error: errSales } = await supabase.from('departments').insert({ name: 'Sales & Marketing', description: 'Growth team' }).select().single();

  if (errIT || errHR || errSales) console.error("Error inserting departments", errIT || errHR || errSales);

  // 2. Insert Employees
  const employees = [
    { full_name: 'Zain Israr', email: 'zain@example.com', phone: '+92 300 1234567', department_id: deptIT?.id, designation: 'Senior Developer | Salary: 150000' },
    { full_name: 'Sarah Khan', email: 'sarah@example.com', phone: '+92 321 7654321', department_id: deptHR?.id, designation: 'HR Manager | Salary: 120000' },
    { full_name: 'Ahmed Ali', email: 'ahmed@example.com', phone: '+92 333 9876543', department_id: deptSales?.id, designation: 'Marketing Executive | Salary: 85000' },
    { full_name: 'Ayesha Tariq', email: 'ayesha@example.com', phone: '+92 300 1112223', department_id: deptIT?.id, designation: 'Frontend Developer | Salary: 100000' },
    { full_name: 'Bilal Hassan', email: 'bilal@example.com', phone: '+92 311 4445556', department_id: deptSales?.id, designation: 'Sales Lead | Salary: 130000' }
  ];

  const { data: empData, error: empErr } = await supabase.from('employees').insert(employees).select();
  if (empErr) {
    console.error("Error inserting employees:", empErr);
    return;
  }
  console.log(`Inserted ${empData.length} employees.`);

  // 3. Insert Tasks
  const tasks = [
    { title: 'Complete Frontend Dashboard', description: 'Finish the React components for dashboard.', assigned_to: empData[0].id, status: 'in_progress', due_date: new Date(Date.now() + 86400000 * 2).toISOString() },
    { title: 'Review Q3 Performance', description: 'Conduct performance reviews.', assigned_to: empData[1].id, status: 'pending', due_date: new Date(Date.now() + 86400000 * 5).toISOString() },
    { title: 'Launch Ad Campaign', description: 'Start the Facebook ad campaign.', assigned_to: empData[2].id, status: 'pending', due_date: new Date(Date.now() + 86400000 * 1).toISOString() },
    { title: 'Fix Bug #402', description: 'Fix the UI glitch on mobile.', assigned_to: empData[3].id, status: 'completed', due_date: new Date(Date.now() - 86400000 * 1).toISOString() }
  ];

  const { data: taskData, error: taskErr } = await supabase.from('tasks').insert(tasks).select();
  if (taskErr) console.error("Error inserting tasks:", taskErr);
  else console.log(`Inserted ${taskData.length} tasks.`);

  // 4. Insert Leaves
  const leaves = [
    { employee_id: empData[0].id, leave_type: 'sick', start_date: new Date(Date.now() + 86400000 * 10).toISOString().split('T')[0], end_date: new Date(Date.now() + 86400000 * 11).toISOString().split('T')[0], reason: 'Medical appointment', status: 'pending' },
    { employee_id: empData[3].id, leave_type: 'annual', start_date: new Date(Date.now() + 86400000 * 20).toISOString().split('T')[0], end_date: new Date(Date.now() + 86400000 * 25).toISOString().split('T')[0], reason: 'Family vacation', status: 'approved' },
    { employee_id: empData[4].id, leave_type: 'casual', start_date: new Date(Date.now() + 86400000 * 5).toISOString().split('T')[0], end_date: new Date(Date.now() + 86400000 * 5).toISOString().split('T')[0], reason: 'Personal work', status: 'pending' }
  ];

  const { data: leaveData, error: leaveErr } = await supabase.from('leaves').insert(leaves).select();
  if (leaveErr) console.error("Error inserting leaves:", leaveErr);
  else console.log(`Inserted ${leaveData.length} leave requests.`);

  console.log("Seeding complete! Check your dashboard now.");
}

seed();
