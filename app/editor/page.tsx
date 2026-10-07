"use client"
import { Suspense, useEffect, useState, useRef } from "react";
import { useSearchParams } from "next/navigation";
import { getTemplates } from "@/lib/templates";

function EditorContent() {
  const params = useSearchParams();
  const id = params.get("id");
  const [template, setTemplate] = useState<any>(null);
  const [clips, setClips] = useState<any[]>([]);
  const [active, setActive] = useState(0);
  const [files, setFiles] = useState<File[]>([]);
  const [trimStart, setTrimStart] = useState<number[]>([]);
  const [vidDuration, setVidDuration] = useState<number[]>([]);
  const [exporting, setExporting] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const all = getTemplates();
    const found = all.find((t:any) => t.id === id);
    if(found){
      setTemplate(found);
      setClips(found.clips);
      setFiles(new Array(found.clips.length).fill(null as any));
      setTrimStart(new Array(found.clips.length).fill(0));
      setVidDuration(new Array(found.clips.length).fill(0));
    }
  }, [id]);

  const handleFile = (i:number, f:File) => {
    const url = URL.createObjectURL(f);
    const n=[...clips]; (n[i] as any).preview=url; setClips(n);
    const nf=[...files]; nf[i]=f; setFiles(nf);
    const v = document.createElement("video");
    v.src = url;
    v.onloadedmetadata = () => {
      const nd=[...vidDuration]; nd[i]=v.duration; setVidDuration(nd);
      setActive(i);
    };
  };

  const handleExport = async () => {
    if(files.some(f=>!f)){ alert("Mawa anni clips ki video select cheyyi!"); return; }
    setExporting(true);
    const fd = new FormData();
    files.forEach(f=> fd.append("files", f));
    fd.append("durations", JSON.stringify(clips.map((c:any)=> c.duration)));
    fd.append("trims", JSON.stringify(trimStart));
    fd.append("effects_json",JSON.stringify(clips.map((c:any)=>c.effects || [])));

    try{
      const res = await fetch('https://editrecap-backend.onrender.com/analyze', { method: "POST", body: fd });
      if(!res.ok) throw new Error("export failed");
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url; a.download = "EditRecap_export.mp4"; a.click();
    }catch(e){ alert("Export failed " + e); }
    finally{ setExporting(false); }
  };

  if(!template) return <div className="p-10 text-white">Loading...</div>;

  const activeTemplateDur = clips[active]?.duration || 3.66;
  const maxTrim = Math.max(0, (vidDuration[active] || 0) - activeTemplateDur);

  return (
    <div className="min-h-screen bg-black text-white flex flex-col md:flex-row">
      <div className="w-full md:w-[400px] border-r border-zinc-800 p-4 overflow-y-auto">
        <h2 className="font-bold mb-1 truncate">{template.template_name}</h2>
        <p className="text-xs text-zinc-500 mb-4">Total: {template.total_duration}s - Tap clip to trim</p>

        {clips.map((c:any, i:number) => (
          <div key={i} onClick={()=>setActive(i)} className={`mb-3 p-3 rounded-xl border cursor-pointer ${active===i?'bg-blue-600/20 border-blue-600':'bg-zinc-900 border-zinc-800'}`}>
            <div className="flex justify-between">
              <p className="text-sm font-semibold">Clip {i+1}: {c.duration}s</p>
              <p className="text-xs text-zinc-400">{files[i]?'✓':''}</p>
            </div>
            {active===i && files[i] && (
              <div className="mt-3">
                <p className="text-xs text-zinc-400">Trim: {trimStart[i].toFixed(1)}s to {(trimStart[i]+c.duration).toFixed(1)}s</p>
                <input type="range" min={0} max={maxTrim} step={0.1} value={trimStart[i]}
                onChange={(e)=>{ const nt=[...trimStart]; nt[i]=parseFloat(e.target.value); setTrimStart(nt); if(videoRef.current) videoRef.current.currentTime=nt[i]; }}
                className="w-full accent-blue-600" />
              </div>
            )}
            <input type="file" accept="video/*" className="mt-2 text-xs w-full" onChange={(e)=> e.target.files && handleFile(i, e.target.files[0])} />
          </div>
        ))}
        <button onClick={handleExport} disabled={exporting} className="w-full mt-6 bg-blue-600 py-3 rounded-xl font-bold hover:bg-blue-500 disabled:opacity-50">
          {exporting?"EXPORTING...":"EXPORT VIDEO"}
        </button>
      </div>

      <div className="flex-1 flex flex-col items-center justify-center bg-zinc-950 p-4">
        <div className="w-[340px] h-[600px] bg-black border border-zinc-800 rounded-xl overflow-hidden">
          {clips[active]?.preview?
            <video ref={videoRef} src={clips[active].preview} controls className="w-full h-full object-cover"
            onLoadedData={(e)=>{ e.currentTarget.currentTime = trimStart[active]; }} />
            : <div className="w-full h-full flex items-center justify-center text-zinc-500">Select video</div>}
        </div>
        <p className="mt-3 text-sm text-zinc-300">Clip {active+1} - Original: {vidDuration[active]?.toFixed(1)}s → Use: {activeTemplateDur}s</p>
        <p className="text-xs text-zinc-500">Slider tho neeku nachina part ni select chesko mawa</p>
      </div>
    </div>
  );
}

export default function EditorPage() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center min-h-screen bg-black text-white">Loading editor...</div>}>
      <EditorContent />
    </Suspense>
  )
}
