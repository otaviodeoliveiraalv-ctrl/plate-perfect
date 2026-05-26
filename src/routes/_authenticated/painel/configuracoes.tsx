import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/_authenticated/painel/configuracoes")({
  component: () => (
    <div className="p-8 max-w-4xl mx-auto">
      <h1 className="text-3xl font-extrabold mb-2">Configurações</h1>
      <p className="text-muted-foreground">Em construção — abas de estabelecimento, horário, delivery e pagamentos entregues na próxima fase.</p>
    </div>
  ),
});
