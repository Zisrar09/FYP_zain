import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Link } from "react-router-dom";
import { Briefcase, MapPin, Clock, ChevronRight, Search, Sparkles, Users, Zap } from "lucide-react";

export default function Careers() {
  const [search, setSearch] = useState("");
  const [activeFilter, setActiveFilter] = useState("All");

  const { data: jobs, isLoading } = useQuery({
    queryKey: ["public-jobs"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("jobs")
        .select("*, departments(name)")
        .eq("status", "open")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const departments = ["All", ...Array.from(new Set((jobs || []).map((j: any) => j.departments?.name || "General")))];

  const filtered = (jobs || []).filter((job: any) => {
    const matchesSearch =
      !search ||
      job.title?.toLowerCase().includes(search.toLowerCase()) ||
      job.required_skills?.some((s: string) => s.toLowerCase().includes(search.toLowerCase()));
    const matchesDept =
      activeFilter === "All" || (job.departments?.name || "General") === activeFilter;
    return matchesSearch && matchesDept;
  });

  return (
    <div style={{ minHeight: "100vh", background: "linear-gradient(135deg, #0a0a1a 0%, #0d1224 40%, #0a0f1e 100%)", fontFamily: "'Inter', sans-serif" }}>
      {/* Animated gradient orbs */}
      <div style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0, overflow: "hidden", pointerEvents: "none", zIndex: 0 }}>
        <div style={{ position: "absolute", top: "-10%", left: "-10%", width: "500px", height: "500px", borderRadius: "50%", background: "radial-gradient(circle, rgba(99,102,241,0.12) 0%, transparent 70%)" }} />
        <div style={{ position: "absolute", top: "30%", right: "-5%", width: "400px", height: "400px", borderRadius: "50%", background: "radial-gradient(circle, rgba(168,85,247,0.08) 0%, transparent 70%)" }} />
        <div style={{ position: "absolute", bottom: "0", left: "30%", width: "600px", height: "300px", borderRadius: "50%", background: "radial-gradient(circle, rgba(59,130,246,0.06) 0%, transparent 70%)" }} />
      </div>

      <div style={{ position: "relative", zIndex: 1 }}>
        {/* Header / Nav */}
        <nav style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "20px 40px", borderBottom: "1px solid rgba(255,255,255,0.05)", backdropFilter: "blur(10px)", background: "rgba(10,10,26,0.8)" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <div style={{ width: "32px", height: "32px", borderRadius: "8px", background: "linear-gradient(135deg, #6366f1, #8b5cf6)", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <Zap size={16} color="white" />
            </div>
            <span style={{ color: "white", fontWeight: 700, fontSize: "16px", letterSpacing: "-0.3px" }}>DeVerse HR</span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: "8px", color: "rgba(255,255,255,0.5)", fontSize: "13px" }}>
            <span>{jobs?.length || 0} open positions</span>
          </div>
        </nav>

        {/* Hero */}
        <div style={{ textAlign: "center", padding: "72px 20px 48px", maxWidth: "700px", margin: "0 auto" }}>
          <div style={{ display: "inline-flex", alignItems: "center", gap: "6px", background: "rgba(99,102,241,0.12)", border: "1px solid rgba(99,102,241,0.25)", borderRadius: "100px", padding: "4px 12px 4px 8px", marginBottom: "24px" }}>
            <Sparkles size={12} color="#a5b4fc" />
            <span style={{ color: "#a5b4fc", fontSize: "12px", fontWeight: 500 }}>AI-Powered Hiring</span>
          </div>
          <h1 style={{ color: "white", fontSize: "clamp(32px, 5vw, 54px)", fontWeight: 800, lineHeight: 1.15, letterSpacing: "-1px", marginBottom: "16px" }}>
            Join <span style={{ background: "linear-gradient(135deg, #6366f1, #a855f7)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>DeVerse</span><br />IT Solutions
          </h1>
          <p style={{ color: "rgba(255,255,255,0.5)", fontSize: "17px", lineHeight: 1.7, maxWidth: "500px", margin: "0 auto 36px" }}>
            Build the future of HR technology with us. Upload your CV and our AI evaluates your fit in seconds.
          </p>

          {/* Stats row */}
          <div style={{ display: "flex", justifyContent: "center", gap: "40px", marginBottom: "40px" }}>
            {[
              { icon: Briefcase, label: "Open Roles", value: jobs?.length || 0 },
              { icon: Zap, label: "AI Matching", value: "Instant" },
              { icon: Users, label: "Remote First", value: "100%" },
            ].map(({ icon: Icon, label, value }) => (
              <div key={label} style={{ textAlign: "center" }}>
                <div style={{ color: "#6366f1", display: "flex", justifyContent: "center", marginBottom: "4px" }}><Icon size={18} /></div>
                <div style={{ color: "white", fontWeight: 700, fontSize: "18px" }}>{value}</div>
                <div style={{ color: "rgba(255,255,255,0.4)", fontSize: "12px" }}>{label}</div>
              </div>
            ))}
          </div>

          {/* Search */}
          <div style={{ position: "relative", maxWidth: "440px", margin: "0 auto" }}>
            <Search style={{ position: "absolute", left: "14px", top: "50%", transform: "translateY(-50%)", color: "rgba(255,255,255,0.3)" }} size={16} />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search roles or skills..."
              style={{ width: "100%", paddingLeft: "44px", paddingRight: "16px", paddingTop: "12px", paddingBottom: "12px", background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: "12px", color: "white", fontSize: "14px", outline: "none", boxSizing: "border-box" }}
            />
          </div>
        </div>

        {/* Filter Tabs */}
        <div style={{ maxWidth: "960px", margin: "0 auto", padding: "0 20px 20px", display: "flex", gap: "8px", flexWrap: "wrap", justifyContent: "center" }}>
          {departments.map((dept) => (
            <button
              key={dept}
              onClick={() => setActiveFilter(dept)}
              style={{
                padding: "6px 16px",
                borderRadius: "100px",
                border: activeFilter === dept ? "1px solid rgba(99,102,241,0.5)" : "1px solid rgba(255,255,255,0.08)",
                background: activeFilter === dept ? "rgba(99,102,241,0.15)" : "rgba(255,255,255,0.03)",
                color: activeFilter === dept ? "#a5b4fc" : "rgba(255,255,255,0.5)",
                fontSize: "13px",
                fontWeight: activeFilter === dept ? 600 : 400,
                cursor: "pointer",
                transition: "all 0.2s",
              }}
            >
              {dept}
            </button>
          ))}
        </div>

        {/* Job Cards Grid */}
        <div style={{ maxWidth: "960px", margin: "0 auto", padding: "0 20px 80px", display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(420px, 1fr))", gap: "16px" }}>
          {isLoading
            ? [1, 2, 3, 4].map((i) => (
                <div key={i} style={{ height: "180px", borderRadius: "16px", background: "rgba(255,255,255,0.04)", animation: "pulse 1.5s infinite" }} />
              ))
            : filtered.length === 0
            ? (
              <div style={{ gridColumn: "1 / -1", textAlign: "center", padding: "80px 20px" }}>
                <Briefcase size={40} color="rgba(255,255,255,0.15)" style={{ margin: "0 auto 12px" }} />
                <p style={{ color: "rgba(255,255,255,0.3)", fontSize: "15px" }}>No open positions match your search.</p>
              </div>
            )
            : filtered.map((job: any) => (
              <div
                key={job.id}
                style={{
                  background: "rgba(255,255,255,0.03)",
                  border: "1px solid rgba(255,255,255,0.07)",
                  borderRadius: "16px",
                  padding: "24px",
                  display: "flex",
                  flexDirection: "column",
                  gap: "16px",
                  transition: "all 0.2s",
                  cursor: "pointer",
                  position: "relative",
                  overflow: "hidden",
                }}
                onMouseEnter={(e) => {
                  (e.currentTarget as HTMLDivElement).style.border = "1px solid rgba(99,102,241,0.3)";
                  (e.currentTarget as HTMLDivElement).style.background = "rgba(99,102,241,0.05)";
                  (e.currentTarget as HTMLDivElement).style.transform = "translateY(-2px)";
                }}
                onMouseLeave={(e) => {
                  (e.currentTarget as HTMLDivElement).style.border = "1px solid rgba(255,255,255,0.07)";
                  (e.currentTarget as HTMLDivElement).style.background = "rgba(255,255,255,0.03)";
                  (e.currentTarget as HTMLDivElement).style.transform = "translateY(0)";
                }}
              >
                {/* Dept badge + date */}
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span style={{ background: "rgba(99,102,241,0.12)", border: "1px solid rgba(99,102,241,0.2)", color: "#a5b4fc", fontSize: "11px", fontWeight: 600, padding: "3px 10px", borderRadius: "100px", textTransform: "uppercase", letterSpacing: "0.5px" }}>
                    {job.departments?.name || "General"}
                  </span>
                  <span style={{ color: "rgba(255,255,255,0.3)", fontSize: "11px", display: "flex", alignItems: "center", gap: "4px" }}>
                    <Clock size={11} /> {new Date(job.created_at).toLocaleDateString()}
                  </span>
                </div>

                {/* Title */}
                <div>
                  <h3 style={{ color: "white", fontSize: "18px", fontWeight: 700, marginBottom: "8px", letterSpacing: "-0.3px" }}>{job.title}</h3>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: "6px" }}>
                    {job.required_skills?.slice(0, 4).map((skill: string) => (
                      <span key={skill} style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)", color: "rgba(255,255,255,0.6)", fontSize: "11px", padding: "2px 8px", borderRadius: "6px" }}>
                        {skill}
                      </span>
                    ))}
                    {(job.required_skills?.length || 0) > 4 && (
                      <span style={{ color: "rgba(255,255,255,0.3)", fontSize: "11px", padding: "2px 0" }}>+{job.required_skills.length - 4} more</span>
                    )}
                  </div>
                </div>

                {/* Footer */}
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", paddingTop: "12px", borderTop: "1px solid rgba(255,255,255,0.06)" }}>
                  <div style={{ display: "flex", gap: "16px", color: "rgba(255,255,255,0.4)", fontSize: "12px" }}>
                    <span style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                      <Briefcase size={12} /> {job.experience_required}+ yrs
                    </span>
                    <span style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                      <MapPin size={12} /> Remote
                    </span>
                  </div>
                  <Link
                    to={`/apply/${job.id}`}
                    style={{ display: "inline-flex", alignItems: "center", gap: "4px", background: "linear-gradient(135deg, #6366f1, #8b5cf6)", color: "white", fontSize: "13px", fontWeight: 600, padding: "8px 16px", borderRadius: "8px", textDecoration: "none", transition: "opacity 0.2s" }}
                    onMouseEnter={(e) => { (e.currentTarget as HTMLAnchorElement).style.opacity = "0.9"; }}
                    onMouseLeave={(e) => { (e.currentTarget as HTMLAnchorElement).style.opacity = "1"; }}
                  >
                    Apply Now <ChevronRight size={14} />
                  </Link>
                </div>
              </div>
            ))}
        </div>

        {/* Footer */}
        <div style={{ borderTop: "1px solid rgba(255,255,255,0.05)", textAlign: "center", padding: "24px", color: "rgba(255,255,255,0.2)", fontSize: "12px" }}>
          Powered by <span style={{ color: "#6366f1", fontWeight: 600 }}>DeVerse HR Suite</span> — AI-Assisted Hiring
        </div>
      </div>
    </div>
  );
}
