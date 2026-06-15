import { createClient } from '@supabase/supabase-js';
import type { Database } from './types';

// Standard Pakistani employee definitions with PKR salaries inside their designations
const INITIAL_EMPLOYEES = [
  { id: 'emp-ali', full_name: 'Muhammad Ali', email: 'ali@deverse.com', phone: '0300-1234567', designation: 'Software Architect | Salary: 380000', department_id: 'dept-eng', employee_code: 'EMP-1001', join_date: '2024-01-15' },
  { id: 'emp-fatima', full_name: 'Fatima Zahra', email: 'fatima@deverse.com', phone: '0312-9876543', designation: 'Lead Product Manager | Salary: 290000', department_id: 'dept-prod', employee_code: 'EMP-1002', join_date: '2024-02-10' },
  { id: 'emp-zainab', full_name: 'Zainab Bibi', email: 'zainab@deverse.com', phone: '0333-1122334', designation: 'Senior Frontend Engineer | Salary: 195000', department_id: 'dept-eng', employee_code: 'EMP-1003', join_date: '2024-03-01' },
  { id: 'emp-bilal', full_name: 'Bilal Ahmed', email: 'bilal@deverse.com', phone: '0321-4455667', designation: 'DevOps Specialist | Salary: 220000', department_id: 'dept-eng', employee_code: 'EMP-1004', join_date: '2024-01-20' },
  { id: 'emp-ayesha', full_name: 'Ayesha Khan', email: 'ayesha@deverse.com', phone: '0345-8899001', designation: 'UX Researcher | Salary: 140000', department_id: 'dept-design', employee_code: 'EMP-1005', join_date: '2024-04-12' },
  { id: 'emp-usman', full_name: 'Usman Ghani', email: 'usman@deverse.com', phone: '0302-2233445', designation: 'Senior QA Automation | Salary: 160000', department_id: 'dept-qa', employee_code: 'EMP-1006', join_date: '2024-02-15' },
  { id: 'emp-hamza', full_name: 'Hamza Mughal', email: 'hamza@deverse.com', phone: '0315-5566778', designation: 'Mobile App Developer | Salary: 180000', department_id: 'dept-eng', employee_code: 'EMP-1007', join_date: '2024-03-15' },
  { id: 'emp-sana', full_name: 'Sana Malik', email: 'sana@deverse.com', phone: '0334-9988776', designation: 'HR Specialist | Salary: 125000', department_id: 'dept-hr', employee_code: 'EMP-1008', join_date: '2024-01-05' },
  { id: 'emp-saad', full_name: 'Saad Siddiqui', email: 'saad@deverse.com', phone: '0320-3344556', designation: 'Data Scientist | Salary: 260000', department_id: 'dept-eng', employee_code: 'EMP-1009', join_date: '2024-05-01' },
  { id: 'emp-mariam', full_name: 'Mariam Yousuf', email: 'mariam@deverse.com', phone: '0301-7788990', designation: 'UI Designer | Salary: 135000', department_id: 'dept-design', employee_code: 'EMP-1010', join_date: '2024-04-20' },
  { id: 'emp-zafar', full_name: 'Zafar Iqbal', email: 'zafar@deverse.com', phone: '0310-1237890', designation: 'Director of Engineering | Salary: 450000', department_id: 'dept-eng', employee_code: 'EMP-1011', join_date: '2023-06-15' },
  { id: 'emp-hina', full_name: 'Hina Fayyaz', email: 'hina@deverse.com', phone: '0300-9871234', designation: 'Recruitment Specialist | Salary: 110000', department_id: 'dept-hr', employee_code: 'EMP-1012', join_date: '2024-02-01' },
  { id: 'emp-bsaeed', full_name: 'Bilal Saeed', email: 'bsaeed@deverse.com', phone: '0322-1112223', designation: 'Systems Analyst | Salary: 155000', department_id: 'dept-eng', employee_code: 'EMP-1013', join_date: '2024-03-10' },
  { id: 'emp-nadia', full_name: 'Nadia Jameel', email: 'nadia@deverse.com', phone: '0340-3334445', designation: 'Technical Writer | Salary: 95000', department_id: 'dept-eng', employee_code: 'EMP-1014', join_date: '2024-05-15' },
  { id: 'emp-faisal', full_name: 'Faisal Shah', email: 'faisal@deverse.com', phone: '0331-5556667', designation: 'Security Engineer | Salary: 240000', department_id: 'dept-eng', employee_code: 'EMP-1015', join_date: '2024-04-01' },
  { id: 'emp-kiran', full_name: 'Kiran Shehzadi', email: 'kiran@deverse.com', phone: '0306-7778889', designation: 'Backend Developer | Salary: 150000', department_id: 'dept-eng', employee_code: 'EMP-1016', join_date: '2024-02-28' },
  { id: 'emp-haris', full_name: 'Haris Raza', email: 'haris@deverse.com', phone: '0313-9990001', designation: 'Fullstack Developer | Salary: 175000', department_id: 'dept-eng', employee_code: 'EMP-1017', join_date: '2024-03-20' },
  { id: 'emp-rubab', full_name: 'Rubab Fatima', email: 'rubab@deverse.com', phone: '0335-2223334', designation: 'Content Strategist | Salary: 115000', department_id: 'dept-design', employee_code: 'EMP-1018', join_date: '2024-05-10' },
  { id: 'emp-adil', full_name: 'Adil Rasheed', email: 'adil@deverse.com', phone: '0324-4445556', designation: 'Database Administrator | Salary: 210000', department_id: 'dept-eng', employee_code: 'EMP-1019', join_date: '2024-04-10' },
  { id: 'emp-asma', full_name: 'Asma Tariq', email: 'asma@deverse.com', phone: '0300-8889990', designation: 'Business Analyst | Salary: 130000', department_id: 'dept-prod', employee_code: 'EMP-1020', join_date: '2024-03-05' }
];

