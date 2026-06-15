import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useMutation } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import {
  Upload,
  Loader2,
  ArrowLeft,
  CheckCircle2,
  Briefcase,
  GraduationCap,
  Clock,
  Sparkles,
  Zap,
  Brain,
  FileCheck,
  Send,
} from "lucide-react";

const STEPS = [
  { icon: Upload, label: "Uploading CV", detail: "Securely storing your document..." },
  { icon: Brain, label: "AI Parsing", detail: "Extracting skills, experience & education..." },
  { icon: FileCheck, label: "Job Matching", detail: "Comparing against role requirements..." },
  { icon: Send, label: "Submitting", detail: "Saving your application..." },
];

export default function Apply() {
  const { jobId } = useParams();
  const navigate = useNavigate();
  const [file, setFile] = useState<File | null>(null);
  const [submitted, setSubmitted] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [processingStep, setProcessingStep] = useState(-1);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [dragOver, setDragOver] = useState(false);

  const { data: job } = useQuery({
    queryKey: ["job", jobId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("jobs")
        .select("*, departments(name)")
        .eq("id", jobId!)
        .single();
      if (error) throw error;
      return data;
    },
  });

  const submitMutation = useMutation({
    mutationFn: async () => {
      setIsUploading(true);

      // Step 0: Read the file and build a real data URL the browser can open
      setProcessingStep(0);
      await new Promise(r => setTimeout(r, 400));

      // Convert file to a data URL (readable by browser) AND to raw base64 (for AI)
      const toDataUrl = (f: File) =>
        new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.readAsDataURL(f);
          reader.onload = () => resolve(reader.result as string);
          reader.onerror = reject;
        });

      const dataUrl = await toDataUrl(file!);                          // full data:application/pdf;base64,...
      const fileBase64 = dataUrl.split(",")[1];                        // raw base64 for AI function

      // Store the real data URL so admin can open it directly
      const cvUrl = dataUrl;

      setProcessingStep(1);
      await new Promise(r => setTimeout(r, 300));

      setProcessingStep(2);

      // Trigger AI CV processor
      const { data: processedData, error: edgeError } = await supabase.functions.invoke("process-cv", {
        body: {
          fileBase64,
          jobData: {
            title: job!.title,
            required_skills: job!.required_skills,
            preferred_skills: job!.preferred_skills || [],
            experience_required: job!.experience_required,
            minimum_education: job!.minimum_education || "Bachelor's",
          },
        },
      });

      if (edgeError) throw new Error(`AI Processing failed: ${edgeError.message || "Unknown"}`);
      if (processedData?.error) throw new Error(`${processedData.error}: ${processedData.details || ""}`);

      setProcessingStep(3);
      await new Promise(r => setTimeout(r, 300));

      // Submit via RPC — pass the real data URL as cv_url
      const { data: result, error: rpcError } = await supabase.rpc("submit_application", {
        p_name: name,
        p_email: email,
        p_cv_url: cvUrl,
        p_job_id: jobId as string,
        p_parsed_data: {
          skills: processedData.skills,
          experience_years: processedData.experience_years,
          education: processedData.education,
          projects: processedData.projects,
        },
        p_match_score: processedData.score ?? null,
        p_ai_evaluation: processedData.insights ?? null,
      });

      if (rpcError) throw rpcError;
      if (!(result as any)?.success) throw new Error("Failed to submit application");
      return { score: processedData.score };
    },
    onSuccess: () => {
      setSubmitted(true);
      toast.success("Application submitted! AI evaluation complete.");
      setIsUploading(false);
    },
    onError: (err: any) => {
      toast.error(err.message || "Failed to submit application");
      setIsUploading(false);
      setProcessingStep(-1);
    },
  });

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!file) return toast.error("Please upload your CV");
    if (!name.trim() || !email.trim()) return toast.error("Please fill in all fields");
    submitMutation.mutate();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const dropped = e.dataTransfer.files[0];
    if (dropped && dropped.type === "application/pdf") setFile(dropped);
    else toast.error("Please drop a PDF file");
  };

  const base: React.CSSProperties = {
    minHeight: "100vh",
    background: "linear-gradient(135deg, #0a0a1a 0%, #0d1224 40%, #0a0f1e 100%)",
    fontFamily: "'Inter', sans-serif",
    color: "white",
    position: "relative",
  };

  // ── SUBMITTED STATE ──
  if (submitted) {
    return (
      <div style={base}>
        <div style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0, overflow: "hidden", pointerEvents: "none" }}>
          <div style={{ position: "absolute", top: "-10%", left: "-5%", width: "500px", height: "500px", borderRadius: "50%", background: "radial-gradient(circle, rgba(99,102,241,0.12) 0%, transparent 70%)" }} />
          <div style={{ position: "absolute", bottom: "10%", right: "-5%", width: "400px", height: "400px", borderRadius: "50%", background: "radial-gradient(circle, rgba(16,185,129,0.08) 0%, transparent 70%)" }} />
        </div>
        <div style={{ position: "relative", zIndex: 1, display: "flex", alignItems: "center", justifyContent: "center", minHeight: "100vh", padding: "20px" }}>
          <div style={{ maxWidth: "440px", width: "100%", background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: "24px", padding: "48px 40px", textAlign: "center" }}>
            <div style={{ width: "72px", height: "72px", borderRadius: "50%", background: "rgba(16,185,129,0.15)", border: "2px solid rgba(16,185,129,0.3)", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 24px" }}>
              <CheckCircle2 size={32} color="#10b981" />
            </div>
            <h2 style={{ fontSize: "24px", fontWeight: 700, marginBottom: "12px" }}>Application Received!</h2>
            <p style={{ color: "rgba(255,255,255,0.5)", fontSize: "15px", lineHeight: 1.6, marginBottom: "32px" }}>
              Thank you for applying for <strong style={{ color: "white" }}>{job?.title}</strong>. Our AI has evaluated your CV and your profile is under review.
            </p>

            {/* AI note */}
            <div style={{ background: "rgba(99,102,241,0.08)", border: "1px solid rgba(99,102,241,0.2)", borderRadius: "12px", padding: "12px 16px", marginBottom: "24px", display: "flex", alignItems: "center", gap: "10px", textAlign: "left" }}>
              <Sparkles size={16} color="#a5b4fc" />
              <span style={{ color: "#a5b4fc", fontSize: "13px", lineHeight: 1.5 }}>
                Our AI has already scored your CV against the role requirements. We'll be in touch soon.
              </span>
            </div>

            <button
              onClick={() => navigate("/careers")}
              style={{ width: "100%", padding: "12px", borderRadius: "10px", background: "rgba(255,255,255,0.07)", border: "1px solid rgba(255,255,255,0.1)", color: "rgba(255,255,255,0.7)", fontSize: "14px", cursor: "pointer" }}
            >
              ← Back to Careers
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ── PROCESSING STATE ──
  if (isUploading) {
    return (
      <div style={base}>
        <div style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0, overflow: "hidden", pointerEvents: "none" }}>
          <div style={{ position: "absolute", top: "-10%", left: "-5%", width: "500px", height: "500px", borderRadius: "50%", background: "radial-gradient(circle, rgba(99,102,241,0.12) 0%, transparent 70%)" }} />
        </div>
        <div style={{ position: "relative", zIndex: 1, display: "flex", alignItems: "center", justifyContent: "center", minHeight: "100vh", padding: "20px" }}>
          <div style={{ maxWidth: "440px", width: "100%", background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: "24px", padding: "48px 40px", textAlign: "center" }}>
            <div style={{ width: "64px", height: "64px", borderRadius: "50%", background: "linear-gradient(135deg, #6366f1, #8b5cf6)", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 24px", animation: "spin 2s linear infinite" }}>
              <Brain size={28} color="white" />
            </div>
            <h2 style={{ fontSize: "20px", fontWeight: 700, marginBottom: "6px" }}>AI Processing Your CV</h2>
            <p style={{ color: "rgba(255,255,255,0.4)", fontSize: "13px", marginBottom: "36px" }}>This usually takes 10–20 seconds</p>

            <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
              {STEPS.map((step, i) => {
                const isActive = i === processingStep;
                const isDone = i < processingStep;
                const Icon = step.icon;
                return (
                  <div key={i} style={{ display: "flex", alignItems: "center", gap: "14px", padding: "12px 16px", borderRadius: "12px", background: isActive ? "rgba(99,102,241,0.1)" : isDone ? "rgba(16,185,129,0.06)" : "rgba(255,255,255,0.02)", border: `1px solid ${isActive ? "rgba(99,102,241,0.3)" : isDone ? "rgba(16,185,129,0.2)" : "rgba(255,255,255,0.05)"}`, transition: "all 0.3s" }}>
                    <div style={{ width: "32px", height: "32px", borderRadius: "8px", background: isActive ? "rgba(99,102,241,0.2)" : isDone ? "rgba(16,185,129,0.15)" : "rgba(255,255,255,0.05)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                      {isDone ? <CheckCircle2 size={16} color="#10b981" /> : isActive ? <Loader2 size={16} color="#a5b4fc" style={{ animation: "spin 1s linear infinite" }} /> : <Icon size={16} color="rgba(255,255,255,0.2)" />}
                    </div>
                    <div style={{ textAlign: "left" }}>
                      <div style={{ fontSize: "13px", fontWeight: 600, color: isActive ? "#a5b4fc" : isDone ? "#10b981" : "rgba(255,255,255,0.3)" }}>{step.label}</div>
                      {isActive && <div style={{ fontSize: "11px", color: "rgba(165,180,252,0.6)", marginTop: "2px" }}>{step.detail}</div>}
                    </div>
                  </div>
                );
              })}
            </div>
            <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
          </div>
        </div>
      </div>
    );
  }

  // ── MAIN FORM ──
  return (
    <div style={base}>
      {/* Orbs */}
      <div style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0, overflow: "hidden", pointerEvents: "none", zIndex: 0 }}>
        <div style={{ position: "absolute", top: "-10%", left: "-10%", width: "500px", height: "500px", borderRadius: "50%", background: "radial-gradient(circle, rgba(99,102,241,0.12) 0%, transparent 70%)" }} />
        <div style={{ position: "absolute", bottom: "0", right: "0", width: "400px", height: "400px", borderRadius: "50%", background: "radial-gradient(circle, rgba(168,85,247,0.07) 0%, transparent 70%)" }} />
      </div>

      <div style={{ position: "relative", zIndex: 1, maxWidth: "900px", margin: "0 auto", padding: "32px 20px 60px" }}>
        {/* Back */}
        <button
          onClick={() => navigate("/careers")}
          style={{ display: "inline-flex", alignItems: "center", gap: "6px", color: "rgba(255,255,255,0.4)", fontSize: "13px", background: "none", border: "none", cursor: "pointer", marginBottom: "32px", padding: 0 }}
          onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.color = "rgba(255,255,255,0.7)"; }}
          onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.color = "rgba(255,255,255,0.4)"; }}
        >
          <ArrowLeft size={14} /> Back to Jobs
        </button>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 380px", gap: "24px", alignItems: "start" }}>
          {/* Left — Job Info */}
          <div style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: "20px", padding: "32px" }}>
            {/* Company badge */}
            <div style={{ display: "inline-flex", alignItems: "center", gap: "6px", background: "rgba(99,102,241,0.12)", border: "1px solid rgba(99,102,241,0.25)", borderRadius: "100px", padding: "4px 12px 4px 8px", marginBottom: "20px" }}>
              <Zap size={12} color="#a5b4fc" />
              <span style={{ color: "#a5b4fc", fontSize: "11px", fontWeight: 500 }}>DeVerse IT Solutions</span>
            </div>

            <h1 style={{ fontSize: "28px", fontWeight: 800, letterSpacing: "-0.5px", marginBottom: "8px", lineHeight: 1.2 }}>{job?.title || "Loading..."}</h1>

            <div style={{ display: "flex", gap: "16px", color: "rgba(255,255,255,0.4)", fontSize: "13px", marginBottom: "28px" }}>
              <span style={{ display: "flex", alignItems: "center", gap: "4px" }}><Briefcase size={13} /> {job?.departments?.name || "General"}</span>
              <span style={{ display: "flex", alignItems: "center", gap: "4px" }}><Clock size={13} /> {job?.experience_required}+ yrs exp</span>
              <span style={{ display: "flex", alignItems: "center", gap: "4px" }}><GraduationCap size={13} /> {job?.minimum_education || "Bachelor's"}</span>
            </div>

            {job?.description && (
              <div style={{ marginBottom: "28px" }}>
                <h3 style={{ fontSize: "13px", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.5px", color: "rgba(255,255,255,0.4)", marginBottom: "10px" }}>About the Role</h3>
                <p style={{ color: "rgba(255,255,255,0.6)", fontSize: "14px", lineHeight: 1.7 }}>{job.description}</p>
              </div>
            )}

            <div style={{ marginBottom: "20px" }}>
              <h3 style={{ fontSize: "13px", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.5px", color: "rgba(255,255,255,0.4)", marginBottom: "10px" }}>Required Skills</h3>
              <div style={{ display: "flex", flexWrap: "wrap", gap: "6px" }}>
                {job?.required_skills?.map((s: string) => (
                  <span key={s} style={{ background: "rgba(99,102,241,0.1)", border: "1px solid rgba(99,102,241,0.2)", color: "#a5b4fc", fontSize: "12px", padding: "3px 10px", borderRadius: "6px" }}>{s}</span>
                ))}
              </div>
            </div>

            {job?.preferred_skills?.length > 0 && (
              <div>
                <h3 style={{ fontSize: "13px", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.5px", color: "rgba(255,255,255,0.4)", marginBottom: "10px" }}>Preferred Skills</h3>
                <div style={{ display: "flex", flexWrap: "wrap", gap: "6px" }}>
                  {job.preferred_skills.map((s: string) => (
                    <span key={s} style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", color: "rgba(255,255,255,0.5)", fontSize: "12px", padding: "3px 10px", borderRadius: "6px" }}>{s}</span>
                  ))}
                </div>
              </div>
            )}

            {/* AI badge */}
            <div style={{ marginTop: "28px", display: "flex", alignItems: "center", gap: "10px", background: "rgba(99,102,241,0.06)", border: "1px solid rgba(99,102,241,0.15)", borderRadius: "10px", padding: "12px 16px" }}>
              <Sparkles size={14} color="#a5b4fc" />
              <span style={{ color: "rgba(165,180,252,0.8)", fontSize: "12px", lineHeight: 1.5 }}>
                Your CV is automatically evaluated by AI. You'll see your fit score instantly.
              </span>
            </div>
          </div>

          {/* Right — Application Form */}
          <div style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: "20px", padding: "28px", position: "sticky", top: "20px" }}>
            <h2 style={{ fontSize: "18px", fontWeight: 700, marginBottom: "4px" }}>Apply Now</h2>
            <p style={{ color: "rgba(255,255,255,0.4)", fontSize: "13px", marginBottom: "24px" }}>Takes less than 2 minutes</p>

            <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
              {/* Name */}
              <div>
                <label style={{ display: "block", fontSize: "12px", fontWeight: 500, color: "rgba(255,255,255,0.5)", marginBottom: "6px", textTransform: "uppercase", letterSpacing: "0.5px" }}>Full Name</label>
                <input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="John Doe"
                  required
                  style={{ width: "100%", padding: "10px 14px", background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: "10px", color: "white", fontSize: "14px", outline: "none", boxSizing: "border-box" }}
                />
              </div>

              {/* Email */}
              <div>
                <label style={{ display: "block", fontSize: "12px", fontWeight: 500, color: "rgba(255,255,255,0.5)", marginBottom: "6px", textTransform: "uppercase", letterSpacing: "0.5px" }}>Email Address</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="john@example.com"
                  required
                  style={{ width: "100%", padding: "10px 14px", background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: "10px", color: "white", fontSize: "14px", outline: "none", boxSizing: "border-box" }}
                />
              </div>

              {/* CV Upload */}
              <div>
                <label style={{ display: "block", fontSize: "12px", fontWeight: 500, color: "rgba(255,255,255,0.5)", marginBottom: "6px", textTransform: "uppercase", letterSpacing: "0.5px" }}>Resume / CV (PDF)</label>
                <div
                  onClick={() => document.getElementById("cv-upload-input")?.click()}
                  onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                  onDragLeave={() => setDragOver(false)}
                  onDrop={handleDrop}
                  style={{
                    border: `2px dashed ${file ? "rgba(99,102,241,0.5)" : dragOver ? "rgba(99,102,241,0.4)" : "rgba(255,255,255,0.08)"}`,
                    borderRadius: "12px",
                    padding: "28px 20px",
                    textAlign: "center",
                    cursor: "pointer",
                    background: file ? "rgba(99,102,241,0.06)" : dragOver ? "rgba(99,102,241,0.04)" : "rgba(255,255,255,0.02)",
                    transition: "all 0.2s",
                  }}
                >
                  <input id="cv-upload-input" type="file" accept=".pdf" style={{ display: "none" }} onChange={(e) => setFile(e.target.files?.[0] || null)} />
                  {file ? (
                    <>
                      <FileCheck size={28} color="#a5b4fc" style={{ margin: "0 auto 8px" }} />
                      <div style={{ color: "#a5b4fc", fontWeight: 600, fontSize: "13px" }}>{file.name}</div>
                      <div style={{ color: "rgba(165,180,252,0.5)", fontSize: "11px", marginTop: "4px" }}>Click to change</div>
                    </>
                  ) : (
                    <>
                      <Upload size={28} color="rgba(255,255,255,0.2)" style={{ margin: "0 auto 8px" }} />
                      <div style={{ color: "rgba(255,255,255,0.5)", fontSize: "13px", fontWeight: 500 }}>Click to upload or drag & drop</div>
                      <div style={{ color: "rgba(255,255,255,0.25)", fontSize: "11px", marginTop: "4px" }}>PDF only — max 5MB</div>
                    </>
                  )}
                </div>
              </div>

              {/* Submit */}
              <button
                type="submit"
                disabled={!file || !name || !email}
                style={{
                  width: "100%",
                  padding: "13px",
                  borderRadius: "10px",
                  background: (!file || !name || !email) ? "rgba(99,102,241,0.3)" : "linear-gradient(135deg, #6366f1, #8b5cf6)",
                  border: "none",
                  color: "white",
                  fontSize: "15px",
                  fontWeight: 600,
                  cursor: (!file || !name || !email) ? "not-allowed" : "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: "8px",
                  transition: "opacity 0.2s",
                }}
              >
                <Sparkles size={16} /> Submit Application
              </button>

              <p style={{ color: "rgba(255,255,255,0.2)", fontSize: "11px", textAlign: "center" }}>
                By submitting you agree to our application processing policy
              </p>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
