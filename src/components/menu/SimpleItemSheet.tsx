import { useState } from "react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Minus, Plus, X } from "lucide-react";
import { brl, type CartItem } from "@/lib/cart";

type Item = {
  id: string;
  nome: string;
  descricao: string | null;
  ingredientes: string | null;
  preco: number;
  foto_url: string | null;
};

export function SimpleItemSheet({
  open,
  onClose,
  item,
  onConfirm,
}: {
  open: boolean;
  onClose: () => void;
  item: Item | null;
  onConfirm: (c: CartItem) => void;
}) {
  const [qtd, setQtd] = useState(1);
  const [obs, setObs] = useState("");

  if (!item) return null;

  const close = () => {
    onClose();
    setTimeout(() => {
      setQtd(1);
      setObs("");
    }, 200);
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && close()}>
      <DialogContent className="p-0 gap-0 max-w-lg sm:rounded-2xl overflow-hidden bg-card border-border max-h-[92vh] flex flex-col">
        {item.foto_url ? (
          <div className="relative aspect-[5/3] bg-muted">
            <img src={item.foto_url} alt={item.nome} className="absolute inset-0 size-full object-cover" />
            <button
              onClick={close}
              className="absolute top-3 right-3 size-9 rounded-full bg-background/80 backdrop-blur flex items-center justify-center"
            >
              <X className="size-5" />
            </button>
          </div>
        ) : (
          <div className="flex justify-end p-3">
            <button onClick={close} className="size-9 rounded-full bg-muted flex items-center justify-center">
              <X className="size-5" />
            </button>
          </div>
        )}

        <div className="flex-1 overflow-y-auto p-5 space-y-3">
          <h2 className="text-xl font-extrabold">{item.nome}</h2>
          {item.descricao && <p className="text-sm text-muted-foreground">{item.descricao}</p>}
          {item.ingredientes && (
            <p className="text-xs text-muted-foreground italic">{item.ingredientes}</p>
          )}
          <div className="text-2xl font-extrabold text-primary">{brl(item.preco)}</div>

          <div>
            <label className="text-sm font-bold block mb-1">Alguma observação?</label>
            <Textarea
              rows={2}
              placeholder="Ex: sem cebola, ponto da carne…"
              value={obs}
              onChange={(e) => setObs(e.target.value)}
            />
          </div>
        </div>

        <div className="p-4 border-t border-border flex items-center gap-3">
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
          <Button
            className="flex-1 h-12 text-base font-bold rounded-xl"
            onClick={() => {
              onConfirm({
                uid: crypto.randomUUID(),
                item_id: item.id,
                nome: item.nome,
                preco_unitario: item.preco,
                quantidade: qtd,
                observacoes: obs || undefined,
              });
              close();
            }}
          >
            Adicionar · {brl(item.preco * qtd)}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
