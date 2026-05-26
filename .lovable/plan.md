## MenuFlow — SaaS de Cardápio Digital Multi-Tenant

O escopo é grande (8 tabelas, ~15 telas, realtime, builder de pizza, QR codes, multi-tenant). Vou entregar em **4 fases sequenciais** para que você consiga validar cada parte antes da próxima. Cada fase resulta em algo funcional.

---

### Fase 1 — Fundação (Backend + Auth + Design System)

**Banco de dados** (migration Supabase):
- `tenants`, `categorias`, `itens`, `item_opcoes`, `mesas`, `clientes`, `pedidos`, `pedido_itens`
- Tabela `user_tenants` (vínculo dono ↔ tenant) — segurança multi-tenant via função `has_tenant_access(uuid)`
- RLS em todas as tabelas isolando por `tenant_id`
- Política pública de leitura para `tenants`, `categorias`, `itens`, `item_opcoes` (cardápio é público por slug)
- Política pública de INSERT para `pedidos`, `pedido_itens`, `clientes` (cliente final faz pedido sem login)
- Realtime habilitado em `pedidos` e `pedido_itens`
- Bucket `menu-images` (público) para fotos

**Auth**:
- Email/senha + Google (padrão Lovable Cloud)
- Páginas `/login` e `/cadastro` (wizard 3 passos)

**Design system** (`src/styles.css`):
- Tema escuro estilo iFood: fundo `#1A1A1A`, cards `#2D2D2D`, laranja `#FF6B35`, amarelo `#F7C94B`
- Fonte Inter via Google Fonts, `rounded-2xl`, sombras suaves
- Tokens semânticos em oklch

---

### Fase 2 — Cardápio Público (Área do cliente)

Rotas:
- `/cardapio/$slug` — listagem com header fixo, abas de categorias com scroll-spy, cards de itens
- Modal de item simples (foto, qtd, observações)
- Modal/tela **Builder de Pizza** com 6 etapas (tamanho → massa → qtd sabores → sabores → preview circular dividido → resumo) + cálculo "maior valor" para 2 sabores
- Carrinho (drawer mobile / modal desktop) com persistência em localStorage
- Tela de finalização (modo mesa vs delivery via `?mesa=X`)
- `/pedido/$id` com timeline de status + Realtime
- Bloqueio fora de horário de funcionamento

---

### Fase 3 — Painel Administrativo

Rotas protegidas sob `/_authenticated/painel`:
- Layout com sidebar colapsável
- `/painel/pedidos` — tela principal (lista/kanban, filtros, badge pulsante para novos, som de notificação via `<audio>`, botões de transição de status, modal de tempo estimado, painel lateral de detalhes) — tudo via Realtime
- `/painel/cardapio` — categorias (drag-and-drop com `@dnd-kit`) + itens (CRUD + upload Storage + toggle pause + editor de opções para personalizáveis)
- `/painel/mesas` — CRUD de mesas, QR Code via `qrcode.react`, download PNG individual e PDF em lote (`jspdf`)
- `/painel/configuracoes` — 4 abas (estabelecimento, funcionamento, delivery, pagamentos)

---

### Fase 4 — Polimento

- Onboarding pós-cadastro (modal de boas-vindas)
- Sitemap/robots
- Animações sutis (carrinho, transições de status)
- QA visual mobile-first
- Seed opcional de demo

---

### Detalhes técnicos relevantes

- **Stack real do template**: TanStack Start (não Vercel/Next) — funciona igualmente bem, hospedagem é Lovable Cloud
- **Realtime**: `supabase.channel().on('postgres_changes', ...)` direto do cliente, filtrado por `tenant_id`
- **Dependências novas**: `qrcode.react`, `jspdf`, `@dnd-kit/core` + `@dnd-kit/sortable`
- **Multi-tenant**: cliente público resolve `tenant_id` via slug; painel pega `tenant_id` via `user_tenants` do usuário logado
- **Pedidos públicos**: cliente final não loga; INSERT permitido a `anon` mas SELECT só do próprio pedido por id (sem listar)

---

### Confirme antes de eu começar

1. **OK começar pela Fase 1** (banco + auth + design system) e seguir sequencialmente? Vou entregar fase a fase para você revisar.
2. Cada dono terá **1 estabelecimento** (suficiente pro MVP) — OK?
3. Google login habilitado por padrão junto com email/senha — OK?

Se sim para os 3, aprovo e começo já pela Fase 1.