
-- Temporarily disable RLS on needed tables
ALTER TABLE public.departments DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.employees DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.tasks DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.leaves DISABLE ROW LEVEL SECURITY;

-- Insert departments
INSERT INTO public.departments (name, description) VALUES
  ('IT & Development', 'Software engineering and tech infrastructure'),
  ('Human Resources', 'HR management and employee relations'),
  ('Sales & Marketing', 'Revenue growth and brand management')
ON CONFLICT DO NOTHING;

-- Insert employees
INSERT INTO public.employees (full_name, email, phone, department_id, designation) VALUES
  ('Zain Israr', 'zain@deverse.com', '+92 300 1234567',
    (SELECT id FROM public.departments WHERE name = 'IT & Development' LIMIT 1),
    'Senior Developer | Salary: 150000'),
  ('Sarah Khan', 'sarah@deverse.com', '+92 321 7654321',
    (SELECT id FROM public.departments WHERE name = 'Human Resources' LIMIT 1),
    'HR Manager | Salary: 120000'),
  ('Ahmed Ali', 'ahmed@deverse.com', '+92 333 9876543',
    (SELECT id FROM public.departments WHERE name = 'Sales & Marketing' LIMIT 1),
    'Marketing Executive | Salary: 85000'),
  ('Ayesha Tariq', 'ayesha@deverse.com', '+92 300 1112223',
    (SELECT id FROM public.departments WHERE name = 'IT & Development' LIMIT 1),
    'Frontend Developer | Salary: 100000'),
  ('Bilal Hassan', 'bilal@deverse.com', '+92 311 4445556',
    (SELECT id FROM public.departments WHERE name = 'Sales & Marketing' LIMIT 1),
    'Sales Lead | Salary: 130000');

-- Insert tasks
INSERT INTO public.tasks (title, description, assigned_to, status, due_date) VALUES
  ('Complete Frontend Dashboard', 'Finish the React components for the admin dashboard.',
    (SELECT id FROM public.employees WHERE full_name = 'Zain Israr' LIMIT 1),
    'in_progress', CURRENT_DATE + INTERVAL '2 days'),
  ('Review Q3 Performance', 'Conduct quarterly performance reviews for all team members.',
    (SELECT id FROM public.employees WHERE full_name = 'Sarah Khan' LIMIT 1),
    'pending', CURRENT_DATE + INTERVAL '5 days'),
  ('Launch Social Media Campaign', 'Start the Facebook and Instagram ad campaign for Q3.',
    (SELECT id FROM public.employees WHERE full_name = 'Ahmed Ali' LIMIT 1),
    'pending', CURRENT_DATE + INTERVAL '1 day');

-- Insert leaves
INSERT INTO public.leaves (employee_id, leave_type, start_date, end_date, reason, status) VALUES
  ((SELECT id FROM public.employees WHERE full_name = 'Zain Israr' LIMIT 1),
    'sick', CURRENT_DATE + 10, CURRENT_DATE + 11, 'Medical appointment', 'pending'),
  ((SELECT id FROM public.employees WHERE full_name = 'Ayesha Tariq' LIMIT 1),
    'annual', CURRENT_DATE + 20, CURRENT_DATE + 25, 'Family vacation', 'pending');

-- Re-enable RLS
ALTER TABLE public.departments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.employees ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.leaves ENABLE ROW LEVEL SECURITY;
