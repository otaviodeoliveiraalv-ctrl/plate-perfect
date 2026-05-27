import { createFileRoute, Link, Outlet, useRouterState, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth";
import { useMyTenant } from "@/lib/tenant";
import { supabase } from "@/integrations/supabase/client";
import { ClipboardList, Pizza, QrCode, Settings, LogOut, Menu, X, Loader as Loader2, Rocket, ExternalLink } from "lucide-react";
import { Logo } from "@/components/Logo";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/_authenticated/painel")({
  component: PainelLayout,
});

function PainelLayout() {
  const { user, signOut, loading } = useAuth();
  const nav = useNavigate();
  const { data: tenant, isLoading } = useMyTenant(user?.id);
  const path = useRouterState({ select: (s) => s.location.pathname });
  const [open, setOpen] = useState(false);
  const [novos, setNovos] = useState(0);
  const [onboarding, setOnboarding] = useState(false);

  useEffect(() => {
    if (!loading && !user) nav({ to: "/login" });
  }, [loading, user, nav]);

  // Show onboarding once per browser
  useEffect(() => {
    if (!tenant) return;
    const key = `menuflow-onboarded-${tenant.id}`;
    if (!localStorage.getItem(key)) {
      setOnboarding(true);
      localStorage.setItem(key, "1");
    }
  }, [tenant]);

  // Contador de pedidos novos (status=recebido) realtime
  useEffect(() => {
    if (!tenant?.id) return;
    let mounted = true;
    const load = async () => {
      const { count } = await supabase
        .from("pedidos")
        .select("id", { count: "exact", head: true })
        .eq("tenant_id", tenant.id)
        .eq("status", "recebido");
      if (mounted) setNovos(count ?? 0);
    };
    load();
    const ch = supabase
      .channel("pedidos-badge-" + tenant.id)
      .on("postgres_changes", { event: "*", schema: "public", table: "pedidos", filter: `tenant_id=eq.${tenant.id}` }, load)
      .subscribe();
    return () => { mounted = false; supabase.removeChannel(ch); };
  }, [tenant?.id]);

  if (isLoading || loading) {
    return <div className="min-h-screen flex items-center justify-center"><Loader2 className="size-6 animate-spin text-primary" /></div>;
  }

  if (!tenant) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="max-w-md text-center">
          <h2 className="text-xl font-bold mb-2">Nenhum estabelecimento vinculado</h2>
          <p className="text-muted-foreground mb-4">Vamos criar o seu agora.</p>
          <Link to="/cadastro" className="inline-block rounded-xl bg-primary text-primary-foreground px-5 py-3 font-semibold">Criar estabelecimento</Link>
        </div>
      </div>
    );
  }

  const items = [
    { to: "/painel/pedidos", label: "Pedidos", icon: ClipboardList, badge: novos },
    { to: "/painel/cardapio", label: "Cardápio", icon: Pizza },
    { to: "/painel/mesas", label: "Mesas & QR", icon: QrCode },
    { to: "/painel/configuracoes", label: "Configurações", icon: Settings },
  ] as const;

  return (
    <div className="min-h-screen flex">
      {/* mobile topbar */}
      <header className="md:hidden fixed top-0 inset-x-0 z-30 h-14 bg-sidebar border-b border-border flex items-center justify-between px-3">
        <button onClick={() => setOpen(true)} aria-label="Abrir menu" className="p-2"><Menu /></button>
        <Logo size={22} />
        <div className="w-10" />
      </header>

      {/* sidebar */}
      <aside className={`${open ? "translate-x-0" : "-translate-x-full"} md:translate-x-0 transition-transform fixed md:sticky top-0 left-0 z-40 h-screen w-64 bg-sidebar border-r border-border flex flex-col`}>
        <div className="h-16 flex items-center justify-between px-5 border-b border-border">
          <Logo size={22} />
          <button onClick={() => setOpen(false)} className="md:hidden p-2"><X /></button>
        </div>
        <div className="px-3 py-4 text-xs text-muted-foreground uppercase tracking-wide">{tenant.nome}</div>
        <nav className="flex-1 px-3 space-y-1">
          {items.map((it) => {
            const active = path.startsWith(it.to);
            return (
              <Link
                key={it.to}
                to={it.to}
                onClick={() => setOpen(false)}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium ${active ? "bg-primary text-primary-foreground" : "hover:bg-sidebar-accent text-sidebar-foreground"}`}
              >
                <it.icon className="size-4" />
                <span className="flex-1">{it.label}</span>
                {"badge" in it && it.badge ? (
                  <span className="bg-secondary text-secondary-foreground text-xs font-bold rounded-full px-2 py-0.5 pulse-new">{it.badge}</span>
                ) : null}
              </Link>
            );
          })}
        </nav>
        <div className="p-3 border-t border-border">
          <button
            onClick={async () => { await signOut(); nav({ to: "/" }); }}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium hover:bg-sidebar-accent"
          >
            <LogOut className="size-4" /> Sair
          </button>
        </div>
      </aside>

      {open && <div onClick={() => setOpen(false)} className="fixed inset-0 z-30 bg-black/50 md:hidden" />}

      <main className="flex-1 min-w-0 pt-14 md:pt-0">
        <Outlet />
      </main>

      {onboarding && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
          <div className="bg-card border border-border rounded-3xl p-6 max-w-md w-full shadow-2xl">
            <div className="size-14 rounded-2xl bg-primary/15 text-primary flex items-center justify-center mb-4">
              <Rocket className="size-7" />
            </div>
            <h2 className="text-2xl font-extrabold mb-1">Bem-vindo ao MenuFlow!</h2>
            <p className="text-sm text-muted-foreground mb-4">
              Seu estabelecimento <strong className="text-foreground">{tenant.nome}</strong> foi criado com sucesso. Veja o que fazer agora:
            </p>
            <ul className="space-y-3 mb-6">
              {[
                { step: "1", text: "Cadastre as categorias e itens do seu cardápio", to: "/painel/cardapio" },
                { step: "2", text: "Crie suas mesas e baixe os QR Codes", to: "/painel/mesas" },
                { step: "3", text: "Configure horários e formas de pagamento", to: "/painel/configuracoes" },
              ].map((s) => (
                <li key={s.step} className="flex items-start gap-3">
                  <span className="size-6 shrink-0 rounded-full bg-primary text-primary-foreground text-xs font-extrabold flex items-center justify-center mt-0.5">
                    {s.step}
                  </span>
                  <div className="flex-1 text-sm">{s.text}</div>
                </li>
              ))}
            </ul>
            <div className="flex flex-col sm:flex-row gap-2">
              <Button
                asChild
                onClick={() => setOnboarding(false)}
                className="flex-1 gap-2"
              >
                <Link to="/painel/cardapio">
                  Começar pelo cardápio <ExternalLink className="size-3.5" />
                </Link>
              </Button>
              <Button variant="outline" onClick={() => setOnboarding(false)} className="flex-1">
                Explorar por conta
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
