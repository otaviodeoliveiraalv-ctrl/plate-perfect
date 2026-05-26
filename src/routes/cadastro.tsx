import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Logo } from "@/components/Logo";
import { ArrowLeft, ArrowRight, Check, Loader2 } from "lucide-react";

export const Route = createFileRoute("/cadastro")({
  component: CadastroPage,
  head: () => ({ meta: [{ title: "Criar conta — MenuFlow" }] }),
});

function slugify(s: string) {
  return s.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "").slice(0, 50);
}

function CadastroPage() {
  const nav = useNavigate();
  const [step, setStep] = useState(1);
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [nome, setNome] = useState("");
  const [telefone, setTelefone] = useState("");
  const [tipo, setTipo] = useState("Pizzaria");
  const [slug, setSlug] = useState("");
  const [slugStatus, setSlugStatus] = useState<"ok" | "tomado" | "checando" | "vazio">("vazio");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (step === 2 && nome && !slug) setSlug(slugify(nome));
  }, [step, nome, slug]);

  useEffect(() => {
    if (!slug) return setSlugStatus("vazio");
    setSlugStatus("checando");
    const t = setTimeout(async () => {
      const { data } = await supabase.from("tenants").select("id").eq("slug", slug).maybeSingle();
      setSlugStatus(data ? "tomado" : "ok");
    }, 350);
    return () => clearTimeout(t);
  }, [slug]);

  async function finalizar() {
    if (slugStatus !== "ok") return toast.error("Escolha um link disponível");
    setLoading(true);
    const { data: signUp, error } = await supabase.auth.signUp({
      email,
      password: senha,
      options: { emailRedirectTo: window.location.origin + "/painel/pedidos" },
    });
    if (error) { setLoading(false); return toast.error(error.message); }
    // Tenta logar (se auto-confirm desabilitado, retorna erro mas usuário foi criado)
    if (!signUp.session) {
      const { error: e2 } = await supabase.auth.signInWithPassword({ email, password: senha });
      if (e2) {
        setLoading(false);
        toast.success("Conta criada! Confirme seu e-mail e faça login.");
        return nav({ to: "/login" });
      }
    }
    const userId = (await supabase.auth.getUser()).data.user?.id;
    if (!userId) { setLoading(false); return toast.error("Falha ao criar sessão"); }

    const { data: tenant, error: tErr } = await supabase
      .from("tenants")
      .insert({ nome, slug, telefone, descricao: tipo })
      .select("id")
      .single();
    if (tErr) { setLoading(false); return toast.error(tErr.message); }

    const { error: linkErr } = await supabase
      .from("user_tenants")
      .insert({ user_id: userId, tenant_id: tenant.id });
    if (linkErr) { setLoading(false); return toast.error(linkErr.message); }

    toast.success("Estabelecimento criado!");
    setLoading(false);
    nav({ to: "/painel/cardapio" });
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8"><Link to="/"><Logo /></Link></div>
        <div className="bg-surface border border-border rounded-3xl p-8 shadow-xl">
          <div className="flex items-center gap-2 mb-6">
            {[1, 2, 3].map((s) => (
              <div key={s} className={`h-1.5 flex-1 rounded-full ${s <= step ? "bg-primary" : "bg-muted"}`} />
            ))}
          </div>

          {step === 1 && (
            <>
              <h1 className="text-2xl font-bold mb-1">Crie sua conta</h1>
              <p className="text-sm text-muted-foreground mb-6">Comece em menos de 1 minuto.</p>
              <div className="space-y-3">
                <input className="input" type="email" placeholder="E-mail" value={email} onChange={(e) => setEmail(e.target.value)} />
                <input className="input" type="password" placeholder="Senha (mín. 6 caracteres)" value={senha} onChange={(e) => setSenha(e.target.value)} />
                <button
                  disabled={!email || senha.length < 6}
                  onClick={() => setStep(2)}
                  className="w-full rounded-xl bg-primary text-primary-foreground py-3 font-semibold disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  Continuar <ArrowRight className="size-4" />
                </button>
              </div>
            </>
          )}

          {step === 2 && (
            <>
              <h1 className="text-2xl font-bold mb-1">Seu estabelecimento</h1>
              <p className="text-sm text-muted-foreground mb-6">Conte um pouco sobre o seu negócio.</p>
              <div className="space-y-3">
                <input className="input" placeholder="Nome do estabelecimento" value={nome} onChange={(e) => setNome(e.target.value)} />
                <input className="input" placeholder="Telefone (WhatsApp)" value={telefone} onChange={(e) => setTelefone(e.target.value)} />
                <select className="input" value={tipo} onChange={(e) => setTipo(e.target.value)}>
                  {["Pizzaria", "Hamburgueria", "Restaurante", "Lanchonete", "Cafeteria", "Outro"].map((t) => <option key={t}>{t}</option>)}
                </select>
                <div className="flex gap-2">
                  <button onClick={() => setStep(1)} className="rounded-xl border border-border px-4 py-3 flex items-center gap-2"><ArrowLeft className="size-4" /></button>
                  <button disabled={!nome} onClick={() => setStep(3)} className="flex-1 rounded-xl bg-primary text-primary-foreground py-3 font-semibold disabled:opacity-50 flex items-center justify-center gap-2">
                    Continuar <ArrowRight className="size-4" />
                  </button>
                </div>
              </div>
            </>
          )}

          {step === 3 && (
            <>
              <h1 className="text-2xl font-bold mb-1">Seu link público</h1>
              <p className="text-sm text-muted-foreground mb-6">Este será o endereço do seu cardápio.</p>
              <div className="space-y-3">
                <div>
                  <div className="flex items-center rounded-xl border border-border bg-background overflow-hidden">
                    <span className="px-3 text-muted-foreground text-sm">menuflow.app/cardapio/</span>
                    <input className="flex-1 bg-transparent py-3 pr-3 text-sm focus:outline-none" value={slug} onChange={(e) => setSlug(slugify(e.target.value))} />
                  </div>
                  <p className="text-xs mt-2">
                    {slugStatus === "checando" && <span className="text-muted-foreground">Verificando…</span>}
                    {slugStatus === "ok" && <span className="text-success">✓ Disponível</span>}
                    {slugStatus === "tomado" && <span className="text-destructive">Já em uso, tente outro</span>}
                  </p>
                </div>
                <div className="flex gap-2">
                  <button onClick={() => setStep(2)} className="rounded-xl border border-border px-4 py-3 flex items-center gap-2"><ArrowLeft className="size-4" /></button>
                  <button disabled={slugStatus !== "ok" || loading} onClick={finalizar} className="flex-1 rounded-xl bg-primary text-primary-foreground py-3 font-semibold disabled:opacity-50 flex items-center justify-center gap-2">
                    {loading ? <Loader2 className="size-4 animate-spin" /> : <Check className="size-4" />} Criar minha conta
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
      <style>{`.input{width:100%;border-radius:.75rem;background:var(--background);border:1px solid var(--border);padding:.75rem 1rem;font-size:.95rem;color:var(--foreground)} .input:focus{outline:none;border-color:var(--primary)}`}</style>
    </div>
  );
}
