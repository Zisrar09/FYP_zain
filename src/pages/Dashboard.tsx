import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import PageHeader from "@/components/PageHeader";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Users, Calendar, Briefcase, CheckSquare, Clock, DollarSign } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

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

function parseDesignation(d: string | null) {
  if (!d) return { title: "", salary: 0 };
  const parts = d.split("|").map((s) => s.trim());
  const title = parts[0] || "";
  const salaryMatch = d.match(/Salary:\s*([\d,]+)/i);
  const salary = salaryMatch ? parseInt(salaryMatch[1].replace(/,/g, ""), 10) : 0;
  return { title, salary };
}

export default function Dashboard() {
  const { role, user } = useAuth();
  const queryClient = useQueryClient();
  const [seeding, setSeeding] = useState(false);

  const { data: stats, isLoading } = useQuery({
    queryKey: ["dash", role, user?.id],
    queryFn: async () => {
      if (role === "admin") {
        // Fetch all counts and employee list in parallel
        const [empCount, empList, leavesCount, tasksCount, pendingCount, deptList] = await Promise.all([
          supabase.from("employees").select("*", { count: "exact", head: true }),
          supabase.from("employees").select("*, departments(name)").order("created_at", { ascending: false }),
          supabase.from("leaves").select("*", { count: "exact", head: true }).eq("status", "pending"),
          supabase.from("tasks").select("*", { count: "exact", head: true }).neq("status", "completed"),
          supabase.from("profiles").select("*", { count: "exact", head: true }).eq("status", "pending"),
          supabase.from("departments").select("*", { count: "exact", head: true }),
        ]);

        console.log("Dashboard Data Debug:", {
          empCount: empCount.count,
          empError: empCount.error,
          empListLen: empList.data?.length,
          empListError: empList.error,
          leavesCount: leavesCount.count,
          leavesError: leavesCount.error,
          tasksCount: tasksCount.count,
          tasksError: tasksCount.error,
          pendingCount: pendingCount.count,
          deptCount: deptList.count,
        });

        return {
          employees: empCount.count ?? 0,
          leaves: leavesCount.count ?? 0,
          tasks: tasksCount.count ?? 0,
          pending: pendingCount.count ?? 0,
          departments: deptList.count ?? 0,
          employeesList: empList.data ?? [],
        };
      }
      // Employee dashboard
      const { data: emp, error: empErr } = await supabase.from("employees").select("id").eq("user_id", user!.id).maybeSingle();
      if (empErr) console.error("Employee fetch error:", empErr);
      if (!emp) return { tasks: 0, leaves: 0, attendance: 0 };

      const [tasks, leaves, att] = await Promise.all([
        supabase.from("tasks").select("*", { count: "exact", head: true }).eq("assigned_to", emp.id).neq("status", "completed"),
        supabase.from("leaves").select("*", { count: "exact", head: true }).eq("employee_id", emp.id).eq("status", "pending"),
        supabase.from("attendance").select("*", { count: "exact", head: true }).eq("employee_id", emp.id),
      ]);

      return { tasks: tasks.count ?? 0, leaves: leaves.count ?? 0, attendance: att.count ?? 0 };
    },
    refetchOnWindowFocus: true,
    staleTime: 0,
  });

  const handleSeedData = async () => {
    setSeeding(true);
    try {
      // 1. Ensure departments exist
      const deptNames = ["IT & Development", "Human Resources", "Sales & Marketing"];
      const depts: Record<string, string> = {};

      for (const name of deptNames) {
        const { data: existing } = await supabase.from("departments").select("id").eq("name", name).maybeSingle();
        if (existing) {
          depts[name] = existing.id;
        } else {
          const { data: created, error } = await supabase.from("departments").insert({ name, description: `${name} department` }).select("id").single();
          if (error) throw error;
          if (created) depts[name] = created.id;
        }
      }

      // 2. Insert employees
      const employeeData = [
        { full_name: "Zain Israr", email: "zain@example.com", phone: "+92 300 1234567", department_id: depts["IT & Development"], designation: "Senior Developer | Salary: 150000" },
        { full_name: "Sarah Khan", email: "sarah@example.com", phone: "+92 321 7654321", department_id: depts["Human Resources"], designation: "HR Manager | Salary: 120000" },
        { full_name: "Ahmed Ali", email: "ahmed@example.com", phone: "+92 333 9876543", department_id: depts["Sales & Marketing"], designation: "Marketing Executive | Salary: 85000" },
        { full_name: "Ayesha Tariq", email: "ayesha@example.com", phone: "+92 300 1112223", department_id: depts["IT & Development"], designation: "Frontend Developer | Salary: 100000" },
        { full_name: "Bilal Hassan", email: "bilal@example.com", phone: "+92 311 4445556", department_id: depts["Sales & Marketing"], designation: "Sales Lead | Salary: 130000" }
      ];

      const createdEmployees = [];
      for (const emp of employeeData) {
        const { data: existing } = await supabase.from("employees").select("id").eq("email", emp.email).maybeSingle();
        if (existing) {
          createdEmployees.push(existing);
        } else {
          const { data: created, error } = await supabase.from("employees").insert(emp).select("id").single();
          if (error) throw error;
          if (created) createdEmployees.push(created);
        }
      }

      // 3. Insert tasks
      if (createdEmployees.length >= 4) {
        const tasks = [
          { title: "Complete Frontend Dashboard", description: "Finish the React components for dashboard.", assigned_to: createdEmployees[0].id, status: "in_progress", due_date: new Date(Date.now() + 86400000 * 2).toISOString() },
          { title: "Review Q3 Performance", description: "Conduct performance reviews.", assigned_to: createdEmployees[1].id, status: "pending", due_date: new Date(Date.now() + 86400000 * 5).toISOString() },
          { title: "Launch Ad Campaign", description: "Start the Facebook ad campaign.", assigned_to: createdEmployees[2].id, status: "pending", due_date: new Date(Date.now() + 86400000 * 1).toISOString() },
          { title: "Fix Bug #402", description: "Fix the UI glitch on mobile.", assigned_to: createdEmployees[3].id, status: "completed", due_date: new Date(Date.now() - 86400000 * 1).toISOString() }
        ];

        for (const t of tasks) {
          const { data: existing } = await supabase.from("tasks").select("id").eq("title", t.title).maybeSingle();
          if (!existing) {
            await supabase.from("tasks").insert(t);
          }
        }
      }

      // 4. Insert leaves
      if (createdEmployees.length >= 5) {
        const leaves = [
          { employee_id: createdEmployees[0].id, leave_type: "sick", start_date: new Date(Date.now() + 86400000 * 10).toISOString().split("T")[0], end_date: new Date(Date.now() + 86400000 * 11).toISOString().split("T")[0], reason: "Medical appointment", status: "pending" },
          { employee_id: createdEmployees[3].id, leave_type: "annual", start_date: new Date(Date.now() + 86400000 * 20).toISOString().split("T")[0], end_date: new Date(Date.now() + 86400000 * 25).toISOString().split("T")[0], reason: "Family vacation", status: "approved" },
          { employee_id: createdEmployees[4].id, leave_type: "casual", start_date: new Date(Date.now() + 86400000 * 5).toISOString().split("T")[0], end_date: new Date(Date.now() + 86400000 * 5).toISOString().split("T")[0], reason: "Personal work", status: "pending" }
        ];

        for (const l of leaves) {
          const { data: existing } = await supabase.from("leaves").select("id").eq("employee_id", l.employee_id).eq("reason", l.reason).maybeSingle();
          if (!existing) {
            await supabase.from("leaves").insert(l);
          }
        }
      }

      toast.success("Database seeded successfully!");
      queryClient.invalidateQueries({ queryKey: ["dash"] });
    } catch (err: any) {
      toast.error("Error seeding: " + err.message);
      console.error(err);
    } finally {
      setSeeding(false);
    }
  };

  return (
    <div>
      <PageHeader
        title={role === "admin" ? "Admin Dashboard" : "My Dashboard"}
        description={role === "admin" ? "Organization overview" : "Your activity at a glance"}
      />

      {isLoading ? (
        <div className="text-muted-foreground text-center py-10">Loading dashboard data…</div>
      ) : role === "admin" ? (
        <>
          {/* Stat Cards */}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Stat label="Total Employees" value={stats?.employees ?? 0} icon={Users} accent="bg-primary/10 text-primary" />
            <Stat label="Pending Leaves" value={stats?.leaves ?? 0} icon={Briefcase} accent="bg-warning/10 text-warning" />
            <Stat label="Active Tasks" value={stats?.tasks ?? 0} icon={CheckSquare} accent="bg-accent/10 text-accent" />
            <Stat label="Pending Approvals" value={stats?.pending ?? 0} icon={Clock} accent="bg-destructive/10 text-destructive" />
          </div>

          {/* Welcome Card */}
          <Card className="p-6 mt-6 shadow-card flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <h3 className="font-semibold mb-2">Welcome to DeVerse IT Solutions</h3>
              <p className="text-muted-foreground text-sm">
                Use the sidebar to manage employees, approve leave requests, run payroll, and assign tasks.
              </p>
            </div>
            <div className="flex shrink-0">
              <Button onClick={handleSeedData} disabled={seeding}>
                {seeding ? "Seeding..." : "Seed Sample Data"}
              </Button>
            </div>
          </Card>

          {/* All Employees Table */}
          {stats?.employeesList && stats.employeesList.length > 0 && (
            <Card className="mt-6 shadow-card overflow-hidden">
              <div className="p-6 border-b flex items-center justify-between">
                <div>
                  <h3 className="font-semibold">All Employees ({stats.employeesList.length})</h3>
                  <p className="text-xs text-muted-foreground mt-1">Complete workforce overview from live database</p>
                </div>
              </div>
              <div className="overflow-x-auto">
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
                                {info.salary > 0 && (
                                  <span className="text-xs text-muted-foreground">PKR {info.salary.toLocaleString()}/mo</span>
                                )}
                              </div>
                            ) : "—"}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            </Card>
          )}
        </>
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-3">
            <Stat label="Active Tasks" value={stats?.tasks ?? 0} icon={CheckSquare} accent="bg-primary/10 text-primary" />
            <Stat label="Pending Leaves" value={stats?.leaves ?? 0} icon={Briefcase} accent="bg-warning/10 text-warning" />
            <Stat label="Attendance Records" value={stats?.attendance ?? 0} icon={Calendar} accent="bg-accent/10 text-accent" />
          </div>
          <Card className="p-6 mt-6 shadow-card">
            <h3 className="font-semibold mb-2">Welcome to DeVerse IT Solutions</h3>
            <p className="text-muted-foreground text-sm">
              Use the sidebar to check in, request time off, view your tasks, and book counseling sessions.
            </p>
          </Card>
        </>
      )}
    </div>
  );
}