const INITIAL_DEPARTMENTS = [
  { id: 'dept-eng', name: 'Engineering', description: 'Software engineering and IT operations' },
  { id: 'dept-prod', name: 'Product Management', description: 'Product strategy and roadmap' },
  { id: 'dept-qa', name: 'Quality Assurance', description: 'Testing and quality control' },
  { id: 'dept-hr', name: 'HR & Operations', description: 'Talent management and office ops' },
  { id: 'dept-design', name: 'Creative Design', description: 'UI/UX and visual design' }
];

const INITIAL_PROFILES = [
  { id: '8c553a00-f75d-471b-bb53-dff8459083e9', email: 'admin@deverse.com', full_name: 'Super Admin', status: 'approved', password: 'admin123' }
];

const INITIAL_ROLES = [
  { id: 'role-admin', user_id: '8c553a00-f75d-471b-bb53-dff8459083e9', role: 'admin' }
];

// Initialize local storage databases if not already present
const initStorage = () => {
  // Reset condition: if old testadmin exists or multiple profiles exist, clear them
  const profilesRaw = localStorage.getItem('mock_profiles');
  if (profilesRaw) {
    const parsed = JSON.parse(profilesRaw);
    const hasTestAdmin = parsed.some((p: any) => p.email === 'testadmin@deverse.com');
    const hasEmployeeProfiles = parsed.length > 1; // Since only super admin should exist initially
    if (hasTestAdmin || hasEmployeeProfiles) {
      localStorage.removeItem('mock_profiles');
      localStorage.removeItem('mock_user_roles');
      localStorage.removeItem('mock_session');
    }
  }

  if (!localStorage.getItem('mock_employees')) {
    const empsWithUserId = INITIAL_EMPLOYEES.map(emp => ({
      ...emp,
      user_id: emp.id
    }));
    localStorage.setItem('mock_employees', JSON.stringify(empsWithUserId));
  } else {
    // Migration: ensure user_id exists on all employees
    const existing = localStorage.getItem('mock_employees');
    if (existing) {
      const parsed = JSON.parse(existing);
      if (parsed.length > 0 && !parsed[0].hasOwnProperty('user_id')) {
        const migrated = parsed.map((emp: any) => ({
          ...emp,
          user_id: emp.user_id || emp.id
        }));
        localStorage.setItem('mock_employees', JSON.stringify(migrated));
      }
    }
  }

  if (!localStorage.getItem('mock_departments')) localStorage.setItem('mock_departments', JSON.stringify(INITIAL_DEPARTMENTS));

  if (!localStorage.getItem('mock_profiles')) {
    const profiles = [
      { id: '8c553a00-f75d-471b-bb53-dff8459083e9', email: 'admin@deverse.com', full_name: 'Super Admin', status: 'approved', password: 'admin123', created_at: new Date().toISOString() }
    ];
    localStorage.setItem('mock_profiles', JSON.stringify(profiles));
  }

  if (!localStorage.getItem('mock_user_roles')) {
    const roles = [
      { id: 'role-admin', user_id: '8c553a00-f75d-471b-bb53-dff8459083e9', role: 'admin' }
    ];
    localStorage.setItem('mock_user_roles', JSON.stringify(roles));
  }

  if (!localStorage.getItem('mock_attendance')) {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = yesterday.toISOString().split('T')[0];
    const todayStr = new Date().toISOString().split('T')[0];

    const attLogs = INITIAL_EMPLOYEES.flatMap(emp => [
      {
        id: `att-yesterday-${emp.id}`,
        employee_id: emp.id,
        date: yesterdayStr,
        status: 'present',
        check_in: `${yesterdayStr}T09:05:00Z`,
        check_out: `${yesterdayStr}T17:00:00Z`,
        working_hours: 7.92
      },
      {
        id: `att-today-${emp.id}`,
        employee_id: emp.id,
        date: todayStr,
        status: Math.random() > 0.15 ? 'present' : 'late',
        check_in: `${todayStr}T09:05:00Z`,
        check_out: `${todayStr}T17:00:00Z`,
        working_hours: 8.00
      }
    ]);
    localStorage.setItem('mock_attendance', JSON.stringify(attLogs));
  }
  if (!localStorage.getItem('mock_leaves')) {
    const leaves = [
      { id: 'leave-1', employee_id: 'emp-ayesha', leave_type: 'sick', start_date: '2026-06-12', end_date: '2026-06-13', reason: 'Fever and cold', status: 'approved', reviewed_by: '8c553a00-f75d-471b-bb53-dff8459083e9', reviewed_at: new Date().toISOString() },
      { id: 'leave-2', employee_id: 'emp-haris', leave_type: 'casual', start_date: '2026-06-20', end_date: '2026-06-21', reason: 'Family event', status: 'pending', reviewed_by: null, reviewed_at: null }
    ];
    localStorage.setItem('mock_leaves', JSON.stringify(leaves));
  }
  if (!localStorage.getItem('mock_payroll')) localStorage.setItem('mock_payroll', JSON.stringify([]));
  if (!localStorage.getItem('mock_tasks')) localStorage.setItem('mock_tasks', JSON.stringify([]));
  if (!localStorage.getItem('mock_jobs')) {
    const jobs = [
      { id: "job-1", title: "Senior Fullstack Engineer", description: "Build scalable React & Node web apps.", required_skills: ["React", "Node.js", "TypeScript"], preferred_skills: ["Docker", "GraphQL"], experience_required: 5, minimum_education: "Bachelor's", status: "open", department_id: "dept-eng" },
      { id: "job-2", title: "AI Researcher", description: "Design generative NLP and vision models.", required_skills: ["Python", "PyTorch", "NLP"], preferred_skills: ["CUDA", "Transformers"], experience_required: 3, minimum_education: "Master's", status: "open", department_id: "dept-eng" }
    ];
    localStorage.setItem('mock_jobs', JSON.stringify(jobs));
  }
  if (!localStorage.getItem('mock_candidates')) {
    const candidates = [
      { id: "cand-1", name: "Aaliyah Shah", email: "aaliyah@example.com", cv_url: "#", created_at: new Date().toISOString() },
      { id: "cand-2", name: "Zarrar Khan", email: "zarrar@example.com", cv_url: "#", created_at: new Date().toISOString() }
    ];
    localStorage.setItem('mock_candidates', JSON.stringify(candidates));
  }
  if (!localStorage.getItem('mock_applications')) {
    const applications = [
      {
        id: "app-1",
        candidate_id: "cand-1",
        job_id: "job-1",
        status: "applied",
        match_score: 95,
        parsed_data: { skills: ["React", "Node.js", "TypeScript", "Docker"], experience_years: 6, education: "Bachelor's in CS", projects: ["E-Commerce Platform"] },
        ai_evaluation: {
          evaluation_metadata: { candidate_name: "Aaliyah Shah", contact_email: "aaliyah@example.com" },
          admin_criteria_audit: { education_rule_passed: true, experience_rule_passed: true, mandatory_skills_matched: ["React", "Node.js", "TypeScript"], mandatory_skills_missing: [], preferred_skills_matched: ["Docker"] },
          automation_trigger: { final_decision: "ACCEPT", match_confidence_score: 100.0 },
          system_log_justification: "Candidate meets the Bachelor's degree requirement, has 6 years of experience, and matches 100% of required skills."
        },
        created_at: new Date().toISOString()
      },
      {
        id: "app-2",
        candidate_id: "cand-2",
        job_id: "job-2",
        status: "applied",
        match_score: 40,
        parsed_data: { skills: ["Python", "TensorFlow"], experience_years: 2, education: "Bachelor's in Mathematics", projects: ["Data Analysis Tool"] },
        ai_evaluation: {
          evaluation_metadata: { candidate_name: "Zarrar Khan", contact_email: "zarrar@example.com" },
          admin_criteria_audit: { education_rule_passed: false, experience_rule_passed: false, mandatory_skills_matched: ["Python"], mandatory_skills_missing: ["PyTorch", "NLP"], preferred_skills_matched: [] },
          automation_trigger: { final_decision: "REJECT", match_confidence_score: 33.3 },
          system_log_justification: "Candidate does not meet the Master's degree or 3 years experience, and is missing mandatory skills: PyTorch, NLP."
        },
        created_at: new Date().toISOString()
      }
    ];
    localStorage.setItem('mock_applications', JSON.stringify(applications));
  }
};

