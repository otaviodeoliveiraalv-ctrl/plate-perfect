import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useTenantBySlug, estaAberto } from "@/lib/tenant";
import { CartProvider, useCart, brl, type CartItem } from "@/lib/cart";
import { Loader2, MapPin, Clock, ShoppingBag, Search, Minus, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { SimpleItemSheet } from "@/components/menu/SimpleItemSheet";
import { PizzaBuilder, type Opcao } from "@/components/menu/PizzaBuilder";
import { CheckoutSheet } from "@/components/menu/CheckoutSheet";

type Categoria = { id: string; nome: string; ordem: number };
type Item = {
  id: string;
  categoria_id: string;
  nome: string;
  descricao: string | null;
  ingredientes: string | null;
  preco: number;
  foto_url: string | null;
  tipo: "simples" | "personalizavel";
  ordem: number;
};

export const Route = createFileRoute("/cardapio/$slug")({
  validateSearch: (s: Record<string, unknown>) => ({
    mesa: s.mesa ? Number(s.mesa) : undefined,
  }),
  component: Page,
});

function Page() {
  const { slug } = Route.useParams();
  const { mesa } = Route.useSearch();
  const { data: tenant, isLoading } = useTenantBySlug(slug);

  if (isLoading)
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="size-6 animate-spin text-primary" />
      </div>
    );
  if (!tenant)
    return (
      <div className="min-h-screen flex items-center justify-center text-muted-foreground">
        Estabelecimento não encontrado.
      </div>
    );

  return (
    <CartProvider tenantSlug={slug}>
      <Menu tenant={tenant} mesa={mesa ?? null} />
    </CartProvider>
  );
}

