import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import PageHeader from "@/components/PageHeader";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "sonner";
import { format } from "date-fns";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Plus, Search } from "lucide-react";

export default function AdminLeaves() {
  const qc = useQueryClient();
  const { user } = useAuth();
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  // Batch Leave Form State
  const [batchDialogOpen, setBatchDialogOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedEmpIds, setSelectedEmpIds] = useState<string[]>([]);
  const [leaveType, setLeaveType] = useState<string>("annual");
  const [status, setStatus] = useState<"approved" | "pending">("approved");

  // Fetch employees for batch request
  const { data: emps } = useQuery({
    queryKey: ["all-emps-min"],
    queryFn: async () => (await supabase.from("employees").select("id, full_name, employee_code").order("full_name", { ascending: true })).data ?? [],
  });

  const { data } = useQuery({
    queryKey: ["all-leaves"],
    queryFn: async () => (await supabase.from("leaves").select("*, employees(full_name, employee_code)").order("created_at", { ascending: false })).data ?? [],
  });

  const pendingLeaves = data?.filter((l: any) => l.status === "pending") ?? [];

  const decide = useMutation({
    mutationFn: async ({ ids, status }: { ids: string[]; status: "approved" | "rejected" }) => {
      for (const id of ids) {
        const { error: updateError } = await supabase
          .from("leaves")
          .update({ status, reviewed_by: user!.id, reviewed_at: new Date().toISOString() })
          .eq("id", id);
        if (updateError) throw updateError;

        if (status === "approved") {
          const { data: leave } = await supabase
            .from("leaves")
            .select("start_date, end_date, employee_id")
            .eq("id", id)
            .single();

          if (leave) {
            const start = new Date(leave.start_date);
            const end = new Date(leave.end_date);
            const dates: string[] = [];
            
            for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
              dates.push(d.toISOString().split("T")[0]);
            }

            for (const dateStr of dates) {
              const { data: existing } = await supabase
                .from("attendance")
                .select("id")
                .eq("employee_id", leave.employee_id)
                .eq("date", dateStr)
                .maybeSingle();

              if (existing) {
                await supabase
                  .from("attendance")
                  .update({
                    status: "on_leave",
                    check_in: null,
                    check_out: null,
                    working_hours: 8.00,
                    notes: "Auto-logged on approved leave"
                  })
                  .eq("id", existing.id);
              } else {
                await supabase
                  .from("attendance")
                  .insert({
                    employee_id: leave.employee_id,
                    date: dateStr,
                    status: "on_leave",
                    working_hours: 8.00,
                    notes: "Auto-logged on approved leave"
                  });
              }
            }
          }
        }
      }
    },
    onSuccess: () => { 
      toast.success("Leaves updated successfully"); 
      setSelectedIds([]);
      qc.invalidateQueries({ queryKey: ["all-leaves"] }); 
      qc.invalidateQueries({ queryKey: ["all-att"] }); 
    },
    onError: (e: any) => toast.error(e.message),
  });

  const createBatchLeaves = useMutation({
    mutationFn: async (vals: {
      employeeIds: string[];
      leaveType: string;
      startDate: string;
      endDate: string;
      reason: string;
      status: "approved" | "pending";
    }) => {
      for (const empId of vals.employeeIds) {
        const isApproved = vals.status === "approved";
        const newLeave = {
          employee_id: empId,
          leave_type: vals.leaveType,
          start_date: vals.startDate,
          end_date: vals.endDate,
          reason: vals.reason,
          status: vals.status,
          reviewed_by: isApproved ? user!.id : null,
          reviewed_at: isApproved ? new Date().toISOString() : null,
        };

        const { error } = await supabase.from("leaves").insert(newLeave);
        if (error) throw error;

        if (isApproved) {
          const start = new Date(vals.startDate);
          const end = new Date(vals.endDate);
          const dates: string[] = [];

          for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
            dates.push(d.toISOString().split("T")[0]);
          }

          for (const dateStr of dates) {
            const { data: existing } = await supabase
              .from("attendance")
              .select("id")
              .eq("employee_id", empId)
              .eq("date", dateStr)
              .maybeSingle();

            if (existing) {
              await supabase
                .from("attendance")
                .update({
                  status: "on_leave",
                  check_in: null,
                  check_out: null,
                  working_hours: 8.00,
                  notes: "Auto-logged on approved leave",
                })
                .eq("id", existing.id);
            } else {
              await supabase
                .from("attendance")
                .insert({
                  employee_id: empId,
                  date: dateStr,
                  status: "on_leave",
                  working_hours: 8.00,
                  notes: "Auto-logged on approved leave",
                });
            }
          }
        }
      }
    },
    onSuccess: () => {
      toast.success("Batch leave requests created successfully");
      handleOpenChange(false);
      qc.invalidateQueries({ queryKey: ["all-leaves"] });
      qc.invalidateQueries({ queryKey: ["all-att"] });
    },
    onError: (e: any) => toast.error(e.message),
  });

  const handleOpenChange = (open: boolean) => {
    setBatchDialogOpen(open);
    if (!open) {
      setSearchQuery("");
      setSelectedEmpIds([]);
      setLeaveType("annual");
      setStatus("approved");
    }
  };

  const deleteLeaves = useMutation({
    mutationFn: async (ids: string[]) => {
      for (const id of ids) {
        // Fetch leave details to check if it was approved
        const { data: leave } = await supabase
          .from("leaves")
          .select("employee_id, start_date, end_date, status")
          .eq("id", id)
          .single();

        if (leave) {
          // Delete the leave request
          const { error: deleteError } = await supabase
            .from("leaves")
            .delete()
            .eq("id", id);
          if (deleteError) throw deleteError;

          // If it was approved, clean up the attendance records
          if (leave.status === "approved") {
            const start = new Date(leave.start_date);
            const end = new Date(leave.end_date);
            const dates: string[] = [];
            
            for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
              dates.push(d.toISOString().split("T")[0]);
            }

            for (const dateStr of dates) {
              await supabase
                .from("attendance")
                .delete()
                .eq("employee_id", leave.employee_id)
                .eq("date", dateStr)
                .eq("status", "on_leave");
            }
          }
        }
      }
    },
    onSuccess: () => {
      toast.success("Leaves deleted successfully");
      setSelectedIds([]);
      qc.invalidateQueries({ queryKey: ["all-leaves"] });
      qc.invalidateQueries({ queryKey: ["all-att"] });
    },
    onError: (e: any) => toast.error(e.message),
  });


  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedIds(data?.map((l: any) => l.id) ?? []);
    } else {
      setSelectedIds([]);
    }
  };

  const handleSelectRow = (id: string, checked: boolean) => {
    if (checked) {
      setSelectedIds(prev => [...prev, id]);
    } else {
      setSelectedIds(prev => prev.filter(item => item !== id));
    }
  };

  const filteredEmps = emps?.filter((emp: any) =>
    emp.full_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    emp.employee_code.toLowerCase().includes(searchQuery.toLowerCase())
  ) ?? [];

  const toggleEmpSelection = (id: string) => {
    setSelectedEmpIds(prev =>
      prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]
    );
  };

  const handleSelectAllFiltered = (checked: boolean) => {
    if (checked) {
      const idsToAdd = filteredEmps.map((emp: any) => emp.id);
      setSelectedEmpIds(prev => Array.from(new Set([...prev, ...idsToAdd])));
    } else {
      const idsToRemove = filteredEmps.map((emp: any) => emp.id);
      setSelectedEmpIds(prev => prev.filter(id => !idsToRemove.includes(id)));
    }
  };

  const onSubmitBatch = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (selectedEmpIds.length === 0) {
      toast.error("Please select at least one employee");
      return;
    }
    const f = new FormData(e.currentTarget);
    const start = String(f.get("start"));
    const end = String(f.get("end"));
    const reason = String(f.get("reason"));

    if (new Date(start) > new Date(end)) {
      toast.error("Start date must be before or equal to end date");
      return;
    }

    createBatchLeaves.mutate({
      employeeIds: selectedEmpIds,
      leaveType,
      startDate: start,
      endDate: end,
      reason,
      status,
    });
  };

  return (
    <div className="space-y-4">
      <PageHeader 
        title="Leave Requests" 
        description="Approve or reject employee requests" 
        action={
          <Dialog open={batchDialogOpen} onOpenChange={handleOpenChange}>
            <DialogTrigger asChild>
              <Button className="bg-primary text-slate-900 hover:bg-primary/90 font-bold flex items-center gap-1.5 shadow-neon">
                <Plus className="h-4 w-4" />
                Batch Request Leave
              </Button>
            </DialogTrigger>
            <DialogContent className="bg-slate-950 border-slate-800 text-slate-100 max-w-lg shadow-neon-blue">
              <DialogHeader>
                <DialogTitle className="text-xl font-bold tracking-wide text-indigo-400">Create Batch Leave Request</DialogTitle>
              </DialogHeader>
              <form onSubmit={onSubmitBatch} className="space-y-4 pt-2">
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <Label className="text-sm font-semibold text-slate-300">Select Employees</Label>
                    <span className="text-xs text-indigo-400 font-medium">{selectedEmpIds.length} selected</span>
                  </div>
                  <div className="relative">
                    <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                      type="search"
                      placeholder="Search employees by name or code..."
                      className="pl-8 bg-slate-900 border-slate-800 text-slate-200 focus-visible:ring-indigo-500"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                    />
                  </div>
                  <div className="flex items-center space-x-2 py-1.5 px-2.5 border border-dashed border-slate-800 rounded bg-slate-900/40">
                    <Checkbox
                      id="select-all-filtered"
                      checked={filteredEmps.length > 0 && filteredEmps.every((emp: any) => selectedEmpIds.includes(emp.id))}
                      onCheckedChange={(checked) => handleSelectAllFiltered(!!checked)}
                      className="border-slate-600 data-[state=checked]:bg-indigo-500 data-[state=checked]:border-indigo-500"
                    />
                    <Label htmlFor="select-all-filtered" className="text-xs font-semibold text-slate-300 cursor-pointer select-none">
                      Select All Filtered ({filteredEmps.length})
                    </Label>
                  </div>
                  <ScrollArea className="h-[140px] border border-slate-900 rounded bg-slate-900/20 p-2">
                    <div className="space-y-1.5">
                      {filteredEmps.map((emp: any) => (
                        <div key={emp.id} className="flex items-center space-x-2 p-1.5 hover:bg-slate-900/60 rounded transition-colors">
                          <Checkbox
                            id={`emp-${emp.id}`}
                            checked={selectedEmpIds.includes(emp.id)}
                            onCheckedChange={() => toggleEmpSelection(emp.id)}
                            className="border-slate-700 data-[state=checked]:bg-indigo-500 data-[state=checked]:border-indigo-500"
                          />
                          <Label htmlFor={`emp-${emp.id}`} className="text-sm font-medium text-slate-300 cursor-pointer flex-1 flex justify-between items-center select-none pr-1">
                            <span>{emp.full_name}</span>
                            <span className="text-xs text-slate-500">{emp.employee_code}</span>
                          </Label>
                        </div>
                      ))}
                      {filteredEmps.length === 0 && (
                        <div className="text-center text-xs text-muted-foreground py-6">No employees found</div>
                      )}
                    </div>
                  </ScrollArea>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label className="text-sm font-semibold text-slate-300">Leave Type</Label>
                    <Select value={leaveType} onValueChange={setLeaveType}>
                      <SelectTrigger className="bg-slate-900 border-slate-800 text-slate-200">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-slate-900 border-slate-800 text-slate-200">
                        {["annual", "sick", "casual", "maternity", "paternity", "unpaid"].map(t => (
                          <SelectItem key={t} value={t} className="capitalize text-slate-200 focus:bg-slate-850 focus:text-indigo-400">
                            {t}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-sm font-semibold text-slate-300">Initial Status</Label>
                    <Select value={status} onValueChange={(v: any) => setStatus(v)}>
                      <SelectTrigger className="bg-slate-900 border-slate-800 text-slate-200">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-slate-900 border-slate-800 text-slate-200">
                        <SelectItem value="approved" className="text-slate-200 focus:bg-slate-850 focus:text-indigo-400">
                          Approved (Auto Attendance)
                        </SelectItem>
                        <SelectItem value="pending" className="text-slate-200 focus:bg-slate-850 focus:text-indigo-400">
                          Pending Review
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label className="text-sm font-semibold text-slate-300">From Date</Label>
                    <Input 
                      type="date" 
                      name="start" 
                      required 
                      className="bg-slate-900 border-slate-800 text-slate-200 [color-scheme:dark]" 
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-sm font-semibold text-slate-300">To Date</Label>
                    <Input 
                      type="date" 
                      name="end" 
                      required 
                      className="bg-slate-900 border-slate-800 text-slate-200 [color-scheme:dark]" 
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-sm font-semibold text-slate-300">Reason</Label>
                  <Textarea 
                    name="reason" 
                    required 
                    maxLength={500} 
                    placeholder="Reason for leave..."
                    className="bg-slate-900 border-slate-800 text-slate-200 min-h-[60px]" 
                  />
                </div>

                <div className="flex gap-2 pt-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => handleOpenChange(false)}
                    className="flex-1 border-slate-800 text-slate-300 hover:bg-slate-900"
                  >
                    Cancel
                  </Button>
                  <Button 
                    type="submit" 
                    className="flex-1 bg-primary text-slate-900 hover:bg-primary/90 font-bold" 
                    disabled={createBatchLeaves.isPending || selectedEmpIds.length === 0}
                  >
                    {createBatchLeaves.isPending 
                      ? "Submitting..." 
                      : `Submit Request (${selectedEmpIds.length})`}
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        }
      />

      {/* Batch Actions Panel */}
      {selectedIds.length > 0 && (
        <Card className="p-4 border-indigo-500/20 bg-indigo-500/5 flex items-center justify-between shadow-glass animate-in fade-in slide-in-from-top-2 duration-200">
          <span className="text-sm font-medium text-slate-300">
            Selected <span className="text-indigo-400 font-bold">{selectedIds.length}</span> request(s)
          </span>
          <div className="flex gap-2">
            <Button 
              size="sm" 
              onClick={() => decide.mutate({ ids: selectedIds, status: "approved" })}
              disabled={decide.isPending}
              className="bg-primary text-slate-900 font-bold"
            >
              Approve Selected
            </Button>
            <Button 
              size="sm" 
              variant="outline" 
              onClick={() => decide.mutate({ ids: selectedIds, status: "rejected" })}
              disabled={decide.isPending}
              className="border-rose-500/30 hover:bg-rose-500/10 text-rose-400 font-bold"
            >
              Reject Selected
            </Button>
            <Button 
              size="sm" 
              variant="destructive" 
              onClick={() => {
                if (window.confirm(`Are you sure you want to delete ${selectedIds.length} selected leave request(s)?`)) {
                  deleteLeaves.mutate(selectedIds);
                }
              }}
              disabled={deleteLeaves.isPending}
              className="bg-rose-600 hover:bg-rose-700 text-white font-bold"
            >
              Delete Selected
            </Button>
          </div>
        </Card>
      )}

      <Card className="shadow-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-12">
                <input 
                  type="checkbox" 
                  checked={data?.length > 0 && selectedIds.length === data.length}
                  onChange={(e) => handleSelectAll(e.target.checked)}
                  className="rounded border-slate-700 bg-slate-900 text-indigo-500 focus:ring-indigo-500 w-4 h-4 cursor-pointer"
                />
              </TableHead>
              <TableHead>Employee</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Period</TableHead>
              <TableHead>Reason</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data?.map((l: any) => (
              <TableRow key={l.id} className={selectedIds.includes(l.id) ? "bg-indigo-500/5" : ""}>
                <TableCell>
                  <input 
                    type="checkbox" 
                    checked={selectedIds.includes(l.id)}
                    onChange={(e) => handleSelectRow(l.id, e.target.checked)}
                    className="rounded border-slate-700 bg-slate-900 text-indigo-500 focus:ring-indigo-500 w-4 h-4 cursor-pointer"
                  />
                </TableCell>
                <TableCell>{l.employees?.full_name}</TableCell>
                <TableCell className="capitalize">{l.leave_type}</TableCell>
                <TableCell>{format(new Date(l.start_date), "MMM d")} → {format(new Date(l.end_date), "MMM d, yyyy")}</TableCell>
                <TableCell className="max-w-xs truncate">{l.reason}</TableCell>
                <TableCell>
                  <Badge 
                    variant={l.status === "approved" ? "default" : l.status === "rejected" ? "destructive" : "secondary"} 
                    className="capitalize"
                  >
                    {l.status}
                  </Badge>
                </TableCell>
                <TableCell className="text-right space-x-1.5">
                  {l.status === "pending" ? (
                    <>
                      <Button size="sm" onClick={() => decide.mutate({ ids: [l.id], status: "approved" })} disabled={decide.isPending}>
                        Approve
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => decide.mutate({ ids: [l.id], status: "rejected" })} disabled={decide.isPending}>
                        Reject
                      </Button>
                    </>
                  ) : (
                    <span className="text-xs text-muted-foreground mr-1">Reviewed</span>
                  )}
                  <Button 
                    size="sm" 
                    variant="ghost" 
                    className="text-rose-400 hover:text-rose-300 hover:bg-rose-500/10 h-8 px-2"
                    onClick={() => {
                      if (window.confirm("Are you sure you want to delete this leave request?")) {
                        deleteLeaves.mutate([l.id]);
                      }
                    }}
                    disabled={deleteLeaves.isPending}
                  >
                    Delete
                  </Button>
                </TableCell>
              </TableRow>
            ))}
            {!data?.length && (
              <TableRow><TableCell colSpan={7} className="text-center py-8 text-muted-foreground">No leave requests found</TableCell></TableRow>
            )}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
}
