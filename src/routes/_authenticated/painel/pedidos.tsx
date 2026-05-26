import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth";
import { useMyTenant } from "@/lib/tenant";
import { supabase } from "@/integrations/supabase/client";
import { brl } from "@/lib/cart";
import { Bike, Utensils, Loader2, Clock, Volume2, VolumeX } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/painel/pedidos")({ component: Page });

type Pedido = {
  id: string; numero: number; origem: "mesa" | "delivery"; status: string;
  total: number; forma_pagamento: string | null; mesa_numero: number | null;
  nome_cliente: string | null; telefone_cliente: string | null;
  endereco_entrega: string | null; bairro_entrega: string | null;
  observacoes: string | null; tempo_estimado_minutos: number | null;
  created_at: string; tenant_id: string;
};

function Page() {
  const { user } = useAuth();
  const { data: tenant } = useMyTenant(user?.id);
  const [pedidos, setPedidos] = useState<Pedido[]>([]);
  const [filtro, setFiltro] = useState<"todos" | "mesa" | "delivery">("todos");
  const [status, setStatus] = useState<string>("ativos");
  const [selecionado, setSelecionado] = useState<Pedido | null>(null);
  const [itensSel, setItensSel] = useState<any[]>([]);
  const [som, setSom] = useState(true);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!tenant?.id) return;
    setLoading(true);
    const load = async () => {
      const { data } = await supabase
        .from("pedidos").select("*")
        .eq("tenant_id", tenant.id)
        .gte("created_at", new Date(new Date().setHours(0, 0, 0, 0)).toISOString())
        .order("created_at", { ascending: false });
      setPedidos((data ?? []) as any);
      setLoading(false);
    };
    load();
    const ch = supabase
      .channel("painel-pedidos-" + tenant.id)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "pedidos", filter: `tenant_id=eq.${tenant.id}` },
        (p) => {
          setPedidos((prev) => [p.new as any, ...prev]);
          if (som) try { new Audio("https://cdn.jsdelivr.net/gh/naptha/tesseract.js@master/tests/assets/empty.mp3"); const a = new Audio("data:audio/wav;base64,UklGRl9vT19XQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQAAAAA="); a.play().catch(()=>{}); } catch {}
          toast.success("Novo pedido recebido!");
        })
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "pedidos", filter: `tenant_id=eq.${tenant.id}` },
        (p) => setPedidos((prev) => prev.map((x) => x.id === (p.new as any).id ? (p.new as any) : x)))
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [tenant?.id, som]);

  async function abrir(p: Pedido) {
    setSelecionado(p);
    const { data } = await supabase.from("pedido_itens").select("*").eq("pedido_id", p.id);
    setItensSel(data ?? []);
  }

  async function mudarStatus(p: Pedido, novo: string, tempo?: number) {
    const patch: any = { status: novo };
    if (tempo) patch.tempo_estimado_minutos = tempo;
    const { error } = await supabase.from("pedidos").update(patch).eq("id", p.id);
    if (error) return toast.error(error.message);
    toast.success("Status atualizado");
  }

  const filtrados = pedidos.filter((p) => {
    if (filtro !== "todos" && p.origem !== filtro) return false;
    if (status === "ativos") return !["entregue", "cancelado"].includes(p.status);
    if (status === "todos") return true;
    return p.status === status;
  });

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto">
      <div className="flex flex-wrap items-center gap-3 mb-6">
        <h1 className="text-2xl md:text-3xl font-extrabold flex-1">Pedidos de hoje</h1>
        <button onClick={() => setSom(!som)} className="rounded-xl border border-border p-2.5" title={som ? "Som ativado" : "Som mudo"}>
          {som ? <Volume2 className="size-4" /> : <VolumeX className="size-4" />}
        </button>
      </div>

      <div className="flex flex-wrap gap-2 mb-4">
        {(["todos", "mesa", "delivery"] as const).map((f) => (
          <button key={f} onClick={() => setFiltro(f)} className={`px-4 py-2 rounded-xl text-sm font-medium ${filtro === f ? "bg-primary text-primary-foreground" : "bg-surface border border-border"}`}>
            {f === "todos" ? "Todos" : f === "mesa" ? "🍽️ Mesa" : "🛵 Delivery"}
          </button>
        ))}
        <div className="w-px bg-border mx-1" />
        {[["ativos", "Ativos"], ["recebido", "Novos"], ["em_preparo", "Em preparo"], ["pronto", "Prontos"], ["todos", "Todos"]].map(([k, l]) => (
          <button key={k} onClick={() => setStatus(k)} className={`px-3 py-2 rounded-xl text-xs font-medium ${status === k ? "bg-secondary text-secondary-foreground" : "bg-surface border border-border"}`}>{l}</button>
        ))}
      </div>

      {loading ? <Loader2 className="size-6 animate-spin text-primary" /> : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {filtrados.length === 0 && <p className="text-muted-foreground col-span-full text-center py-12">Nenhum pedido por aqui ainda.</p>}
          {filtrados.map((p) => (
            <PedidoCard key={p.id} p={p} onOpen={() => abrir(p)} onAdvance={mudarStatus} />
          ))}
        </div>
      )}

      {selecionado && (
        <div className="fixed inset-0 z-50 flex" onClick={() => setSelecionado(null)}>
          <div className="flex-1 bg-black/50" />
          <div className="w-full max-w-md bg-surface border-l border-border overflow-y-auto p-6" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold">#{String(selecionado.numero).padStart(4, "0")}</h2>
              <button onClick={() => setSelecionado(null)} className="text-muted-foreground">✕</button>
            </div>
            <div className="space-y-3 text-sm">
              <p><b>Origem:</b> {selecionado.origem === "mesa" ? `Mesa ${selecionado.mesa_numero}` : "Delivery"}</p>
              {selecionado.nome_cliente && <p><b>Cliente:</b> {selecionado.nome_cliente}</p>}
              {selecionado.telefone_cliente && <p><b>Telefone:</b> {selecionado.telefone_cliente}</p>}
              {selecionado.endereco_entrega && <p><b>Endereço:</b> {selecionado.endereco_entrega}, {selecionado.bairro_entrega}</p>}
              {selecionado.observacoes && <p><b>Obs:</b> {selecionado.observacoes}</p>}
              <p><b>Pagamento:</b> {selecionado.forma_pagamento}</p>
              <div className="border-t border-border pt-3">
                <b>Itens:</b>
                <ul className="mt-2 space-y-2">
                  {itensSel.map((i) => (
                    <li key={i.id} className="bg-background rounded-xl p-3">
                      <div className="flex justify-between"><span>{i.quantidade}× {i.nome_item}</span><span>{brl(i.preco_total)}</span></div>
                      {i.personalizacao?.resumo && <p className="text-xs text-muted-foreground mt-1">{i.personalizacao.resumo}</p>}
                      {i.observacoes && <p className="text-xs text-muted-foreground mt-1">Obs: {i.observacoes}</p>}
                    </li>
                  ))}
                </ul>
              </div>
              <p className="text-lg font-bold text-right">Total: {brl(selecionado.total)}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function PedidoCard({ p, onOpen, onAdvance }: { p: Pedido; onOpen: () => void; onAdvance: (p: Pedido, s: string, t?: number) => void }) {
  const min = Math.floor((Date.now() - new Date(p.created_at).getTime()) / 60000);
  const statusColor: Record<string, string> = {
    recebido: "bg-secondary text-secondary-foreground pulse-new",
    confirmado: "bg-blue-500 text-white",
    em_preparo: "bg-primary text-primary-foreground",
    pronto: "bg-success text-success-foreground",
    saiu_entrega: "bg-success text-success-foreground",
    entregue: "bg-muted text-muted-foreground",
    cancelado: "bg-destructive text-destructive-foreground",
  };
  return (
    <div className={`bg-surface border border-border rounded-2xl p-4 ${p.status === "recebido" ? "ring-2 ring-secondary" : ""}`}>
      <div className="flex items-start justify-between gap-2 mb-2">
        <div>
          <h3 className="font-bold text-lg">#{String(p.numero).padStart(4, "0")}</h3>
          <p className="text-xs text-muted-foreground flex items-center gap-1"><Clock className="size-3" /> há {min} min</p>
        </div>
        <span className={`px-2 py-1 rounded-lg text-xs font-bold uppercase ${statusColor[p.status]}`}>{p.status.replace("_", " ")}</span>
      </div>
      <div className="text-sm text-muted-foreground mb-2 flex items-center gap-1">
        {p.origem === "mesa" ? <><Utensils className="size-3" /> Mesa {p.mesa_numero}</> : <><Bike className="size-3" /> Delivery</>}
      </div>
      <p className="text-lg font-bold mb-3">{brl(p.total)}</p>
      <div className="flex flex-wrap gap-2">
        <button onClick={onOpen} className="text-xs px-3 py-1.5 rounded-lg border border-border">Detalhes</button>
        {p.status === "recebido" && (
          <>
            <button onClick={() => { const t = parseInt(prompt("Tempo estimado (min)?", "30") ?? "30"); onAdvance(p, "confirmado", t); }} className="text-xs px-3 py-1.5 rounded-lg bg-primary text-primary-foreground font-semibold">Confirmar</button>
            <button onClick={() => onAdvance(p, "cancelado")} className="text-xs px-3 py-1.5 rounded-lg bg-destructive text-destructive-foreground">Cancelar</button>
          </>
        )}
        {p.status === "confirmado" && <button onClick={() => onAdvance(p, "em_preparo")} className="text-xs px-3 py-1.5 rounded-lg bg-primary text-primary-foreground font-semibold">Em preparo</button>}
        {p.status === "em_preparo" && <button onClick={() => onAdvance(p, p.origem === "mesa" ? "pronto" : "saiu_entrega")} className="text-xs px-3 py-1.5 rounded-lg bg-success text-success-foreground font-semibold">{p.origem === "mesa" ? "Pronto" : "Saiu p/ entrega"}</button>}
        {(p.status === "pronto" || p.status === "saiu_entrega") && <button onClick={() => onAdvance(p, "entregue")} className="text-xs px-3 py-1.5 rounded-lg bg-success text-success-foreground font-semibold">Entregue</button>}
      </div>
    </div>
  );
}