function Menu({
  tenant,
  mesa,
}: {
  tenant: NonNullable<ReturnType<typeof useTenantBySlug>["data"]>;
  mesa: number | null;
}) {
  const origem = mesa ? "mesa" : "delivery";
  const aberto = estaAberto(tenant.horario_funcionamento);
  const { count, bump } = useCart();

  const [busca, setBusca] = useState("");
  const [catAtiva, setCatAtiva] = useState<string | null>(null);
  const [itemSelecionado, setItemSelecionado] = useState<Item | null>(null);
  const [cartOpen, setCartOpen] = useState(false);
  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const [opcoes, setOpcoes] = useState<Opcao[] | null>(null);

  const fabRef = useRef<HTMLButtonElement>(null);

  const { data: categorias = [] } = useQuery({
    queryKey: ["public-categorias", tenant.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("categorias")
        .select("id,nome,ordem")
        .eq("tenant_id", tenant.id)
        .eq("ativo", true)
        .order("ordem");
      if (error) throw error;
      return data as Categoria[];
    },
  });

  const { data: itens = [] } = useQuery({
    queryKey: ["public-itens", tenant.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("itens")
        .select("id,categoria_id,nome,descricao,ingredientes,preco,foto_url,tipo,ordem")
        .eq("tenant_id", tenant.id)
        .eq("ativo", true)
        .order("ordem");
      if (error) throw error;
      return data as Item[];
    },
  });

  const itensFiltrados = useMemo(() => {
    const q = busca.trim().toLowerCase();
    if (!q) return itens;
    return itens.filter(
      (i) =>
        i.nome.toLowerCase().includes(q) ||
        (i.descricao || "").toLowerCase().includes(q) ||
        (i.ingredientes || "").toLowerCase().includes(q),
    );
  }, [itens, busca]);

  useEffect(() => {
    if (!catAtiva && categorias[0]) setCatAtiva(categorias[0].id);
  }, [categorias, catAtiva]);

  // bump animation on FAB
  useEffect(() => {
    if (!fabRef.current || bump === 0) return;
    fabRef.current.animate(
      [{ transform: "scale(1)" }, { transform: "scale(1.18)" }, { transform: "scale(1)" }],
      { duration: 280, easing: "ease-out" },
    );
  }, [bump]);

  const abrirItem = async (item: Item) => {
    setItemSelecionado(item);
    if (item.tipo === "personalizavel") {
      setOpcoes(null);
      const { data, error } = await supabase
        .from("item_opcoes")
        .select("id,nome,tipo_opcao,preco_adicional,ingredientes,ordem")
        .eq("item_id", item.id)
        .order("ordem");
      if (!error) setOpcoes((data || []) as Opcao[]);
    }
  };

  const scrollToCat = (id: string) => {
    setCatAtiva(id);
    document.getElementById(`cat-${id}`)?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  return (
    <div className="min-h-screen bg-background pb-32">
      {/* Hero */}
      <header className="relative">
        <div
          className="h-40 sm:h-52 bg-gradient-to-br from-primary/40 via-primary/15 to-background"
          style={{
            backgroundImage: tenant.logo_url
              ? `linear-gradient(180deg, transparent 0%, oklch(var(--background)) 100%), url(${tenant.logo_url})`
              : undefined,
            backgroundSize: "cover",
            backgroundPosition: "center",
          }}
        />
        <div className="max-w-3xl mx-auto px-4 -mt-12 relative">
          <div className="bg-card border border-border rounded-2xl p-4 shadow-xl">
            <div className="flex items-start gap-3">
              {tenant.logo_url ? (
                <img
                  src={tenant.logo_url}
                  alt={tenant.nome}
                  className="size-16 rounded-xl object-cover border-2 border-border"
                />
              ) : (
                <div className="size-16 rounded-xl bg-primary/15 text-primary text-2xl font-extrabold flex items-center justify-center">
                  {tenant.nome[0]}
                </div>
              )}
              <div className="flex-1 min-w-0">
                <h1 className="text-xl font-extrabold leading-tight">{tenant.nome}</h1>
                {tenant.descricao && (
                  <p className="text-xs text-muted-foreground line-clamp-2 mt-0.5">{tenant.descricao}</p>
                )}
                <div className="flex items-center gap-3 mt-2 text-xs">
                  <span
                    className={`inline-flex items-center gap-1 font-bold ${
                      aberto ? "text-success" : "text-destructive"
                    }`}
                  >
                    <span
                      className={`size-2 rounded-full ${aberto ? "bg-success" : "bg-destructive"}`}
                    />
                    {aberto ? "Aberto agora" : "Fechado"}
                  </span>
                  {origem === "mesa" && (
                    <span className="inline-flex items-center gap-1 bg-primary/15 text-primary px-2 py-0.5 rounded-full font-bold">
                      <MapPin className="size-3" /> Mesa {mesa}
                    </span>
                  )}
                  <span className="inline-flex items-center gap-1 text-muted-foreground">
                    <Clock className="size-3" /> ~{tenant.tempo_estimado_entrega_minutos}min
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Search */}
      <div className="max-w-3xl mx-auto px-4 mt-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
          <Input
            placeholder="Buscar item…"
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            className="pl-10 h-11 rounded-xl bg-surface border-border"
          />
        </div>
      </div>

      {/* Category tabs */}
      <div className="sticky top-0 z-20 bg-background/95 backdrop-blur border-b border-border mt-4">
        <div className="max-w-3xl mx-auto px-4 overflow-x-auto flex gap-2 py-3 no-scrollbar">
          {categorias.map((c) => (
            <button
              key={c.id}
              onClick={() => scrollToCat(c.id)}
              className={`shrink-0 px-4 h-9 rounded-full text-sm font-bold transition ${
                catAtiva === c.id
                  ? "bg-primary text-primary-foreground"
                  : "bg-surface text-foreground hover:bg-muted"
              }`}
            >
              {c.nome}
            </button>
          ))}
        </div>
      </div>

      {/* List */}
      <main className="max-w-3xl mx-auto px-4 mt-4 space-y-8">
        {!aberto && (
          <div className="rounded-xl border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive-foreground">
            <strong>Estabelecimento fechado.</strong> Você pode navegar pelo cardápio, mas pedidos só serão
            aceitos no horário de funcionamento.
          </div>
        )}

        {categorias.map((c) => {
          const ic = itensFiltrados.filter((i) => i.categoria_id === c.id);
          if (ic.length === 0) return null;
          return (
            <section key={c.id} id={`cat-${c.id}`} className="scroll-mt-20">
              <h2 className="text-lg font-extrabold mb-3">{c.nome}</h2>
              <div className="space-y-3">
                {ic.map((it) => (
                  <button
                    key={it.id}
                    onClick={() => abrirItem(it)}
                    className="w-full bg-card border border-border rounded-2xl p-3 flex gap-3 text-left hover:border-primary/50 transition"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="font-bold leading-tight">{it.nome}</div>
                      {it.descricao && (
                        <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{it.descricao}</p>
                      )}
                      <div className="mt-2 flex items-center gap-2">
                        <span className="text-primary font-extrabold">
                          {it.tipo === "personalizavel" ? "a partir de " : ""}
                          {brl(it.preco)}
                        </span>
                        {it.tipo === "personalizavel" && (
                          <span className="text-[10px] uppercase font-bold tracking-wider bg-primary/15 text-primary px-1.5 py-0.5 rounded">
                            monte
                          </span>
                        )}
                      </div>
                    </div>
                    {it.foto_url ? (
                      <img
                        src={it.foto_url}
                        alt={it.nome}
                        className="size-24 rounded-xl object-cover shrink-0"
                      />
                    ) : (
                      <div className="size-24 rounded-xl bg-muted shrink-0 flex items-center justify-center text-3xl">
                        🍽️
                      </div>
                    )}
                  </button>
                ))}
              </div>
            </section>
          );
        })}

        {itens.length === 0 && (
          <p className="text-center text-muted-foreground py-10">
            Cardápio sendo preparado. Volte em instantes!
          </p>
        )}
      </main>

      {/* Cart FAB */}
      {count > 0 && (
        <div className="fixed bottom-4 inset-x-0 px-4 z-30">
          <div className="max-w-3xl mx-auto">
            <button
              ref={fabRef}
              onClick={() => setCartOpen(true)}
              className="w-full h-14 rounded-2xl bg-primary text-primary-foreground font-bold flex items-center justify-between px-5 shadow-2xl shadow-primary/30"
            >
              <span className="flex items-center gap-2">
                <span className="size-7 rounded-full bg-primary-foreground/20 flex items-center justify-center text-sm">
                  {count}
                </span>
                Ver carrinho
              </span>
              <ShoppingBag className="size-5" />
            </button>
          </div>
        </div>
      )}

      {/* Sheets */}
      <CartDrawer
        open={cartOpen}
        onClose={() => setCartOpen(false)}
        onCheckout={() => {
          setCartOpen(false);
          setTimeout(() => setCheckoutOpen(true), 150);
        }}
        aberto={aberto}
      />

      {itemSelecionado?.tipo === "simples" && (
        <SimpleItemSheet
          open={!!itemSelecionado}
          onClose={() => setItemSelecionado(null)}
          item={itemSelecionado}
          onConfirm={(c) => useCartAdd(c)}
        />
      )}
      {itemSelecionado?.tipo === "personalizavel" && opcoes && (
        <PizzaBuilder
          open={!!itemSelecionado}
          onClose={() => setItemSelecionado(null)}
          itemId={itemSelecionado.id}
          itemNome={itemSelecionado.nome}
          precoBase={itemSelecionado.preco}
          opcoes={opcoes}
          regraDoisSabores={tenant.regra_dois_sabores}
          onConfirm={(c) => useCartAdd(c)}
        />
      )}

      <CheckoutSheet
        open={checkoutOpen}
        onClose={() => setCheckoutOpen(false)}
        tenant={tenant}
        origem={origem}
        mesaNumero={mesa}
      />
    </div>
  );
}

