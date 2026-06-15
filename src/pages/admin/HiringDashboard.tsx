import { useState, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import PageHeader from "@/components/PageHeader";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  FileText,
  Award,
  AlertCircle,
  CheckCircle2,
  ChevronRight,
  Plus,
  Briefcase,
  ThumbsUp,
  ThumbsDown,
  Loader2,
  Database,
  XCircle,
  Link2,
  Copy,
  ExternalLink,
  PartyPopper,
} from "lucide-react";

function cn(...classes: any[]) {
  return classes.filter(Boolean).join(" ");
}

export default function HiringDashboard() {
  // ── Lifted dialog state (prevents white-screen flash from map nesting) ──
  const [evalDialogOpen, setEvalDialogOpen] = useState(false);
  const [selectedApp, setSelectedApp] = useState<any>(null);
  // Keep a stable ref so the mutation closure never sees stale data
  const selectedAppRef = useRef<any>(null);

  const [isJobDialogOpen, setIsJobDialogOpen] = useState(false);
  const [isManageDialogOpen, setIsManageDialogOpen] = useState(false);
  const [editingJob, setEditingJob] = useState<any>(null);
  const [selectedDept, setSelectedDept] = useState<string>("");
  const [selectedEducation, setSelectedEducation] = useState<string>("Bachelor's");
  const [filterJobId, setFilterJobId] = useState<string>("all");
  // Shareable link state — set after a new job is posted
  const [postedJob, setPostedJob] = useState<{ id: string; title: string } | null>(null);

  // Track mutation result for inline status display in dialog
  const [mutationResult, setMutationResult] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);

  const copyLink = (jobId: string) => {
    const url = `${window.location.origin}/apply/${jobId}`;
    navigator.clipboard.writeText(url).then(() => toast.success("Link copied to clipboard!"));
  };

  const queryClient = useQueryClient();

  // ─────────────────────────────────────────────────────────────────────────
  // DATA QUERIES
  // ─────────────────────────────────────────────────────────────────────────

  const { data: applications, isLoading } = useQuery({
    queryKey: ["admin-applications"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("applications" as any)
        .select(`*, jobs(title, required_skills, preferred_skills, minimum_education, experience_required), candidates(name, email, cv_url)`)
        .order("match_score", { ascending: false, nullsFirst: false });
      if (error) throw error;
      return data as any[];
    },
  });

  const { data: jobs } = useQuery({
    queryKey: ["admin-jobs"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("jobs" as any)
        .select("*, departments(name)");
      if (error) throw error;
      return data as any[];
    },
  });

  const { data: departments } = useQuery({
    queryKey: ["departments"],
    queryFn: async () => {
      const { data, error } = await supabase.from("departments").select("*");
      if (error) throw error;
      return data;
    },
  });

  // ─────────────────────────────────────────────────────────────────────────
  // MUTATIONS
  // ─────────────────────────────────────────────────────────────────────────

  /**
   * STATUS MUTATION: Uses SECURITY DEFINER RPC to bypass RLS.
   * This is the guaranteed write path — no silent failures.
   */
  const statusMutation = useMutation({
    mutationFn: async ({ appId, status }: { appId: string; status: string }) => {
      setMutationResult(null);

      const { data, error } = await supabase.rpc("update_application_status" as any, {
        p_application_id: appId,
        p_status: status,
      });

      if (error) {
        throw new Error(`RPC Error: ${error.message}`);
      }

      // The RPC returns a JSON object with success/error fields
      const result = data as any;
      if (!result?.success) {
        throw new Error(result?.error || "DB returned 0 rows affected — ID mismatch?");
      }

      return result;
    },
    onSuccess: (result, variables) => {
      queryClient.invalidateQueries({ queryKey: ["admin-applications"] });

      if (variables.status === "rejected") {
        // Application is deleted from DB — close dialog and let table refetch remove the row
        toast.success("Candidate rejected and removed from the list.");
        setEvalDialogOpen(false);
        setTimeout(() => {
          setSelectedApp(null);
          selectedAppRef.current = null;
          setMutationResult(null);
        }, 200);
        return;
      }

      // Hired: update local state so badge updates instantly without re-open
      if (selectedAppRef.current?.id === variables.appId) {
        const updated = { ...selectedAppRef.current, status: "hired" };
        selectedAppRef.current = updated;
        setSelectedApp(updated);
      }

      const empMsg = result.employee_created
        ? "✅ Hired & added to Employees list!"
        : "✅ Hired! (Employee record already existed)";

      setMutationResult({ type: "success", message: empMsg });
      toast.success(
        result.employee_created
          ? "Candidate hired — new employee record created!"
          : "Candidate hired — employee already in system."
      );
    },
    onError: (err: any) => {
      const msg = err.message || "Unknown database error";
      setMutationResult({ type: "error", message: msg });
      toast.error(`DB Error: ${msg}`);
      console.error("STATUS MUTATION FAILED:", err);
    },
  });

  const jobMutation = useMutation({
    mutationFn: async (jobData: any) => {
      if (editingJob) {
        const { error } = await supabase
          .from("jobs" as any)
          .update(jobData)
          .eq("id", editingJob.id);
        if (error) throw error;
        return null; // editing — no new id
      } else {
        const { data, error } = await supabase
          .from("jobs" as any)
          .insert(jobData)
          .select("id, title")
          .single();
        if (error) throw error;
        return data as { id: string; title: string };
      }
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["admin-jobs"] });
      if (data) {
        // New job — show the shareable link panel inside the dialog
        setPostedJob({ id: data.id, title: data.title });
        toast.success("Job posted! Share the link below.");
      } else {
        toast.success("Job updated successfully!");
        setIsJobDialogOpen(false);
        setEditingJob(null);
        setSelectedDept("");
      }
    },
    onError: (err: any) => {
      toast.error(`Failed to save job: ${err.message}`);
    },
  });

  const deleteJobMutation = useMutation({
    mutationFn: async (jobId: string) => {
      const { data, error } = await supabase.rpc("delete_job", { p_job_id: jobId });
      if (error) throw error;
      if (!(data as any)?.success) throw new Error((data as any)?.error || "Failed to delete job");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-jobs"] });
      toast.success("Job posting deleted");
    },
    onError: (err: any) => {
      toast.error(`Error deleting job: ${err.message}`);
    },
  });

  // ─────────────────────────────────────────────────────────────────────────
  // HELPERS
  // ─────────────────────────────────────────────────────────────────────────

  const openEvalDialog = (app: any) => {
    setMutationResult(null);
    selectedAppRef.current = app;
    setSelectedApp(app);
    setEvalDialogOpen(true);
  };

  const filteredApplications =
    filterJobId === "all"
      ? applications
      : applications?.filter((app: any) => app.job_id === filterJobId);

  const getScoreColor = (score: number | null) => {
    if (score == null) return "bg-slate-100 text-slate-500 border-slate-200";
    if (score >= 80) return "bg-green-100 text-green-700 border-green-200";
    if (score >= 50) return "bg-yellow-100 text-yellow-700 border-yellow-200";
    return "bg-red-100 text-red-700 border-red-200";
  };

  const getStatusBadgeClass = (status: string) => {
    switch (status) {
      case "hired":     return "bg-green-100 text-green-700 border-green-200";
      case "rejected":  return "bg-red-100 text-red-600 border-red-200";
      case "interviewing": return "bg-blue-100 text-blue-700 border-blue-200";
      default:          return "bg-slate-100 text-slate-600 border-slate-200";
    }
  };

  // ─────────────────────────────────────────────────────────────────────────
  // RENDER
  // ─────────────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-6">
      <PageHeader
        title="Hiring Pipeline"
        description="Automated candidate ranking and AI insights for your job openings."
      />

      {/* ── Toolbar ── */}
      <div className="flex justify-between items-center bg-slate-900 border border-slate-800 p-4 rounded-lg shadow-sm flex-wrap gap-3">
        <div className="flex items-center gap-4">
          <Select value={filterJobId} onValueChange={setFilterJobId}>
            <SelectTrigger className="w-[200px] bg-slate-950 border-slate-800 text-slate-200">
              <SelectValue placeholder="Filter by Job" />
            </SelectTrigger>
            <SelectContent className="bg-slate-950 border border-slate-800 text-slate-200">
              <SelectItem value="all">All Jobs</SelectItem>
              {jobs?.map((j: any) => (
                <SelectItem key={j.id} value={j.id}>{j.title}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <span className="text-sm text-slate-400">
            {filteredApplications?.length || 0} total applications
          </span>
        </div>

        <div className="flex gap-2">
          {/* ── Manage Jobs Dialog ── */}
          <Dialog open={isManageDialogOpen} onOpenChange={setIsManageDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" size="sm" className="gap-2 border-slate-700 bg-slate-900 text-slate-200 hover:bg-slate-800">
                <Briefcase className="h-4 w-4" />
                Manage Jobs
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl bg-slate-900 border border-slate-800 text-slate-100 shadow-xl">
              <DialogHeader>
                <DialogTitle className="text-slate-100">Active Job Postings</DialogTitle>
                <DialogDescription className="text-slate-400">View, share and manage your open positions.</DialogDescription>
              </DialogHeader>
              <div className="space-y-3 pt-4 max-h-[460px] overflow-y-auto pr-2">
                {jobs?.map((job: any) => {
                  const shareUrl = `${window.location.origin}/apply/${job.id}`;
                  return (
                    <div
                      key={job.id}
                      className="border border-slate-800 rounded-xl bg-slate-950/40 hover:bg-slate-950/70 transition-colors overflow-hidden"
                    >
                      <div className="flex items-center justify-between p-3 pb-2">
                        <div>
                          <h4 className="font-semibold text-slate-200">{job.title}</h4>
                          <p className="text-xs text-slate-500 uppercase tracking-wider">
                            {job.departments?.name || "No Department"} &bull; {job.experience_required}+ yrs exp
                          </p>
                        </div>
                        <div className="flex items-center gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-indigo-400 hover:text-indigo-300 hover:bg-indigo-950/40 gap-1 text-xs"
                            onClick={() => copyLink(job.id)}
                          >
                            <Copy className="h-3 w-3" /> Copy Link
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-slate-400 hover:text-slate-200 hover:bg-slate-800/60 gap-1 text-xs"
                            onClick={() => window.open(`/apply/${job.id}`, "_blank")}
                          >
                            <ExternalLink className="h-3 w-3" /> Open
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-red-400 hover:text-red-300 hover:bg-red-950/40 text-xs"
                            onClick={() => {
                              if (confirm("Delete this job? All applications will be removed.")) {
                                deleteJobMutation.mutate(job.id);
                              }
                            }}
                            disabled={deleteJobMutation.isPending}
                          >
                            Delete
                          </Button>
                        </div>
                      </div>
                      {/* Inline share link */}
                      <div className="mx-3 mb-3 flex items-center gap-2 bg-slate-900 border border-slate-800 rounded-lg px-3 py-1.5">
                        <Link2 className="h-3 w-3 text-indigo-400 shrink-0" />
                        <span className="text-[11px] text-slate-400 truncate flex-1 font-mono">{shareUrl}</span>
                        <button
                          onClick={() => copyLink(job.id)}
                          className="text-[10px] text-indigo-400 hover:text-indigo-300 font-medium shrink-0 transition-colors"
                        >
                          Copy
                        </button>
                      </div>
                    </div>
                  );
                })}
                {(!jobs || jobs.length === 0) && (
                  <div className="text-center py-8 text-slate-500">No jobs posted yet.</div>
                )}
              </div>
            </DialogContent>
          </Dialog>

          {/* ── Create Job Dialog ── */}
          <Dialog
            open={isJobDialogOpen}
            onOpenChange={(v) => {
              setIsJobDialogOpen(v);
              if (!v) { setPostedJob(null); setEditingJob(null); setSelectedDept(""); }
            }}
          >
            <DialogTrigger asChild>
              <Button
                size="sm"
                className="gap-2 btn-primary"
                onClick={() => { setEditingJob(null); setSelectedDept(""); setSelectedEducation("Bachelor's"); setPostedJob(null); }}
              >
                <Plus className="h-4 w-4" />
                Create New Job
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-xl bg-slate-900 border border-slate-800 text-slate-100 shadow-xl">
              <DialogHeader>
                <DialogTitle className="text-slate-100">
                  {postedJob ? "🎉 Job Posted Successfully!" : editingJob ? "Edit Job" : "Post New Job"}
                </DialogTitle>
                <DialogDescription className="text-slate-400">
                  {postedJob
                    ? "Share this link so applicants can apply. Our AI CV checker will automatically evaluate each submission."
                    : "Define the role requirements for the AI to match candidates."}
                </DialogDescription>
              </DialogHeader>

              {/* ── SUCCESS: Share Link Panel ── */}
              {postedJob ? (
                <div className="space-y-5 pt-2">
                  {/* Celebration Banner */}
                  <div className="flex items-center gap-3 p-4 bg-emerald-500/10 border border-emerald-500/25 rounded-xl">
                    <PartyPopper className="h-6 w-6 text-emerald-400 shrink-0" />
                    <div>
                      <p className="font-semibold text-emerald-300 text-sm">{postedJob.title}</p>
                      <p className="text-xs text-emerald-400/70 mt-0.5">Job is live — applicants can apply right now</p>
                    </div>
                  </div>

                  {/* Public Apply Link */}
                  <div className="space-y-2">
                    <label className="text-xs font-medium text-slate-400 uppercase tracking-wider flex items-center gap-1">
                      <Link2 className="h-3 w-3" /> Public Application Link
                    </label>
                    <div className="flex items-center gap-2 bg-slate-950 border border-indigo-500/30 rounded-lg px-3 py-2.5 group">
                      <span className="text-sm text-indigo-300 font-mono truncate flex-1 select-all">
                        {window.location.origin}/apply/{postedJob.id}
                      </span>
                      <Button
                        size="sm"
                        className="shrink-0 bg-indigo-600 hover:bg-indigo-500 text-white gap-1.5 h-7 text-xs"
                        onClick={() => copyLink(postedJob.id)}
                      >
                        <Copy className="h-3 w-3" /> Copy
                      </Button>
                    </div>
                    <p className="text-[11px] text-slate-500">
                      Share this link anywhere — anyone with the link can apply. Our AI will auto-score their CV.
                    </p>
                  </div>

                  {/* Job Board Link */}
                  <div className="space-y-2">
                    <label className="text-xs font-medium text-slate-400 uppercase tracking-wider flex items-center gap-1">
                      <Briefcase className="h-3 w-3" /> Full Careers Page
                    </label>
                    <div className="flex items-center gap-2 bg-slate-950 border border-slate-800 rounded-lg px-3 py-2.5">
                      <span className="text-sm text-slate-400 font-mono truncate flex-1">
                        {window.location.origin}/careers
                      </span>
                      <Button
                        size="sm"
                        variant="outline"
                        className="shrink-0 border-slate-700 text-slate-300 hover:bg-slate-800 gap-1.5 h-7 text-xs"
                        onClick={() => window.open("/careers", "_blank")}
                      >
                        <ExternalLink className="h-3 w-3" /> Open
                      </Button>
                    </div>
                  </div>

                  {/* Pipeline info */}
                  <div className="p-3 bg-slate-950/60 border border-slate-800 rounded-lg space-y-1.5">
                    <p className="text-[11px] font-semibold text-slate-300 uppercase tracking-wider">Automated Pipeline Active</p>
                    <div className="grid grid-cols-3 gap-2 text-center">
                      {["Applicant Uploads CV", "AI Scores & Evaluates", "You Accept / Reject"].map((step, i) => (
                        <div key={i} className="bg-slate-900 border border-slate-800 rounded-md p-2">
                          <div className="text-lg font-bold text-indigo-400">{i + 1}</div>
                          <div className="text-[10px] text-slate-400 leading-tight mt-0.5">{step}</div>
                        </div>
                      ))}
                    </div>
                  </div>

                  <Button
                    className="w-full btn-primary gap-2"
                    onClick={() => { setIsJobDialogOpen(false); setPostedJob(null); }}
                  >
                    <CheckCircle2 className="h-4 w-4" /> Done
                  </Button>
                </div>
              ) : (
                /* ── FORM ── */
                <form
                  className="space-y-4 pt-4"
                  onSubmit={(e) => {
                    e.preventDefault();
                    const f = new FormData(e.currentTarget);
                    jobMutation.mutate({
                      title: f.get("title"),
                      description: f.get("description"),
                      experience_required: parseInt(f.get("experience") as string),
                      required_skills: (f.get("skills") as string)
                        .split(",")
                        .map((s) => s.trim())
                        .filter((s) => s !== ""),
                      preferred_skills: (f.get("pref_skills") as string || "")
                        .split(",")
                        .map((s) => s.trim())
                        .filter((s) => s !== ""),
                      minimum_education: selectedEducation,
                      department_id: selectedDept || null,
                    });
                  }}
                >
                  <div className="space-y-2">
                    <Label className="text-slate-300">Job Title</Label>
                    <Input name="title" defaultValue={editingJob?.title} className="bg-slate-950 border-slate-800 text-slate-200" placeholder="e.g. Senior Frontend Engineer" required />
                  </div>
                  
                  <div className="grid grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <Label className="text-slate-300">Department</Label>
                      <Select value={selectedDept} onValueChange={setSelectedDept}>
                        <SelectTrigger className="bg-slate-950 border-slate-800 text-slate-200">
                          <SelectValue placeholder="Select dept" />
                        </SelectTrigger>
                        <SelectContent className="bg-slate-950 border-slate-800 text-slate-200">
                          {departments?.map((d: any) => (
                            <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label className="text-slate-300">Min. Exp (Years)</Label>
                      <Input name="experience" type="number" className="bg-slate-950 border-slate-800 text-slate-200" defaultValue={editingJob?.experience_required} placeholder="2" required />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-slate-300">Min. Education</Label>
                      <Select value={selectedEducation} onValueChange={setSelectedEducation}>
                        <SelectTrigger className="bg-slate-950 border-slate-800 text-slate-200">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="bg-slate-950 border-slate-800 text-slate-200">
                          <SelectItem value="None">None</SelectItem>
                          <SelectItem value="High School">High School</SelectItem>
                          <SelectItem value="Bachelor's">Bachelor's</SelectItem>
                          <SelectItem value="Master's">Master's</SelectItem>
                          <SelectItem value="PhD">PhD</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label className="text-slate-300">Required Skills (comma separated)</Label>
                      <Input name="skills" className="bg-slate-950 border-slate-800 text-slate-200" placeholder="Python, SQL, AWS" defaultValue={editingJob?.required_skills?.join(", ")} required />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-slate-300">Preferred Skills (comma separated)</Label>
                      <Input name="pref_skills" className="bg-slate-950 border-slate-800 text-slate-200" placeholder="Docker, GraphQL" defaultValue={editingJob?.preferred_skills?.join(", ")} />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-slate-300">Description</Label>
                    <Textarea name="description" className="bg-slate-950 border-slate-800 text-slate-200" defaultValue={editingJob?.description} placeholder="Describe the role..." rows={4} required />
                  </div>
                  <div className="pt-2 flex justify-end gap-3">
                    <Button type="button" variant="ghost" className="text-slate-400 hover:bg-slate-800 hover:text-slate-200" onClick={() => setIsJobDialogOpen(false)}>Cancel</Button>
                    <Button type="submit" disabled={jobMutation.isPending} className="btn-primary">
                      {jobMutation.isPending ? (
                        <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Posting...</>
                      ) : (
                        editingJob ? "Update Job" : "Post Job & Get Link"
                      )}
                    </Button>
                  </div>
                </form>
              )}
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* ── Applications Table ── */}
      <Card className="overflow-hidden border border-slate-800 bg-slate-900 shadow-elegant">
        <Table>
          <TableHeader className="bg-slate-950/40 border-b border-slate-800 text-slate-350">
            <TableRow className="border-b border-slate-800 hover:bg-transparent">
              <TableHead className="w-[250px] text-slate-300">Candidate</TableHead>
              <TableHead className="text-slate-300">Applied For</TableHead>
              <TableHead className="text-center text-slate-300">Match Score</TableHead>
              <TableHead className="text-center text-slate-300">Status</TableHead>
              <TableHead className="text-slate-300">Experience</TableHead>
              <TableHead className="text-right text-slate-300">Action</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              [1, 2, 3].map((i) => (
                <TableRow key={i} className="border-b border-slate-800/40">
                  <TableCell colSpan={6} className="h-16 animate-pulse bg-slate-950/20" />
                </TableRow>
              ))
            ) : filteredApplications?.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="h-32 text-center text-muted-foreground">
                  No applications found.
                </TableCell>
              </TableRow>
            ) : (
              filteredApplications?.map((app) => (
                <TableRow key={app.id} className="group border-b border-slate-800/40 hover:bg-slate-850/40 transition-colors">
                  <TableCell>
                    <div className="font-medium text-slate-200">{app.candidates?.name || "Unknown Candidate"}</div>
                    <div className="text-xs text-slate-400">{app.candidates?.email || "No Email"}</div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className="font-normal border-slate-800 bg-slate-950 text-slate-300">
                      {app.jobs?.title || "Unknown Position"}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-center">
                    <Badge className={cn("px-2 py-0.5 border font-semibold", getScoreColor(app.match_score))}>
                      {app.match_score != null ? `${Math.round(app.match_score)}%` : "N/A"}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-center">
                    <Badge className={cn("capitalize border font-medium", getStatusBadgeClass(app.status))}>
                      {app.status}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <span className="text-sm text-slate-300">{app.parsed_data?.experience_years ?? "—"} yrs</span>
                  </TableCell>
                  <TableCell className="text-right">
                    {/* Button opens the SINGLE lifted Dialog below, not a per-row dialog */}
                    <Button
                      variant="ghost"
                      size="sm"
                      className="gap-2 text-indigo-400 hover:text-indigo-350 hover:bg-slate-800/40"
                      onClick={() => openEvalDialog(app)}
                    >
                      View Insights
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </Card>

      {/* ── SINGLE Evaluation Dialog (lifted out of .map()) ── */}
      <Dialog
        open={evalDialogOpen}
        onOpenChange={(open) => {
          setEvalDialogOpen(open);
          if (!open) {
            // Brief delay so dialog animates out before clearing data
            setTimeout(() => {
              setSelectedApp(null);
              selectedAppRef.current = null;
              setMutationResult(null);
            }, 200);
          }
        }}
      >
        <DialogContent className="max-w-2xl bg-slate-900 border border-slate-800 text-slate-100 shadow-xl flex flex-col max-h-[90vh]">
          <DialogHeader className="shrink-0">
            <DialogTitle className="text-2xl text-slate-100">Candidate Evaluation</DialogTitle>
            <DialogDescription className="text-slate-400">
              AI-generated analysis for{" "}
              <strong className="text-slate-200">{selectedApp?.candidates?.name}</strong>
            </DialogDescription>
          </DialogHeader>

          {selectedApp && (
            <div className="flex flex-col flex-1 min-h-0">
            <div className="grid gap-5 py-2 overflow-y-auto flex-1 pr-1">
              {/* Score + CV Row */}
              <div className="flex items-center justify-between p-4 bg-slate-950 border border-slate-800 rounded-xl">
                <div className="space-y-1">
                  <p className="text-xs text-slate-550">Overall Match Score</p>
                  <p className="text-3xl font-bold text-indigo-400">
                    {selectedApp.match_score != null
                      ? `${Math.round(selectedApp.match_score)}%`
                      : "N/A"}
                  </p>
                </div>
                <div className="flex flex-col items-end gap-2">
                  <Badge className={cn("capitalize border font-medium text-sm px-3 py-1", getStatusBadgeClass(selectedApp.status))}>
                    {selectedApp.status}
                  </Badge>
                  {selectedApp.candidates?.cv_url && (
                    <Button variant="outline" size="sm" className="border-slate-800 bg-slate-900 text-slate-300 hover:bg-slate-850" asChild>
                      <a href={selectedApp.candidates.cv_url} target="_blank" rel="noreferrer" className="gap-2">
                        <FileText className="h-4 w-4" />
                        View CV
                      </a>
                    </Button>
                  )}
                </div>
              </div>

              {/* If new Decision Engine data exists, render the advanced audit UI */}
              {selectedApp.ai_evaluation?.admin_criteria_audit ? (
                <div className="space-y-4">
                  {/* Decision Banner */}
                  {selectedApp.ai_evaluation.automation_trigger?.final_decision === "ACCEPT" ? (
                    <div className="flex items-center gap-3 p-4 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-xl">
                      <CheckCircle2 className="h-6 w-6 shrink-0 text-emerald-400" />
                      <div>
                        <h4 className="font-bold text-sm">AUTOMATION STATUS: ACCEPTED FOR FINAL INTERVIEW</h4>
                        <p className="text-xs text-emerald-400/80 mt-0.5">Match Confidence Score: {selectedApp.ai_evaluation.automation_trigger.match_confidence_score}%</p>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center gap-3 p-4 bg-rose-500/10 border border-rose-500/20 text-rose-400 rounded-xl">
                      <XCircle className="h-6 w-6 shrink-0 text-rose-400" />
                      <div>
                        <h4 className="font-bold text-sm">AUTOMATION STATUS: REJECTED</h4>
                        <p className="text-xs text-rose-400/80 mt-0.5">Match Confidence Score: {selectedApp.ai_evaluation.automation_trigger?.match_confidence_score || 0}%</p>
                      </div>
                    </div>
                  )}

                  {/* Checklist Audit */}
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="p-4 border border-slate-800 rounded-xl bg-slate-950/40 space-y-2">
                      <h4 className="font-semibold text-sm text-slate-200">Requirements Check</h4>
                      
                      <div className="flex items-center justify-between text-xs py-1 border-b border-slate-800/60">
                        <span className="text-slate-400">Education Requirement:</span>
                        {selectedApp.ai_evaluation.admin_criteria_audit.education_rule_passed ? (
                          <Badge className="bg-emerald-500/10 text-emerald-400 border-emerald-500/20 text-[10px]">Passed</Badge>
                        ) : (
                          <Badge className="bg-rose-500/10 text-rose-400 border-rose-500/20 text-[10px]">Failed</Badge>
                        )}
                      </div>
                      <div className="text-[11px] text-slate-500">
                        Required: {selectedApp.jobs?.minimum_education || "Bachelor's"} | Found: {selectedApp.parsed_data?.education || "Unknown"}
                      </div>

                      <div className="flex items-center justify-between text-xs py-1 border-b border-slate-800/60 mt-2">
                        <span className="text-slate-400">Experience Requirement:</span>
                        {selectedApp.ai_evaluation.admin_criteria_audit.experience_rule_passed ? (
                          <Badge className="bg-emerald-500/10 text-emerald-400 border-emerald-500/20 text-[10px]">Passed</Badge>
                        ) : (
                          <Badge className="bg-rose-500/10 text-rose-400 border-rose-500/20 text-[10px]">Failed</Badge>
                        )}
                      </div>
                      <div className="text-[11px] text-slate-500">
                        Required: {selectedApp.jobs?.experience_required || 0} yrs | Found: {selectedApp.parsed_data?.experience_years ?? "—"} yrs
                      </div>
                    </div>

                    <div className="p-4 border border-slate-800 rounded-xl bg-slate-950/40 space-y-3">
                      <h4 className="font-semibold text-sm text-slate-200">Mandatory Skills Audit</h4>
                      <div className="space-y-1">
                        <span className="text-[10px] uppercase text-slate-500">Matched Required</span>
                        <div className="flex flex-wrap gap-1">
                          {selectedApp.ai_evaluation.admin_criteria_audit.mandatory_skills_matched?.length > 0 ? (
                            selectedApp.ai_evaluation.admin_criteria_audit.mandatory_skills_matched.map((s: string) => (
                              <Badge key={s} className="bg-emerald-500/10 text-emerald-400 border-emerald-500/20 text-[10px]">{s}</Badge>
                            ))
                          ) : (
                            <span className="text-xs text-slate-500">—</span>
                          )}
                        </div>
                      </div>
                      <div className="space-y-1">
                        <span className="text-[10px] uppercase text-slate-500">Missing Required</span>
                        <div className="flex flex-wrap gap-1">
                          {selectedApp.ai_evaluation.admin_criteria_audit.mandatory_skills_missing?.length > 0 ? (
                            selectedApp.ai_evaluation.admin_criteria_audit.mandatory_skills_missing.map((s: string) => (
                              <Badge key={s} className="bg-rose-500/10 text-rose-400 border-rose-500/20 text-[10px]">{s}</Badge>
                            ))
                          ) : (
                            <span className="text-[10px] text-emerald-400 font-medium bg-emerald-500/5 px-2 py-0.5 rounded border border-emerald-500/10">100% Mandatory Skills Met</span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Preferred Skills */}
                  <div className="p-4 border border-slate-800 rounded-xl bg-slate-950/40 space-y-2">
                    <h4 className="font-semibold text-sm text-slate-200">Preferred Skills Audit</h4>
                    <div className="flex flex-wrap gap-1">
                      {selectedApp.ai_evaluation.admin_criteria_audit.preferred_skills_matched?.length > 0 ? (
                        selectedApp.ai_evaluation.admin_criteria_audit.preferred_skills_matched.map((s: string) => (
                          <Badge key={s} className="bg-indigo-500/10 text-indigo-400 border-indigo-500/20 text-xs">{s}</Badge>
                        ))
                      ) : (
                        <span className="text-xs text-slate-500">No preferred skills matched.</span>
                      )}
                    </div>
                  </div>

                  {/* Log Justification */}
                  <div className="p-4 border border-slate-800 rounded-xl bg-slate-950 font-mono text-[11px] text-slate-350 space-y-1">
                    <span className="text-[10px] uppercase text-slate-500 font-sans">System Log Justification</span>
                    <p className="leading-relaxed">{selectedApp.ai_evaluation.system_log_justification}</p>
                  </div>
                </div>
              ) : (
                /* Fallback for older candidates */
                <>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-3 p-4 border border-slate-850 rounded-xl bg-slate-950/40">
                      <div className="flex items-center gap-2 text-green-400 font-semibold text-sm">
                        <CheckCircle2 className="h-4 w-4" />
                        Strengths
                      </div>
                      <p className="text-xs text-slate-300 leading-relaxed">
                        {selectedApp.ai_evaluation?.strengths || "No data available."}
                      </p>
                    </div>
                    <div className="space-y-3 p-4 border border-slate-850 rounded-xl bg-slate-950/40">
                      <div className="flex items-center gap-2 text-amber-400 font-semibold text-sm">
                        <AlertCircle className="h-4 w-4" />
                        Missing Skills
                      </div>
                      <div className="flex flex-wrap gap-1">
                        {selectedApp.ai_evaluation?.missing_skills?.length > 0 ? (
                          selectedApp.ai_evaluation.missing_skills.map((s: string) => (
                            <Badge key={s} className="bg-slate-900 border-slate-800 text-slate-300">{s}</Badge>
                          ))
                        ) : (
                          <span className="text-xs text-slate-500">None identified.</span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* AI Recommendation */}
                  <div className="space-y-3 p-5 border border-slate-850 rounded-xl bg-slate-950/40">
                    <div className="flex items-center gap-2 text-indigo-400 font-semibold text-sm">
                      <Award className="h-4 w-4" />
                      AI Recommendation
                    </div>
                    <p className="text-xs italic text-slate-300 leading-relaxed">
                      "{selectedApp.ai_evaluation?.recommendation || "No recommendation available."}"
                    </p>
                  </div>
                </>
              )}

              {/* DB Mutation Result Banner */}
              {mutationResult && (
                <div
                  className={cn(
                    "flex items-start gap-3 p-3 rounded-lg border text-sm font-medium",
                    mutationResult.type === "success"
                      ? "bg-green-950/30 border-green-900/40 text-green-400"
                      : "bg-red-950/30 border-red-900/40 text-red-400"
                  )}
                >
                  <Database className="h-4 w-4 mt-0.5 shrink-0" />
                  <span>{mutationResult.message}</span>
                </div>
              )}
            </div>

              {/* ── Sticky Action Buttons Footer ── */}
              <div className="shrink-0 flex gap-3 pt-3 border-t border-slate-800 mt-2">
                <Button
                  variant="destructive"
                  className="flex-1 gap-2"
                  disabled={statusMutation.isPending || selectedApp.status === "rejected"}
                  onClick={() =>
                    statusMutation.mutate({ appId: selectedApp.id, status: "rejected" })
                  }
                >
                  {statusMutation.isPending && statusMutation.variables?.status === "rejected" ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <ThumbsDown className="h-4 w-4" />
                  )}
                  Reject Candidate
                </Button>
                <Button
                  className="flex-1 gap-2 bg-green-600 hover:bg-green-700 text-white"
                  disabled={statusMutation.isPending || selectedApp.status === "hired"}
                  onClick={() =>
                    statusMutation.mutate({ appId: selectedApp.id, status: "hired" })
                  }
                >
                  {statusMutation.isPending && statusMutation.variables?.status === "hired" ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <ThumbsUp className="h-4 w-4" />
                  )}
                  Hire Candidate
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
