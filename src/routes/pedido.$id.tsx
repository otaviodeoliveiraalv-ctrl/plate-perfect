import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { brl } from "@/lib/cart";
import {
  Check,
  ChefHat,
  Clock,
  Loader2,
  PackageCheck,
  Receipt,
  Truck,
  Utensils,
  XCircle,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

export const Route = createFileRoute("/pedido/$id")({
  component: Page,
});

type Status = "recebido" | "confirmado" | "em_preparo" | "pronto" | "saiu_entrega" | "entregue" | "cancelado";

type Pedido = {
  id: string;
  numero: number;
  status: Status;
  origem: "mesa" | "delivery";
  mesa_numero: number | null;
  subtotal: number;
  taxa_entrega: number;
  total: number;
  forma_pagamento: string | null;
  nome_cliente: string | null;
  endereco_entrega: string | null;
  bairro_entrega: string | null;
  tempo_estimado_minutos: number | null;
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

const TIMELINE_MESA: { status: Status; label: string; icon: LucideIcon }[] = [
  { status: "recebido", label: "Pedido recebido", icon: Receipt },
  { status: "confirmado", label: "Confirmado", icon: Check },
  { status: "em_preparo", label: "Em preparo", icon: ChefHat },
  { status: "pronto", label: "Pronto", icon: PackageCheck },
  { status: "entregue", label: "Servido", icon: Utensils },
];

const TIMELINE_DELIVERY: { status: Status; label: string; icon: LucideIcon }[] = [
  { status: "recebido", label: "Pedido recebido", icon: Receipt },
  { status: "confirmado", label: "Confirmado", icon: Check },
  { status: "em_preparo", label: "Em preparo", icon: ChefHat },
  { status: "saiu_entrega", label: "Saiu para entrega", icon: Truck },
  { status: "entregue", label: "Entregue", icon: PackageCheck },
];

function Page() {
  const { id } = Route.useParams();
  const [pedido, setPedido] = useState<Pedido | null>(null);
  const [itens, setItens] = useState<PedidoItem[]>([]);
  const [tenant, setTenant] = useState<{ nome: string; slug: string } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      const { data: p } = await supabase.from("pedidos").select("*").eq("id", id).maybeSingle();
      if (!mounted) return;
      if (!p) {
        setLoading(false);
        return;
      }
      setPedido(p as Pedido);
      const { data: its } = await supabase
        .from("pedido_itens")
        .select("id,nome_item,quantidade,preco_total,observacoes,personalizacao")
        .eq("pedido_id", id);
      setItens((its || []) as PedidoItem[]);
      const { data: t } = await supabase
        .from("tenants")
        .select("nome,slug")
        .eq("id", (p as Pedido).tenant_id)
        .maybeSingle();
      if (t) setTenant(t);
      setLoading(false);
    };
    load();

    const ch = supabase
      .channel(`pedido-${id}`)
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "pedidos", filter: `id=eq.${id}` },
        (p) => setPedido((prev) => (prev ? { ...prev, ...(p.new as Pedido) } : prev)),
      )
      .subscribe();
    return () => {
      mounted = false;
      supabase.removeChannel(ch);
    };
  }, [id]);

  if (loading)
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="size-6 animate-spin text-primary" />
      </div>
    );

  if (!pedido)
    return (
      <div className="min-h-screen flex items-center justify-center text-muted-foreground">
        Pedido não encontrado.
      </div>
    );

  const timeline = pedido.origem === "mesa" ? TIMELINE_MESA : TIMELINE_DELIVERY;
  const idxAtual = timeline.findIndex((t) => t.status === pedido.status);
  const cancelado = pedido.status === "cancelado";

  return (
    <div className="min-h-screen bg-background pb-10">
      <header className="bg-card border-b border-border">
        <div className="max-w-2xl mx-auto px-4 py-5">
          <div className="text-xs text-muted-foreground">Pedido</div>
          <div className="flex items-end justify-between gap-4">
            <h1 className="text-3xl font-extrabold">#{String(pedido.numero).padStart(4, "0")}</h1>
            {tenant && (
              <Link
                to="/cardapio/$slug"
                params={{ slug: tenant.slug }}
                className="text-xs text-primary hover:underline"
              >
                ← {tenant.nome}
              </Link>
            )}
          </div>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 mt-6 space-y-6">
        {/* Status hero */}
        {cancelado ? (
          <div className="bg-destructive/10 border border-destructive/40 rounded-2xl p-5 flex items-center gap-4">
            <XCircle className="size-10 text-destructive" />
            <div>
              <div className="font-extrabold text-destructive">Pedido cancelado</div>
              <p className="text-sm text-muted-foreground">
                Entre em contato com o estabelecimento se tiver dúvidas.
              </p>
            </div>
          </div>
        ) : (
          <div className="bg-card border border-border rounded-2xl p-5">
            <div className="flex items-center gap-3 mb-1">
              <Clock className="size-5 text-primary" />
              <span className="text-xs uppercase tracking-wider text-muted-foreground font-bold">
                Tempo estimado
              </span>
            </div>
            <div className="text-2xl font-extrabold">
              {pedido.tempo_estimado_minutos ?? "—"} min
            </div>
            <p className="text-sm text-muted-foreground mt-1">
              {pedido.origem === "mesa"
                ? `Mesa ${pedido.mesa_numero} · acompanhe abaixo`
                : "Acompanhe seu pedido em tempo real."}
            </p>
          </div>
        )}

        {/* Timeline */}
        {!cancelado && (
          <section className="bg-card border border-border rounded-2xl p-5">
            <h2 className="font-bold mb-4">Status</h2>
            <ol className="space-y-4">
              {timeline.map((step, i) => {
                const done = i <= idxAtual;
                const active = i === idxAtual;
                const Icon = step.icon;
                return (
                  <li key={step.status} className="flex items-center gap-3">
                    <div
                      className={`size-10 rounded-full flex items-center justify-center transition ${
                        done
                          ? "bg-primary text-primary-foreground"
                          : "bg-muted text-muted-foreground"
                      } ${active ? "ring-4 ring-primary/30 animate-pulse" : ""}`}
                    >
                      <Icon className="size-5" />
                    </div>
                    <div className="flex-1">
                      <div className={`font-bold text-sm ${done ? "" : "text-muted-foreground"}`}>
                        {step.label}
                      </div>
                    </div>
                    {done && <Check className="size-4 text-success" />}
                  </li>
                );
              })}
            </ol>
          </section>
        )}

        {/* Items */}
        <section className="bg-card border border-border rounded-2xl p-5">
          <h2 className="font-bold mb-3">Seu pedido</h2>
          <div className="divide-y divide-border">
            {itens.map((it) => (
              <div key={it.id} className="py-3 flex gap-3">
                <div className="size-8 rounded-lg bg-primary/15 text-primary font-bold flex items-center justify-center shrink-0">
                  {it.quantidade}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-semibold text-sm">{it.nome_item}</div>
                  {it.personalizacao?.resumo && (
                    <div className="text-xs text-muted-foreground">{it.personalizacao.resumo}</div>
                  )}
                  {it.observacoes && (
                    <div className="text-xs text-muted-foreground italic">Obs: {it.observacoes}</div>
                  )}
                </div>
                <div className="font-bold text-sm">{brl(it.preco_total)}</div>
              </div>
            ))}
          </div>
          <div className="mt-4 space-y-1 text-sm border-t border-border pt-3">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Subtotal</span>
              <span>{brl(pedido.subtotal)}</span>
            </div>
            {pedido.origem === "delivery" && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Taxa de entrega</span>
                <span>{pedido.taxa_entrega > 0 ? brl(pedido.taxa_entrega) : "Grátis"}</span>
              </div>
            )}
            <div className="flex justify-between font-extrabold text-base pt-2">
              <span>Total</span>
              <span className="text-primary">{brl(pedido.total)}</span>
            </div>
          </div>
        </section>

        {pedido.origem === "delivery" && pedido.endereco_entrega && (
          <section className="bg-card border border-border rounded-2xl p-5">
            <h2 className="font-bold mb-1">Entrega</h2>
            <p className="text-sm">{pedido.endereco_entrega}</p>
            {pedido.bairro_entrega && (
              <p className="text-sm text-muted-foreground">{pedido.bairro_entrega}</p>
            )}
          </section>
        )}
      </main>
    </div>
  );
}