initStorage();

class MockQueryBuilder {
  private table: string;
  private filters: Array<(item: any) => boolean> = [];
  private action: 'select' | 'insert' | 'update' | 'delete' = 'select';
  private actionData: any = null;
  private limitNum: number | null = null;
  private orderField: string | null = null;
  private orderAsc: boolean = true;

  constructor(table: string) {
    this.table = table;
  }

  select(fields?: string) {
    this.action = 'select';
    return this;
  }

  insert(data: any) {
    this.action = 'insert';
    this.actionData = data;
    return this;
  }

  update(data: any) {
    this.action = 'update';
    this.actionData = data;
    return this;
  }

  delete() {
    this.action = 'delete';
    return this;
  }

  eq(field: string, value: any) {
    this.filters.push(item => item[field] === value);
    return this;
  }

  in(field: string, values: any[]) {
    this.filters.push(item => values.includes(item[field]));
    return this;
  }

  lte(field: string, value: any) {
    this.filters.push(item => item[field] <= value);
    return this;
  }

  gte(field: string, value: any) {
    this.filters.push(item => item[field] >= value);
    return this;
  }

  order(field: string, options?: { ascending: boolean }) {
    this.orderField = field;
    this.orderAsc = options?.ascending ?? true;
    return this;
  }

  limit(num: number) {
    this.limitNum = num;
    return this;
  }

