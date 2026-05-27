import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { useAuth } from "@/lib/auth";
import { useMyTenant } from "@/lib/tenant";
import { supabase } from "@/integrations/supabase/client";
import { brl } from "@/lib/cart";
import { Bike, Utensils, Loader as Loader2, Clock, Volume2, VolumeX, LayoutList, Columns3, ChevronRight, X, Timer, CircleCheck as CheckCircle2, Circle as XCircle, ChefHat, PackageCheck, Truck, Receipt } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/painel/pedidos")({ component: Page });

type PedidoStatus =
  | "recebido"
  | "confirmado"
  | "em_preparo"
  | "pronto"
  | "saiu_entrega"
  | "entregue"
  | "cancelado";

type Pedido = {
  id: string;
  numero: number;
  origem: "mesa" | "delivery";
  status: PedidoStatus;
  total: number;
  subtotal: number;
  taxa_entrega: number;
  forma_pagamento: string | null;
  mesa_numero: number | null;
  nome_cliente: string | null;
  telefone_cliente: string | null;
  endereco_entrega: string | null;
  bairro_entrega: string | null;
  observacoes: string | null;
  tempo_estimado_minutos: number | null;
  troco_para: number | null;
  created_at: string;
  tenant_id: string;
};

type PedidoItem = {
  id: string;
  nome_item: string;
  quantidade: number;
  preco_total: number;
  observacoes: string | null;
  personalizacao: { resumo?: string } | null;
};

const STATUS_LABELS: Record<PedidoStatus, string> = {
  recebido: "Novo",
  confirmado: "Confirmado",
  em_preparo: "Em preparo",
  pronto: "Pronto",
  saiu_entrega: "Saiu p/ entrega",
  entregue: "Entregue",
  cancelado: "Cancelado",
};

const STATUS_COLORS: Record<PedidoStatus, string> = {
  recebido: "bg-secondary/20 text-secondary border border-secondary/40",
  confirmado: "bg-blue-500/15 text-blue-300 border border-blue-500/30",
  em_preparo: "bg-primary/15 text-primary border border-primary/30",
  pronto: "bg-success/15 text-success border border-success/30",
  saiu_entrega: "bg-success/15 text-success border border-success/30",
  entregue: "bg-muted text-muted-foreground",
  cancelado: "bg-destructive/15 text-destructive border border-destructive/30",
};

const KANBAN_COLS: { id: PedidoStatus; label: string }[] = [
  { id: "recebido", label: "Novos" },
  { id: "confirmado", label: "Confirmados" },
  { id: "em_preparo", label: "Em preparo" },
  { id: "pronto", label: "Prontos" },
  { id: "saiu_entrega", label: "Saiu p/ entrega" },
];

const FORMA_LABEL: Record<string, string> = {
  pix: "Pix",
  dinheiro: "Dinheiro",
  cartao_entrega: "Cartao na entrega",
};

