import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
  arrayMove,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { useAuth } from "@/lib/auth";
import { useMyTenant } from "@/lib/tenant";
import { supabase } from "@/integrations/supabase/client";
import { brl } from "@/lib/cart";
import { GripVertical, Plus, Pencil, Trash2, X, ChevronDown, ChevronUp, Loader as Loader2, ImagePlus, CirclePause as PauseCircle, CirclePlay as PlayCircle, Settings2 } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/painel/cardapio")({ component: Page });

type Categoria = { id: string; nome: string; ordem: number; ativo: boolean };
type Item = {
  id: string;
  nome: string;
  descricao: string | null;
  ingredientes: string | null;
  preco: number;
  foto_url: string | null;
  tipo: "simples" | "personalizavel";
  ativo: boolean;
  ordem: number;
  categoria_id: string;
};
type Opcao = {
  id: string;
  nome: string;
  tipo_opcao: "tamanho" | "massa" | "sabor" | "complemento";
  preco_adicional: number;
  ingredientes: string | null;
  ordem: number;
};

const OPCAO_TIPO_LABEL: Record<string, string> = {
  tamanho: "Tamanho",
  massa: "Massa",
  sabor: "Sabor",
  complemento: "Complemento",
};

function Page() {
  const { user } = useAuth();
  const { data: tenant } = useMyTenant(user?.id);
  const qc = useQueryClient();
  const [catExpanded, setCatExpanded] = useState<string | null>(null);
  const [catModal, setCatModal] = useState<{ tipo: "novo" | "editar"; cat?: Categoria } | null>(
    null,
  );
  const [itemModal, setItemModal] = useState<{
    tipo: "novo" | "editar";
    item?: Item;
    catId: string;
  } | null>(null);
  const [opcoesModal, setOpcoesModal] = useState<{ item: Item } | null>(null);

  const { data: categorias = [], isLoading } = useQuery({
    queryKey: ["adm-categorias", tenant?.id],
    enabled: !!tenant?.id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("categorias")
        .select("id,nome,ordem,ativo")
        .eq("tenant_id", tenant!.id)
        .order("ordem");
      if (error) throw error;
      return data as Categoria[];
    },
  });

  const { data: itens = [] } = useQuery({
    queryKey: ["adm-itens", tenant?.id],
    enabled: !!tenant?.id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("itens")
        .select("id,nome,descricao,ingredientes,preco,foto_url,tipo,ativo,ordem,categoria_id")
        .eq("tenant_id", tenant!.id)
        .order("ordem");
      if (error) throw error;
      return data as Item[];
    },
  });

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));

  async function handleCatDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = categorias.findIndex((c) => c.id === active.id);
    const newIndex = categorias.findIndex((c) => c.id === over.id);
    const reordered = arrayMove(categorias, oldIndex, newIndex);
    qc.setQueryData(["adm-categorias", tenant?.id], reordered);
    const updates = reordered.map((c, i) =>
      supabase.from("categorias").update({ ordem: i }).eq("id", c.id),
    );
    await Promise.all(updates);
  }

  async function toggleCategoria(cat: Categoria) {
    await supabase.from("categorias").update({ ativo: !cat.ativo }).eq("id", cat.id);
    qc.invalidateQueries({ queryKey: ["adm-categorias", tenant?.id] });
  }

  async function deletarCategoria(cat: Categoria) {
    if (!confirm(`Deletar categoria "${cat.nome}"? Os itens ficarao sem categoria.`)) return;
    await supabase.from("categorias").delete().eq("id", cat.id);
    qc.invalidateQueries({ queryKey: ["adm-categorias", tenant?.id] });
    toast.success("Categoria removida");
  }

  async function toggleItem(item: Item) {
    await supabase.from("itens").update({ ativo: !item.ativo }).eq("id", item.id);
    qc.invalidateQueries({ queryKey: ["adm-itens", tenant?.id] });
  }

  async function deletarItem(item: Item) {
    if (!confirm(`Deletar item "${item.nome}"?`)) return;
    await supabase.from("itens").delete().eq("id", item.id);
    qc.invalidateQueries({ queryKey: ["adm-itens", tenant?.id] });
    toast.success("Item removido");
  }

  if (!tenant) return null;

  return (
    <div className="p-4 md:p-6 max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl md:text-2xl font-extrabold">Cardapio</h1>
        <button
          onClick={() => setCatModal({ tipo: "novo" })}
          className="flex items-center gap-2 rounded-xl bg-primary text-primary-foreground px-4 py-2.5 text-sm font-bold hover:opacity-90 transition"
        >
          <Plus className="size-4" /> Nova categoria
        </button>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-20">
          <Loader2 className="size-6 animate-spin text-primary" />
        </div>
      ) : categorias.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">
          <p className="text-sm">Nenhuma categoria ainda. Crie a primeira para comecar!</p>
        </div>
      ) : (
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleCatDragEnd}
        >
          <SortableContext
            items={categorias.map((c) => c.id)}
            strategy={verticalListSortingStrategy}
          >
            <div className="space-y-3">
              {categorias.map((cat) => {
                const catItens = itens.filter((i) => i.categoria_id === cat.id);
                return (
                  <SortableCategoria
                    key={cat.id}
                    cat={cat}
                    itens={catItens}
                    expanded={catExpanded === cat.id}
                    onToggleExpand={() =>
                      setCatExpanded(catExpanded === cat.id ? null : cat.id)
                    }
                    onEdit={() => setCatModal({ tipo: "editar", cat })}
                    onToggle={() => toggleCategoria(cat)}
                    onDelete={() => deletarCategoria(cat)}
                    onAddItem={() => setItemModal({ tipo: "novo", catId: cat.id })}
                    onEditItem={(item) => setItemModal({ tipo: "editar", item, catId: cat.id })}
                    onToggleItem={toggleItem}
                    onDeleteItem={deletarItem}
                    onOpcoes={(item) => setOpcoesModal({ item })}
                  />
                );
              })}
            </div>
          </SortableContext>
        </DndContext>
      )}

      {catModal && (
        <CategoriaModal
          tipo={catModal.tipo}
          cat={catModal.cat}
          tenantId={tenant.id}
          existingCount={categorias.length}
          onClose={() => setCatModal(null)}
          onSaved={() => {
            setCatModal(null);
            qc.invalidateQueries({ queryKey: ["adm-categorias", tenant.id] });
          }}
        />
      )}

      {itemModal && (
        <ItemModal
          tipo={itemModal.tipo}
          item={itemModal.item}
          catId={itemModal.catId}
          tenantId={tenant.id}
          existingCount={itens.filter((i) => i.categoria_id === itemModal.catId).length}
          onClose={() => setItemModal(null)}
          onSaved={() => {
            setItemModal(null);
            qc.invalidateQueries({ queryKey: ["adm-itens", tenant.id] });
          }}
        />
      )}

      {opcoesModal && (
        <OpcoesModal
          item={opcoesModal.item}
          onClose={() => setOpcoesModal(null)}
        />
      )}
    </div>
  );
}

