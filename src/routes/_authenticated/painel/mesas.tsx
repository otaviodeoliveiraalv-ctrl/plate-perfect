import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/_authenticated/painel/mesas")({
  component: () => (
    <div className="p-8 max-w-4xl mx-auto">
      <h1 className="text-3xl font-extrabold mb-2">Mesas & QR Codes</h1>
      <p className="text-muted-foreground">Em construção — geração de QR Code e impressão em PDF entregues na próxima fase.</p>
    </div>
  ),
});
