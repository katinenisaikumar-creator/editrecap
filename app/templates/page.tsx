"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { getTemplates } from "@/lib/templates";

export default function TemplatesPage() {
  const [templates, setTemplates] = useState<any[]>([]);
  useEffect(() => { setTemplates(getTemplates()); }, []);

  if (templates.length === 0) return <div className="p-20 text-center text-zinc-400">No templates yet. Go home and upload.</div>;

  return (
    <main className="p-6 max-w-6xl mx-auto">
      <h1 className="text-3xl font-bold mb-6">Your Templates</h1>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {templates.map((t: any) => (
          <div key={t.id} className="bg-zinc-900 border border-zinc-800 rounded-xl p-4">
            {t.thumbnail && <img src={t.thumbnail} className="h-40 w-full object-cover rounded-lg mb-3" alt="" />}
            <h3 className="font-bold truncate">{t.template_name}</h3>
            <p className="text-xs text-zinc-400 mt-1">{t.total_duration}s • {t.total_clips} clips</p>
            <p className="text-xs text-zinc-500 mt-1">BPM: {t.tempo_bpm} | Drop: {t.music_sync?.drop_at}s</p>
            <Link href={`/editor?id=${t.id}`} className="mt-4 block w-full bg-blue-600 text-center py-2.5 rounded-lg font-bold hover:bg-blue-500">
              USE THIS TEMPLATE →
            </Link>
          </div>
        ))}
      </div>
    </main>
  );
}