function Page() {
  const { user } = useAuth();
  const { data: tenant } = useMyTenant(user?.id);
  const [pedidos, setPedidos] = useState<Pedido[]>([]);
  const [filtroOrigem, setFiltroOrigem] = useState<"todos" | "mesa" | "delivery">("todos");
  const [filtroStatus, setFiltroStatus] = useState<"ativos" | "todos" | PedidoStatus>("ativos");
  const [view, setView] = useState<"list" | "kanban">("list");
  const [selecionado, setSelecionado] = useState<Pedido | null>(null);
  const [itensSel, setItensSel] = useState<PedidoItem[]>([]);
  const [som, setSom] = useState(true);
  const [loading, setLoading] = useState(true);
  const [tempoModal, setTempoModal] = useState<{ pedido: Pedido } | null>(null);
  const [tempoInput, setTempoInput] = useState("30");
  const audioRef = useRef<HTMLAudioElement>(null);

  useEffect(() => {
    if (!tenant?.id) return;
    setLoading(true);
    const load = async () => {
      const { data } = await supabase
        .from("pedidos")
        .select("*")
        .eq("tenant_id", tenant.id)
        .gte("created_at", new Date(new Date().setHours(0, 0, 0, 0)).toISOString())
        .order("created_at", { ascending: false });
      setPedidos((data ?? []) as Pedido[]);
      setLoading(false);
    };
    load();

    const ch = supabase
      .channel("painel-pedidos-" + tenant.id)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "pedidos",
          filter: `tenant_id=eq.${tenant.id}`,
        },
        (payload) => {
          setPedidos((prev) => [payload.new as Pedido, ...prev]);
          if (som && audioRef.current) {
            audioRef.current.currentTime = 0;
            audioRef.current.play().catch(() => {});
          }
          toast.success("Novo pedido recebido!", { duration: 5000 });
        },
      )
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "pedidos",
          filter: `tenant_id=eq.${tenant.id}`,
        },
        (payload) => {
          const updated = payload.new as Pedido;
          setPedidos((prev) => prev.map((x) => (x.id === updated.id ? updated : x)));
          setSelecionado((prev) => (prev && prev.id === updated.id ? updated : prev));
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(ch);
    };
  }, [tenant?.id, som]);

  async function abrirDetalhes(p: Pedido) {
    setSelecionado(p);
    const { data } = await supabase.from("pedido_itens").select("*").eq("pedido_id", p.id);
    setItensSel((data ?? []) as PedidoItem[]);
  }

  async function mudarStatus(p: Pedido, novoStatus: PedidoStatus, tempo?: number) {
    const patch: { status: PedidoStatus; tempo_estimado_minutos?: number } = { status: novoStatus };
    if (tempo !== undefined) patch.tempo_estimado_minutos = tempo;
    const { error } = await supabase.from("pedidos").update(patch).eq("id", p.id);
    if (error) return toast.error(error.message);
    toast.success("Status atualizado");
  }

  function abrirTempoModal(p: Pedido) {
    setTempoModal({ pedido: p });
    setTempoInput("30");
  }

  async function confirmarComTempo() {
    if (!tempoModal) return;
    const tempo = parseInt(tempoInput) || 30;
    await mudarStatus(tempoModal.pedido, "confirmado", tempo);
    setTempoModal(null);
  }

  const pedidosFiltrados = pedidos.filter((p) => {
    if (filtroOrigem !== "todos" && p.origem !== filtroOrigem) return false;
    if (filtroStatus === "ativos") return !["entregue", "cancelado"].includes(p.status);
    if (filtroStatus === "todos") return true;
    return p.status === filtroStatus;
  });

  const novosCount = pedidos.filter((p) => p.status === "recebido").length;

  return (
    <div className="flex flex-col min-h-screen">
      {/* Notification audio */}
      <audio ref={audioRef} preload="auto">
        <source src="data:audio/wav;base64,UklGRl9vT19XQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQAAAAA=" type="audio/wav" />
      </audio>

      {/* Header / filters */}
      <div className="p-4 md:p-6 border-b border-border sticky top-0 z-10 bg-background/95 backdrop-blur">
        <div className="flex flex-wrap items-center gap-3 mb-4">
          <div className="flex items-center gap-3 flex-1">
            <h1 className="text-xl md:text-2xl font-extrabold">Pedidos de hoje</h1>
            {novosCount > 0 && (
              <span className="bg-secondary text-secondary-foreground text-xs font-bold rounded-full px-2.5 py-1 pulse-new">
                {novosCount} novo{novosCount > 1 ? "s" : ""}
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setView(view === "list" ? "kanban" : "list")}
              className="rounded-xl border border-border p-2.5 hover:bg-muted transition"
              title={view === "list" ? "Visao kanban" : "Visao lista"}
            >
              {view === "list" ? (
                <Columns3 className="size-4" />
              ) : (
                <LayoutList className="size-4" />
              )}
            </button>
            <button
              onClick={() => setSom(!som)}
              className={`rounded-xl border p-2.5 transition ${
                som
                  ? "border-primary/50 text-primary bg-primary/10"
                  : "border-border hover:bg-muted"
              }`}
              title={som ? "Som ativado" : "Som desativado"}
            >
              {som ? <Volume2 className="size-4" /> : <VolumeX className="size-4" />}
            </button>
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          {(["todos", "mesa", "delivery"] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFiltroOrigem(f)}
              className={`px-3 py-1.5 rounded-xl text-sm font-medium transition ${
                filtroOrigem === f
                  ? "bg-primary text-primary-foreground"
                  : "bg-surface border border-border hover:bg-muted"
              }`}
            >
              {f === "todos" ? "Todos" : f === "mesa" ? "Mesa" : "Delivery"}
            </button>
          ))}
          <div className="h-6 w-px bg-border self-center mx-1" />
          {(
            [
              ["ativos", "Ativos"],
              ["recebido", "Novos"],
              ["em_preparo", "Em preparo"],
              ["pronto", "Prontos"],
              ["todos", "Historico"],
            ] as const
          ).map(([k, l]) => (
            <button
              key={k}
              onClick={() => setFiltroStatus(k)}
              className={`px-3 py-1.5 rounded-xl text-xs font-medium transition ${
                filtroStatus === k
                  ? "bg-secondary text-secondary-foreground"
                  : "bg-surface border border-border hover:bg-muted"
              }`}
            >
              {l}
            </button>
          ))}
        </div>
      </div>

      {/* Main content */}
      <div className="flex-1 p-4 md:p-6 overflow-auto">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="size-6 animate-spin text-primary" />
          </div>
        ) : pedidosFiltrados.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-muted-foreground gap-3">
            <Receipt className="size-10 opacity-30" />
            <p className="text-sm">Nenhum pedido encontrado para os filtros selecionados.</p>
          </div>
        ) : view === "list" ? (
          <div className="space-y-3 max-w-4xl">
            {pedidosFiltrados.map((p) => (
              <PedidoRow
                key={p.id}
                p={p}
                onOpen={() => abrirDetalhes(p)}
                onAdvance={mudarStatus}
                onConfirmar={abrirTempoModal}
              />
            ))}
          </div>
        ) : (
          <KanbanView
            pedidos={pedidosFiltrados}
            onOpen={abrirDetalhes}
            onAdvance={mudarStatus}
            onConfirmar={abrirTempoModal}
          />
        )}
      </div>

      {/* Detail panel */}
      {selecionado && (
        <DetalhePanel
          pedido={selecionado}
          itens={itensSel}
          onClose={() => setSelecionado(null)}
          onAdvance={mudarStatus}
          onConfirmar={abrirTempoModal}
        />
      )}

      {/* Tempo modal */}
      {tempoModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70">
          <div className="bg-card border border-border rounded-2xl p-6 w-full max-w-sm shadow-2xl">
            <div className="flex items-center gap-3 mb-5">
              <div className="size-10 rounded-xl bg-primary/15 text-primary flex items-center justify-center">
                <Timer className="size-5" />
              </div>
              <div>
                <h3 className="font-bold">Tempo estimado</h3>
                <p className="text-xs text-muted-foreground">
                  Pedido #{String(tempoModal.pedido.numero).padStart(4, "0")}
                </p>
              </div>
            </div>
            <div className="grid grid-cols-5 gap-2 mb-4">
              {[15, 20, 30, 45, 60].map((t) => (
                <button
                  key={t}
                  onClick={() => setTempoInput(String(t))}
                  className={`py-2 rounded-xl text-sm font-bold border transition ${
                    tempoInput === String(t)
                      ? "bg-primary text-primary-foreground border-primary"
                      : "border-border bg-surface hover:bg-muted"
                  }`}
                >
                  {t}
                </button>
              ))}
            </div>
            <div className="flex items-center gap-2 mb-5">
              <input
                type="number"
                min={1}
                value={tempoInput}
                onChange={(e) => setTempoInput(e.target.value)}
                className="flex-1 rounded-xl border border-border bg-background px-3 py-2.5 text-sm focus:outline-none focus:border-primary"
              />
              <span className="text-sm text-muted-foreground">minutos</span>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setTempoModal(null)}
                className="flex-1 rounded-xl border border-border py-2.5 text-sm font-medium hover:bg-muted transition"
              >
                Cancelar
              </button>
              <button
                onClick={confirmarComTempo}
                className="flex-1 rounded-xl bg-primary text-primary-foreground py-2.5 text-sm font-bold hover:opacity-90 transition"
              >
                Confirmar pedido
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── List Row ────────────────────────────────────────────────────────────────

