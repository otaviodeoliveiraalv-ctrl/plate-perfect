import { useMemo, useState } from "react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ArrowLeft, Check, Minus, Plus, X } from "lucide-react";
import { brl, type CartItem } from "@/lib/cart";

export type Opcao = {
  id: string;
  nome: string;
  tipo_opcao: "tamanho" | "massa" | "sabor" | "complemento";
  preco_adicional: number;
  ingredientes: string | null;
  ordem: number;
};

type Props = {
  open: boolean;
  onClose: () => void;
  itemId: string;
  itemNome: string;
  precoBase: number;
  opcoes: Opcao[];
  regraDoisSabores: string; // 'maior' | 'media'
  onConfirm: (c: CartItem) => void;
};

const STEPS = ["Tamanho", "Massa", "Quantidade", "Sabores", "Revisão"] as const;

export function PizzaBuilder({
  open,
  onClose,
  itemId,
  itemNome,
  precoBase,
  opcoes,
  regraDoisSabores,
  onConfirm,
}: Props) {
  const tamanhos = opcoes.filter((o) => o.tipo_opcao === "tamanho").sort((a, b) => a.ordem - b.ordem);
  const massas = opcoes.filter((o) => o.tipo_opcao === "massa").sort((a, b) => a.ordem - b.ordem);
  const sabores = opcoes.filter((o) => o.tipo_opcao === "sabor").sort((a, b) => a.ordem - b.ordem);
  const complementos = opcoes.filter((o) => o.tipo_opcao === "complemento").sort((a, b) => a.ordem - b.ordem);

  const [step, setStep] = useState(0);
  const [tamanho, setTamanho] = useState<Opcao | null>(null);
  const [massa, setMassa] = useState<Opcao | null>(null);
  const [qtdSabores, setQtdSabores] = useState<1 | 2>(1);
  const [selSabores, setSelSabores] = useState<Opcao[]>([]);
  const [selComplementos, setSelComplementos] = useState<Opcao[]>([]);
  const [obs, setObs] = useState("");
  const [qtd, setQtd] = useState(1);

  const reset = () => {
    setStep(0);
    setTamanho(null);
    setMassa(null);
    setQtdSabores(1);
    setSelSabores([]);
    setSelComplementos([]);
    setObs("");
    setQtd(1);
  };

  const close = () => {
    onClose();
    setTimeout(reset, 200);
  };

  const precoSabores = useMemo(() => {
    if (selSabores.length === 0) return 0;
    const valores = selSabores.map((s) => s.preco_adicional);
    if (selSabores.length === 1) return valores[0];
    if (regraDoisSabores === "media") return valores.reduce((a, b) => a + b, 0) / valores.length;
    return Math.max(...valores);
  }, [selSabores, regraDoisSabores]);

  const precoUnit =
    precoBase +
    (tamanho?.preco_adicional ?? 0) +
    (massa?.preco_adicional ?? 0) +
    precoSabores +
    selComplementos.reduce((a, c) => a + c.preco_adicional, 0);

  const canNext =
    (step === 0 && !!tamanho) ||
    (step === 1 && (massas.length === 0 || !!massa)) ||
    step === 2 ||
    (step === 3 && selSabores.length === qtdSabores) ||
    step === 4;

  const next = () => {
    if (step === 1 && massas.length === 0) setStep(2);
    else setStep((s) => Math.min(STEPS.length - 1, s + 1));
  };
  const prev = () => setStep((s) => Math.max(0, s - 1));

  const toggleSabor = (s: Opcao) => {
    setSelSabores((prev) => {
      const exists = prev.find((p) => p.id === s.id);
      if (exists) return prev.filter((p) => p.id !== s.id);
      if (prev.length >= qtdSabores) return [...prev.slice(1), s];
      return [...prev, s];
    });
  };

  const handleConfirm = () => {
    const resumo = [
      tamanho?.nome,
      massa?.nome,
      selSabores.map((s) => s.nome).join(" + "),
      selComplementos.length ? `+ ${selComplementos.map((c) => c.nome).join(", ")}` : "",
    ]
      .filter(Boolean)
      .join(" · ");
    onConfirm({
      uid: crypto.randomUUID(),
      item_id: itemId,
      nome: itemNome,
      preco_unitario: precoUnit,
      quantidade: qtd,
      observacoes: obs || undefined,
      personalizacao: {
        tamanho: tamanho?.nome,
        massa: massa?.nome,
        sabores: selSabores.map((s) => s.nome),
        complementos: selComplementos.map((c) => c.nome),
        resumo,
      },
    });
    close();
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && close()}>
      <DialogContent className="p-0 gap-0 max-w-lg sm:rounded-2xl overflow-hidden bg-card border-border max-h-[92vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center gap-3 p-4 border-b border-border">
          {step > 0 ? (
            <button onClick={prev} className="p-1 -ml-1 rounded-full hover:bg-muted">
              <ArrowLeft className="size-5" />
            </button>
          ) : (
            <button onClick={close} className="p-1 -ml-1 rounded-full hover:bg-muted">
              <X className="size-5" />
            </button>
          )}
          <div className="flex-1">
            <div className="text-xs text-muted-foreground">
              Passo {Math.min(step + 1, STEPS.length)} de {STEPS.length}
            </div>
            <div className="font-bold leading-tight">{STEPS[step]}</div>
          </div>
          <div className="text-right">
            <div className="text-xs text-muted-foreground">Total</div>
            <div className="font-extrabold text-primary">{brl(precoUnit * qtd)}</div>
          </div>
        </div>

        {/* Progress bar */}
        <div className="h-1 bg-muted">
          <div
            className="h-full bg-primary transition-all"
            style={{ width: `${((step + 1) / STEPS.length) * 100}%` }}
          />
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {step === 0 && (
            <div className="space-y-2">
              {tamanhos.length === 0 && (
                <p className="text-sm text-muted-foreground">Nenhum tamanho cadastrado.</p>
              )}
              {tamanhos.map((t) => (
                <button
                  key={t.id}
                  onClick={() => setTamanho(t)}
                  className={`w-full p-4 rounded-xl border-2 flex items-center justify-between text-left transition ${
                    tamanho?.id === t.id ? "border-primary bg-primary/10" : "border-border bg-surface"
                  }`}
                >
                  <div>
                    <div className="font-semibold">{t.nome}</div>
                    {t.ingredientes && (
                      <div className="text-xs text-muted-foreground">{t.ingredientes}</div>
                    )}
                  </div>
                  <div className="text-sm font-bold">
                    {t.preco_adicional > 0 ? `+ ${brl(t.preco_adicional)}` : "Incluso"}
                  </div>
                </button>
              ))}
            </div>
          )}

          {step === 1 && (
            <div className="space-y-2">
              {massas.length === 0 && (
                <p className="text-sm text-muted-foreground">
                  Esta pizza não tem opção de massa — siga para o próximo passo.
                </p>
              )}
              {massas.map((m) => (
                <button
                  key={m.id}
                  onClick={() => setMassa(m)}
                  className={`w-full p-4 rounded-xl border-2 flex items-center justify-between text-left transition ${
                    massa?.id === m.id ? "border-primary bg-primary/10" : "border-border bg-surface"
                  }`}
                >
                  <div className="font-semibold">{m.nome}</div>
                  <div className="text-sm font-bold">
                    {m.preco_adicional > 0 ? `+ ${brl(m.preco_adicional)}` : "Incluso"}
                  </div>
                </button>
              ))}
            </div>
          )}

          {step === 2 && (
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">Quantos sabores você quer?</p>
              <div className="grid grid-cols-2 gap-3">
                {[1, 2].map((n) => (
                  <button
                    key={n}
                    onClick={() => {
                      setQtdSabores(n as 1 | 2);
                      setSelSabores([]);
                    }}
                    className={`p-6 rounded-2xl border-2 font-bold text-2xl ${
                      qtdSabores === n ? "border-primary bg-primary/10 text-primary" : "border-border"
                    }`}
                  >
                    {n}
                    <div className="text-xs font-normal text-muted-foreground mt-1">
                      {n === 1 ? "sabor" : "sabores"}
                    </div>
                  </button>
                ))}
              </div>
              {qtdSabores === 2 && (
                <p className="text-xs text-muted-foreground text-center">
                  {regraDoisSabores === "media"
                    ? "Em pizzas de 2 sabores, será cobrado o valor médio."
                    : "Em pizzas de 2 sabores, será cobrado o valor do sabor mais caro."}
                </p>
              )}
            </div>
          )}

          {step === 3 && (
            <div className="space-y-2">
              <p className="text-xs text-muted-foreground mb-2">
                Selecione {qtdSabores} {qtdSabores === 1 ? "sabor" : "sabores"} ({selSabores.length}/{qtdSabores})
              </p>
              {sabores.map((s) => {
                const sel = selSabores.find((p) => p.id === s.id);
                return (
                  <button
                    key={s.id}
                    onClick={() => toggleSabor(s)}
                    className={`w-full p-3 rounded-xl border-2 flex items-center gap-3 text-left transition ${
                      sel ? "border-primary bg-primary/10" : "border-border bg-surface"
                    }`}
                  >
                    <div
                      className={`size-6 shrink-0 rounded-full border-2 flex items-center justify-center ${
                        sel ? "bg-primary border-primary" : "border-border"
                      }`}
                    >
                      {sel && <Check className="size-4 text-primary-foreground" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-semibold">{s.nome}</div>
                      {s.ingredientes && (
                        <div className="text-xs text-muted-foreground truncate">{s.ingredientes}</div>
                      )}
                    </div>
                    <div className="text-sm font-bold">{brl(s.preco_adicional)}</div>
                  </button>
                );
              })}
            </div>
          )}

          {step === 4 && (
            <div className="space-y-4">
              {/* Pizza preview */}
              <div className="flex justify-center py-2">
                <div className="relative size-44 rounded-full border-4 border-primary/40 overflow-hidden shadow-xl"
                  style={{ background: "radial-gradient(circle, oklch(0.85 0.12 75) 0%, oklch(0.75 0.15 50) 100%)" }}>
                  {selSabores.length === 2 && (
                    <div className="absolute top-0 bottom-0 left-1/2 w-px bg-background/50" />
                  )}
                  <div className="absolute inset-0 flex">
                    {selSabores.map((s, i) => (
                      <div
                        key={s.id}
                        className="flex-1 flex items-center justify-center text-center p-2"
                        style={{ width: selSabores.length === 2 ? "50%" : "100%" }}
                      >
                        <span className="text-[11px] font-bold text-background drop-shadow leading-tight">
                          {s.nome}
                        </span>
                      </div>
                    ))}
                    {selSabores.length === 0 && (
                      <div className="m-auto text-xs text-background/80">Sem sabores</div>
                    )}
                  </div>
                </div>
              </div>

              <div className="bg-surface rounded-xl p-3 space-y-1 text-sm">
                {tamanho && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Tamanho</span>
                    <span className="font-semibold">{tamanho.nome}</span>
                  </div>
                )}
                {massa && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Massa</span>
                    <span className="font-semibold">{massa.nome}</span>
                  </div>
                )}
                {selSabores.length > 0 && (
                  <div className="flex justify-between gap-3">
                    <span className="text-muted-foreground">Sabores</span>
                    <span className="font-semibold text-right">
                      {selSabores.map((s) => s.nome).join(" + ")}
                    </span>
                  </div>
                )}
              </div>

              {complementos.length > 0 && (
                <div>
                  <div className="text-sm font-bold mb-2">Complementos (opcional)</div>
                  <div className="space-y-2">
                    {complementos.map((c) => {
                      const sel = selComplementos.find((p) => p.id === c.id);
                      return (
                        <button
                          key={c.id}
                          onClick={() =>
                            setSelComplementos((prev) =>
                              sel ? prev.filter((p) => p.id !== c.id) : [...prev, c],
                            )
                          }
                          className={`w-full p-3 rounded-xl border-2 flex items-center justify-between text-left ${
                            sel ? "border-primary bg-primary/10" : "border-border bg-surface"
                          }`}
                        >
                          <span className="font-medium text-sm">{c.nome}</span>
                          <span className="text-sm font-bold">+ {brl(c.preco_adicional)}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              <div>
                <label className="text-sm font-bold block mb-1">Observações</label>
                <Textarea
                  rows={2}
                  placeholder="Ex: sem cebola, borda recheada de catupiry…"
                  value={obs}
                  onChange={(e) => setObs(e.target.value)}
                />
              </div>

              <div className="flex items-center justify-between">
                <span className="text-sm font-bold">Quantidade</span>
                <div className="flex items-center gap-3 bg-surface rounded-full p-1">
                  <button
                    onClick={() => setQtd((q) => Math.max(1, q - 1))}
                    className="size-9 rounded-full bg-background flex items-center justify-center"
                  >
                    <Minus className="size-4" />
                  </button>
                  <span className="w-6 text-center font-bold">{qtd}</span>
                  <button
                    onClick={() => setQtd((q) => q + 1)}
                    className="size-9 rounded-full bg-primary text-primary-foreground flex items-center justify-center"
                  >
                    <Plus className="size-4" />
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-border bg-card">
          {step < 4 ? (
            <Button
              className="w-full h-12 text-base font-bold rounded-xl"
              disabled={!canNext}
              onClick={next}
            >
              Continuar
            </Button>
          ) : (
            <Button
              className="w-full h-12 text-base font-bold rounded-xl"
              onClick={handleConfirm}
            >
              Adicionar · {brl(precoUnit * qtd)}
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
