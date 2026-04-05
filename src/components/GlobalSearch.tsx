import React, { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import {
  CommandDialog, CommandEmpty, CommandGroup, CommandInput,
  CommandItem, CommandList, CommandSeparator,
} from "@/components/ui/command";
import { supabase } from "@/integrations/supabase/client";
import { Bell, Users, MapPin, Search } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { quickActions, getCameraIcon, getSeverityColor, getListTypeBadge } from "./search/searchHelpers";

export function GlobalSearch() {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const navigate = useNavigate();

  const { data: cameras = [] } = useQuery({
    queryKey: ["search-cameras"],
    queryFn: async () => { const { data } = await supabase.from("cameras").select("id, name, location, status").limit(50); return data || []; },
    enabled: open,
  });
  const { data: alerts = [] } = useQuery({
    queryKey: ["search-alerts"],
    queryFn: async () => { const { data } = await supabase.from("alerts").select("id, message, camera_name, severity, type, is_read").order("created_at", { ascending: false }).limit(50); return data || []; },
    enabled: open,
  });
  const { data: persons = [] } = useQuery({
    queryKey: ["search-persons"],
    queryFn: async () => { const { data } = await supabase.from("registered_persons").select("id, name, role, department, list_type, is_active").limit(50); return data || []; },
    enabled: open,
  });
  const { data: zones = [] } = useQuery({
    queryKey: ["search-zones"],
    queryFn: async () => { const { data } = await supabase.from("zones").select("id, name, type, is_active").limit(50); return data || []; },
    enabled: open,
  });

  useEffect(() => {
    const down = (e: KeyboardEvent) => { if (e.key === "k" && (e.metaKey || e.ctrlKey)) { e.preventDefault(); setOpen(p => !p); } };
    const handleOpen = () => setOpen(true);
    document.addEventListener("open-search", handleOpen);
    document.addEventListener("keydown", down);
    return () => { document.removeEventListener("keydown", down); document.removeEventListener("open-search", handleOpen); };
  }, []);

  const handleSelect = useCallback((route: string) => { setOpen(false); setSearch(""); navigate(route); }, [navigate]);
  const q = search.toLowerCase();
  const fc = cameras.filter(c => c.name.toLowerCase().includes(q) || c.location.toLowerCase().includes(q));
  const fa = alerts.filter(a => a.message.toLowerCase().includes(q) || a.camera_name.toLowerCase().includes(q));
  const fp = persons.filter(p => p.name.toLowerCase().includes(q) || (p.role?.toLowerCase() || "").includes(q) || (p.department?.toLowerCase() || "").includes(q));
  const fz = zones.filter(z => z.name.toLowerCase().includes(q));
  const fq = quickActions.filter(a => a.title.toLowerCase().includes(q));

  return (
    <CommandDialog open={open} onOpenChange={setOpen}>
      <CommandInput placeholder="Buscar câmeras, alertas, pessoas, zonas..." value={search} onValueChange={setSearch} />
      <CommandList className="max-h-[400px]">
        <CommandEmpty>
          <div className="flex flex-col items-center gap-2 py-6">
            <Search className="h-10 w-10 text-muted-foreground/50" />
            <p className="text-sm text-muted-foreground">Nenhum resultado encontrado</p>
          </div>
        </CommandEmpty>

        {fq.length > 0 && (
          <CommandGroup heading="Navegação Rápida">
            {fq.slice(0, 5).map(a => (
              <CommandItem key={a.id} value={a.title} onSelect={() => handleSelect(a.route)} className="flex items-center gap-3 px-3 py-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-md bg-muted">{a.icon}</div>
                <span>{a.title}</span>
              </CommandItem>
            ))}
          </CommandGroup>
        )}

        {fc.length > 0 && (<><CommandSeparator /><CommandGroup heading={`Câmeras (${fc.length})`}>
          {fc.slice(0, 5).map(c => (
            <CommandItem key={c.id} value={`camera-${c.name}`} onSelect={() => handleSelect(`/cameras/${c.id}`)} className="flex items-center justify-between px-3 py-2">
              <div className="flex items-center gap-3">
                <div className="flex h-8 w-8 items-center justify-center rounded-md bg-muted">{getCameraIcon(c.status)}</div>
                <div className="flex flex-col"><span className="font-medium">{c.name}</span><span className="text-xs text-muted-foreground">{c.location}</span></div>
              </div>
              <Badge variant="outline" className={cn("text-xs capitalize", c.status === "online" && "bg-success/15 text-success border-success/30", c.status === "offline" && "bg-muted text-muted-foreground", c.status === "alert" && "bg-destructive/15 text-destructive border-destructive/30")}>{c.status}</Badge>
            </CommandItem>
          ))}
        </CommandGroup></>)}

        {fa.length > 0 && (<><CommandSeparator /><CommandGroup heading={`Alertas (${fa.length})`}>
          {fa.slice(0, 5).map(a => (
            <CommandItem key={a.id} value={`alert-${a.message}`} onSelect={() => handleSelect(`/alerts?id=${a.id}`)} className="flex items-center justify-between px-3 py-2">
              <div className="flex items-center gap-3">
                <div className={cn("flex h-8 w-8 items-center justify-center rounded-md", a.is_read ? "bg-muted" : "bg-primary/10")}>
                  <Bell className={cn("h-4 w-4", a.is_read ? "text-muted-foreground" : "text-primary")} />
                </div>
                <div className="flex flex-col"><span className={cn("font-medium", !a.is_read && "text-foreground")}>{a.message.slice(0, 50)}...</span><span className="text-xs text-muted-foreground">{a.camera_name}</span></div>
              </div>
              <Badge variant="outline" className={cn("text-xs capitalize", getSeverityColor(a.severity))}>{a.severity}</Badge>
            </CommandItem>
          ))}
        </CommandGroup></>)}

        {fp.length > 0 && (<><CommandSeparator /><CommandGroup heading={`Pessoas (${fp.length})`}>
          {fp.slice(0, 5).map(p => (
            <CommandItem key={p.id} value={`person-${p.name}`} onSelect={() => handleSelect(`/people/${p.id}`)} className="flex items-center justify-between px-3 py-2">
              <div className="flex items-center gap-3">
                <div className={cn("flex h-8 w-8 items-center justify-center rounded-full", p.is_active ? "bg-primary/10" : "bg-muted")}>
                  <Users className={cn("h-4 w-4", p.is_active ? "text-primary" : "text-muted-foreground")} />
                </div>
                <div className="flex flex-col"><span className="font-medium">{p.name}</span><span className="text-xs text-muted-foreground">{[p.role, p.department].filter(Boolean).join(" • ") || "Sem cargo"}</span></div>
              </div>
              {getListTypeBadge(p.list_type)}
            </CommandItem>
          ))}
        </CommandGroup></>)}

        {fz.length > 0 && (<><CommandSeparator /><CommandGroup heading={`Zonas (${fz.length})`}>
          {fz.slice(0, 5).map(z => (
            <CommandItem key={z.id} value={`zone-${z.name}`} onSelect={() => handleSelect(`/zones/${z.id}`)} className="flex items-center justify-between px-3 py-2">
              <div className="flex items-center gap-3">
                <div className={cn("flex h-8 w-8 items-center justify-center rounded-md", z.is_active ? "bg-amber-500/10" : "bg-muted")}>
                  <MapPin className={cn("h-4 w-4", z.is_active ? "text-amber-400" : "text-muted-foreground")} />
                </div>
                <div className="flex flex-col"><span className="font-medium">{z.name}</span><span className="text-xs text-muted-foreground capitalize">{z.type}</span></div>
              </div>
              <Badge variant="outline" className={cn("text-xs", z.is_active ? "bg-emerald-500/20 text-emerald-400 border-emerald-500/30" : "bg-muted text-muted-foreground")}>{z.is_active ? "Ativa" : "Inativa"}</Badge>
            </CommandItem>
          ))}
        </CommandGroup></>)}
      </CommandList>

      <div className="flex items-center justify-between border-t border-border px-3 py-2 text-xs text-muted-foreground">
        <div className="flex items-center gap-2">
          <kbd className="px-1.5 py-0.5 bg-muted rounded text-[10px] font-mono">↑↓</kbd><span>Navegar</span>
          <kbd className="px-1.5 py-0.5 bg-muted rounded text-[10px] font-mono">↵</kbd><span>Selecionar</span>
        </div>
        <div className="flex items-center gap-1">
          <kbd className="px-1.5 py-0.5 bg-muted rounded text-[10px] font-mono">Esc</kbd><span>Fechar</span>
        </div>
      </div>
    </CommandDialog>
  );
}

export default GlobalSearch;
