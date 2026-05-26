import { createFileRoute } from "@tanstack/react-router";
import { useTenantBySlug } from "@/lib/tenant";
import { Loader2 } from "lucide-react";

export const Route = createFileRoute("/cardapio/$slug")({
  component: Page,
});

function Page() {
  const { slug } = Route.useParams();
  const { data: tenant, isLoading } = useTenantBySlug(slug);
  if (isLoading) return <div className="min-h-screen flex items-center justify-center"><Loader2 className="size-6 animate-spin text-primary" /></div>;
  if (!tenant) return <div className="min-h-screen flex items-center justify-center text-muted-foreground">Estabelecimento não encontrado.</div>;
  return (
    <div className="min-h-screen p-6 max-w-3xl mx-auto">
      <h1 className="text-3xl font-extrabold">{tenant.nome}</h1>
      <p className="text-muted-foreground mt-2">{tenant.descricao}</p>
      <p className="mt-6 text-sm text-muted-foreground">Cardápio público em construção — montagem completa (itens, builder de pizza, carrinho, checkout) na próxima fase.</p>
    </div>
  );
}