// helper that uses the cart context from current render scope
function useCartAdd(c: CartItem) {
  // This indirection allows children to call add via a closure;
  // call inside an effect-safe spot — we just delegate to context.
  // (Kept here for clarity; consumer components actually invoke via hook.)
  const { add } = useCart();
  add(c);
}

function CartDrawer({
  open,
  onClose,
  onCheckout,
  aberto,
}: {
  open: boolean;
  onClose: () => void;
  onCheckout: () => void;
  aberto: boolean;
}) {
  const { items, setQty, remove, subtotal, clear } = useCart();
  return (
    <Sheet open={open} onOpenChange={(o) => !o && onClose()}>
      <SheetContent side="bottom" className="rounded-t-3xl p-0 max-h-[85vh] flex flex-col bg-card">
        <div className="p-5 border-b border-border">
          <div className="mx-auto h-1 w-12 bg-muted rounded-full mb-3" />
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-extrabold">Seu carrinho</h2>
            {items.length > 0 && (
              <button
                onClick={clear}
                className="text-xs text-muted-foreground hover:text-destructive flex items-center gap-1"
              >
                <Trash2 className="size-3" /> Esvaziar
              </button>
            )}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {items.length === 0 && (
            <p className="text-center text-muted-foreground py-10 text-sm">Seu carrinho está vazio.</p>
          )}
          {items.map((it) => (
            <div key={it.uid} className="flex gap-3 bg-surface rounded-xl p-3">
              <div className="flex-1 min-w-0">
                <div className="font-bold text-sm leading-tight">{it.nome}</div>
                {it.personalizacao?.resumo && (
                  <div className="text-xs text-muted-foreground truncate">{it.personalizacao.resumo}</div>
                )}
                {it.observacoes && (
                  <div className="text-xs text-muted-foreground italic mt-0.5">Obs: {it.observacoes}</div>
                )}
                <div className="mt-2 flex items-center justify-between">
                  <div className="flex items-center gap-2 bg-background rounded-full p-1">
                    <button
                      onClick={() =>
                        it.quantidade === 1 ? remove(it.uid) : setQty(it.uid, it.quantidade - 1)
                      }
                      className="size-7 rounded-full bg-surface flex items-center justify-center"
                    >
                      <Minus className="size-3" />
                    </button>
                    <span className="w-5 text-center text-sm font-bold">{it.quantidade}</span>
                    <button
                      onClick={() => setQty(it.uid, it.quantidade + 1)}
                      className="size-7 rounded-full bg-primary text-primary-foreground flex items-center justify-center"
                    >
                      <Plus className="size-3" />
                    </button>
                  </div>
                  <span className="font-extrabold text-primary text-sm">
                    {brl(it.preco_unitario * it.quantidade)}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>

        {items.length > 0 && (
          <div className="p-4 border-t border-border space-y-3">
            <div className="flex justify-between font-bold">
              <span>Subtotal</span>
              <span>{brl(subtotal)}</span>
            </div>
            <Button
              disabled={!aberto}
              onClick={onCheckout}
              className="w-full h-12 text-base font-bold rounded-xl"
            >
              {aberto ? "Finalizar pedido" : "Fechado no momento"}
            </Button>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}
