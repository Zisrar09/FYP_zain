import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import PageHeader from "@/components/PageHeader";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Trash2, Edit, Plus } from "lucide-react";
import { toast } from "sonner";

export const parseDesignation = (raw: string | null) => {
  if (!raw) return { title: "", salary: 2000 };
  const parts = raw.split(" | Salary: ");
  return {
    title: parts[0] || "",
    salary: parts[1] ? Number(parts[1]) : 2000,
  };
};

export default function AdminEmployees() {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<any>(null);

  const { data: emps } = useQuery({
    queryKey: ["all-emps"],
    queryFn: async () => (await supabase.from("employees").select("*, departments(name)").order("created_at", { ascending: false })).data ?? [],
  });
  const { data: depts } = useQuery({
    queryKey: ["depts"],
    queryFn: async () => (await supabase.from("departments").select("*")).data ?? [],
  });

  const save = useMutation({
    mutationFn: async (vals: any) => {
      if (editing) {
        const { error } = await supabase.from("employees").update(vals).eq("id", editing.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("employees").insert(vals);
        if (error) throw error;
      }
    },
    onSuccess: () => { toast.success("Saved"); setOpen(false); setEditing(null); qc.invalidateQueries({ queryKey: ["all-emps"] }); },
    onError: (e: any) => toast.error(e.message),
  });

  const del = useMutation({
    mutationFn: async (id: string) => { const { error } = await supabase.from("employees").delete().eq("id", id); if (error) throw error; },
    onSuccess: () => { toast.success("Deleted"); qc.invalidateQueries({ queryKey: ["all-emps"] }); },
    onError: (e: any) => toast.error(e.message),
  });

  const onSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const title = String(f.get("title") || "");
    const salary = Number(f.get("base_salary") || 2000);
    save.mutate({
      full_name: f.get("full_name"), email: f.get("email"), phone: f.get("phone"),
      designation: `${title} | Salary: ${salary}`, department_id: f.get("department_id") || null,
      join_date: f.get("join_date") || new Date().toISOString().slice(0, 10),
    });
  };

  const parsedEditing = editing ? parseDesignation(editing.designation) : { title: "", salary: 2000 };

  return (
    <div>
      <PageHeader title="Employees" description="Manage your workforce"
        action={
          <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) setEditing(null); }}>
            <DialogTrigger asChild><Button><Plus className="h-4 w-4 mr-1" />Add employee</Button></DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>{editing ? "Edit" : "Add"} employee</DialogTitle></DialogHeader>
              <form onSubmit={onSubmit} className="space-y-3">
                <div className="space-y-2"><Label>Full name</Label><Input name="full_name" required defaultValue={editing?.full_name} /></div>
                <div className="space-y-2"><Label>Email</Label><Input name="email" type="email" required defaultValue={editing?.email} /></div>
                <div className="space-y-2"><Label>Phone</Label><Input name="phone" defaultValue={editing?.phone} /></div>
                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-2"><Label>Designation</Label><Input name="title" required defaultValue={parsedEditing.title} /></div>
                  <div className="space-y-2"><Label>Base Salary (PKR)</Label><Input name="base_salary" type="number" required defaultValue={parsedEditing.salary} /></div>
                </div>
                <div className="space-y-2"><Label>Department</Label>
                  <Select name="department_id" defaultValue={editing?.department_id ?? undefined}>
                    <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                    <SelectContent>{depts?.map(d => <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div className="space-y-2"><Label>Join date</Label><Input name="join_date" type="date" defaultValue={editing?.join_date} /></div>
                <Button type="submit" className="w-full" disabled={save.isPending}>Save</Button>
              </form>
            </DialogContent>
          </Dialog>
        } />
      <Card className="shadow-card">
        <Table>
          <TableHeader><TableRow><TableHead>Code</TableHead><TableHead>Name</TableHead><TableHead>Email</TableHead><TableHead>Department</TableHead><TableHead>Designation & Salary</TableHead><TableHead className="text-right">Actions</TableHead></TableRow></TableHeader>
          <TableBody>
            {emps?.map(e => {
              const info = parseDesignation(e.designation);
              return (
                <TableRow key={e.id}>
                  <TableCell className="font-mono text-xs">{e.employee_code}</TableCell>
                  <TableCell>{e.full_name}</TableCell>
                  <TableCell>{e.email}</TableCell>
                  <TableCell>{(e as any).departments?.name ?? "—"}</TableCell>
                  <TableCell>
                    {info.title ? (
                      <div className="flex flex-col">
                        <span>{info.title}</span>
                        <span className="text-xs text-muted-foreground">PKR {info.salary.toLocaleString()}/mo</span>
                      </div>
                    ) : "—"}
                  </TableCell>
                  <TableCell className="text-right space-x-1">
                    <Button size="icon" variant="ghost" onClick={() => { setEditing(e); setOpen(true); }}><Edit className="h-4 w-4" /></Button>
                    <Button size="icon" variant="ghost" onClick={() => del.mutate(e.id)}><Trash2 className="h-4 w-4" /></Button>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
}
