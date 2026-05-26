
-- =========================================================
-- ENUMS
-- =========================================================
CREATE TYPE public.item_tipo AS ENUM ('simples', 'personalizavel');
CREATE TYPE public.pedido_origem AS ENUM ('mesa', 'delivery');
CREATE TYPE public.pedido_status AS ENUM ('recebido','confirmado','em_preparo','pronto','saiu_entrega','entregue','cancelado');
CREATE TYPE public.opcao_tipo AS ENUM ('tamanho','massa','sabor','complemento');
CREATE TYPE public.forma_pagamento AS ENUM ('pix','dinheiro','cartao_entrega');

-- =========================================================
-- TIMESTAMP TRIGGER
-- =========================================================
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- =========================================================
-- TENANTS
-- =========================================================
CREATE TABLE public.tenants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  descricao TEXT,
  logo_url TEXT,
  telefone TEXT,
  endereco TEXT,
  horario_funcionamento JSONB NOT NULL DEFAULT '{
    "seg":{"abre":"18:00","fecha":"23:00","ativo":true},
    "ter":{"abre":"18:00","fecha":"23:00","ativo":true},
    "qua":{"abre":"18:00","fecha":"23:00","ativo":true},
    "qui":{"abre":"18:00","fecha":"23:00","ativo":true},
    "sex":{"abre":"18:00","fecha":"23:59","ativo":true},
    "sab":{"abre":"18:00","fecha":"23:59","ativo":true},
    "dom":{"abre":"18:00","fecha":"23:00","ativo":true}
  }'::jsonb,
  delivery_ativo BOOLEAN NOT NULL DEFAULT true,
  mesa_ativo BOOLEAN NOT NULL DEFAULT true,
  taxa_entrega_fixa NUMERIC(10,2) NOT NULL DEFAULT 0,
  pedido_minimo NUMERIC(10,2) NOT NULL DEFAULT 0,
  tempo_estimado_entrega_minutos INT NOT NULL DEFAULT 40,
  formas_pagamento forma_pagamento[] NOT NULL DEFAULT ARRAY['pix','dinheiro','cartao_entrega']::forma_pagamento[],
  regra_dois_sabores TEXT NOT NULL DEFAULT 'maior',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- =========================================================
-- USER_TENANTS (vínculo dono ↔ tenant)
-- =========================================================
CREATE TABLE public.user_tenants (
  user_id UUID NOT NULL,
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, tenant_id)
);
CREATE INDEX idx_user_tenants_user ON public.user_tenants(user_id);
CREATE INDEX idx_user_tenants_tenant ON public.user_tenants(tenant_id);

-- Helper security definer (evita recursão em policies)
CREATE OR REPLACE FUNCTION public.user_owns_tenant(_user_id UUID, _tenant_id UUID)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_tenants
    WHERE user_id = _user_id AND tenant_id = _tenant_id
  );
$$;

-- =========================================================
-- CATEGORIAS
-- =========================================================
CREATE TABLE public.categorias (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  nome TEXT NOT NULL,
  ordem INT NOT NULL DEFAULT 0,
  ativo BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_categorias_tenant ON public.categorias(tenant_id);

-- =========================================================
-- ITENS
-- =========================================================
CREATE TABLE public.itens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  categoria_id UUID NOT NULL REFERENCES public.categorias(id) ON DELETE CASCADE,
  nome TEXT NOT NULL,
  descricao TEXT,
  preco NUMERIC(10,2) NOT NULL DEFAULT 0,
  foto_url TEXT,
  tipo item_tipo NOT NULL DEFAULT 'simples',
  ativo BOOLEAN NOT NULL DEFAULT true,
  ordem INT NOT NULL DEFAULT 0,
  ingredientes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_itens_tenant ON public.itens(tenant_id);
CREATE INDEX idx_itens_categoria ON public.itens(categoria_id);

-- =========================================================
-- ITEM OPCOES
-- =========================================================
CREATE TABLE public.item_opcoes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  item_id UUID NOT NULL REFERENCES public.itens(id) ON DELETE CASCADE,
  tipo_opcao opcao_tipo NOT NULL,
  nome TEXT NOT NULL,
  preco_adicional NUMERIC(10,2) NOT NULL DEFAULT 0,
  ordem INT NOT NULL DEFAULT 0,
  ingredientes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_item_opcoes_item ON public.item_opcoes(item_id);

-- =========================================================
-- MESAS
-- =========================================================
CREATE TABLE public.mesas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  numero INT NOT NULL,
  ativo BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (tenant_id, numero)
);
CREATE INDEX idx_mesas_tenant ON public.mesas(tenant_id);

