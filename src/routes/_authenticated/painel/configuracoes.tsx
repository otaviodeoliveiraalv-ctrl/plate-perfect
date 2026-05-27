import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth";
import { useMyTenant, type HorarioDia, type Horario } from "@/lib/tenant";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Loader as Loader2, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";

export const Route = createFileRoute("/_authenticated/painel/configuracoes")({
  component: Page,
});

type FormaPagamento = "pix" | "dinheiro" | "cartao_entrega";

const DIAS: { key: keyof Horario; label: string }[] = [
  { key: "seg", label: "Segunda" },
  { key: "ter", label: "Terça" },
  { key: "qua", label: "Quarta" },
  { key: "qui", label: "Quinta" },
  { key: "sex", label: "Sexta" },
  { key: "sab", label: "Sábado" },
  { key: "dom", label: "Domingo" },
];

const FORMAS: { key: FormaPagamento; label: string }[] = [
  { key: "pix", label: "Pix" },
  { key: "dinheiro", label: "Dinheiro" },
  { key: "cartao_entrega", label: "Cartão na entrega" },
];

const DEFAULT_HORARIO: Horario = {
  seg: { abre: "11:00", fecha: "22:00", ativo: true },
  ter: { abre: "11:00", fecha: "22:00", ativo: true },
  qua: { abre: "11:00", fecha: "22:00", ativo: true },
  qui: { abre: "11:00", fecha: "22:00", ativo: true },
  sex: { abre: "11:00", fecha: "22:00", ativo: true },
  sab: { abre: "11:00", fecha: "23:00", ativo: true },
  dom: { abre: "11:00", fecha: "22:00", ativo: false },
};