// ─── Sortable Category ────────────────────────────────────────────────────────

function SortableCategoria({
  cat,
  itens,
  expanded,
  onToggleExpand,
  onEdit,
  onToggle,
  onDelete,
  onAddItem,
  onEditItem,
  onToggleItem,
  onDeleteItem,
  onOpcoes,
}: {
  cat: Categoria;
  itens: Item[];
  expanded: boolean;
  onToggleExpand: () => void;
  onEdit: () => void;
  onToggle: () => void;
  onDelete: () => void;
  onAddItem: () => void;
  onEditItem: (item: Item) => void;
  onToggleItem: (item: Item) => void;
  onDeleteItem: (item: Item) => void;
  onOpcoes: (item: Item) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: cat.id,
  });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="bg-card border border-border rounded-2xl overflow-hidden"
    >
      <div className="flex items-center gap-2 p-3 sm:p-4">
        <button
          {...attributes}
          {...listeners}
          className="text-muted-foreground hover:text-foreground cursor-grab active:cursor-grabbing p-1"
        >
          <GripVertical className="size-4" />
        </button>
        <button
          onClick={onToggleExpand}
          className="flex items-center gap-2 flex-1 min-w-0 text-left"
        >
          <span className={`font-bold ${!cat.ativo ? "opacity-50 line-through" : ""}`}>
            {cat.nome}
          </span>
          <span className="text-xs text-muted-foreground">({itens.length})</span>
          {expanded ? (
            <ChevronUp className="size-4 ml-auto text-muted-foreground" />
          ) : (
            <ChevronDown className="size-4 ml-auto text-muted-foreground" />
          )}
        </button>
        <div className="flex items-center gap-1 shrink-0">
          <button
            onClick={onToggle}
            className="size-8 rounded-lg hover:bg-muted flex items-center justify-center transition text-muted-foreground"
            title={cat.ativo ? "Pausar" : "Ativar"}
          >
            {cat.ativo ? <PauseCircle className="size-4" /> : <PlayCircle className="size-4 text-success" />}
          </button>
          <button
            onClick={onEdit}
            className="size-8 rounded-lg hover:bg-muted flex items-center justify-center transition text-muted-foreground"
          >
            <Pencil className="size-4" />
          </button>
          <button
            onClick={onDelete}
            className="size-8 rounded-lg hover:bg-destructive/15 flex items-center justify-center transition text-muted-foreground hover:text-destructive"
          >
            <Trash2 className="size-4" />
          </button>
        </div>
      </div>

      {expanded && (
        <div className="border-t border-border">
          {itens.length > 0 && (
            <div className="divide-y divide-border">
              {itens.map((item) => (
                <ItemRow
                  key={item.id}
                  item={item}
                  onEdit={() => onEditItem(item)}
                  onToggle={() => onToggleItem(item)}
                  onDelete={() => onDeleteItem(item)}
                  onOpcoes={() => onOpcoes(item)}
                />
              ))}
            </div>
          )}
          <div className="p-3">
            <button
              onClick={onAddItem}
              className="w-full flex items-center justify-center gap-2 rounded-xl border border-dashed border-border py-2.5 text-sm font-medium text-muted-foreground hover:border-primary hover:text-primary transition"
            >
              <Plus className="size-4" /> Adicionar item
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Item Row ─────────────────────────────────────────────────────────────────

function ItemRow({
  item,
  onEdit,
  onToggle,
  onDelete,
  onOpcoes,
}: {
  item: Item;
  onEdit: () => void;
  onToggle: () => void;
  onDelete: () => void;
  onOpcoes: () => void;
}) {
  return (
    <div className={`flex items-center gap-3 px-4 py-3 ${!item.ativo ? "opacity-50" : ""}`}>
      {item.foto_url ? (
        <img
          src={item.foto_url}
          alt={item.nome}
          className="size-12 rounded-xl object-cover shrink-0 border border-border"
        />
      ) : (
        <div className="size-12 rounded-xl bg-muted shrink-0 flex items-center justify-center text-xl">
          {item.tipo === "personalizavel" ? "🍕" : "🍽️"}
        </div>
      )}
      <div className="flex-1 min-w-0">
        <p className={`font-semibold text-sm ${!item.ativo ? "line-through" : ""}`}>{item.nome}</p>
        <div className="flex items-center gap-2 mt-0.5">
          <span className="text-primary font-bold text-sm">{brl(item.preco)}</span>
          {item.tipo === "personalizavel" && (
            <span className="text-[10px] uppercase font-bold tracking-wider bg-primary/15 text-primary px-1.5 py-0.5 rounded">
              personalizavel
            </span>
          )}
        </div>
      </div>
      <div className="flex items-center gap-1 shrink-0">
        {item.tipo === "personalizavel" && (
          <button
            onClick={onOpcoes}
            className="size-8 rounded-lg hover:bg-muted flex items-center justify-center transition text-muted-foreground"
            title="Opcoes"
          >
            <Settings2 className="size-4" />
          </button>
        )}
        <button
          onClick={onToggle}
          className="size-8 rounded-lg hover:bg-muted flex items-center justify-center transition text-muted-foreground"
          title={item.ativo ? "Pausar" : "Ativar"}
        >
          {item.ativo ? <PauseCircle className="size-4" /> : <PlayCircle className="size-4 text-success" />}
        </button>
        <button
          onClick={onEdit}
          className="size-8 rounded-lg hover:bg-muted flex items-center justify-center transition text-muted-foreground"
        >
          <Pencil className="size-4" />
        </button>
        <button
          onClick={onDelete}
          className="size-8 rounded-lg hover:bg-destructive/15 flex items-center justify-center transition text-muted-foreground hover:text-destructive"
        >
          <Trash2 className="size-4" />
        </button>
      </div>
    </div>
  );
}

// ─── Categoria Modal ──────────────────────────────────────────────────────────

function CategoriaModal({
  tipo,
  cat,
  tenantId,
  existingCount,
  onClose,
  onSaved,
}: {
  tipo: "novo" | "editar";
  cat?: Categoria;
  tenantId: string;
  existingCount: number;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [nome, setNome] = useState(cat?.nome ?? "");
  const [saving, setSaving] = useState(false);

  async function salvar() {
    if (!nome.trim()) return;
    setSaving(true);
    if (tipo === "novo") {
      const { error } = await supabase.from("categorias").insert({
        tenant_id: tenantId,
        nome: nome.trim(),
        ordem: existingCount,
      });
      if (error) { toast.error(error.message); setSaving(false); return; }
    } else if (cat) {
      const { error } = await supabase.from("categorias").update({ nome: nome.trim() }).eq("id", cat.id);
      if (error) { toast.error(error.message); setSaving(false); return; }
    }
    toast.success(tipo === "novo" ? "Categoria criada!" : "Categoria atualizada!");
    onSaved();
  }

  return (
    <Modal title={tipo === "novo" ? "Nova categoria" : "Editar categoria"} onClose={onClose}>
      <div className="space-y-4">
        <div>
          <label className="text-sm font-medium block mb-1.5">Nome</label>
          <input
            autoFocus
            value={nome}
            onChange={(e) => setNome(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && salvar()}
            className="w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm focus:outline-none focus:border-primary"
            placeholder="Ex: Pizzas, Bebidas, Entradas..."
          />
        </div>
        <div className="flex gap-2 pt-1">
          <button
            onClick={onClose}
            className="flex-1 rounded-xl border border-border py-2.5 text-sm font-medium hover:bg-muted transition"
          >
            Cancelar
          </button>
          <button
            onClick={salvar}
            disabled={!nome.trim() || saving}
            className="flex-1 rounded-xl bg-primary text-primary-foreground py-2.5 text-sm font-bold hover:opacity-90 disabled:opacity-50 transition flex items-center justify-center gap-2"
          >
            {saving && <Loader2 className="size-3.5 animate-spin" />}
            Salvar
          </button>
        </div>
      </div>
    </Modal>
  );
}

// ─── Item Modal ───────────────────────────────────────────────────────────────

function ItemModal({
  tipo,
  item,
  catId,
  tenantId,
  existingCount,
  onClose,
  onSaved,
}: {
  tipo: "novo" | "editar";
  item?: Item;
  catId: string;
  tenantId: string;
  existingCount: number;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [nome, setNome] = useState(item?.nome ?? "");
  const [descricao, setDescricao] = useState(item?.descricao ?? "");
  const [ingredientes, setIngredientes] = useState(item?.ingredientes ?? "");
  const [preco, setPreco] = useState(item?.preco ? String(item.preco) : "");
  const [tipoItem, setTipoItem] = useState<"simples" | "personalizavel">(
    item?.tipo ?? "simples",
  );
  const [fotoUrl, setFotoUrl] = useState(item?.foto_url ?? "");
  const [uploadingFoto, setUploadingFoto] = useState(false);
  const [saving, setSaving] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  async function uploadFoto(file: File) {
    setUploadingFoto(true);
    const ext = file.name.split(".").pop();
    const path = `${tenantId}/${Date.now()}.${ext}`;
    const { error } = await supabase.storage.from("menu-images").upload(path, file, {
      upsert: true,
    });
    if (error) {
      toast.error("Falha no upload da imagem");
      setUploadingFoto(false);
      return;
    }
    const { data } = supabase.storage.from("menu-images").getPublicUrl(path);
    setFotoUrl(data.publicUrl);
    setUploadingFoto(false);
  }

  async function salvar() {
    if (!nome.trim() || !preco) return;
    setSaving(true);
    const payload = {
      nome: nome.trim(),
      descricao: descricao.trim() || null,
      ingredientes: ingredientes.trim() || null,
      preco: parseFloat(preco),
      tipo: tipoItem,
      foto_url: fotoUrl || null,
    };
    if (tipo === "novo") {
      const { error } = await supabase.from("itens").insert({
        ...payload,
        tenant_id: tenantId,
        categoria_id: catId,
        ordem: existingCount,
      });
      if (error) { toast.error(error.message); setSaving(false); return; }
    } else if (item) {
      const { error } = await supabase.from("itens").update(payload).eq("id", item.id);
      if (error) { toast.error(error.message); setSaving(false); return; }
    }
    toast.success(tipo === "novo" ? "Item criado!" : "Item atualizado!");
    onSaved();
  }

  return (
    <Modal title={tipo === "novo" ? "Novo item" : "Editar item"} onClose={onClose} wide>
      <div className="space-y-4">
        {/* Foto */}
        <div className="flex items-center gap-4">
          <div
            className="size-20 rounded-2xl border-2 border-dashed border-border bg-surface flex items-center justify-center cursor-pointer hover:border-primary transition overflow-hidden shrink-0"
            onClick={() => fileRef.current?.click()}
          >
            {uploadingFoto ? (
              <Loader2 className="size-5 animate-spin text-muted-foreground" />
            ) : fotoUrl ? (
              <img src={fotoUrl} alt="" className="size-full object-cover" />
            ) : (
              <ImagePlus className="size-6 text-muted-foreground" />
            )}
          </div>
          <div className="flex-1">
            <p className="text-sm font-medium">Foto do item</p>
            <p className="text-xs text-muted-foreground mt-0.5">JPG ou PNG, max 5MB</p>
            <button
              onClick={() => fileRef.current?.click()}
              className="mt-2 text-xs text-primary hover:underline"
            >
              {fotoUrl ? "Trocar imagem" : "Selecionar imagem"}
            </button>
          </div>
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) uploadFoto(f);
            }}
          />
        </div>

        <div className="grid sm:grid-cols-2 gap-3">
          <div className="sm:col-span-2">
            <label className="text-sm font-medium block mb-1.5">Nome *</label>
            <input
              value={nome}
              onChange={(e) => setNome(e.target.value)}
              className="w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm focus:outline-none focus:border-primary"
              placeholder="Ex: Pizza Margherita"
            />
          </div>
          <div>
            <label className="text-sm font-medium block mb-1.5">Preco *</label>
            <input
              type="number"
              step="0.01"
              min={0}
              value={preco}
              onChange={(e) => setPreco(e.target.value)}
              className="w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm focus:outline-none focus:border-primary"
              placeholder="0,00"
            />
          </div>
          <div>
            <label className="text-sm font-medium block mb-1.5">Tipo</label>
            <select
              value={tipoItem}
              onChange={(e) => setTipoItem(e.target.value as "simples" | "personalizavel")}
              className="w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm focus:outline-none focus:border-primary"
            >
              <option value="simples">Simples</option>
              <option value="personalizavel">Personalizavel (pizza)</option>
            </select>
          </div>
          <div className="sm:col-span-2">
            <label className="text-sm font-medium block mb-1.5">Descricao</label>
            <textarea
              rows={2}
              value={descricao}
              onChange={(e) => setDescricao(e.target.value)}
              className="w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm focus:outline-none focus:border-primary resize-none"
              placeholder="Breve descricao exibida no cardapio..."
            />
          </div>
          <div className="sm:col-span-2">
            <label className="text-sm font-medium block mb-1.5">Ingredientes</label>
            <input
              value={ingredientes}
              onChange={(e) => setIngredientes(e.target.value)}
              className="w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm focus:outline-none focus:border-primary"
              placeholder="Ex: queijo, molho de tomate, manjericao..."
            />
          </div>
        </div>

        <div className="flex gap-2 pt-1">
          <button
            onClick={onClose}
            className="flex-1 rounded-xl border border-border py-2.5 text-sm font-medium hover:bg-muted transition"
          >
            Cancelar
          </button>
          <button
            onClick={salvar}
            disabled={!nome.trim() || !preco || saving}
            className="flex-1 rounded-xl bg-primary text-primary-foreground py-2.5 text-sm font-bold hover:opacity-90 disabled:opacity-50 transition flex items-center justify-center gap-2"
          >
            {saving && <Loader2 className="size-3.5 animate-spin" />}
            Salvar
          </button>
        </div>
      </div>
    </Modal>
  );
}

// ─── Opcoes Modal ─────────────────────────────────────────────────────────────

function OpcoesModal({ item, onClose }: { item: Item; onClose: () => void }) {
  const qc = useQueryClient();
  const [opcoes, setOpcoes] = useState<Opcao[]>([]);
  const [loading, setLoading] = useState(true);
  const [novaOpcao, setNovaOpcao] = useState<{
    nome: string;
    tipo_opcao: Opcao["tipo_opcao"];
    preco_adicional: string;
    ingredientes: string;
  }>({ nome: "", tipo_opcao: "tamanho", preco_adicional: "0", ingredientes: "" });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const load = async () => {
      const { data } = await supabase
        .from("item_opcoes")
        .select("*")
        .eq("item_id", item.id)
        .order("ordem");
      setOpcoes((data ?? []) as Opcao[]);
      setLoading(false);
    };
    load();
  }, [item.id]);

  async function adicionarOpcao() {
    if (!novaOpcao.nome.trim()) return;
    setSaving(true);
    const { data, error } = await supabase
      .from("item_opcoes")
      .insert({
        item_id: item.id,
        nome: novaOpcao.nome.trim(),
        tipo_opcao: novaOpcao.tipo_opcao,
        preco_adicional: parseFloat(novaOpcao.preco_adicional) || 0,
        ingredientes: novaOpcao.ingredientes.trim() || null,
        ordem: opcoes.length,
      })
      .select("*")
      .single();
    if (error) {
      toast.error(error.message);
    } else {
      setOpcoes((prev) => [...prev, data as Opcao]);
      setNovaOpcao({ nome: "", tipo_opcao: "tamanho", preco_adicional: "0", ingredientes: "" });
    }
    setSaving(false);
  }

  async function deletarOpcao(id: string) {
    await supabase.from("item_opcoes").delete().eq("id", id);
    setOpcoes((prev) => prev.filter((o) => o.id !== id));
  }

  const grouped = Object.entries(OPCAO_TIPO_LABEL).map(([tipo, label]) => ({
    tipo,
    label,
    items: opcoes.filter((o) => o.tipo_opcao === tipo),
  }));

  return (
    <Modal title={`Opcoes — ${item.nome}`} onClose={onClose} wide>
      <div className="space-y-5">
        {loading ? (
          <div className="flex justify-center py-6">
            <Loader2 className="size-5 animate-spin text-primary" />
          </div>
        ) : (
          <div className="space-y-4">
            {grouped.map(({ tipo, label, items: groupItems }) => (
              <div key={tipo}>
                <h4 className="text-xs font-bold uppercase tracking-wide text-muted-foreground mb-2">
                  {label}
                </h4>
                {groupItems.length === 0 ? (
                  <p className="text-xs text-muted-foreground italic">Nenhuma opcao deste tipo.</p>
                ) : (
                  <div className="space-y-1.5">
                    {groupItems.map((o) => (
                      <div
                        key={o.id}
                        className="flex items-center gap-2 bg-surface rounded-xl p-2.5"
                      >
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium">{o.nome}</p>
                          {o.ingredientes && (
                            <p className="text-xs text-muted-foreground">{o.ingredientes}</p>
                          )}
                        </div>
                        <span className="text-sm font-bold shrink-0">
                          {o.preco_adicional > 0 ? `+${brl(o.preco_adicional)}` : "Incluso"}
                        </span>
                        <button
                          onClick={() => deletarOpcao(o.id)}
                          className="size-7 rounded-lg hover:bg-destructive/15 hover:text-destructive flex items-center justify-center transition text-muted-foreground shrink-0"
                        >
                          <Trash2 className="size-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        <div className="border-t border-border pt-4">
          <h4 className="text-sm font-bold mb-3">Adicionar opcao</h4>
          <div className="grid grid-cols-2 gap-2 mb-2">
            <input
              value={novaOpcao.nome}
              onChange={(e) => setNovaOpcao((p) => ({ ...p, nome: e.target.value }))}
              className="col-span-2 rounded-xl border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:border-primary"
              placeholder="Nome da opcao (ex: Grande, Tradicional...)"
            />
            <select
              value={novaOpcao.tipo_opcao}
              onChange={(e) =>
                setNovaOpcao((p) => ({ ...p, tipo_opcao: e.target.value as Opcao["tipo_opcao"] }))
              }
              className="rounded-xl border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:border-primary"
            >
              {Object.entries(OPCAO_TIPO_LABEL).map(([k, v]) => (
                <option key={k} value={k}>
                  {v}
                </option>
              ))}
            </select>
            <div className="flex items-center gap-1">
              <span className="text-sm text-muted-foreground">+R$</span>
              <input
                type="number"
                step="0.01"
                min={0}
                value={novaOpcao.preco_adicional}
                onChange={(e) => setNovaOpcao((p) => ({ ...p, preco_adicional: e.target.value }))}
                className="flex-1 rounded-xl border border-border bg-background px-2 py-2 text-sm focus:outline-none focus:border-primary"
              />
            </div>
            <input
              value={novaOpcao.ingredientes}
              onChange={(e) => setNovaOpcao((p) => ({ ...p, ingredientes: e.target.value }))}
              className="col-span-2 rounded-xl border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:border-primary"
              placeholder="Ingredientes ou descricao (opcional)"
            />
          </div>
          <button
            onClick={adicionarOpcao}
            disabled={!novaOpcao.nome.trim() || saving}
            className="w-full rounded-xl bg-primary text-primary-foreground py-2.5 text-sm font-bold hover:opacity-90 disabled:opacity-50 transition flex items-center justify-center gap-2"
          >
            {saving ? <Loader2 className="size-3.5 animate-spin" /> : <Plus className="size-4" />}
            Adicionar
          </button>
        </div>
      </div>
    </Modal>
  );
}

// ─── Generic Modal ────────────────────────────────────────────────────────────

function Modal({
  title,
  children,
  onClose,
  wide,
}: {
  title: string;
  children: React.ReactNode;
  onClose: () => void;
  wide?: boolean;
}) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70"
      onClick={onClose}
    >
      <div
        className={`bg-card border border-border rounded-2xl p-6 w-full shadow-2xl max-h-[90vh] flex flex-col ${
          wide ? "max-w-lg" : "max-w-sm"
        }`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-5 shrink-0">
          <h3 className="font-extrabold text-lg">{title}</h3>
          <button
            onClick={onClose}
            className="size-8 rounded-xl hover:bg-muted flex items-center justify-center transition"
          >
            <X className="size-4" />
          </button>
        </div>
        <div className="overflow-y-auto">{children}</div>
      </div>
    </div>
  );
}
