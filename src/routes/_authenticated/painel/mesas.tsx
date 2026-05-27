import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/lib/auth";
import { useMyTenant } from "@/lib/tenant";
import { supabase } from "@/integrations/supabase/client";
import { QRCodeCanvas } from "qrcode.react";
import { jsPDF } from "jspdf";
import { Plus, Trash2, Download, FileDown, Loader as Loader2, QrCode, ToggleLeft, ToggleRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/painel/mesas")({
  component: Page,
});

type Mesa = {
  id: string;
  numero: number;
  ativo: boolean;
  tenant_id: string;
  created_at: string;
};

function Page() {
  const { user } = useAuth();
  const { data: tenant } = useMyTenant(user?.id);
  const qc = useQueryClient();
  const [novoNumero, setNovoNumero] = useState("");
  const [criando, setCriando] = useState(false);
  const [downloadingPdf, setDownloadingPdf] = useState(false);
  const [qrPreview, setQrPreview] = useState<Mesa | null>(null);
  const canvasRefs = useRef<Map<string, HTMLCanvasElement>>(new Map());

  const { data: mesas = [], isLoading } = useQuery({
    queryKey: ["mesas", tenant?.id],
    enabled: !!tenant?.id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("mesas")
        .select("*")
        .eq("tenant_id", tenant!.id)
        .order("numero");
      if (error) throw error;
      return data as Mesa[];
    },
  });

  const qrUrl = (mesa: Mesa) =>
    `${window.location.origin}/cardapio/${tenant?.slug}?mesa=${mesa.numero}`;

  async function criarMesa() {
    const num = parseInt(novoNumero);
    if (!num || num < 1 || !tenant) return;
    if (mesas.some((m) => m.numero === num)) {
      toast.error(`Mesa ${num} já existe`);
      return;
    }
    setCriando(true);
    const { error } = await supabase
      .from("mesas")
      .insert({ tenant_id: tenant.id, numero: num });
    setCriando(false);
    if (error) return toast.error(error.message);
    setNovoNumero("");
    qc.invalidateQueries({ queryKey: ["mesas", tenant.id] });
    toast.success(`Mesa ${num} criada`);
  }

  async function toggleMesa(mesa: Mesa) {
    const { error } = await supabase
      .from("mesas")
      .update({ ativo: !mesa.ativo })
      .eq("id", mesa.id);
    if (error) return toast.error(error.message);
    qc.invalidateQueries({ queryKey: ["mesas", tenant?.id] });
  }

  async function excluirMesa(mesa: Mesa) {
    if (!confirm(`Excluir mesa ${mesa.numero}?`)) return;
    const { error } = await supabase.from("mesas").delete().eq("id", mesa.id);
    if (error) return toast.error(error.message);
    qc.invalidateQueries({ queryKey: ["mesas", tenant?.id] });
    toast.success(`Mesa ${mesa.numero} excluída`);
  }

  function downloadPng(mesa: Mesa) {
    const canvas = canvasRefs.current.get(mesa.id);
    if (!canvas) return;
    const link = document.createElement("a");
    link.download = `mesa-${mesa.numero}-qrcode.png`;
    link.href = canvas.toDataURL("image/png");
    link.click();
  }

  async function downloadPdfTodos() {
    if (mesas.length === 0) return;
    setDownloadingPdf(true);
    await new Promise((r) => setTimeout(r, 100));

    const pdf = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
    const pageW = 210;
    const pageH = 297;
    const cols = 2;
    const rows = 3;
    const perPage = cols * rows;
    const cellW = pageW / cols;
    const cellH = pageH / rows;
    const qrSize = 55;
    const margin = 8;

    mesas.forEach((mesa, idx) => {
      if (idx > 0 && idx % perPage === 0) pdf.addPage();
      const col = idx % cols;
      const row = Math.floor((idx % perPage) / cols);
      const x = col * cellW;
      const y = row * cellH;

      const canvas = canvasRefs.current.get(mesa.id);
      if (!canvas) return;
      const imgData = canvas.toDataURL("image/png");

      const imgX = x + (cellW - qrSize) / 2;
      const imgY = y + margin + 10;
      pdf.addImage(imgData, "PNG", imgX, imgY, qrSize, qrSize);

      pdf.setFontSize(14);
      pdf.setFont("helvetica", "bold");
      const label = `Mesa ${mesa.numero}`;
      const textW = pdf.getTextWidth(label);
      pdf.text(label, x + (cellW - textW) / 2, imgY + qrSize + 8);

      pdf.setFontSize(7);
      pdf.setFont("helvetica", "normal");
      const url = qrUrl(mesa);
      const urlW = pdf.getTextWidth(url);
      if (urlW < cellW - 8) {
        pdf.text(url, x + (cellW - urlW) / 2, imgY + qrSize + 14);
      }

      pdf.setDrawColor(220, 220, 220);
      pdf.rect(x + 3, y + 3, cellW - 6, cellH - 6);
    });

    pdf.save(`qrcodes-${tenant?.slug ?? "mesas"}.pdf`);
    setDownloadingPdf(false);
    toast.success("PDF baixado com sucesso");
  }

  if (!tenant) {
    return (
      <div className="p-8 flex items-center justify-center">
        <Loader2 className="size-5 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="p-4 md:p-8 max-w-5xl mx-auto">
      <div className="flex flex-wrap items-center gap-3 mb-6">
        <div className="flex-1">
          <h1 className="text-2xl md:text-3xl font-extrabold">Mesas & QR Codes</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {mesas.length} {mesas.length === 1 ? "mesa" : "mesas"} cadastradas
          </p>
        </div>
        {mesas.length > 0 && (
          <Button
            variant="outline"
            onClick={downloadPdfTodos}
            disabled={downloadingPdf}
            className="gap-2"
          >
            {downloadingPdf ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <FileDown className="size-4" />
            )}
            PDF de todos
          </Button>
        )}
      </div>

      {/* Add mesa */}
      <div className="bg-surface border border-border rounded-2xl p-4 mb-6">
        <h2 className="font-bold text-sm uppercase tracking-wide text-muted-foreground mb-3">
          Adicionar mesa
        </h2>
        <div className="flex gap-2">
          <input
            type="number"
            min="1"
            placeholder="Número da mesa (ex: 5)"
            value={novoNumero}
            onChange={(e) => setNovoNumero(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && criarMesa()}
            className="flex h-10 w-full max-w-xs rounded-xl border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
          />
          <Button
            onClick={criarMesa}
            disabled={criando || !novoNumero}
            className="gap-2"
          >
            {criando ? <Loader2 className="size-4 animate-spin" /> : <Plus className="size-4" />}
            Criar mesa
          </Button>
        </div>
      </div>

      {/* Hidden QR canvases for download */}
      <div className="sr-only" aria-hidden>
        {mesas.map((mesa) => (
          <QRCodeCanvas
            key={mesa.id}
            value={qrUrl(mesa)}
            size={300}
            level="H"
            includeMargin
            ref={(el) => {
              if (el) canvasRefs.current.set(mesa.id, el);
              else canvasRefs.current.delete(mesa.id);
            }}
          />
        ))}
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="size-6 animate-spin text-primary" />
        </div>
      ) : mesas.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">
          <QrCode className="size-10 mx-auto mb-3 opacity-30" />
          <p>Nenhuma mesa cadastrada. Crie a primeira acima.</p>
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {mesas.map((mesa) => (
            <MesaCard
              key={mesa.id}
              mesa={mesa}
              url={qrUrl(mesa)}
              onToggle={() => toggleMesa(mesa)}
              onDelete={() => excluirMesa(mesa)}
              onDownload={() => downloadPng(mesa)}
              onPreview={() => setQrPreview(mesa)}
            />
          ))}
        </div>
      )}

      {/* QR Preview modal */}
      {qrPreview && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70"
          onClick={() => setQrPreview(null)}
        >
          <div
            className="bg-card border border-border rounded-3xl p-6 max-w-xs w-full mx-4 text-center"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="text-xl font-extrabold mb-1">Mesa {qrPreview.numero}</h2>
            <p className="text-xs text-muted-foreground mb-4 break-all">{qrUrl(qrPreview)}</p>
            <div className="flex justify-center bg-white p-3 rounded-2xl mb-4">
              <QRCodeCanvas value={qrUrl(qrPreview)} size={220} level="H" includeMargin />
            </div>
            <div className="flex gap-2 justify-center">
              <Button
                variant="outline"
                size="sm"
                onClick={() => downloadPng(qrPreview)}
                className="gap-2"
              >
                <Download className="size-3.5" /> Baixar PNG
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setQrPreview(null)}
              >
                Fechar
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function MesaCard({
  mesa,
  url,
  onToggle,
  onDelete,
  onDownload,
  onPreview,
}: {
  mesa: Mesa;
  url: string;
  onToggle: () => void;
  onDelete: () => void;
  onDownload: () => void;
  onPreview: () => void;
}) {
  return (
    <div
      className={`bg-surface border rounded-2xl p-4 flex flex-col gap-3 transition ${
        mesa.ativo ? "border-border" : "border-border opacity-60"
      }`}
    >
      <div className="flex items-start justify-between">
        <div>
          <h3 className="font-extrabold text-lg">Mesa {mesa.numero}</h3>
          <span
            className={`text-xs font-bold ${mesa.ativo ? "text-success" : "text-muted-foreground"}`}
          >
            {mesa.ativo ? "Ativa" : "Pausada"}
          </span>
        </div>
        <button
          onClick={onToggle}
          title={mesa.ativo ? "Pausar mesa" : "Ativar mesa"}
          className="text-muted-foreground hover:text-primary transition"
        >
          {mesa.ativo ? (
            <ToggleRight className="size-6 text-success" />
          ) : (
            <ToggleLeft className="size-6" />
          )}
        </button>
      </div>

      <button
        onClick={onPreview}
        className="bg-white rounded-xl p-2 flex items-center justify-center hover:opacity-90 transition"
      >
        <QRCodeCanvas value={url} size={120} level="H" includeMargin />
      </button>

      <div className="flex gap-2">
        <button
          onClick={onDownload}
          className="flex-1 flex items-center justify-center gap-1.5 text-xs font-medium rounded-xl border border-border bg-background py-2 hover:bg-muted/30 transition"
        >
          <Download className="size-3.5" /> PNG
        </button>
        <button
          onClick={onDelete}
          className="flex items-center justify-center gap-1.5 text-xs font-medium rounded-xl border border-border bg-background px-3 py-2 hover:bg-destructive/10 hover:text-destructive hover:border-destructive/40 transition"
        >
          <Trash2 className="size-3.5" />
        </button>
      </div>
    </div>
  );
}
