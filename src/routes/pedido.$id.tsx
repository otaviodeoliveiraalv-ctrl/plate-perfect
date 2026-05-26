import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/pedido/$id")({
  component: () => (
    <div className="min-h-screen flex items-center justify-center p-6 text-center">
      <div>
        <h1 className="text-2xl font-bold mb-2">Acompanhamento do pedido</h1>
        <p className="text-muted-foreground">Em construção — timeline em tempo real entregue na próxima fase.</p>
      </div>
    </div>
  ),
});
