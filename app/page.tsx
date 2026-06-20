"use client";

import { useEffect, useState } from "react";
import type { User } from "@supabase/supabase-js";
import ReactMarkdown from "react-markdown";
import jsPDF from "jspdf";
import { supabase } from "./lib/supabase";

type BusinessIdea = {
  id: number;
  idea: string;
  result: string | null;
  created_at: string;
  project_id: string | null;
};

type Project = {
  id: string;
  user_id: string;
  project_name: string;
  project_type: string | null;
  created_at: string;
};

type AnalysisMode = "analyze" | "names" | "content" | "ebook";

export default function Home() {
  const [user, setUser] = useState<User | null>(null);
  const [email, setEmail] = useState("");

  const [idea, setIdea] = useState("");
  const [result, setResult] = useState("");
  const [loading, setLoading] = useState(false);
  const [authLoading, setAuthLoading] = useState(false);

  const [history, setHistory] = useState<BusinessIdea[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState("");

  const [projectName, setProjectName] = useState("");
  const [projectType, setProjectType] = useState("Dropshipping");
  const [projectLoading, setProjectLoading] = useState(false);

  const [mode, setMode] = useState<AnalysisMode>("analyze");

  const filteredHistory =
    selectedProjectId === ""
      ? history
      : history.filter((item) => item.project_id === selectedProjectId);

  const getProjectName = (projectId: string | null) => {
    if (!projectId) return "No project";
    return (
      projects.find((project) => project.id === projectId)?.project_name ||
      "Unknown project"
    );
  };

  const loadHistory = async () => {
    if (!user) return;

    const { data, error } = await supabase
      .from("business_ideas")
      .select("id, idea, result, created_at, project_id")
      .order("created_at", { ascending: false })
      .limit(20);

    if (!error && data) {
      setHistory(data as BusinessIdea[]);
    }
  };

  const loadProjects = async () => {
    if (!user) return;

    const { data, error } = await supabase
      .from("projects")
      .select("id, user_id, project_name, project_type, created_at")
      .order("created_at", { ascending: false });

    if (error) {
      alert(error.message);
      return;
    }

    if (data) {
      setProjects(data as Project[]);

      if (data.length > 0 && !selectedProjectId) {
        setSelectedProjectId(data[0].id);
      }
    }
  };

  useEffect(() => {
    const getUser = async () => {
      const { data } = await supabase.auth.getUser();
      setUser(data.user);
    };

    getUser();

    const { data: listener } = supabase.auth.onAuthStateChange(
      async (_event, session) => {
        setUser(session?.user ?? null);
      }
    );

    return () => {
      listener.subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (user) {
      loadHistory();
      loadProjects();
    } else {
      setHistory([]);
      setProjects([]);
      setSelectedProjectId("");
    }
  }, [user]);

  const loginWithGoogle = async () => {
    setAuthLoading(true);

    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: window.location.origin,
      },
    });

    setAuthLoading(false);

    if (error) {
      alert(error.message);
    }
  };

  const loginWithEmailMagicLink = async () => {
    if (!email.trim()) {
      alert("Please enter your email first");
      return;
    }

    setAuthLoading(true);

    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: window.location.origin,
      },
    });

    setAuthLoading(false);

    if (error) {
      alert(error.message);
      return;
    }

    alert("Magic link sent! Please check your email.");
  };

  const logout = async () => {
    await supabase.auth.signOut();
    setResult("");
    setIdea("");
    setHistory([]);
    setProjects([]);
    setSelectedProjectId("");
  };

  const createProject = async () => {
    if (!user) {
      alert("Please login first");
      return;
    }

    if (!projectName.trim()) {
      alert("Please enter a project name");
      return;
    }

    setProjectLoading(true);

    const { data, error } = await supabase
      .from("projects")
      .insert([
        {
          project_name: projectName,
          project_type: projectType,
          user_id: user.id,
        },
      ])
      .select("id, user_id, project_name, project_type, created_at")
      .single();

    setProjectLoading(false);

    if (error) {
      alert(error.message);
      return;
    }

    setProjectName("");
    setProjectType("Dropshipping");

    if (data) {
      setSelectedProjectId(data.id);
    }

    await loadProjects();
  };

  const deleteProject = async (id: string) => {
    const confirmDelete = confirm("Delete this project?");
    if (!confirmDelete) return;

    const { error } = await supabase.from("projects").delete().eq("id", id);

    if (error) {
      alert(error.message);
      return;
    }

    if (selectedProjectId === id) {
      setSelectedProjectId("");
    }

    await loadProjects();
    await loadHistory();
  };

  const downloadPDF = () => {
    if (!result) return;

    const doc = new jsPDF();
    const pageHeight = doc.internal.pageSize.height;
    const margin = 10;
    const lineHeight = 7;
    let y = margin;

    doc.setFont("helvetica");
    doc.setFontSize(16);
    doc.text("Heybabe AI Analysis", margin, y);
    y += 10;

    doc.setFontSize(11);

    const cleanText = result
      .replaceAll("#", "")
      .replaceAll("*", "")
      .replaceAll("`", "");

    const lines = doc.splitTextToSize(cleanText, 180);

    lines.forEach((line: string) => {
      if (y > pageHeight - margin) {
        doc.addPage();
        y = margin;
      }

      doc.text(line, margin, y);
      y += lineHeight;
    });

    doc.save("heybabe-analysis.pdf");
  };

  const copyAnalysis = async () => {
    if (!result) return;

    await navigator.clipboard.writeText(result);
    alert("Copied analysis!");
  };

  const deleteHistory = async (id: number) => {
    const { error } = await supabase
      .from("business_ideas")
      .delete()
      .eq("id", id);

    if (error) {
      alert(error.message);
      return;
    }

    await loadHistory();
  };

  const openHistory = (item: BusinessIdea) => {
    setIdea(item.idea);
    setResult(item.result || "");

    if (item.project_id) {
      setSelectedProjectId(item.project_id);
    }
  };

  const analyzeIdea = async () => {
    if (!user) {
      alert("Please login first");
      return;
    }

    if (!idea.trim()) {
      alert("Please enter a business idea first");
      return;
    }

    if (projects.length > 0 && !selectedProjectId) {
      alert("Please select a project first");
      return;
    }

    setLoading(true);
    setResult("");

    const response = await fetch("/api/analyze", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ idea, mode }),
    });

    const data = await response.json();

    if (data.error) {
      alert(data.error);
      setLoading(false);
      return;
    }

    setResult(data.result);

    const { error } = await supabase.from("business_ideas").insert([
      {
        idea,
        result: data.result,
        user_id: user.id,
        project_id: selectedProjectId || null,
      },
    ]);

    if (error) {
      alert(error.message);
    }

    await loadHistory();
    setLoading(false);
  };

  return (
    <main className="min-h-screen bg-gradient-to-br from-black via-[#111111] to-[#1a1a1a] text-white">
      <nav className="mx-auto flex max-w-7xl items-center justify-between px-6 py-6">
        <div className="text-xl font-bold tracking-tight text-pink-400">
          Heybabe AI
        </div>

        {user ? (
          <div className="flex items-center gap-3">
            <span className="text-sm text-gray-300">{user.email}</span>
            <button
              onClick={logout}
              className="rounded-full bg-white px-5 py-2 text-sm font-semibold text-[#c75b8c] shadow-sm hover:bg-[#1f1f1f]"
            >
              Logout
            </button>
          </div>
        ) : (
          <span className="text-sm text-pink-300">Login to save history</span>
        )}
      </nav>

      <section className="mx-auto flex min-h-[calc(100vh-88px)] max-w-7xl flex-col items-center justify-center px-6 text-center">
        <div className="mb-6 rounded-full border border-[#f2bfd5] bg-white/80 px-4 py-2 text-sm font-medium text-[#c75b8c] shadow-sm">
          AI Business Bestie for online founders 💕
        </div>

        <h1 className="max-w-5xl text-5xl font-black leading-tight md:text-7xl">
          Build Your Dream
          <span className="block bg-gradient-to-r from-pink-300 via-pink-400 to-fuchsia-400 bg-clip-text text-transparent">
            Business With AI
          </span>
        </h1>

        <p className="mt-6 max-w-3xl text-lg leading-8 text-gray-300 md:text-xl">
          Launch your online business faster with AI-powered product research,
          content strategy, business validation, and step-by-step action plans.
        </p>

        {!user && (
          <div className="mt-10 w-full max-w-md rounded-3xl border border-pink-500/20 bg-[#1f1f1f] p-6">
            <h2 className="mb-2 text-xl font-bold text-pink-300">
              Login / Create Account
            </h2>

            <p className="mb-5 text-sm leading-6 text-gray-400">
              No password needed. Continue with Google or get a magic link sent
              to your email.
            </p>

            <button
              onClick={loginWithGoogle}
              disabled={authLoading}
              className="mb-4 w-full rounded-xl bg-white p-3 font-bold text-[#1f1f1f] hover:bg-gray-100 disabled:opacity-50"
            >
              {authLoading ? "Loading..." : "Continue with Google"}
            </button>

            <div className="my-4 flex items-center gap-3">
              <div className="h-px flex-1 bg-pink-500/20" />
              <span className="text-xs font-bold uppercase tracking-wide text-pink-300">
                or
              </span>
              <div className="h-px flex-1 bg-pink-500/20" />
            </div>

            <input
              type="email"
              placeholder="Email"
              className="mb-3 w-full rounded-xl border border-pink-500 bg-[#1a1a1a] p-3 text-white outline-none placeholder:text-gray-500 focus:border-pink-300"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />

            <button
              onClick={loginWithEmailMagicLink}
              disabled={authLoading}
              className="w-full rounded-xl bg-pink-500 p-3 font-bold text-white shadow-lg shadow-pink-500/20 hover:bg-pink-400 disabled:opacity-50"
            >
              {authLoading ? "Sending..." : "Send Magic Link"}
            </button>
          </div>
        )}

        {user && (
          <>
            <div className="mt-10 grid w-full max-w-5xl gap-5 md:grid-cols-3">
              <div className="rounded-3xl border border-pink-500/20 bg-[#1f1f1f] p-6 text-left">
                <p className="text-sm text-gray-400">Total Projects</p>
                <h3 className="mt-2 text-4xl font-black text-pink-300">
                  {projects.length}
                </h3>
              </div>

              <div className="rounded-3xl border border-pink-500/20 bg-[#1f1f1f] p-6 text-left">
                <p className="text-sm text-gray-400">Recent Analyses</p>
                <h3 className="mt-2 text-4xl font-black text-pink-300">
                  {filteredHistory.length}
                </h3>
              </div>

              <div className="rounded-3xl border border-pink-500/20 bg-[#1f1f1f] p-6 text-left">
                <p className="text-sm text-gray-400">Plan</p>
                <h3 className="mt-2 text-4xl font-black text-pink-300">
                  Free
                </h3>
              </div>
            </div>

            <div className="mt-8 w-full max-w-4xl rounded-3xl border border-pink-500/20 bg-[#1f1f1f] p-6 text-left">
              <h2 className="mb-4 text-xl font-bold text-pink-300">
                + New Project
              </h2>

              <div className="grid gap-3 md:grid-cols-3">
                <input
                  type="text"
                  placeholder="Project name"
                  className="rounded-xl border border-pink-500 bg-[#1a1a1a] p-3 text-white outline-none placeholder:text-gray-500 focus:border-pink-300"
                  value={projectName}
                  onChange={(e) => setProjectName(e.target.value)}
                />

                <select
                  className="rounded-xl border border-pink-500 bg-[#1a1a1a] p-3 text-white outline-none focus:border-pink-300"
                  value={projectType}
                  onChange={(e) => setProjectType(e.target.value)}
                >
                  <option>Dropshipping</option>
                  <option>Digital Products</option>
                  <option>Print On Demand</option>
                  <option>Affiliate Marketing</option>
                  <option>AI Agency</option>
                  <option>Personal Brand</option>
                </select>

                <button
                  onClick={createProject}
                  disabled={projectLoading}
                  className="rounded-xl bg-pink-500 p-3 font-bold text-white shadow-lg shadow-pink-500/20 hover:bg-pink-400 disabled:opacity-50"
                >
                  {projectLoading ? "Creating..." : "Create Project"}
                </button>
              </div>
            </div>

            {projects.length > 0 && (
              <div className="mt-6 w-full max-w-4xl rounded-3xl border border-pink-500/20 bg-[#1f1f1f] p-6 text-left">
                <h2 className="mb-4 text-xl font-bold text-pink-300">
                  My Projects
                </h2>

                <div className="space-y-3">
                  {projects.map((project) => (
                    <div
                      key={project.id}
                      className={`flex items-center justify-between gap-3 rounded-2xl px-5 py-4 ${
                        selectedProjectId === project.id
                          ? "border border-pink-400 bg-pink-500/10"
                          : "bg-black/30"
                      }`}
                    >
                      <button
                        onClick={() => setSelectedProjectId(project.id)}
                        className="flex-1 text-left"
                      >
                        <h3 className="font-bold text-white">
                          {project.project_name}
                        </h3>
                        <p className="text-sm text-gray-400">
                          {project.project_type || "No type"}
                        </p>
                      </button>

                      <button
                        onClick={() => deleteProject(project.id)}
                        className="text-xs font-bold text-red-400 hover:text-red-300"
                      >
                        Delete
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="mt-10 w-full max-w-3xl">
              {projects.length > 0 && (
                <div className="mb-4 text-left">
                  <label className="mb-2 block text-sm font-bold text-pink-300">
                    Select Project
                  </label>

                  <select
                    className="w-full rounded-xl border border-pink-500 bg-[#1a1a1a] p-4 text-white outline-none focus:border-pink-300"
                    value={selectedProjectId}
                    onChange={(e) => setSelectedProjectId(e.target.value)}
                  >
                    <option value="">All Projects</option>
                    {projects.map((project) => (
                      <option key={project.id} value={project.id}>
                        {project.project_name} —{" "}
                        {project.project_type || "No type"}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div className="grid grid-cols-1 gap-3 md:grid-cols-4">
                {[
                  ["analyze", "📊 Business Analysis"],
                  ["names", "🏷️ Name Generator"],
                  ["content", "📱 Content Ideas"],
                  ["ebook", "📚 Ebook Generator"],
                ].map(([value, label]) => (
                  <button
                    key={value}
                    onClick={() => setMode(value as AnalysisMode)}
                    className={`rounded-xl border p-3 text-sm font-bold ${
                      mode === value
                        ? "border-pink-400 bg-pink-500 text-white"
                        : "border-pink-500/20 bg-[#1f1f1f] text-gray-300"
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>

              <input
                type="text"
                value={idea}
                onChange={(e) => setIdea(e.target.value)}
                placeholder="Tell Heybabe what business you want to build..."
                className="mt-4 w-full rounded-xl border border-pink-500 bg-[#1a1a1a] p-4 text-white outline-none placeholder:text-gray-500 focus:border-pink-300"
              />

              <button
                onClick={analyzeIdea}
                disabled={loading}
                className="mt-4 w-full rounded-xl bg-pink-500 p-4 font-bold text-white shadow-lg shadow-pink-500/20 hover:bg-pink-400 disabled:opacity-50"
              >
                {loading ? "Generating..." : "✨ Generate With Heybabe"}
              </button>
            </div>

            {filteredHistory.length > 0 && (
              <div className="mt-6 w-full max-w-xl rounded-2xl border border-pink-500/20 bg-[#1f1f1f] p-5 text-left">
                <h2 className="mb-3 text-sm font-bold uppercase tracking-wide text-pink-300">
                  {selectedProjectId
                    ? `Analyses For ${getProjectName(selectedProjectId)}`
                    : "Recent Analyses"}
                </h2>

                <div className="space-y-2">
                  {filteredHistory.map((item) => (
                    <div
                      key={item.id}
                      className="flex items-center justify-between gap-3 rounded-xl bg-black/30 px-4 py-3"
                    >
                      <button
                        onClick={() => openHistory(item)}
                        className="flex-1 text-left text-sm text-gray-300 hover:text-white"
                      >
                        <span className="block text-white">{item.idea}</span>
                        <span className="text-xs text-pink-300">
                          {getProjectName(item.project_id)}
                        </span>
                      </button>

                      <button
                        onClick={() => deleteHistory(item.id)}
                        className="text-xs font-bold text-red-400 hover:text-red-300"
                      >
                        Delete
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {result && (
              <div className="mt-8 w-full max-w-4xl rounded-3xl border border-pink-500/30 bg-[#1f1f1f] p-8 text-left shadow-xl">
                <div className="mb-6 flex justify-end gap-3">
                  <button
                    onClick={downloadPDF}
                    className="rounded-full border border-pink-500/30 px-4 py-2 text-sm font-bold text-pink-300 hover:bg-pink-500/10"
                  >
                    📄 Download PDF
                  </button>

                  <button
                    onClick={copyAnalysis}
                    className="rounded-full border border-pink-500/30 px-4 py-2 text-sm font-bold text-pink-300 hover:bg-pink-500/10"
                  >
                    📋 Copy Analysis
                  </button>
                </div>

                <ReactMarkdown
                  components={{
                    h1: ({ children }) => (
                      <h1 className="mb-4 mt-8 text-3xl font-black text-pink-400">
                        {children}
                      </h1>
                    ),
                    h2: ({ children }) => (
                      <h2 className="mb-3 mt-6 text-2xl font-bold text-white">
                        {children}
                      </h2>
                    ),
                    h3: ({ children }) => (
                      <h3 className="mb-2 mt-4 text-xl font-bold text-pink-300">
                        {children}
                      </h3>
                    ),
                    p: ({ children }) => (
                      <p className="mb-4 leading-7 text-gray-300">
                        {children}
                      </p>
                    ),
                    ul: ({ children }) => (
                      <ul className="mb-4 list-disc space-y-2 pl-6 text-gray-300">
                        {children}
                      </ul>
                    ),
                    ol: ({ children }) => (
                      <ol className="mb-4 list-decimal space-y-2 pl-6 text-gray-300">
                        {children}
                      </ol>
                    ),
                    li: ({ children }) => <li>{children}</li>,
                    strong: ({ children }) => (
                      <strong className="font-bold text-white">
                        {children}
                      </strong>
                    ),
                  }}
                >
                  {result}
                </ReactMarkdown>
              </div>
            )}
          </>
        )}
      </section>
    </main>
  );
}