function Page() {
  const { user } = useAuth();
  const { data: tenant, refetch } = useMyTenant(user?.id);

  const [saving, setSaving] = useState(false);

  // Aba: Estabelecimento
  const [nome, setNome] = useState("");
  const [telefone, setTelefone] = useState("");
  const [endereco, setEndereco] = useState("");
  const [descricao, setDescricao] = useState("");
  const [logoUrl, setLogoUrl] = useState("");
  const [uploadingLogo, setUploadingLogo] = useState(false);

  // Aba: Funcionamento
  const [horario, setHorario] = useState<Horario>(DEFAULT_HORARIO);

  // Aba: Delivery
  const [deliveryAtivo, setDeliveryAtivo] = useState(false);
  const [taxaEntrega, setTaxaEntrega] = useState("0");
  const [pedidoMinimo, setPedidoMinimo] = useState("0");
  const [tempoEstimado, setTempoEstimado] = useState("45");

  // Aba: Pagamentos
  const [formasPagamento, setFormasPagamento] = useState<FormaPagamento[]>(["pix"]);
  const [regraDoisSabores, setRegraDoisSabores] = useState<"maior" | "media">("maior");
  const [mesaAtivo, setMesaAtivo] = useState(true);

  useEffect(() => {
    if (!tenant) return;
    setNome(tenant.nome ?? "");
    setTelefone(tenant.telefone ?? "");
    setEndereco(tenant.endereco ?? "");
    setDescricao(tenant.descricao ?? "");
    setLogoUrl(tenant.logo_url ?? "");
    setHorario({ ...DEFAULT_HORARIO, ...(tenant.horario_funcionamento as Horario) });
    setDeliveryAtivo(tenant.delivery_ativo);
    setTaxaEntrega(String(tenant.taxa_entrega_fixa));
    setPedidoMinimo(String(tenant.pedido_minimo));
    setTempoEstimado(String(tenant.tempo_estimado_entrega_minutos));
    setFormasPagamento((tenant.formas_pagamento as FormaPagamento[]) ?? ["pix"]);
    setRegraDoisSabores((tenant.regra_dois_sabores as "maior" | "media") ?? "maior");
    setMesaAtivo(tenant.mesa_ativo);
  }, [tenant]);

  async function uploadLogo(file: File) {
    if (!tenant) return;
    setUploadingLogo(true);
    const ext = file.name.split(".").pop();
    const path = `${tenant.id}/logo.${ext}`;
    const { error } = await supabase.storage
      .from("menu-images")
      .upload(path, file, { upsert: true });
    if (error) {
      setUploadingLogo(false);
      return toast.error("Falha ao enviar logo");
    }
    const { data: pub } = supabase.storage.from("menu-images").getPublicUrl(path);
    setLogoUrl(pub.publicUrl + `?t=${Date.now()}`);
    setUploadingLogo(false);
  }

  async function salvar() {
    if (!tenant) return;
    setSaving(true);
    const { error } = await supabase
      .from("tenants")
      .update({
        nome,
        telefone: telefone || null,
        endereco: endereco || null,
        descricao: descricao || null,
        logo_url: logoUrl || null,
        horario_funcionamento: horario,
        delivery_ativo: deliveryAtivo,
        taxa_entrega_fixa: parseFloat(taxaEntrega) || 0,
        pedido_minimo: parseFloat(pedidoMinimo) || 0,
        tempo_estimado_entrega_minutos: parseInt(tempoEstimado) || 45,
        formas_pagamento: formasPagamento,
        regra_dois_sabores: regraDoisSabores,
        mesa_ativo: mesaAtivo,
      })
      .eq("id", tenant.id);
    setSaving(false);
    if (error) return toast.error(error.message);
    toast.success("Configurações salvas!");
    refetch();
  }

  function setDia(key: keyof Horario, patch: Partial<HorarioDia>) {
    setHorario((h) => ({ ...h, [key]: { ...h[key], ...patch } }));
  }

  function toggleForma(f: FormaPagamento) {
    setFormasPagamento((prev) =>
      prev.includes(f) ? prev.filter((p) => p !== f) : [...prev, f],
    );
  }

  if (!tenant) {
    return (
      <div className="p-8 flex items-center justify-center">
        <Loader2 className="size-5 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="p-4 md:p-8 max-w-3xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl md:text-3xl font-extrabold">Configurações</h1>
          <p className="text-sm text-muted-foreground mt-1">{tenant.nome}</p>
        </div>
        <Button onClick={salvar} disabled={saving} className="gap-2">
          {saving ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />}
          Salvar
        </Button>
      </div>

      <Tabs defaultValue="estabelecimento">
        <TabsList className="w-full mb-6 grid grid-cols-4 h-auto bg-surface p-1 rounded-xl">
          <TabsTrigger value="estabelecimento" className="text-xs py-2 rounded-lg data-[state=active]:bg-background">
            Estabelecimento
          </TabsTrigger>
          <TabsTrigger value="funcionamento" className="text-xs py-2 rounded-lg data-[state=active]:bg-background">
            Funcionamento
          </TabsTrigger>
          <TabsTrigger value="delivery" className="text-xs py-2 rounded-lg data-[state=active]:bg-background">
            Delivery
          </TabsTrigger>
          <TabsTrigger value="pagamentos" className="text-xs py-2 rounded-lg data-[state=active]:bg-background">
            Pagamentos
          </TabsTrigger>
        </TabsList>

        {/* Estabelecimento */}
        <TabsContent value="estabelecimento" className="space-y-4">
          <Field label="Nome do estabelecimento">
            <Input value={nome} onChange={(e) => setNome(e.target.value)} />
          </Field>
          <Field label="Telefone / WhatsApp">
            <Input value={telefone} onChange={(e) => setTelefone(e.target.value)} placeholder="+55 11 99999-9999" />
          </Field>
          <Field label="Endereço">
            <Input value={endereco} onChange={(e) => setEndereco(e.target.value)} placeholder="Rua, número, bairro" />
          </Field>
          <Field label="Descrição">
            <textarea
              value={descricao}
              onChange={(e) => setDescricao(e.target.value)}
              placeholder="Breve descrição do seu estabelecimento"
              rows={3}
              className="flex w-full rounded-xl border border-input bg-transparent px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring resize-none"
            />
          </Field>
          <Field label="Logo">
            <div className="flex items-center gap-3">
              {logoUrl && (
                <img
                  src={logoUrl}
                  alt="Logo"
                  className="size-16 rounded-xl object-cover border border-border"
                />
              )}
              <label className="cursor-pointer">
                <div className="px-4 py-2 rounded-xl border border-border bg-background text-sm font-medium hover:bg-muted/30 transition inline-flex items-center gap-2">
                  {uploadingLogo ? <Loader2 className="size-4 animate-spin" /> : null}
                  {uploadingLogo ? "Enviando…" : "Escolher imagem"}
                </div>
                <input
                  type="file"
                  accept="image/*"
                  className="sr-only"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) uploadLogo(f);
                  }}
                />
              </label>
              {logoUrl && (
                <button
                  onClick={() => setLogoUrl("")}
                  className="text-xs text-destructive hover:underline"
                >
                  Remover
                </button>
              )}
            </div>
          </Field>
        </TabsContent>

        {/* Funcionamento */}
        <TabsContent value="funcionamento" className="space-y-1">
          <p className="text-sm text-muted-foreground mb-4">
            Configure os dias e horários em que o estabelecimento aceita pedidos.
          </p>
          <div className="bg-surface border border-border rounded-2xl divide-y divide-border">
            {DIAS.map(({ key, label }) => {
              const d = horario[key];
              return (
                <div key={key} className="flex items-center gap-3 px-4 py-3">
                  <Switch
                    checked={d.ativo}
                    onCheckedChange={(v) => setDia(key, { ativo: v })}
                  />
                  <span className={`w-20 text-sm font-medium ${d.ativo ? "" : "text-muted-foreground"}`}>
                    {label}
                  </span>
                  {d.ativo ? (
                    <div className="flex items-center gap-2 ml-auto">
                      <input
                        type="time"
                        value={d.abre}
                        onChange={(e) => setDia(key, { abre: e.target.value })}
                        className="h-8 rounded-lg border border-input bg-background px-2 text-sm focus:outline-none focus:ring-1 focus:ring-ring"
                      />
                      <span className="text-muted-foreground text-xs">até</span>
                      <input
                        type="time"
                        value={d.fecha}
                        onChange={(e) => setDia(key, { fecha: e.target.value })}
                        className="h-8 rounded-lg border border-input bg-background px-2 text-sm focus:outline-none focus:ring-1 focus:ring-ring"
                      />
                    </div>
                  ) : (
                    <span className="ml-auto text-xs text-muted-foreground">Fechado</span>
                  )}
                </div>
              );
            })}
          </div>
        </TabsContent>

        {/* Delivery */}
        <TabsContent value="delivery" className="space-y-4">
          <div className="bg-surface border border-border rounded-2xl p-4 flex items-center justify-between">
            <div>
              <div className="font-semibold text-sm">Habilitar delivery</div>
              <div className="text-xs text-muted-foreground">Aceita pedidos de entrega</div>
            </div>
            <Switch checked={deliveryAtivo} onCheckedChange={setDeliveryAtivo} />
          </div>

          <div className="bg-surface border border-border rounded-2xl p-4 flex items-center justify-between">
            <div>
              <div className="font-semibold text-sm">Habilitar pedido na mesa</div>
              <div className="text-xs text-muted-foreground">Aceita pedidos via QR Code na mesa</div>
            </div>
            <Switch checked={mesaAtivo} onCheckedChange={setMesaAtivo} />
          </div>

          <div className={deliveryAtivo ? "" : "opacity-50 pointer-events-none"}>
            <Field label="Taxa de entrega (R$)">
              <Input
                type="number"
                min="0"
                step="0.50"
                value={taxaEntrega}
                onChange={(e) => setTaxaEntrega(e.target.value)}
                placeholder="0.00"
              />
              <p className="text-xs text-muted-foreground mt-1">Use 0 para entrega grátis.</p>
            </Field>
            <div className="mt-4">
              <Field label="Pedido mínimo (R$)">
                <Input
                  type="number"
                  min="0"
                  step="1"
                  value={pedidoMinimo}
                  onChange={(e) => setPedidoMinimo(e.target.value)}
                  placeholder="0.00"
                />
              </Field>
            </div>
            <div className="mt-4">
              <Field label="Tempo estimado de entrega (minutos)">
                <Input
                  type="number"
                  min="5"
                  step="5"
                  value={tempoEstimado}
                  onChange={(e) => setTempoEstimado(e.target.value)}
                />
              </Field>
            </div>
          </div>
        </TabsContent>

        {/* Pagamentos */}
        <TabsContent value="pagamentos" className="space-y-4">
          <div>
            <h3 className="font-bold text-sm mb-3">Formas de pagamento aceitas</h3>
            <div className="space-y-2">
              {FORMAS.map(({ key, label }) => (
                <label
                  key={key}
                  className={`flex items-center gap-3 p-3 rounded-xl border-2 cursor-pointer transition ${
                    formasPagamento.includes(key)
                      ? "border-primary bg-primary/10"
                      : "border-border bg-surface"
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={formasPagamento.includes(key)}
                    onChange={() => toggleForma(key)}
                    className="sr-only"
                  />
                  <div
                    className={`size-5 rounded border-2 flex items-center justify-center transition ${
                      formasPagamento.includes(key)
                        ? "border-primary bg-primary"
                        : "border-border"
                    }`}
                  >
                    {formasPagamento.includes(key) && (
                      <svg className="size-3 text-white" viewBox="0 0 12 12" fill="none">
                        <path d="M2 6l3 3 5-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    )}
                  </div>
                  <span className="font-medium text-sm">{label}</span>
                </label>
              ))}
            </div>
          </div>

          <div>
            <h3 className="font-bold text-sm mb-3">Regra para pizzas de 2 sabores</h3>
            <div className="space-y-2">
              {[
                { value: "maior", label: "Cobrar o valor do sabor mais caro", desc: "Padrão do mercado." },
                { value: "media", label: "Cobrar a média dos dois sabores", desc: "Mais justo para o cliente." },
              ].map((opt) => (
                <label
                  key={opt.value}
                  className={`flex items-start gap-3 p-3 rounded-xl border-2 cursor-pointer transition ${
                    regraDoisSabores === opt.value
                      ? "border-primary bg-primary/10"
                      : "border-border bg-surface"
                  }`}
                >
                  <input
                    type="radio"
                    name="regra"
                    value={opt.value}
                    checked={regraDoisSabores === opt.value}
                    onChange={() => setRegraDoisSabores(opt.value as "maior" | "media")}
                    className="sr-only"
                  />
                  <div
                    className={`mt-0.5 size-5 rounded-full border-2 flex items-center justify-center shrink-0 ${
                      regraDoisSabores === opt.value
                        ? "border-primary bg-primary"
                        : "border-border"
                    }`}
                  >
                    {regraDoisSabores === opt.value && (
                      <div className="size-2 rounded-full bg-white" />
                    )}
                  </div>
                  <div>
                    <div className="font-medium text-sm">{opt.label}</div>
                    <div className="text-xs text-muted-foreground">{opt.desc}</div>
                  </div>
                </label>
              ))}
            </div>
          </div>
        </TabsContent>
      </Tabs>

      <div className="mt-6 flex justify-end">
        <Button onClick={salvar} disabled={saving} className="gap-2">
          {saving ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />}
          Salvar alterações
        </Button>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <label className="text-sm font-medium">{label}</label>
      {children}
    </div>
  );
}
