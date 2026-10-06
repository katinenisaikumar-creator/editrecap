"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Clapperboard } from "lucide-react";
import { cn } from "@/lib/utils";

const links = [{ href: "/", label: "Upload" }, { href: "/templates", label: "Templates" }, { href: "/editor", label: "Editor" }];

export default function Nav() {
  const path = usePathname();
  return (
    <header className="sticky top-0 z-50 border-b border-zinc-800/80 bg-[#0a0a0a]/80 backdrop-blur">
      <div className="mx-auto flex h-14 max-w-7xl items-center justify-between px-4">
        <Link href="/" className="flex items-center gap-2 font-bold">
          <span className="grid h-8 w-8 place-items-center rounded-lg bg-gradient-to-br from-neon-purple to-neon-blue"><Clapperboard className="h-4 w-4" /></span>
          Edit<span className="grad-text">Recap</span>
        </Link>
        <nav className="flex gap-1">
          {links.map((l) => (
            <Link key={l.href} href={l.href} className={cn("rounded-md px-3 py-1.5 text-sm text-zinc-400 transition hover:text-white", path === l.href && "bg-zinc-800 text-white")}>{l.label}</Link>
          ))}
        </nav>
      </div>
    </header>
  );
}
