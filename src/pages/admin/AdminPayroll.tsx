import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { parseDesignation } from "@/pages/admin/Employees";
import PageHeader from "@/components/PageHeader";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Calculator, Check } from "lucide-react";
import { toast } from "sonner";

const M = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

interface CalculatedPayroll {
  employee_id: string;
  full_name: string;
  employee_code: string;
  basic_salary: number;
  working_days: number;
  absent_days: number;
  unpaid_leaves: number;
  allowances: number;
  bonuses: number;
  deductions: number;
  tax: number;
  net_salary: number;
}

export default function AdminPayroll() {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState<1 | 2>(1);
  const [selectedMonth, setSelectedMonth] = useState<string>(String(new Date().getMonth() + 1));
  const [selectedYear, setSelectedYear] = useState<string>(String(new Date().getFullYear()));
  const [calculatedPayrolls, setCalculatedPayrolls] = useState<CalculatedPayroll[]>([]);
  const [isCalculating, setIsCalculating] = useState(false);

  // States for Manual Add / Edit
  const [manualOpen, setManualOpen] = useState(false);
  const [editingPayroll, setEditingPayroll] = useState<any>(null);
  const [manualEmpId, setManualEmpId] = useState("");
  const [manualMonth, setManualMonth] = useState(String(new Date().getMonth() + 1));
  const [manualYear, setManualYear] = useState(String(new Date().getFullYear()));
  const [manualBasic, setManualBasic] = useState(0);
  const [manualAllowances, setManualAllowances] = useState(0);
  const [manualBonuses, setManualBonuses] = useState(0);
  const [manualDeductions, setManualDeductions] = useState(0);
  const [manualTax, setManualTax] = useState(0);

  // Query all employees for manual dropdown
  const { data: emps } = useQuery({
    queryKey: ["all-emps-min"],
    queryFn: async () => (await supabase.from("employees").select("id, full_name, employee_code, designation").order("full_name", { ascending: true })).data ?? [],
  });

  const { data: rows } = useQuery({
    queryKey: ["all-payroll"],
    queryFn: async () => (await supabase.from("payroll").select("*, employees(full_name, employee_code)").order("period_year", { ascending: false }).order("period_month", { ascending: false })).data ?? [],
  });

  const getWorkingDaysInMonth = (year: number, month: number) => {
    let count = 0;
    const daysInMonth = new Date(year, month, 0).getDate();
    for (let d = 1; d <= daysInMonth; d++) {
      const dayOfWeek = new Date(year, month - 1, d).getDay();
      if (dayOfWeek !== 0 && dayOfWeek !== 6) {
        count++;
      }
    }
    return count;
  };

  const handleCalculate = async () => {
    setIsCalculating(true);
    try {
      const month = Number(selectedMonth);
      const year = Number(selectedYear);
      const workingDays = getWorkingDaysInMonth(year, month);
      
      const startOfMonthStr = `${year}-${String(month).padStart(2, '0')}-01`;
      const endOfMonthStr = `${year}-${String(month).padStart(2, '0')}-${new Date(year, month, 0).getDate()}`;
      
      const startOfMonth = new Date(startOfMonthStr);
      const endOfMonth = new Date(endOfMonthStr);

      // 1. Fetch all approved employees
      const { data: empsList, error: empErr } = await supabase.from("employees").select("*");
      if (empErr) throw empErr;

      // 2. Fetch all attendance for this month
      const { data: att, error: attErr } = await supabase
        .from("attendance")
        .select("*")
        .gte("date", startOfMonthStr)
        .lte("date", endOfMonthStr);
      if (attErr) throw attErr;

      // 3. Fetch all approved unpaid leaves for this month
      const { data: leaves, error: leaveErr } = await supabase
        .from("leaves")
        .select("*")
        .eq("status", "approved")
        .eq("leave_type", "unpaid")
        .gte("end_date", startOfMonthStr)
        .lte("start_date", endOfMonthStr);
      if (leaveErr) throw leaveErr;

      const payrollList: CalculatedPayroll[] = empsList.map(emp => {
        const salaryInfo = parseDesignation(emp.designation);
        const basic = salaryInfo.salary;

        // Count absent days
        const absentDays = att.filter(a => a.employee_id === emp.id && a.status === "absent").length;

        // Count unpaid leave days overlapping with this month
        let unpaidLeaveDays = 0;
        const empLeaves = leaves.filter(l => l.employee_id === emp.id);
        for (const leave of empLeaves) {
          const leaveStart = new Date(leave.start_date);
          const leaveEnd = new Date(leave.end_date);
          const intersectStart = new Date(Math.max(leaveStart.getTime(), startOfMonth.getTime()));
          const intersectEnd = new Date(Math.min(leaveEnd.getTime(), endOfMonth.getTime()));
          
          if (intersectStart <= intersectEnd) {
            for (let d = new Date(intersectStart); d <= intersectEnd; d.setDate(d.getDate() + 1)) {
              const dayOfWeek = d.getDay();
              if (dayOfWeek !== 0 && dayOfWeek !== 6) {
                unpaidLeaveDays++;
              }
            }
          }
        }

        // Calculate dynamic deductions
        const dailyRate = basic / (workingDays || 22);
        const totalDeductions = Math.round((absentDays + unpaidLeaveDays) * dailyRate * 100) / 100;

        // Standard allowances (10% of basic)
        const allowances = Math.round(basic * 0.10 * 100) / 100;
        const bonuses = 0;
        
        // Tax rate (18% of gross earnings)
        const gross = basic + allowances - totalDeductions;
        const tax = gross > 0 ? Math.round(gross * 0.18 * 100) / 100 : 0;
        const net = Math.max(0, Math.round((gross + bonuses - tax) * 100) / 100);

        return {
          employee_id: emp.id,
          full_name: emp.full_name,
          employee_code: emp.employee_code,
          basic_salary: basic,
          working_days: workingDays,
          absent_days: absentDays,
          unpaid_leaves: unpaidLeaveDays,
          allowances,
          bonuses,
          deductions: totalDeductions,
          tax,
          net_salary: net
        };
      });

      setCalculatedPayrolls(payrollList);
      setStep(2);
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setIsCalculating(false);
    }
  };

  const handleOverride = (index: number, field: keyof CalculatedPayroll, value: number) => {
    setCalculatedPayrolls(prev => {
      const copy = [...prev];
      const row = { ...copy[index] };
      (row as any)[field] = value;

      // If they didn't override tax directly, recompute tax
      if (field !== "tax") {
        const grossForTax = row.basic_salary + row.allowances - row.deductions;
        row.tax = grossForTax > 0 ? Math.round(grossForTax * 0.18 * 100) / 100 : 0;
      }

      // Recompute net salary
      const gross = row.basic_salary + row.allowances - row.deductions;
      const net = Math.max(0, Math.round((gross + row.bonuses - row.tax) * 100) / 100);
      row.net_salary = net;

      copy[index] = row;
      return copy;
    });
  };

  const postPayroll = useMutation({
    mutationFn: async () => {
      const month = Number(selectedMonth);
      const year = Number(selectedYear);
      const empIds = calculatedPayrolls.map(p => p.employee_id);

      // Clean old payroll for this period to avoid constraint errors
      await supabase.from("payroll")
        .delete()
        .in("employee_id", empIds)
        .eq("period_month", month)
        .eq("period_year", year);

      // Insert fresh records
      const insertList = calculatedPayrolls.map(p => ({
        employee_id: p.employee_id,
        period_month: month,
        period_year: year,
        basic_salary: p.basic_salary,
        allowances: p.allowances,
        bonuses: p.bonuses,
        deductions: p.deductions,
        tax: p.tax
      }));

      const { error } = await supabase.from("payroll").insert(insertList);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Payroll posted successfully!");
      setOpen(false);
      setStep(1);
      qc.invalidateQueries({ queryKey: ["all-payroll"] });
    },
    onError: (e: any) => toast.error(e.message),
  });

  const postManualPayroll = useMutation({
    mutationFn: async (vals: {
      employeeId: string;
      month: number;
      year: number;
      basicSalary: number;
      allowances: number;
      bonuses: number;
      deductions: number;
      tax: number;
    }) => {
      if (editingPayroll) {
        const { error } = await supabase.from("payroll")
          .update({
            basic_salary: vals.basicSalary,
            allowances: vals.allowances,
            bonuses: vals.bonuses,
            deductions: vals.deductions,
            tax: vals.tax
          })
          .eq("id", editingPayroll.id);
        if (error) throw error;
      } else {
        // Delete old record for period to avoid duplicates
        await supabase.from("payroll")
          .delete()
          .eq("employee_id", vals.employeeId)
          .eq("period_month", vals.month)
          .eq("period_year", vals.year);

        const { error } = await supabase.from("payroll").insert({
          employee_id: vals.employeeId,
          period_month: vals.month,
          period_year: vals.year,
          basic_salary: vals.basicSalary,
          allowances: vals.allowances,
          bonuses: vals.bonuses,
          deductions: vals.deductions,
          tax: vals.tax
        });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      toast.success(editingPayroll ? "Payroll updated successfully!" : "Manual payroll record saved successfully!");
      setManualOpen(false);
      setEditingPayroll(null);
      qc.invalidateQueries({ queryKey: ["all-payroll"] });
    },
    onError: (e: any) => toast.error(e.message),
  });

  // Manual Dialog prefill helpers
  const handleStartEdit = (r: any) => {
    setEditingPayroll(r);
    setManualEmpId(r.employee_id);
    setManualMonth(String(r.period_month));
    setManualYear(String(r.period_year));
    setManualBasic(r.basic_salary);
    setManualAllowances(r.allowances);
    setManualBonuses(r.bonuses);
    setManualDeductions(r.deductions);
    setManualTax(r.tax);
    setManualOpen(true);
  };

  const handleStartAddManual = () => {
    setEditingPayroll(null);
    setManualEmpId("");
    setManualMonth(String(new Date().getMonth() + 1));
    setManualYear(String(new Date().getFullYear()));
    setManualBasic(0);
    setManualAllowances(0);
    setManualBonuses(0);
    setManualDeductions(0);
    setManualTax(0);
    setManualOpen(true);
  };

  const onManualEmpChange = (empId: string) => {
    setManualEmpId(empId);
    const emp = emps?.find((e: any) => e.id === empId);
    if (emp) {
      const parsed = parseDesignation(emp.designation);
      setManualBasic(parsed.salary);
      const allowances = Math.round(parsed.salary * 0.10 * 100) / 100;
      setManualAllowances(allowances);
      const gross = parsed.salary + allowances;
      setManualTax(Math.round(gross * 0.18 * 100) / 100);
      setManualBonuses(0);
      setManualDeductions(0);
    }
  };

  const onManualBasicChange = (val: number) => {
    setManualBasic(val);
    const gross = val + manualAllowances - manualDeductions;
    setManualTax(gross > 0 ? Math.round(gross * 0.18 * 100) / 100 : 0);
  };
  
  const onManualAllowancesChange = (val: number) => {
    setManualAllowances(val);
    const gross = manualBasic + val - manualDeductions;
    setManualTax(gross > 0 ? Math.round(gross * 0.18 * 100) / 100 : 0);
  };

  const onManualDeductionsChange = (val: number) => {
    setManualDeductions(val);
    const gross = manualBasic + manualAllowances - val;
    setManualTax(gross > 0 ? Math.round(gross * 0.18 * 100) / 100 : 0);
  };

  const onSubmitManual = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!manualEmpId) {
      toast.error("Please select an employee");
      return;
    }
    postManualPayroll.mutate({
      employeeId: manualEmpId,
      month: Number(manualMonth),
      year: Number(manualYear),
      basicSalary: Number(manualBasic),
      allowances: Number(manualAllowances),
      bonuses: Number(manualBonuses),
      deductions: Number(manualDeductions),
      tax: Number(manualTax)
    });
  };

  return (
    <div>
      <PageHeader 
        title="Payroll" 
        description="Manage monthly salaries"
        action={
          <div className="flex gap-2">
            <Button variant="outline" className="border-brand-800 text-slate-200 hover:bg-brand-900" onClick={handleStartAddManual}>
              <Plus className="h-4 w-4 mr-1" /> Add Manual Payroll
            </Button>
            <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) setStep(1); }}>
              <DialogTrigger asChild>
                <Button className="btn-primary">
                  <Calculator className="h-4 w-4 mr-1" /> Auto-Generate Payroll
                </Button>
              </DialogTrigger>
              <DialogContent className={step === 2 ? "max-w-4xl" : "max-w-md"}>
                <DialogHeader>
                  <DialogTitle>
                    {step === 1 ? "Generate Monthly Payroll" : "Review & Adjust Payroll"}
                  </DialogTitle>
                </DialogHeader>

                {step === 1 ? (
                  // Step 1: Select Date Period
                  <div className="space-y-4 pt-2">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Month</Label>
                        <Select value={selectedMonth} onValueChange={setSelectedMonth}>
                          <SelectTrigger><SelectValue /></SelectTrigger>
                          <SelectContent>
                            {M.map((m, i) => (
                              <SelectItem key={i} value={String(i + 1)}>{m}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label>Year</Label>
                        <Input 
                          type="number" 
                          value={selectedYear} 
                          onChange={(e) => setSelectedYear(e.target.value)} 
                          required 
                        />
                      </div>
                    </div>
                    <Button 
                      onClick={handleCalculate} 
                      className="w-full btn-primary"
                      disabled={isCalculating}
                    >
                      {isCalculating ? "Analyzing workforce data..." : "Fetch & Calculate Payroll"}
                    </Button>
                  </div>
                ) : (
                  // Step 2: Override Grid
                  <div className="space-y-4 pt-2">
                    <div className="max-h-[450px] overflow-y-auto border border-brand-800/20 rounded-lg">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Employee</TableHead>
                            <TableHead>Basic</TableHead>
                            <TableHead>Allowances</TableHead>
                            <TableHead>Bonuses</TableHead>
                            <TableHead>Deductions*</TableHead>
                            <TableHead>Tax</TableHead>
                            <TableHead>Net Salary</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {calculatedPayrolls.map((p, i) => (
                            <TableRow key={p.employee_id}>
                              <TableCell>
                                <div className="flex flex-col">
                                  <span className="font-semibold text-slate-200">{p.full_name}</span>
                                  <span className="text-[10px] text-muted-foreground">Absences: {p.absent_days} | Unpaid: {p.unpaid_leaves}</span>
                                </div>
                              </TableCell>
                              <TableCell>
                                <Input 
                                  type="number" 
                                  className="w-24 h-8 text-xs bg-brand-900/40 border-brand-850"
                                  value={p.basic_salary} 
                                  onChange={(e) => handleOverride(i, "basic_salary", Number(e.target.value))} 
                                />
                              </TableCell>
                              <TableCell>
                                <Input 
                                  type="number" 
                                  className="w-20 h-8 text-xs bg-brand-900/40 border-brand-850"
                                  value={p.allowances} 
                                  onChange={(e) => handleOverride(i, "allowances", Number(e.target.value))} 
                                />
                              </TableCell>
                              <TableCell>
                                <Input 
                                  type="number" 
                                  className="w-20 h-8 text-xs bg-brand-900/40 border-brand-850"
                                  value={p.bonuses} 
                                  onChange={(e) => handleOverride(i, "bonuses", Number(e.target.value))} 
                                />
                              </TableCell>
                              <TableCell>
                                <Input 
                                  type="number" 
                                  className="w-20 h-8 text-xs bg-brand-900/40 border-brand-850"
                                  value={p.deductions} 
                                  onChange={(e) => handleOverride(i, "deductions", Number(e.target.value))} 
                                />
                              </TableCell>
                              <TableCell>
                                <Input 
                                  type="number" 
                                  className="w-20 h-8 text-xs bg-brand-900/40 border-brand-850"
                                  value={p.tax} 
                                  onChange={(e) => handleOverride(i, "tax", Number(e.target.value))} 
                                />
                              </TableCell>
                              <TableCell className="font-bold text-indigo-400">
                                PKR {p.net_salary}
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                    <p className="text-[10px] text-muted-foreground">
                      * Deductions are calculated automatically from absences & unpaid leaves relative to working days ({calculatedPayrolls[0]?.working_days || 22} days in this month).
                    </p>
                    <div className="flex gap-2">
                      <Button variant="outline" onClick={() => setStep(1)} className="w-1/3">Back</Button>
                      <Button 
                        onClick={() => postPayroll.mutate()} 
                        disabled={postPayroll.isPending}
                        className="w-2/3 btn-primary flex items-center justify-center gap-1"
                      >
                        <Check className="h-4 w-4" /> {postPayroll.isPending ? "Posting..." : "Confirm & Post Payroll"}
                      </Button>
                    </div>
                  </div>
                )}
              </DialogContent>
            </Dialog>
          </div>
        } 
      />
      
      <Card className="shadow-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Employee</TableHead>
              <TableHead>Period</TableHead>
              <TableHead>Basic Salary</TableHead>
              <TableHead>Allowances</TableHead>
              <TableHead>Bonuses</TableHead>
              <TableHead>Deductions</TableHead>
              <TableHead>Tax</TableHead>
              <TableHead>Net Salary</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows?.map((r: any) => (
              <TableRow key={r.id}>
                <TableCell>
                  <div className="flex flex-col">
                    <span className="font-medium">{r.employees?.full_name}</span>
                    <span className="text-xs text-muted-foreground">{r.employees?.employee_code}</span>
                  </div>
                </TableCell>
                <TableCell>{M[r.period_month - 1]} {r.period_year}</TableCell>
                <TableCell>PKR {r.basic_salary}</TableCell>
                <TableCell>PKR {r.allowances}</TableCell>
                <TableCell>PKR {r.bonuses}</TableCell>
                <TableCell className="text-rose-450">PKR {r.deductions}</TableCell>
                <TableCell>PKR {r.tax}</TableCell>
                <TableCell className="font-bold text-emerald-450">PKR {r.net_salary}</TableCell>
                <TableCell className="text-right">
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    onClick={() => handleStartEdit(r)}
                    className="text-indigo-400 hover:text-indigo-350 hover:bg-brand-800/20"
                  >
                    Edit
                  </Button>
                </TableCell>
              </TableRow>
            ))}
            {!rows?.length && (
              <TableRow><TableCell colSpan={9} className="text-center py-8 text-muted-foreground">No payroll logs found</TableCell></TableRow>
            )}
          </TableBody>
        </Table>
      </Card>

      {/* Manual Add / Edit Dialog */}
      <Dialog open={manualOpen} onOpenChange={setManualOpen}>
        <DialogContent className="max-w-md bg-slate-900 border border-slate-800 text-slate-100 shadow-xl">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold text-slate-100">
              {editingPayroll ? "Edit Payroll Record" : "Add Manual Payroll"}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={onSubmitManual} className="space-y-4 pt-2">
            <div className="space-y-2">
              <Label className="text-slate-350">Employee</Label>
              {editingPayroll ? (
                <Input 
                  value={editingPayroll.employees?.full_name || ""} 
                  disabled 
                  className="bg-slate-950/60 border-slate-800 text-slate-400"
                />
              ) : (
                <Select value={manualEmpId} onValueChange={onManualEmpChange}>
                  <SelectTrigger className="bg-slate-950 border border-slate-800 text-slate-200 hover:bg-slate-900 focus:bg-slate-900">
                    <SelectValue placeholder="Select Employee" />
                  </SelectTrigger>
                  <SelectContent className="bg-slate-950 border border-slate-800 text-slate-200 shadow-2xl">
                    {emps?.map((e: any) => {
                      const parsed = parseDesignation(e.designation);
                      return (
                        <SelectItem key={e.id} value={e.id}>
                          {e.full_name} ({e.employee_code}) — Base: PKR {parsed.salary.toLocaleString()}
                        </SelectItem>
                      );
                    })}
                  </SelectContent>
                </Select>
              )}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-slate-350">Month</Label>
                <Select 
                  value={manualMonth} 
                  onValueChange={setManualMonth}
                  disabled={!!editingPayroll}
                >
                  <SelectTrigger className="bg-slate-950 border border-slate-800 text-slate-200 hover:bg-slate-900 focus:bg-slate-900">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-slate-950 border border-slate-800 text-slate-200 shadow-2xl">
                    {M.map((m, i) => (
                      <SelectItem key={i} value={String(i + 1)}>{m}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label className="text-slate-350">Year</Label>
                <Input 
                  type="number" 
                  value={manualYear} 
                  onChange={(e) => setManualYear(e.target.value)} 
                  disabled={!!editingPayroll}
                  className="bg-slate-950 border border-slate-800 text-slate-200"
                  required 
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-slate-350">Basic Salary (PKR)</Label>
                <Input 
                  type="number" 
                  value={manualBasic} 
                  onChange={(e) => onManualBasicChange(Number(e.target.value))} 
                  className="bg-slate-950 border border-slate-800 text-slate-200"
                  required 
                />
              </div>
              <div className="space-y-2">
                <Label className="text-slate-350">Allowances (PKR)</Label>
                <Input 
                  type="number" 
                  value={manualAllowances} 
                  onChange={(e) => onManualAllowancesChange(Number(e.target.value))} 
                  className="bg-slate-950 border border-slate-800 text-slate-200"
                  required 
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-slate-350">Bonuses (PKR)</Label>
                <Input 
                  type="number" 
                  value={manualBonuses} 
                  onChange={(e) => setManualBonuses(Number(e.target.value))} 
                  className="bg-slate-950 border border-slate-800 text-slate-200"
                  required 
                />
              </div>
              <div className="space-y-2">
                <Label className="text-slate-350">Deductions (PKR)</Label>
                <Input 
                  type="number" 
                  value={manualDeductions} 
                  onChange={(e) => onManualDeductionsChange(Number(e.target.value))} 
                  className="bg-slate-950 border border-slate-800 text-slate-200"
                  required 
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-slate-350">Tax (PKR)</Label>
                <Input 
                  type="number" 
                  value={manualTax} 
                  onChange={(e) => setManualTax(Number(e.target.value))} 
                  className="bg-slate-950 border border-slate-800 text-slate-200"
                  required 
                />
              </div>
              <div className="space-y-2">
                <Label className="text-slate-350">Net Salary (PKR)</Label>
                <div className="h-10 flex items-center px-3 rounded-md bg-slate-950/40 border border-slate-800/80 text-emerald-450 font-bold">
                  PKR {Math.max(0, Math.round((manualBasic + manualAllowances + manualBonuses - manualDeductions - manualTax) * 100) / 100)}
                </div>
              </div>
            </div>

            <div className="flex gap-2 pt-2">
              <Button type="button" variant="outline" onClick={() => setManualOpen(false)} className="w-1/3">
                Cancel
              </Button>
              <Button 
                type="submit" 
                disabled={postManualPayroll.isPending}
                className="w-2/3 btn-primary"
              >
                {postManualPayroll.isPending ? "Saving..." : "Save Record"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
