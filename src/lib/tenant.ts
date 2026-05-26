import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type HorarioDia = { abre: string; fecha: string; ativo: boolean };
export type Horario = Record<"seg" | "ter" | "qua" | "qui" | "sex" | "sab" | "dom", HorarioDia>;

export type Tenant = {
  id: string;
  nome: string;
  slug: string;
  descricao: string | null;
  logo_url: string | null;
  telefone: string | null;
  endereco: string | null;
  horario_funcionamento: Horario;
  delivery_ativo: boolean;
  mesa_ativo: boolean;
  taxa_entrega_fixa: number;
  pedido_minimo: number;
  tempo_estimado_entrega_minutos: number;
  formas_pagamento: ("pix" | "dinheiro" | "cartao_entrega")[];
  regra_dois_sabores: string;
};

export function useMyTenant(userId: string | undefined) {
  return useQuery({
    queryKey: ["my-tenant", userId],
    enabled: !!userId,
    queryFn: async () => {
      const { data: link, error: e1 } = await supabase
        .from("user_tenants")
        .select("tenant_id")
        .eq("user_id", userId!)
        .maybeSingle();
      if (e1) throw e1;
      if (!link) return null;
      const { data: tenant, error: e2 } = await supabase
        .from("tenants")
        .select("*")
        .eq("id", link.tenant_id)
        .single();
      if (e2) throw e2;
      return tenant as unknown as Tenant;
    },
  });
}

export function useTenantBySlug(slug: string) {
  return useQuery({
    queryKey: ["tenant-by-slug", slug],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("tenants")
        .select("*")
        .eq("slug", slug)
        .maybeSingle();
      if (error) throw error;
      return data as unknown as Tenant | null;
    },
  });
}

export function estaAberto(horario: Horario, agora = new Date()): boolean {
  const dias: (keyof Horario)[] = ["dom", "seg", "ter", "qua", "qui", "sex", "sab"];
  const d = dias[agora.getDay()];
  const h = horario[d];
  if (!h?.ativo) return false;
  const [ah, am] = h.abre.split(":").map(Number);
  const [fh, fm] = h.fecha.split(":").map(Number);
  const cur = agora.getHours() * 60 + agora.getMinutes();
  const abre = ah * 60 + am;
  const fecha = fh * 60 + fm;
  return cur >= abre && cur <= fecha;
}
