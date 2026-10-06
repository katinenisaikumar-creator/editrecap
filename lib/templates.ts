export type Clip = { start: number; end: number; effects: string[]; filter: string; speed: string };
export type Template = {
  id: string; template_name: string; clips: Clip[]; music_sync: string;
  duration: number; thumbnail: string | null; createdAt: number;
};

const KEY = "editrecap_templates";

export const getTemplates = (): Template[] => {
  if (typeof window === "undefined") return [];
  try { return JSON.parse(localStorage.getItem(KEY) || "[]"); } catch { return []; }
};
export const getTemplate = (id: string | null) => getTemplates().find((t) => t.id === id) ?? null;
export const saveTemplate = (t: Template) => localStorage.setItem(KEY, JSON.stringify([t, ...getTemplates()]));
export const countEffects = (t: Template) => t.clips.reduce((n, c) => n + c.effects.length, 0);

// TODO: replace with fetch("/api/analyze", { method: "POST", body: formData }) to your Python backend
export function mockAnalyze(thumbnail: string | null): Template {
  const fx = ["zoom_in", "zoom_out", "shake", "glitch", "flash", "blur_transition", "spin"];
  const filters = ["warm", "cool", "cinematic", "vivid", "noir"];
  const speeds = ["100%", "100->250%", "50->100%", "200%"];
  const pick = <T,>(a: T[]) => a[Math.floor(Math.random() * a.length)];
  const cuts = [0, 2.1, 3.4, 5.0, 6.2, 8.0];
  const clips: Clip[] = cuts.slice(0, -1).map((s, i) => ({
    start: s, end: cuts[i + 1],
    effects: i === 0 ? ["zoom_in", "shake"] : [pick(fx), pick(fx)].filter((v, j, a) => a.indexOf(v) === j),
    filter: i === 0 ? "warm" : pick(filters),
    speed: i === 0 ? "100->250%" : pick(speeds),
  }));
  return {
    id: crypto.randomUUID(), template_name: "trending_velo", clips,
    music_sync: "beat at 2.1s", duration: 8, thumbnail, createdAt: Date.now(),
  };
}

// Grab a small JPEG frame from a video file for the gallery thumbnail
export function grabThumb(file: File): Promise<string | null> {
  return new Promise((resolve) => {
    const url = URL.createObjectURL(file);
    const v = document.createElement("video");
    v.muted = true; v.preload = "metadata"; v.src = url;
    v.onloadeddata = () => { v.currentTime = Math.min(0.5, v.duration / 2 || 0); };
    v.onseeked = () => {
      const c = document.createElement("canvas");
      const w = 270; c.width = w; c.height = Math.round((w * v.videoHeight) / v.videoWidth) || 480;
      c.getContext("2d")?.drawImage(v, 0, 0, c.width, c.height);
      URL.revokeObjectURL(url);
      resolve(c.toDataURL("image/jpeg", 0.6));
    };
    v.onerror = () => resolve(null);
  });
}