  async execute() {
    const tableData = JSON.parse(localStorage.getItem(`mock_${this.table}`) || "[]");

    if (this.action === 'insert') {
      const rows = Array.isArray(this.actionData) ? this.actionData : [this.actionData];
      const newRows = rows.map(r => ({
        id: r.id || Math.random().toString(36).substring(2, 11),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        ...r
      }));
      localStorage.setItem(`mock_${this.table}`, JSON.stringify([...tableData, ...newRows]));

      // Simulated applicant webhook callback for LinkedIn
      if (this.table === 'jobs') {
        newRows.forEach(job => {
          if (job.posted_to_linkedin) {
            console.log(`Scheduling simulated LinkedIn candidate webhook for job: ${job.title}`);
            setTimeout(() => {
              const candidates = JSON.parse(localStorage.getItem("mock_candidates") || "[]");
              const candId = `cand-linkedin-${Math.random().toString(36).substring(2, 11)}`;
              
              const firstNames = ["Ayesha", "Bilal", "Faisal", "Hamza", "Hina", "Sana", "Zainab", "Ali"];
              const lastNames = ["Iqbal", "Saeed", "Mughal", "Ahmed", "Khan", "Bibi", "Malik", "Shah"];
              const randomName = `${firstNames[Math.floor(Math.random() * firstNames.length)]} ${lastNames[Math.floor(Math.random() * lastNames.length)]}`;
              const randomEmail = `${randomName.toLowerCase().replace(' ', '.')}@linkedin-apply.com`;

              const newCand = { 
                id: candId, 
                name: randomName, 
                email: randomEmail, 
                cv_url: "#", 
                created_at: new Date().toISOString() 
              };
              candidates.push(newCand);
              localStorage.setItem("mock_candidates", JSON.stringify(candidates));

              const apps = JSON.parse(localStorage.getItem("mock_applications") || "[]");
              const reqSkills = job.required_skills || [];
              const prefSkills = job.preferred_skills || [];
              const minExp = job.experience_required || 0;
              const minEd = job.minimum_education || "Bachelor's";

              const experience = minExp + 1;
              const education = minEd + " in Computer Science";
              const matchScore = 100; // Perfect match

              const newApp = {
                id: `app-linkedin-${Math.random().toString(36).substring(2, 11)}`,
                candidate_id: candId,
                job_id: job.id,
                status: "applied",
                source: "LinkedIn",
                match_score: matchScore,
                parsed_data: { 
                  skills: [...reqSkills, ...prefSkills], 
                  experience_years: experience, 
                  education: education, 
                  projects: ["LinkedIn Profile Automation System"] 
                },
                ai_evaluation: {
                  evaluation_metadata: {
                    candidate_name: randomName,
                    contact_email: randomEmail
                  },
                  admin_criteria_audit: {
                    education_rule_passed: true,
                    experience_rule_passed: true,
                    mandatory_skills_matched: reqSkills,
                    mandatory_skills_missing: [],
                    preferred_skills_matched: prefSkills
                  },
                  automation_trigger: {
                    final_decision: "ACCEPT",
                    match_confidence_score: matchScore
                  },
                  system_log_justification: `Automated match successful. Candidate applied via LinkedIn, meets experience threshold of ${minExp} years, holds required ${minEd} degree, and matches 100% of required skills.`
                },
                created_at: new Date().toISOString()
              };
              apps.push(newApp);
              localStorage.setItem("mock_applications", JSON.stringify(apps));
              console.log(`Simulated LinkedIn candidate ${randomName} applied!`);
            }, 3000);
          }
        });
      }

      return { data: Array.isArray(this.actionData) ? newRows : newRows[0], error: null };
    }

    if (this.action === 'update') {
      const updated = tableData.map((item: any) => {
        const matches = this.filters.every(filter => filter(item));
        if (matches) {
          return { ...item, ...this.actionData, updated_at: new Date().toISOString() };
        }
        return item;
      });
      localStorage.setItem(`mock_${this.table}`, JSON.stringify(updated));
      const matchingItems = updated.filter((item: any) => this.filters.every(filter => filter(item)));
      return { data: matchingItems, error: null };
    }

    if (this.action === 'delete') {
      const remaining = tableData.filter((item: any) => {
        const matches = this.filters.every(filter => filter(item));
        return !matches;
      });
      localStorage.setItem(`mock_${this.table}`, JSON.stringify(remaining));
      return { data: null, error: null };
    }

    // Default: 'select'
    let resultData = [...tableData];
    
    if (this.filters.length > 0) {
      resultData = resultData.filter(item => this.filters.every(filter => filter(item)));
    }

    if (this.orderField) {
      resultData.sort((a, b) => {
        const valA = a[this.orderField!];
        const valB = b[this.orderField!];
        if (valA < valB) return this.orderAsc ? -1 : 1;
        if (valA > valB) return this.orderAsc ? 1 : -1;
        return 0;
      });
    }

    if (this.limitNum !== null) {
      resultData = resultData.slice(0, this.limitNum);
    }

    // Resolve relationships
    const emps = JSON.parse(localStorage.getItem('mock_employees') || '[]');
    const depts = JSON.parse(localStorage.getItem('mock_departments') || '[]');

    resultData = resultData.map(row => {
      const copy = { ...row };
      if (this.table === 'employees') {
        const d = depts.find((dept: any) => dept.id === copy.department_id);
        copy.departments = d ? { name: d.name } : null;
      }
      if (this.table === 'payroll' || this.table === 'attendance' || this.table === 'leaves' || this.table === 'tasks') {
        const e = emps.find((emp: any) => emp.id === copy.employee_id || emp.id === copy.assigned_to);
        copy.employees = e ? { full_name: e.full_name, employee_code: e.employee_code } : null;
      }
      if (copy.job_id || copy.candidate_id) {
        const jobs = JSON.parse(localStorage.getItem('mock_jobs') || '[]');
        const candidates = JSON.parse(localStorage.getItem('mock_candidates') || '[]');
        const j = jobs.find((job: any) => job.id === copy.job_id);
        const c = candidates.find((cand: any) => cand.id === copy.candidate_id);
        if (j) {
          copy.jobs = { 
            title: j.title, 
            required_skills: j.required_skills,
            preferred_skills: j.preferred_skills,
            minimum_education: j.minimum_education,
            experience_required: j.experience_required
          };
        }
        if (c) {
          copy.candidates = { name: c.name, email: c.email, cv_url: c.cv_url };
        }
      }
      return copy;
    });

    return { data: resultData, error: null };
  }

