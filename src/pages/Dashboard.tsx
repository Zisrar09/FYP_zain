import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import PageHeader from "@/components/PageHeader";
import { Card } from "@/components/ui/card";
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
          <Card className="p-6 mt-6 shadow-card">
            <h3 className="font-semibold mb-2">Welcome to DeVerse IT Solutions</h3>
            <p className="text-muted-foreground text-sm">
              Use the sidebar to manage employees, approve leave requests, run payroll, and assign tasks.
            </p>
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
