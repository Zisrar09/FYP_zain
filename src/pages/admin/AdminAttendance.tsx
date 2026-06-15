import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import PageHeader from "@/components/PageHeader";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { format } from "date-fns";
import { toast } from "sonner";
import { Play } from "lucide-react";

export default function AdminAttendance() {
  const qc = useQueryClient();
  const [targetDate, setTargetDate] = useState<string>(format(new Date(), "yyyy-MM-dd"));
  const [defaultStatus, setDefaultStatus] = useState<"present" | "absent">("present");

  const { data, isLoading } = useQuery({
    queryKey: ["all-att"],
    queryFn: async () => (await supabase.from("attendance").select("*, employees(full_name, employee_code)").order("date", { ascending: false }).limit(100)).data ?? [],
  });

  const autoGenerate = useMutation({
    mutationFn: async () => {
      // 1. Fetch all approved employees
      const { data: emps, error: empError } = await supabase
        .from("employees")
        .select("id, user_id");
      if (empError) throw empError;

      // 2. Fetch all approved leaves covering the target date
      const { data: leaves, error: leaveError } = await supabase
        .from("leaves")
        .select("employee_id, leave_type")
        .eq("status", "approved")
        .lte("start_date", targetDate)
        .gte("end_date", targetDate);
      if (leaveError) throw leaveError;

      const leaveMap = new Map(leaves.map(l => [l.employee_id, l.leave_type]));
      let generatedCount = 0;

      // 3. For each employee, generate attendance if not exists
      for (const emp of emps) {
        const { data: existing } = await supabase
          .from("attendance")
          .select("id")
          .eq("employee_id", emp.id)
          .eq("date", targetDate)
          .maybeSingle();

        if (!existing) {
          const isOnLeave = leaveMap.has(emp.id);
          
          if (isOnLeave) {
            await supabase.from("attendance").insert({
              employee_id: emp.id,
              date: targetDate,
              status: "on_leave",
              working_hours: 8.00,
              notes: `Auto-generated: Employee on approved leave`
            });
          } else if (defaultStatus === "present") {
            const checkInTime = new Date(`${targetDate}T09:00:00`);
            const checkOutTime = new Date(`${targetDate}T17:00:00`);
            await supabase.from("attendance").insert({
              employee_id: emp.id,
              date: targetDate,
              status: "present",
              check_in: checkInTime.toISOString(),
              check_out: checkOutTime.toISOString(),
              working_hours: 8.00,
              notes: "Auto-generated present status"
            });
          } else {
            await supabase.from("attendance").insert({
              employee_id: emp.id,
              date: targetDate,
              status: "absent",
              working_hours: 0.00,
              notes: "Auto-generated absent status"
            });
          }
          generatedCount++;
        }
      }

      return generatedCount;
    },
    onSuccess: (count) => {
      toast.success(`Generated attendance for ${count} employees.`);
      qc.invalidateQueries({ queryKey: ["all-att"] });
    },
    onError: (e: any) => toast.error(e.message),
  });

  return (
    <div className="space-y-6">
      <PageHeader title="Attendance Overview" description="Recent attendance across the organization" />

      {/* Automation panel */}
      <Card className="p-6 border-brand-800/20 bg-brand-950/20 shadow-glass">
        <h3 className="text-lg font-semibold mb-4 text-slate-100 flex items-center gap-2">
          <Play className="h-5 w-5 text-indigo-400" /> Attendance Automation Tools
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-end">
          <div className="space-y-2">
            <Label className="text-xs uppercase font-semibold text-slate-400">Target Date</Label>
            <Input 
              type="date" 
              value={targetDate} 
              onChange={(e) => setTargetDate(e.target.value)} 
              className="bg-brand-900/40 border-brand-850"
            />
          </div>
          <div className="space-y-2">
            <Label className="text-xs uppercase font-semibold text-slate-400">Default Status (For active employees)</Label>
            <Select 
              value={defaultStatus} 
              onValueChange={(v: "present" | "absent") => setDefaultStatus(v)}
            >
              <SelectTrigger className="bg-brand-900/40 border-brand-850">
                <SelectValue placeholder="Select status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="present">Auto-Mark Present (9am - 5pm)</SelectItem>
                <SelectItem value="absent">Auto-Mark Absent</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <Button 
            onClick={() => autoGenerate.mutate()} 
            disabled={autoGenerate.isPending}
            className="w-full btn-primary py-2.5 font-bold flex items-center justify-center gap-2"
          >
            {autoGenerate.isPending ? "Generating..." : "Run Batch Auto-Generator"}
          </Button>
        </div>
        <p className="text-xs text-slate-400 mt-3 font-medium">
          * Automatically identifies approved leave requests for the selected date and logs them as <span className="text-indigo-400">on_leave</span>. Existing logs will not be overwritten.
        </p>
      </Card>

      <Card className="shadow-card">
        <Table>
          <TableHeader><TableRow><TableHead>Employee</TableHead><TableHead>Date</TableHead><TableHead>Check in</TableHead><TableHead>Check out</TableHead><TableHead>Hours</TableHead><TableHead>Status</TableHead><TableHead>Notes</TableHead></TableRow></TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow><TableCell colSpan={7} className="text-center py-8 text-muted-foreground">Loading attendance records...</TableCell></TableRow>
            ) : data?.map((r: any) => (
              <TableRow key={r.id}>
                <TableCell>{r.employees?.full_name} <span className="text-xs text-muted-foreground">{r.employees?.employee_code}</span></TableCell>
                <TableCell>{format(new Date(r.date), "MMM d, yyyy")}</TableCell>
                <TableCell>{r.check_in ? format(new Date(r.check_in), "HH:mm") : "—"}</TableCell>
                <TableCell>{r.check_out ? format(new Date(r.check_out), "HH:mm") : "—"}</TableCell>
                <TableCell>{r.working_hours}</TableCell>
                <TableCell>
                  <Badge 
                    variant="secondary" 
                    className={`capitalize ${
                      r.status === 'present' ? 'bg-emerald-500/10 text-emerald-450 border-emerald-500/20' :
                      r.status === 'on_leave' ? 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20' :
                      r.status === 'late' ? 'bg-amber-500/10 text-amber-450 border-amber-500/20' :
                      'bg-rose-500/10 text-rose-450 border-rose-500/20'
                    }`}
                  >
                    {r.status.replace('_', ' ')}
                  </Badge>
                </TableCell>
                <TableCell className="text-xs text-muted-foreground max-w-xs truncate">{r.notes ?? "—"}</TableCell>
              </TableRow>
            ))}
            {!isLoading && data?.length === 0 && (
              <TableRow><TableCell colSpan={7} className="text-center py-8 text-muted-foreground">No records found</TableCell></TableRow>
            )}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
}