function PedidoRow({
  p,
  onOpen,
  onAdvance,
  onConfirmar,
}: {
  p: Pedido;
  onOpen: () => void;
  onAdvance: (p: Pedido, s: PedidoStatus, t?: number) => void;
  onConfirmar: (p: Pedido) => void;
}) {
  const min = Math.floor((Date.now() - new Date(p.created_at).getTime()) / 60000);
  return (
    <div
      className={`bg-card border rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center gap-3 transition ${
        p.status === "recebido" ? "border-secondary/60 ring-1 ring-secondary/30" : "border-border"
      }`}
    >
      <div className="flex items-center gap-3 flex-1 min-w-0">
        <div className="flex flex-col items-center justify-center size-14 rounded-xl bg-surface shrink-0 border border-border">
          <span className="font-bold text-sm">#{String(p.numero).padStart(4, "0")}</span>
          <span className="text-[10px] text-muted-foreground flex items-center gap-0.5 mt-0.5">
            <Clock className="size-2.5" /> {min}m
          </span>
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap mb-1">
            <span className={`text-xs font-bold px-2 py-0.5 rounded-lg ${STATUS_COLORS[p.status]}`}>
              {p.status === "recebido" ? (
                <span className="flex items-center gap-1.5">
                  <span className="size-1.5 rounded-full bg-secondary animate-pulse inline-block" />
                  {STATUS_LABELS[p.status]}
                </span>
              ) : (
                STATUS_LABELS[p.status]
              )}
            </span>
            <span className="text-xs text-muted-foreground flex items-center gap-1">
              {p.origem === "mesa" ? (
                <>
                  <Utensils className="size-3" /> Mesa {p.mesa_numero}
                </>
              ) : (
                <>
                  <Bike className="size-3" /> Delivery
                </>
              )}
            </span>
            {p.nome_cliente && (
              <span className="text-xs text-muted-foreground truncate max-w-[160px]">
                {p.nome_cliente}
              </span>
            )}
          </div>
          <span className="text-lg font-extrabold">{brl(p.total)}</span>
        </div>
      </div>
      <div className="flex items-center gap-2 flex-wrap">
        <ActionButtons p={p} onAdvance={onAdvance} onConfirmar={onConfirmar} compact />
        <button
          onClick={onOpen}
          className="text-xs px-3 py-2 rounded-xl border border-border hover:bg-muted flex items-center gap-1 transition"
        >
          Detalhes <ChevronRight className="size-3" />
        </button>
      </div>
    </div>
  );
}