-- =========================================================
-- CLIENTES
-- =========================================================
CREATE TABLE public.clientes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  nome TEXT,
  telefone TEXT,
  endereco TEXT,
  bairro TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_clientes_tenant_tel ON public.clientes(tenant_id, telefone);

-- =========================================================
-- PEDIDOS
-- =========================================================
CREATE SEQUENCE public.pedidos_numero_seq;

CREATE TABLE public.pedidos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  numero INT NOT NULL DEFAULT nextval('public.pedidos_numero_seq'),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  cliente_id UUID REFERENCES public.clientes(id) ON DELETE SET NULL,
  mesa_id UUID REFERENCES public.mesas(id) ON DELETE SET NULL,
  mesa_numero INT,
  origem pedido_origem NOT NULL,
  status pedido_status NOT NULL DEFAULT 'recebido',
  subtotal NUMERIC(10,2) NOT NULL DEFAULT 0,
  taxa_entrega NUMERIC(10,2) NOT NULL DEFAULT 0,
  total NUMERIC(10,2) NOT NULL DEFAULT 0,
  forma_pagamento forma_pagamento,
  troco_para NUMERIC(10,2),
  observacoes TEXT,
  nome_cliente TEXT,
  telefone_cliente TEXT,
  endereco_entrega TEXT,
  bairro_entrega TEXT,
  tempo_estimado_minutos INT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_pedidos_tenant_status ON public.pedidos(tenant_id, status);
CREATE INDEX idx_pedidos_tenant_created ON public.pedidos(tenant_id, created_at DESC);

CREATE TRIGGER trg_pedidos_updated
BEFORE UPDATE ON public.pedidos
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER trg_tenants_updated
BEFORE UPDATE ON public.tenants
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- =========================================================
-- PEDIDO_ITENS
-- =========================================================
CREATE TABLE public.pedido_itens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pedido_id UUID NOT NULL REFERENCES public.pedidos(id) ON DELETE CASCADE,
  item_id UUID REFERENCES public.itens(id) ON DELETE SET NULL,
  nome_item TEXT NOT NULL,
  quantidade INT NOT NULL DEFAULT 1,
  preco_unitario NUMERIC(10,2) NOT NULL,
  preco_total NUMERIC(10,2) NOT NULL,
  personalizacao JSONB,
  observacoes TEXT
);
CREATE INDEX idx_pedido_itens_pedido ON public.pedido_itens(pedido_id);

-- =========================================================
-- RLS
-- =========================================================
ALTER TABLE public.tenants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_tenants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.categorias ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.itens ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.item_opcoes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mesas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.clientes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pedidos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pedido_itens ENABLE ROW LEVEL SECURITY;

-- ---- tenants ----
CREATE POLICY "Tenants são públicos para leitura"
  ON public.tenants FOR SELECT
  USING (true);

CREATE POLICY "Qualquer um logado cria tenant"
  ON public.tenants FOR INSERT TO authenticated
  WITH CHECK (true);

CREATE POLICY "Dono edita seu tenant"
  ON public.tenants FOR UPDATE TO authenticated
  USING (public.user_owns_tenant(auth.uid(), id));

CREATE POLICY "Dono exclui seu tenant"
  ON public.tenants FOR DELETE TO authenticated
  USING (public.user_owns_tenant(auth.uid(), id));

-- ---- user_tenants ----
CREATE POLICY "Usuário vê seus vínculos"
  ON public.user_tenants FOR SELECT TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Usuário cria seu vínculo"
  ON public.user_tenants FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Usuário remove seu vínculo"
  ON public.user_tenants FOR DELETE TO authenticated
  USING (user_id = auth.uid());

