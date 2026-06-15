import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import PageHeader from "@/components/PageHeader";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Users, Calendar, Briefcase, CheckSquare, Clock, DollarSign } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { parseDesignation } from "./admin/Employees";

function Stat({ label, value, icon: Icon, accent }: any) {
  return (
    <Card className="p-5 shadow-card">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-muted-foreground">{label}</p>
          <p className="text-2xl font-bold mt-1">{value}</p>
        </div>
        <div className={`h-10 w-10 rounded-lg flex items-center justify-center ${accent}`}>
          <Icon className="h-5 w-5" />
        </div>
      </div>
    </Card>
  );
}

export default function Dashboard() {
  const { role, user } = useAuth();

  const { data: stats } = useQuery({
    queryKey: ["dash", role, user?.id],
    queryFn: async () => {
      if (role === "admin") {
        const [emp, leaves, tasks, pending, empList] = await Promise.all([
          supabase.from("employees").select("id", { count: "exact", head: true }),
          supabase.from("leaves").select("id", { count: "exact", head: true }).eq("status", "pending"),
          supabase.from("tasks").select("id", { count: "exact", head: true }).neq("status", "completed"),
          supabase.from("profiles").select("id", { count: "exact", head: true }).eq("status", "pending"),
          supabase.from("employees").select("*, departments(name)").order("created_at", { ascending: false }).limit(5)
        ]);
        
        if (emp.error) console.error("Employees Error:", emp.error);
        if (leaves.error) console.error("Leaves Error:", leaves.error);
        if (tasks.error) console.error("Tasks Error:", tasks.error);
        if (pending.error) console.error("Profiles Error:", pending.error);

        return { 
          employees: emp.count ?? 0, 
          leaves: leaves.count ?? 0, 
          tasks: tasks.count ?? 0, 
          pending: pending.count ?? 0,
          employeesList: empList?.data ?? [] 
        };
      }
      const { data: emp, error: empErr } = await supabase.from("employees").select("id").eq("user_id", user!.id).maybeSingle();
      if (empErr) console.error("Employee fetch error:", empErr);
      if (!emp) return { tasks: 0, leaves: 0, attendance: 0 };
      
      const [tasks, leaves, att] = await Promise.all([
        supabase.from("tasks").select("id", { count: "exact", head: true }).eq("assigned_to", emp.id).neq("status", "completed"),
        supabase.from("leaves").select("id", { count: "exact", head: true }).eq("employee_id", emp.id).eq("status", "pending"),
        supabase.from("attendance").select("id", { count: "exact", head: true }).eq("employee_id", emp.id),
      ]);
      
      if (tasks.error) console.error("Employee Tasks Error:", tasks.error);
      if (leaves.error) console.error("Employee Leaves Error:", leaves.error);
      if (att.error) console.error("Employee Attendance Error:", att.error);

      return { tasks: tasks.count ?? 0, leaves: leaves.count ?? 0, attendance: att.count ?? 0 };
    },
  });

  return (
    <div>
      <PageHeader
        title={role === "admin" ? "Admin Dashboard" : "My Dashboard"}
        description={role === "admin" ? "Organization overview" : "Your activity at a glance"}
      />
      {role === "admin" ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Stat label="Employees" value={stats?.employees ?? 0} icon={Users} accent="bg-primary/10 text-primary" />
          <Stat label="Pending leaves" value={stats?.leaves ?? 0} icon={Briefcase} accent="bg-warning/10 text-warning" />
          <Stat label="Active tasks" value={stats?.tasks ?? 0} icon={CheckSquare} accent="bg-accent/10 text-accent" />
          <Stat label="Pending approvals" value={stats?.pending ?? 0} icon={Clock} accent="bg-destructive/10 text-destructive" />
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-3">
          <Stat label="Active tasks" value={stats?.tasks ?? 0} icon={CheckSquare} accent="bg-primary/10 text-primary" />
          <Stat label="Pending leaves" value={stats?.leaves ?? 0} icon={Briefcase} accent="bg-warning/10 text-warning" />
          <Stat label="Attendance records" value={stats?.attendance ?? 0} icon={Calendar} accent="bg-accent/10 text-accent" />
        </div>
      )}
      <Card className="p-6 mt-6 shadow-card">
        <h3 className="font-semibold mb-2">Welcome to DeVerse IT Solutions</h3>
        <p className="text-muted-foreground text-sm mb-4">
          {role === "admin"
            ? "Use the sidebar to manage employees, approve leave requests, run payroll, and assign tasks."
            : "Use the sidebar to check in, request time off, view your tasks, and book counseling sessions."}
        </p>
        {role === "admin" && (
          <Button onClick={async () => {
            try {
              toast.info("Seeding started...");
              
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

              const { data: empData, error: empErr } = await supabase.from('employees').insert(employees).select();
              if (empErr) throw empErr;

              const tasks = [
                { title: 'Complete Frontend Dashboard', description: 'Finish the React components for dashboard.', assigned_to: empData[0].id, status: 'in_progress', due_date: new Date(Date.now() + 86400000 * 2).toISOString() },
                { title: 'Review Q3 Performance', description: 'Conduct performance reviews.', assigned_to: empData[1].id, status: 'pending', due_date: new Date(Date.now() + 86400000 * 5).toISOString() },
                { title: 'Launch Ad Campaign', description: 'Start the Facebook ad campaign.', assigned_to: empData[2].id, status: 'pending', due_date: new Date(Date.now() + 86400000 * 1).toISOString() }
              ];
              await supabase.from('tasks').insert(tasks);

              const leaves = [
                { employee_id: empData[0].id, leave_type: 'sick', start_date: new Date(Date.now() + 86400000 * 10).toISOString().split('T')[0], end_date: new Date(Date.now() + 86400000 * 11).toISOString().split('T')[0], reason: 'Medical appointment', status: 'pending' },
                { employee_id: empData[3].id, leave_type: 'annual', start_date: new Date(Date.now() + 86400000 * 20).toISOString().split('T')[0], end_date: new Date(Date.now() + 86400000 * 25).toISOString().split('T')[0], reason: 'Family vacation', status: 'approved' }
              ];
              await supabase.from('leaves').insert(leaves);

              toast.success("Database seeded successfully! Refreshing...");
              setTimeout(() => window.location.reload(), 1500);
            } catch (err: any) {
              toast.error("Error seeding: " + err.message);
              console.error(err);
            }
          }}>
            Inject Sample Data (One-Time Click)
          </Button>
        )}
      </Card>

      {role === "admin" && stats?.employeesList && stats.employeesList.length > 0 && (
        <Card className="mt-6 shadow-card overflow-hidden">
          <div className="p-6 border-b">
            <h3 className="font-semibold">Recent Employees & Details</h3>
          </div>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Code</TableHead>
                <TableHead>Name</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Department</TableHead>
                <TableHead>Designation & Salary</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {stats.employeesList.map((e: any) => {
                const info = parseDesignation(e.designation);
                return (
                  <TableRow key={e.id}>
                    <TableCell className="font-mono text-xs">{e.employee_code}</TableCell>
                    <TableCell className="font-medium">{e.full_name}</TableCell>
                    <TableCell>{e.email}</TableCell>
                    <TableCell>{e.departments?.name ?? "—"}</TableCell>
                    <TableCell>
                      {info.title ? (
                        <div className="flex flex-col">
                          <span>{info.title}</span>
                          <span className="text-xs text-muted-foreground">PKR {info.salary.toLocaleString()}/mo</span>
                        </div>
                      ) : "—"}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </Card>
      )}
    </div>
  );
}