// ─── Kanban View ─────────────────────────────────────────────────────────────

function KanbanView({
  pedidos,
  onOpen,
  onAdvance,
  onConfirmar,
}: {
  pedidos: Pedido[];
  onOpen: (p: Pedido) => void;
  onAdvance: (p: Pedido, s: PedidoStatus, t?: number) => void;
  onConfirmar: (p: Pedido) => void;
}) {
  return (
    <div className="flex gap-3 overflow-x-auto pb-4">
      {KANBAN_COLS.map((col) => {
        const colPedidos = pedidos.filter((p) => p.status === col.id);
        return (
          <div key={col.id} className="flex-none w-72">
            <div className="flex items-center gap-2 mb-3">
              <h3 className="font-bold text-sm">{col.label}</h3>
              {colPedidos.length > 0 && (
                <span className="bg-surface border border-border text-muted-foreground text-xs rounded-full px-2 py-0.5">
                  {colPedidos.length}
                </span>
              )}
            </div>
            <div className="space-y-2">
              {colPedidos.map((p) => (
                <KanbanCard
                  key={p.id}
                  p={p}
                  onOpen={() => onOpen(p)}
                  onAdvance={onAdvance}
                  onConfirmar={onConfirmar}
                />
              ))}
              {colPedidos.length === 0 && (
                <div className="rounded-xl border border-dashed border-border h-16 flex items-center justify-center">
                  <span className="text-xs text-muted-foreground">Vazio</span>
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function KanbanCard({
  p,
  onOpen,
  onAdvance,
  onConfirmar,
}: {
  p: Pedido;
  onOpen: () => void;
  onAdvance: (p: Pedido, s: PedidoStatus, t?: number) => void;
  onConfirmar: (p: Pedido) => void;
}) {
  const min = Math.floor((Date.now() - new Date(p.created_at).getTime()) / 60000);
  return (
    <div
      className={`bg-card border rounded-2xl p-3 transition ${
        p.status === "recebido" ? "border-secondary/60 ring-1 ring-secondary/30" : "border-border"
      }`}
    >
      <div className="flex items-start justify-between gap-2 mb-2">
        <div>
          <span className="font-bold text-sm">#{String(p.numero).padStart(4, "0")}</span>
          <div className="text-[10px] text-muted-foreground flex items-center gap-1 mt-0.5">
            <Clock className="size-2.5" /> {min}m atras
          </div>
        </div>
        <span className="text-[10px] text-muted-foreground flex items-center gap-1">
          {p.origem === "mesa" ? (
            <>
              <Utensils className="size-2.5" /> Mesa {p.mesa_numero}
            </>
          ) : (
            <>
              <Bike className="size-2.5" /> Delivery
            </>
          )}
        </span>
      </div>
      {p.nome_cliente && (
        <p className="text-xs text-muted-foreground mb-1.5 truncate">{p.nome_cliente}</p>
      )}
      <p className="font-extrabold text-base mb-3">{brl(p.total)}</p>
      <div className="flex flex-wrap gap-1.5">
        <button
          onClick={onOpen}
          className="text-xs px-2.5 py-1.5 rounded-lg border border-border hover:bg-muted transition"
        >
          Detalhes
        </button>
        <ActionButtons p={p} onAdvance={onAdvance} onConfirmar={onConfirmar} compact={false} />
      </div>
    </div>
  );
}

// ─── Action Buttons ───────────────────────────────────────────────────────────

function ActionButtons({
  p,
  onAdvance,
  onConfirmar,
  compact,
}: {
  p: Pedido;
  onAdvance: (p: Pedido, s: PedidoStatus, t?: number) => void;
  onConfirmar: (p: Pedido) => void;
  compact: boolean;
}) {
  const baseCls = compact
    ? "text-xs px-3 py-2 rounded-xl font-semibold transition"
    : "text-xs px-2.5 py-1.5 rounded-lg font-semibold transition";

  if (p.status === "recebido") {
    return (
      <>
        <button
          onClick={(e) => {
            e.stopPropagation();
            onConfirmar(p);
          }}
          className={`${baseCls} bg-primary text-primary-foreground hover:opacity-90`}
        >
          Aceitar
        </button>
        <button
          onClick={(e) => {
            e.stopPropagation();
            onAdvance(p, "cancelado");
          }}
          className={`${baseCls} bg-destructive/20 text-destructive border border-destructive/30 hover:bg-destructive/30`}
        >
          Recusar
        </button>
      </>
    );
  }
  if (p.status === "confirmado") {
    return (
      <button
        onClick={(e) => {
          e.stopPropagation();
          onAdvance(p, "em_preparo");
        }}
        className={`${baseCls} bg-primary/15 text-primary border border-primary/30 hover:bg-primary/25`}
      >
        Iniciar preparo
      </button>
    );
  }
  if (p.status === "em_preparo") {
    return (
      <button
        onClick={(e) => {
          e.stopPropagation();
          onAdvance(p, p.origem === "mesa" ? "pronto" : "saiu_entrega");
        }}
        className={`${baseCls} bg-success/15 text-success border border-success/30 hover:bg-success/25`}
      >
        {p.origem === "mesa" ? "Marcar pronto" : "Saiu p/ entrega"}
      </button>
    );
  }
  if (p.status === "pronto" || p.status === "saiu_entrega") {
    return (
      <button
        onClick={(e) => {
          e.stopPropagation();
          onAdvance(p, "entregue");
        }}
        className={`${baseCls} bg-success/15 text-success border border-success/30 hover:bg-success/25`}
      >
        {p.origem === "mesa" ? "Servido" : "Entregue"}
      </button>
    );
  }
  return null;
}

// ─── Detail Panel ─────────────────────────────────────────────────────────────

function DetalhePanel({
  pedido,
  itens,
  onClose,
  onAdvance,
  onConfirmar,
}: {
  pedido: Pedido;
  itens: PedidoItem[];
  onClose: () => void;
  onAdvance: (p: Pedido, s: PedidoStatus, t?: number) => void;
  onConfirmar: (p: Pedido) => void;
}) {
  const min = Math.floor((Date.now() - new Date(pedido.created_at).getTime()) / 60000);

  const STATUS_ICONS: Partial<Record<PedidoStatus, React.ComponentType<{ className?: string }>>> =
    {
      recebido: Receipt,
      confirmado: CheckCircle2,
      em_preparo: ChefHat,
      pronto: PackageCheck,
      saiu_entrega: Truck,
      entregue: CheckCircle2,
      cancelado: XCircle,
    };
  const StatusIcon = STATUS_ICONS[pedido.status] ?? Receipt;

  return (
    <>
      <div className="fixed inset-0 z-40 bg-black/50 md:hidden" onClick={onClose} />
      <div className="fixed right-0 top-0 bottom-0 z-40 w-full max-w-md bg-card border-l border-border flex flex-col shadow-2xl animate-in slide-in-from-right duration-300">
        <div className="flex items-center justify-between p-5 border-b border-border shrink-0">
          <div className="flex items-center gap-3">
            <div
              className={`size-10 rounded-xl flex items-center justify-center shrink-0 ${
                pedido.status === "cancelado"
                  ? "bg-destructive/15 text-destructive"
                  : "bg-primary/15 text-primary"
              }`}
            >
              <StatusIcon className="size-5" />
            </div>
            <div>
              <h2 className="font-extrabold text-lg leading-tight">
                #{String(pedido.numero).padStart(4, "0")}
              </h2>
              <p className="text-xs text-muted-foreground">
                {pedido.origem === "mesa" ? `Mesa ${pedido.mesa_numero}` : "Delivery"} · {min}m atras
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="size-9 rounded-xl hover:bg-muted flex items-center justify-center transition shrink-0"
          >
            <X className="size-4" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          <div className="flex items-center gap-2 flex-wrap">
            <span
              className={`text-sm font-bold px-3 py-1.5 rounded-lg ${STATUS_COLORS[pedido.status]}`}
            >
              {STATUS_LABELS[pedido.status]}
            </span>
            {pedido.tempo_estimado_minutos && (
              <span className="text-xs text-muted-foreground flex items-center gap-1">
                <Timer className="size-3" /> {pedido.tempo_estimado_minutos} min estimados
              </span>
            )}
          </div>

          {(pedido.nome_cliente || pedido.telefone_cliente) && (
            <section className="bg-surface rounded-xl p-3 space-y-0.5 text-sm">
              <p className="font-bold text-xs uppercase tracking-wide text-muted-foreground mb-2">
                Cliente
              </p>
              {pedido.nome_cliente && <p className="font-semibold">{pedido.nome_cliente}</p>}
              {pedido.telefone_cliente && (
                <p className="text-muted-foreground">{pedido.telefone_cliente}</p>
              )}
            </section>
          )}

          {pedido.origem === "delivery" && pedido.endereco_entrega && (
            <section className="bg-surface rounded-xl p-3 text-sm">
              <p className="font-bold text-xs uppercase tracking-wide text-muted-foreground mb-2">
                Entrega
              </p>
              <p>{pedido.endereco_entrega}</p>
              {pedido.bairro_entrega && (
                <p className="text-muted-foreground">{pedido.bairro_entrega}</p>
              )}
            </section>
          )}

          <section>
            <p className="font-bold text-xs uppercase tracking-wide text-muted-foreground mb-2">
              Itens
            </p>
            <div className="bg-surface rounded-xl divide-y divide-border">
              {itens.length === 0 ? (
                <div className="p-4 flex justify-center">
                  <Loader2 className="size-4 animate-spin text-muted-foreground" />
                </div>
              ) : (
                itens.map((i) => (
                  <div key={i.id} className="p-3 flex gap-3">
                    <div className="size-8 rounded-lg bg-primary/15 text-primary font-bold text-sm flex items-center justify-center shrink-0">
                      {i.quantidade}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-sm leading-tight">{i.nome_item}</p>
                      {i.personalizacao?.resumo && (
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {i.personalizacao.resumo}
                        </p>
                      )}
                      {i.observacoes && (
                        <p className="text-xs text-muted-foreground italic mt-0.5">
                          Obs: {i.observacoes}
                        </p>
                      )}
                    </div>
                    <p className="font-bold text-sm shrink-0">{brl(i.preco_total)}</p>
                  </div>
                ))
              )}
            </div>
          </section>

          {pedido.observacoes && (
            <section className="bg-surface rounded-xl p-3 text-sm">
              <p className="font-bold text-xs uppercase tracking-wide text-muted-foreground mb-1">
                Observacoes gerais
              </p>
              <p className="text-muted-foreground">{pedido.observacoes}</p>
            </section>
          )}

          <section className="bg-surface rounded-xl p-3 text-sm space-y-1">
            <p className="font-bold text-xs uppercase tracking-wide text-muted-foreground mb-2">
              Resumo financeiro
            </p>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Subtotal</span>
              <span>{brl(pedido.subtotal)}</span>
            </div>
            {pedido.origem === "delivery" && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Entrega</span>
                <span>{pedido.taxa_entrega > 0 ? brl(pedido.taxa_entrega) : "Gratis"}</span>
              </div>
            )}
            <div className="flex justify-between font-extrabold text-base pt-2 border-t border-border mt-2">
              <span>Total</span>
              <span className="text-primary">{brl(pedido.total)}</span>
            </div>
            <div className="flex justify-between pt-1">
              <span className="text-muted-foreground">Pagamento</span>
              <span className="font-medium">
                {pedido.forma_pagamento
                  ? (FORMA_LABEL[pedido.forma_pagamento] ?? pedido.forma_pagamento)
                  : "—"}
              </span>
            </div>
            {pedido.troco_para != null && pedido.troco_para > 0 && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Troco para</span>
                <span>{brl(pedido.troco_para)}</span>
              </div>
            )}
          </section>
        </div>

        <div className="p-4 border-t border-border shrink-0">
          <div className="flex flex-wrap gap-2">
            <ActionButtons
              p={pedido}
              onAdvance={onAdvance}
              onConfirmar={onConfirmar}
              compact
            />
          </div>
        </div>
      </div>
    </>
  );
}