  // Promise support
  then(onfulfilled?: (value: any) => any) {
    return this.execute().then(onfulfilled);
  }

  async maybeSingle() {
    const { data, error } = await this.execute();
    return { data: data ? data[0] || null : null, error };
  }

  async single() {
    const { data, error } = await this.execute();
    const row = data ? data[0] : null;
    return { data: row || null, error: row ? null : { message: "Row not found" } };
  }
}

const mockAuth = {
  onAuthStateChange: (callback: any) => {
    const session = JSON.parse(localStorage.getItem("mock_session") || "null");
    setTimeout(() => callback(session ? "SIGNED_IN" : "SIGNED_OUT", session), 50);
    return { data: { subscription: { unsubscribe: () => {} } } };
  },
  getSession: async () => {
    const session = JSON.parse(localStorage.getItem("mock_session") || "null");
    return { data: { session }, error: null };
  },
  signInWithPassword: async ({ email, password }: any) => {
    const profiles = JSON.parse(localStorage.getItem("mock_profiles") || "[]");
    const profile = profiles.find((p: any) => p.email.toLowerCase() === email.toLowerCase());
    
    if (!profile) {
      return { data: null, error: { message: "Invalid login credentials (user not found)" } };
    }
    
    // Check password if it is stored in the profile
    if (profile.password && profile.password !== password) {
      return { data: null, error: { message: "Invalid password" } };
    }
    
    if (profile.status === "rejected") {
      return { data: null, error: { message: "Your account request was rejected by admin." } };
    }
    
    const session = { 
      access_token: `mock_token_${profile.id}`, 
      user: { 
        id: profile.id, 
        email: profile.email, 
        raw_user_meta_data: { full_name: profile.full_name } 
      } 
    };
    localStorage.setItem("mock_session", JSON.stringify(session));
    return { data: { session }, error: null };
  },
  signUp: async ({ email, password, options }: any) => {
    const profiles = JSON.parse(localStorage.getItem("mock_profiles") || "[]");
    const roles = JSON.parse(localStorage.getItem("mock_user_roles") || "[]");
    const emps = JSON.parse(localStorage.getItem("mock_employees") || "[]");
    
    const existing = profiles.find((p: any) => p.email.toLowerCase() === email.toLowerCase());
    if (existing) {
      return { data: null, error: { message: "User with this email already exists" } };
    }

    const userId = "user-" + Math.random().toString(36).substring(2, 11);
    const fullName = options?.data?.full_name || email.split("@")[0];
    
    const newProfile = {
      id: userId,
      email: email,
      full_name: fullName,
      status: 'pending',
      password: password, // Store entered password
      created_at: new Date().toISOString()
    };
    
    const newRole = {
      id: `role-${userId}`,
      user_id: userId,
      role: 'employee'
    };
    
    const newEmp = {
      id: `emp-${userId}`,
      user_id: userId,
      full_name: fullName,
      email: email,
      phone: '',
      designation: 'Staff | Salary: 50000',
      department_id: null,
      employee_code: `EMP-${Math.floor(1000 + Math.random() * 9000)}`,
      join_date: new Date().toISOString().split("T")[0]
    };
    
    localStorage.setItem("mock_profiles", JSON.stringify([...profiles, newProfile]));
    localStorage.setItem("mock_user_roles", JSON.stringify([...roles, newRole]));
    localStorage.setItem("mock_employees", JSON.stringify([...emps, newEmp]));

    return { data: { user: { id: userId, email } }, error: null };
  },
  signOut: async () => {
    localStorage.removeItem("mock_session");
    window.location.reload();
    return { error: null };
  }
};

