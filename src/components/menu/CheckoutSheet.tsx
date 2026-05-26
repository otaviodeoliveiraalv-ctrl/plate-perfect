import { useState } from "react";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useCart, brl } from "@/lib/cart";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "@tanstack/react-router";
import { Loader2 } from "lucide-react";
import type { Tenant } from "@/lib/tenant";

type Origem = "mesa" | "delivery";
type Forma = "pix" | "dinheiro" | "cartao_entrega";

const FORMA_LABEL: Record<Forma, string> = {
  pix: "Pix",
  dinheiro: "Dinheiro",
  cartao_entrega: "Cartão na entrega",
};

export function CheckoutSheet({
  open,
  onClose,
  tenant,
  origem,
  mesaNumero,
}: {
  open: boolean;
  onClose: () => void;
  tenant: Tenant;
  origem: Origem;
  mesaNumero: number | null;
}) {
  const { items, subtotal, clear } = useCart();
  const navigate = useNavigate();
  const [nome, setNome] = useState("");
  const [telefone, setTelefone] = useState("");
  const [endereco, setEndereco] = useState("");
  const [bairro, setBairro] = useState("");
  const [forma, setForma] = useState<Forma | null>(null);
  const [troco, setTroco] = useState("");
  const [obs, setObs] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  const taxa = origem === "delivery" ? tenant.taxa_entrega_fixa : 0;
  const total = subtotal + taxa;

  const podeEnviar =
    items.length > 0 &&
    nome.trim().length > 1 &&
    (origem === "mesa" ||
      (telefone.trim().length >= 8 && endereco.trim().length > 2 && bairro.trim().length > 1)) &&
    !!forma &&
    (origem === "mesa" || subtotal >= tenant.pedido_minimo);

  const enviar = async () => {
    if (!podeEnviar || !forma) return;
    setEnviando(true);
    setErro(null);
    try {
      let cliente_id: string | null = null;
      const { data: cli, error: e1 } = await supabase
        .from("clientes")
        .insert({
          tenant_id: tenant.id,
          nome,
          telefone: telefone || null,
          endereco: endereco || null,
          bairro: bairro || null,
        })
        .select("id")
        .single();
      if (e1) throw e1;
      cliente_id = cli.id;

      const { data: ped, error: e2 } = await supabase
        .from("pedidos")
        .insert({
          tenant_id: tenant.id,
          cliente_id,
          mesa_numero: origem === "mesa" ? mesaNumero : null,
          origem,
          subtotal,
          taxa_entrega: taxa,
          total,
          forma_pagamento: forma,
          troco_para: forma === "dinheiro" && troco ? Number(troco) : null,
          observacoes: obs || null,
          nome_cliente: nome,
          telefone_cliente: telefone || null,
          endereco_entrega: origem === "delivery" ? endereco : null,
          bairro_entrega: origem === "delivery" ? bairro : null,
        })
        .select("id")
        .single();
      if (e2) throw e2;

      const itensInsert = items.map((it) => ({
        pedido_id: ped.id,
        item_id: it.item_id,
        nome_item: it.nome,
        quantidade: it.quantidade,
        preco_unitario: it.preco_unitario,
        preco_total: it.preco_unitario * it.quantidade,
        observacoes: it.observacoes ?? null,
        personalizacao: it.personalizacao ? (it.personalizacao as never) : null,
      }));
      const { error: e3 } = await supabase.from("pedido_itens").insert(itensInsert);
      if (e3) throw e3;

      clear();
      navigate({ to: "/pedido/$id", params: { id: ped.id } });
    } catch (e) {
      const err = e as { message?: string };
      setErro(err.message || "Falha ao enviar pedido.");
    } finally {
      setEnviando(false);
    }
  };

  return (
    <Sheet open={open} onOpenChange={(o) => !o && onClose()}>
      <SheetContent side="bottom" className="h-[92vh] rounded-t-3xl p-0 flex flex-col bg-card">
        <div className="p-5 border-b border-border">
          <div className="mx-auto h-1 w-12 bg-muted rounded-full mb-3" />
          <h2 className="text-xl font-extrabold">Finalizar pedido</h2>
          <p className="text-xs text-muted-foreground mt-1">
            {origem === "mesa" ? `Mesa ${mesaNumero}` : "Entrega"} · {tenant.nome}
          </p>
        </div>

        <div className="flex-1 overflow-y-auto p-5 space-y-5">
          <section className="space-y-2">
            <h3 className="font-bold text-sm uppercase tracking-wide text-muted-foreground">Seu pedido</h3>
            <div className="bg-surface rounded-xl divide-y divide-border">
              {items.map((it) => (
                <div key={it.uid} className="p-3 flex gap-3">
                  <div className="size-8 rounded-lg bg-primary/15 text-primary font-bold flex items-center justify-center shrink-0">
                    {it.quantidade}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold text-sm">{it.nome}</div>
                    {it.personalizacao?.resumo && (
                      <div className="text-xs text-muted-foreground truncate">{it.personalizacao.resumo}</div>
                    )}
                    {it.observacoes && (
                      <div className="text-xs text-muted-foreground italic">Obs: {it.observacoes}</div>
                    )}
                  </div>
                  <div className="font-bold text-sm">{brl(it.preco_unitario * it.quantidade)}</div>
                </div>
              ))}
            </div>
          </section>

          <section className="space-y-3">
            <h3 className="font-bold text-sm uppercase tracking-wide text-muted-foreground">Seus dados</h3>
            <Input placeholder="Seu nome" value={nome} onChange={(e) => setNome(e.target.value)} />
            {origem === "delivery" && (
              <>
                <Input
                  placeholder="Telefone (WhatsApp)"
                  value={telefone}
                  onChange={(e) => setTelefone(e.target.value)}
                />
                <Input
                  placeholder="Endereço (rua e número)"
                  value={endereco}
                  onChange={(e) => setEndereco(e.target.value)}
                />
                <Input placeholder="Bairro" value={bairro} onChange={(e) => setBairro(e.target.value)} />
              </>
            )}
            <Textarea
              rows={2}
              placeholder="Alguma observação geral? (opcional)"
              value={obs}
              onChange={(e) => setObs(e.target.value)}
            />
          </section>

          <section className="space-y-2">
            <h3 className="font-bold text-sm uppercase tracking-wide text-muted-foreground">Pagamento</h3>
            <div className="grid gap-2">
              {tenant.formas_pagamento.map((f) => (
                <button
                  key={f}
                  onClick={() => setForma(f)}
                  className={`p-3 rounded-xl border-2 text-left font-medium ${
                    forma === f ? "border-primary bg-primary/10" : "border-border bg-surface"
                  }`}
                >
                  {FORMA_LABEL[f]}
                </button>
              ))}
            </div>
            {forma === "dinheiro" && (
              <Input
                type="number"
                placeholder="Troco para R$ (opcional)"
                value={troco}
                onChange={(e) => setTroco(e.target.value)}
              />
            )}
          </section>

          <section className="bg-surface rounded-xl p-4 space-y-1 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Subtotal</span>
              <span>{brl(subtotal)}</span>
            </div>
            {origem === "delivery" && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Taxa de entrega</span>
                <span>{taxa > 0 ? brl(taxa) : "Grátis"}</span>
              </div>
            )}
            <div className="flex justify-between font-extrabold text-base pt-2 border-t border-border mt-2">
              <span>Total</span>
              <span className="text-primary">{brl(total)}</span>
            </div>
            {origem === "delivery" && tenant.pedido_minimo > 0 && subtotal < tenant.pedido_minimo && (
              <p className="text-xs text-destructive pt-1">
                Pedido mínimo de {brl(tenant.pedido_minimo)} para delivery.
              </p>
            )}
          </section>

          {erro && <p className="text-sm text-destructive">{erro}</p>}
        </div>

        <div className="p-4 border-t border-border">
          <Button
            disabled={!podeEnviar || enviando}
            onClick={enviar}
            className="w-full h-13 text-base font-bold rounded-xl"
          >
            {enviando ? (
              <>
                <Loader2 className="size-4 animate-spin mr-2" /> Enviando…
              </>
            ) : (
              <>Enviar pedido · {brl(total)}</>
            )}
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