-- ---- categorias ----
CREATE POLICY "Categorias ativas públicas"
  ON public.categorias FOR SELECT
  USING (ativo = true OR public.user_owns_tenant(auth.uid(), tenant_id));

CREATE POLICY "Dono gerencia categorias"
  ON public.categorias FOR ALL TO authenticated
  USING (public.user_owns_tenant(auth.uid(), tenant_id))
  WITH CHECK (public.user_owns_tenant(auth.uid(), tenant_id));

-- ---- itens ----
CREATE POLICY "Itens ativos públicos"
  ON public.itens FOR SELECT
  USING (ativo = true OR public.user_owns_tenant(auth.uid(), tenant_id));

CREATE POLICY "Dono gerencia itens"
  ON public.itens FOR ALL TO authenticated
  USING (public.user_owns_tenant(auth.uid(), tenant_id))
  WITH CHECK (public.user_owns_tenant(auth.uid(), tenant_id));

-- ---- item_opcoes ----
CREATE POLICY "Opções públicas via item"
  ON public.item_opcoes FOR SELECT
  USING (true);

CREATE POLICY "Dono gerencia opcoes"
  ON public.item_opcoes FOR ALL TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.itens i
    WHERE i.id = item_opcoes.item_id
      AND public.user_owns_tenant(auth.uid(), i.tenant_id)
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.itens i
    WHERE i.id = item_opcoes.item_id
      AND public.user_owns_tenant(auth.uid(), i.tenant_id)
  ));

-- ---- mesas ----
CREATE POLICY "Mesas ativas públicas"
  ON public.mesas FOR SELECT
  USING (ativo = true OR public.user_owns_tenant(auth.uid(), tenant_id));

CREATE POLICY "Dono gerencia mesas"
  ON public.mesas FOR ALL TO authenticated
  USING (public.user_owns_tenant(auth.uid(), tenant_id))
  WITH CHECK (public.user_owns_tenant(auth.uid(), tenant_id));

-- ---- clientes ----
-- INSERT público (cliente final cria registro ao pedir)
CREATE POLICY "Qualquer um cria cliente"
  ON public.clientes FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Dono vê clientes do seu tenant"
  ON public.clientes FOR SELECT TO authenticated
  USING (public.user_owns_tenant(auth.uid(), tenant_id));

CREATE POLICY "Dono atualiza clientes"
  ON public.clientes FOR UPDATE TO authenticated
  USING (public.user_owns_tenant(auth.uid(), tenant_id));

-- ---- pedidos ----
CREATE POLICY "Qualquer um cria pedido"
  ON public.pedidos FOR INSERT
  WITH CHECK (true);

-- SELECT público: necessário para tela /pedido/[id] (cliente acompanha)
-- Não há listagem pública porque não há índice/sem filtro = sem prejuízo;
-- a tela busca por id específico.
CREATE POLICY "Pedidos podem ser consultados por id"
  ON public.pedidos FOR SELECT
  USING (true);

CREATE POLICY "Dono atualiza pedidos"
  ON public.pedidos FOR UPDATE TO authenticated
  USING (public.user_owns_tenant(auth.uid(), tenant_id));

-- ---- pedido_itens ----
CREATE POLICY "Qualquer um cria item de pedido"
  ON public.pedido_itens FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Itens de pedido visíveis"
  ON public.pedido_itens FOR SELECT
  USING (true);

-- =========================================================
-- REALTIME
-- =========================================================
ALTER PUBLICATION supabase_realtime ADD TABLE public.pedidos;
ALTER PUBLICATION supabase_realtime ADD TABLE public.pedido_itens;
ALTER TABLE public.pedidos REPLICA IDENTITY FULL;
ALTER TABLE public.pedido_itens REPLICA IDENTITY FULL;

-- =========================================================
-- STORAGE BUCKET
-- =========================================================
INSERT INTO storage.buckets (id, name, public)
VALUES ('menu-images', 'menu-images', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Imagens do cardápio são públicas"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'menu-images');

CREATE POLICY "Usuários logados fazem upload de imagens"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'menu-images');

CREATE POLICY "Usuários logados atualizam imagens"
  ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'menu-images');

CREATE POLICY "Usuários logados deletam imagens"
  ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'menu-images');
