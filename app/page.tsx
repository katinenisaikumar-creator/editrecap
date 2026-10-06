"use client";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { UploadCloud, Sparkles, CheckCircle2, Film, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { grabThumb, saveTemplate } from "@/lib/templates";

const STEPS = ["Detecting cuts...", "Detecting filters...", "Detecting beats...", "Building template JSON..."];

export default function Home() {
  const input = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [thumb, setThumb] = useState<string | null>(null);
  const [drag, setDrag] = useState(false);
  const [phase, setPhase] = useState<"idle" | "analyzing" | "done">("idle");
  const [step, setStep] = useState(0);

  const pick = async (f?: File) => {
    if (!f ||!f.type.startsWith("video/")) return;
    setFile(f); setPhase("idle"); setThumb(await grabThumb(f));
  };

  const analyze = async () => {
    if (!file) return;
    setPhase("analyzing");
    setStep(0);

    const iv = setInterval(() => setStep((s) => Math.min(s + 1, STEPS.length - 1)), 800);

    try {
      // REAL BACKEND CALL
      const formData = new FormData();
      formData.append("file", file);

      const res = await fetch("https://editrecap-backend.onrender.com/analyze", {
        method: "POST",
        body: formData,
      });

      if (!res.ok) throw new Error("Backend failed");

      const realTemplate = await res.json();

      clearInterval(iv);

      // Add thumb to template
      const templateWithThumb = {
       ...realTemplate,
        thumbnail: thumb || "",
        id: Date.now().toString()
      };

      saveTemplate(templateWithThumb);
      setPhase("done");

    } catch (err) {
      clearInterval(iv);
      console.error(err);
      alert("Backend connect avvaledu mawa! \n1. backend folder lo uvicorn analyzer:app --reload --port 8000 run chesava?\n2. http://localhost:8000 open avuthunda chudu");
      setPhase("idle");
    }
  };

  return (
    <main className="relative mx-auto max-w-3xl px-4 py-16 text-center">
      <div className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-72 bg-[radial-gradient(ellipse_at_top,rgba(168,85,247,.25),transparent_70%)]" />
      <motion.h1 initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="text-4xl font-extrabold sm:text-6xl">
        Steal the <span className="grad-text">edit</span>, keep the vibe.
      </motion.h1>
      <p className="mx-auto mt-4 max-w-xl text-zinc-400">Upload any edited reel. We extract cuts, effects, filters and beat sync into a reusable template.</p>

      <motion.div
        whileHover={{ scale: 1.01 }}
        onClick={() => phase!== "analyzing" && input.current?.click()}
        onDragOver={(e) => { e.preventDefault(); setDrag(true); }}
        onDragLeave={() => setDrag(false)}
        onDrop={(e) => { e.preventDefault(); setDrag(false); pick(e.dataTransfer.files[0]); }}
        className={cn("mt-10 cursor-pointer rounded-2xl border-2 border-dashed p-10 transition-colors",
          drag? "border-neon-purple bg-neon-purple/10 glow" : "border-zinc-700 bg-zinc-900/40 hover:border-neon-blue hover:bg-neon-blue/5")}
      >
        <input ref={input} type="file" accept="video/*" hidden onChange={(e) => pick(e.target.files?.[0])} />
        <AnimatePresence mode="wait">
          {!file? (
            <motion.div key="e" exit={{ opacity: 0 }} className="flex flex-col items-center gap-3">
              <UploadCloud className="h-14 w-14 text-neon-purple" />
              <p className="text-xl font-semibold">Drop your edited video here</p>
              <p className="text-sm text-zinc-500">or click to browse · MP4, MOV, WebM</p>
            </motion.div>
          ) : (
            <motion.div key="f" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col items-center gap-3">
              {thumb? <img src={thumb} alt="" className="h-40 rounded-lg border border-zinc-700" /> : <Film className="h-14 w-14 text-neon-blue" />}
              <p className="font-medium">{file.name}</p>
              <p className="text-xs text-zinc-500">{(file.size / 1048576).toFixed(1)} MB</p>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>

      <div className="mt-8 flex min-h-24 flex-col items-center gap-4">
        {file && phase === "idle" && (
          <Button size="lg" onClick={analyze}><Sparkles className="h-5 w-5" /> Analyze Video</Button>
        )}
        {phase === "analyzing" && (
          <div className="w-full max-w-sm">
            <div className="flex items-center justify-center gap-2 text-neon-cyan"><Loader2 className="h-4 w-4 animate-spin" />
              <AnimatePresence mode="wait"><motion.span key={step} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>{STEPS[step]}</motion.span></AnimatePresence>
            </div>
            <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-zinc-800">
              <motion.div className="h-full bg-gradient-to-r from-neon-purple to-neon-cyan" initial={{ width: 0 }} animate={{ width: "100%" }} transition={{ duration: 8, ease: "linear" }} />
            </div>
            <p className="mt-2 text-xs text-zinc-500">Backend lo video analyze chesthundi...</p>
          </div>
        )}
        {phase === "done" && (
          <motion.div initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="flex flex-col items-center gap-4">
            <div className="flex items-center gap-2 text-xl font-bold text-emerald-400"><CheckCircle2 className="h-6 w-6" /> Template Created!</div>
            <Button size="lg" asChild><Link href="/templates">View Templates →</Link></Button>
          </motion.div>
        )}
      </div>
    </main>
  );
}
