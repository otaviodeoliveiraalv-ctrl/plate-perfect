import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/_authenticated/painel/cardapio")({
  component: () => (
    <div className="p-8 max-w-4xl mx-auto">
      <h1 className="text-3xl font-extrabold mb-2">Cardápio</h1>
      <p className="text-muted-foreground">Em construção — gestão de categorias e itens será entregue na próxima fase.</p>
    </div>
  ),
});
