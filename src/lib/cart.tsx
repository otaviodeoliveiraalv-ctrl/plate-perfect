import { createContext, useContext, useEffect, useState, type ReactNode } from "react";

export type CartItem = {
  uid: string;
  item_id: string;
  nome: string;
  preco_unitario: number;
  quantidade: number;
  observacoes?: string;
  personalizacao?: {
    tamanho?: string;
    massa?: string;
    sabores?: string[];
    complementos?: string[];
    resumo?: string;
  };
};

type CartCtx = {
  items: CartItem[];
  add: (i: CartItem) => void;
  setQty: (uid: string, qty: number) => void;
  remove: (uid: string) => void;
  clear: () => void;
  subtotal: number;
  count: number;
  bump: number;
};

const Ctx = createContext<CartCtx | null>(null);

export function CartProvider({ tenantSlug, children }: { tenantSlug: string; children: ReactNode }) {
  const key = `menuflow-cart-${tenantSlug}`;
  const [items, setItems] = useState<CartItem[]>([]);
  const [bump, setBump] = useState(0);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(key);
      if (raw) setItems(JSON.parse(raw));
    } catch {}
  }, [key]);

  useEffect(() => {
    try {
      localStorage.setItem(key, JSON.stringify(items));
    } catch {}
  }, [items, key]);

  const subtotal = items.reduce((acc, i) => acc + i.preco_unitario * i.quantidade, 0);
  const count = items.reduce((acc, i) => acc + i.quantidade, 0);

  return (
    <Ctx.Provider
      value={{
        items,
        add: (i) => {
          setItems((prev) => [...prev, i]);
          setBump((b) => b + 1);
        },
        setQty: (uid, qty) =>
          setItems((prev) =>
            prev.map((p) => (p.uid === uid ? { ...p, quantidade: Math.max(1, qty) } : p)),
          ),
        remove: (uid) => setItems((prev) => prev.filter((p) => p.uid !== uid)),
        clear: () => setItems([]),
        subtotal,
        count,
        bump,
      }}
    >
      {children}
    </Ctx.Provider>
  );
}

export const useCart = () => {
  const c = useContext(Ctx);
  if (!c) throw new Error("useCart must be used within CartProvider");
  return c;
};

export const brl = (n: number) =>
  n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
