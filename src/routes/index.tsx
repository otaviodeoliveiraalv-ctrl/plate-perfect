import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight, QrCode, Bike, BellRing, Smartphone, Pizza, ChefHat } from "lucide-react";
import { Logo } from "@/components/Logo";

export const Route = createFileRoute("/")({
  component: Landing,
  head: () => ({
    meta: [
      { title: "MenuFlow — Cardápio digital com QR Code e delivery" },
      { name: "description", content: "Receba pedidos do salão e do delivery direto pelo navegador. Cardápio digital, QR Code nas mesas, painel em tempo real." },
    ],
  }),
});

function Landing() {
  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-30 backdrop-blur bg-background/80 border-b border-border">
        <div className="mx-auto max-w-6xl px-4 h-16 flex items-center justify-between">
          <Logo />
          <nav className="flex items-center gap-2">
            <Link to="/login" className="px-4 py-2 text-sm font-medium hover:text-primary">Entrar</Link>
            <Link
              to="/cadastro"
              className="rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:opacity-90"
            >
              Criar conta grátis
            </Link>
          </nav>
        </div>
      </header>

      <section className="relative overflow-hidden">
        <div className="absolute inset-0 -z-10 opacity-40"
          style={{ background: "radial-gradient(80% 60% at 50% 0%, oklch(0.7 0.19 38 / 0.25), transparent)" }} />
        <div className="mx-auto max-w-6xl px-4 py-20 md:py-28 text-center">
          <span className="inline-flex items-center gap-2 rounded-full bg-surface border border-border px-3 py-1 text-xs font-medium text-muted-foreground">
            <Pizza className="size-3.5 text-primary" /> Construtor de pizza incluso
          </span>
          <h1 className="mt-6 text-4xl md:text-6xl font-extrabold tracking-tight leading-[1.05]">
            Seu cardápio digital, <span className="text-primary">recebendo pedidos</span>
            <br className="hidden md:block" /> em tempo real.
          </h1>
          <p className="mt-5 mx-auto max-w-2xl text-base md:text-lg text-muted-foreground">
            Pizzarias, lanchonetes e restaurantes vendem pelo QR Code da mesa e pelo delivery — sem app, sem cadastro do cliente.
          </p>
          <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3">
            <Link
              to="/cadastro"
              className="inline-flex items-center gap-2 rounded-2xl bg-primary px-6 py-3.5 text-base font-semibold text-primary-foreground shadow-lg shadow-primary/30 hover:opacity-90"
            >
              Começar grátis <ArrowRight className="size-4" />
            </Link>
            <Link
              to="/login"
              className="inline-flex items-center gap-2 rounded-2xl border border-border bg-surface px-6 py-3.5 text-base font-semibold"
            >
              Já tenho conta
            </Link>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 pb-24 grid md:grid-cols-3 gap-4">
        {[
          { icon: QrCode, title: "QR Code na mesa", desc: "Cliente escaneia, monta o pedido e envia direto pra cozinha." },
          { icon: Bike, title: "Delivery integrado", desc: "Link público com taxa de entrega, formas de pagamento e tempo estimado." },
          { icon: BellRing, title: "Notificações em tempo real", desc: "Novos pedidos pulsam e tocam som no painel — nada passa." },
          { icon: Pizza, title: "Builder de pizza", desc: "Tamanho, massa, 1 ou 2 sabores com preview visual em tempo real." },
          { icon: Smartphone, title: "100% navegador", desc: "Funciona em qualquer celular, tablet ou desktop. Sem instalação." },
          { icon: ChefHat, title: "Gestão completa", desc: "Categorias, itens, mesas, horário, formas de pagamento e mais." },
        ].map((f) => (
          <div key={f.title} className="rounded-2xl bg-surface border border-border p-6">
            <div className="size-11 rounded-xl bg-primary/15 text-primary flex items-center justify-center mb-4">
              <f.icon className="size-5" />
            </div>
            <h3 className="font-semibold text-lg">{f.title}</h3>
            <p className="text-sm text-muted-foreground mt-1">{f.desc}</p>
          </div>
        ))}
      </section>

      <footer className="border-t border-border">
        <div className="mx-auto max-w-6xl px-4 py-8 text-sm text-muted-foreground flex items-center justify-between">
          <Logo size={22} />
          <span>© {new Date().getFullYear()} MenuFlow</span>
        </div>
      </footer>
    </div>
  );
}