export const supabase = {
  auth: mockAuth,
  from: (table: string) => {
    return new MockQueryBuilder(table);
  },
  rpc: async (name: string, args: any) => {
    console.log(`Mock RPC Call: ${name}`, args);
    const emps = JSON.parse(localStorage.getItem("mock_employees") || "[]");
    
    if (name === "update_application_status") {
      const { p_application_id, p_status } = args;
      const apps = JSON.parse(localStorage.getItem("mock_applications") || "[]");
      const app = apps.find((a: any) => a.id === p_application_id);
      if (!app) return { data: { success: false, error: "Application not found" }, error: null };
      
      app.status = p_status;
      
      let employeeCreated = false;
      if (p_status === "hired") {
        const candidates = JSON.parse(localStorage.getItem("mock_candidates") || "[]");
        const cand = candidates.find((c: any) => c.id === app.candidate_id);
        if (cand) {
          const existingEmp = emps.find((e: any) => e.email.toLowerCase() === cand.email.toLowerCase());
          if (!existingEmp) {
            const newEmp = {
              id: `emp-${cand.id}`,
              user_id: cand.id,
              full_name: cand.name,
              email: cand.email,
              phone: "",
              designation: "Software Engineer | Salary: 150000",
              department_id: null,
              employee_code: `EMP-${Math.floor(1000 + Math.random() * 9000)}`,
              join_date: new Date().toISOString().split("T")[0]
            };
            emps.push(newEmp);
            localStorage.setItem("mock_employees", JSON.stringify(emps));
            employeeCreated = true;
          }
        }
      }
      
      if (p_status === "rejected") {
        const remaining = apps.filter((a: any) => a.id !== p_application_id);
        localStorage.setItem("mock_applications", JSON.stringify(remaining));
      } else {
        localStorage.setItem("mock_applications", JSON.stringify(apps));
      }
      
      return { data: { success: true, employee_created: employeeCreated }, error: null };
    }
    
    if (name === "delete_job") {
      const { p_job_id } = args;
      const jobs = JSON.parse(localStorage.getItem("mock_jobs") || "[]");
      localStorage.setItem("mock_jobs", JSON.stringify(jobs.filter((j: any) => j.id !== p_job_id)));
      const apps = JSON.parse(localStorage.getItem("mock_applications") || "[]");
      localStorage.setItem("mock_applications", JSON.stringify(apps.filter((a: any) => a.job_id !== p_job_id)));
      return { data: { success: true }, error: null };
    }
    
    if (name === "submit_application") {
      const { p_name, p_email, p_cv_url, p_job_id, p_parsed_data, p_match_score, p_ai_evaluation } = args;
      const candidates = JSON.parse(localStorage.getItem("mock_candidates") || "[]");
      const candId = `cand-${Math.random().toString(36).substring(2, 11)}`;
      const newCand = { id: candId, name: p_name, email: p_email, cv_url: p_cv_url, created_at: new Date().toISOString() };
      candidates.push(newCand);
      localStorage.setItem("mock_candidates", JSON.stringify(candidates));
      
      const apps = JSON.parse(localStorage.getItem("mock_applications") || "[]");
      const newApp = {
        id: `app-${Math.random().toString(36).substring(2, 11)}`,
        candidate_id: candId,
        job_id: p_job_id,
        parsed_data: p_parsed_data,
        match_score: p_match_score,
        ai_evaluation: p_ai_evaluation,
        status: "applied",
        created_at: new Date().toISOString()
      };
      apps.push(newApp);
      localStorage.setItem("mock_applications", JSON.stringify(apps));
      return { data: { success: true }, error: null };
    }
    
    return { data: null, error: { message: `Function ${name} not implemented` } };
  },
  functions: {
    invoke: async (name: string, options?: { body: any }) => {
      console.log(`Mock Function Call: ${name}`, options);
      if (name === "process-cv") {
        const { jobData } = options?.body || {};
        
        // Mock candidate evaluations matching constraints
        const isReject = Math.random() > 0.45;
        
        const reqSkills = jobData?.required_skills || [];
        const prefSkills = jobData?.preferred_skills || [];
        const minExp = jobData?.experience_required || 0;
        const minEd = jobData?.minimum_education || "Bachelor's";
        
        const matchedReq = isReject ? reqSkills.slice(0, Math.max(0, reqSkills.length - 1)) : reqSkills;
        const missingReq = isReject ? [reqSkills[reqSkills.length - 1] || "Required Skill"] : [];
        const matchedPref = prefSkills.slice(0, Math.ceil(prefSkills.length / 2));
        
        const experience = isReject ? Math.max(0, minExp - 1) : minExp + 2;
        const education = isReject ? "High School" : minEd;
        
        const decision = (!isReject && missingReq.length === 0) ? "ACCEPT" : "REJECT";
        
        // calculate compliance percentage with total mandatory criteria
        const totalMandatoryCount = reqSkills.length + 2; // Skills + Education + Experience
        let metCount = matchedReq.length;
        if (!isReject) {
          metCount += 2;
        } else {
          if (education !== "High School") metCount += 1;
          if (experience >= minExp) metCount += 1;
        }
        const matchScore = Math.round((metCount / totalMandatoryCount) * 100);
        
        const mockResult = {
          name: "Candidate " + Math.floor(100 + Math.random() * 900),
          skills: [...matchedReq, ...matchedPref],
          experience_years: experience,
          education: education + " in Systems Engineering",
          projects: ["Automated Pipeline Project"],
          score: matchScore,
          insights: {
            evaluation_metadata: {
              candidate_name: "Mock Candidate",
              contact_email: "candidate@example.com"
            },
            admin_criteria_audit: {
              education_rule_passed: !isReject,
              experience_rule_passed: !isReject,
              mandatory_skills_matched: matchedReq,
              mandatory_skills_missing: missingReq,
              preferred_skills_matched: matchedPref
            },
            automation_trigger: {
              final_decision: decision,
              match_confidence_score: matchScore
            },
            system_log_justification: decision === "ACCEPT" 
              ? `Candidate holds the required ${minEd} degree, meets the minimum experience of ${minExp} years, and matches 100% of required skills.`
              : `Candidate is rejected because they failed to meet education/experience thresholds or are missing mandatory skills: ${missingReq.join(', ')}.`
          }
        };
        
        return { data: mockResult, error: null };
      }
      return { data: null, error: { message: "Function not found" } };
    }
  }
} as any;