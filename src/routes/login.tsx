import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable";
import { toast } from "sonner";
import { Logo } from "@/components/Logo";
import { Loader2 } from "lucide-react";

export const Route = createFileRoute("/login")({
  component: LoginPage,
  head: () => ({ meta: [{ title: "Entrar — MenuFlow" }] }),
});

function LoginPage() {
  const nav = useNavigate();
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password: senha });
    setLoading(false);
    if (error) return toast.error(error.message);
    toast.success("Bem-vindo!");
    nav({ to: "/painel/pedidos" });
  }

  async function google() {
    const r = await lovable.auth.signInWithOAuth("google", { redirect_uri: window.location.origin + "/painel/pedidos" });
    if (r.error) toast.error("Falha no login com Google");
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <Link to="/"><Logo /></Link>
        </div>
        <div className="bg-surface border border-border rounded-3xl p-8 shadow-xl">
          <h1 className="text-2xl font-bold mb-1">Entrar no painel</h1>
          <p className="text-sm text-muted-foreground mb-6">Acesse seu estabelecimento.</p>

          <button
            onClick={google}
            className="w-full mb-4 rounded-xl border border-border bg-background hover:bg-muted/30 py-3 font-medium flex items-center justify-center gap-2"
          >
            <GoogleIcon /> Continuar com Google
          </button>

          <div className="relative my-4">
            <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-border" /></div>
            <div className="relative flex justify-center text-xs"><span className="bg-surface px-2 text-muted-foreground">ou com e-mail</span></div>
          </div>

          <form onSubmit={onSubmit} className="space-y-3">
            <input className="input" type="email" required placeholder="E-mail" value={email} onChange={(e) => setEmail(e.target.value)} />
            <input className="input" type="password" required placeholder="Senha" value={senha} onChange={(e) => setSenha(e.target.value)} />
            <button disabled={loading} className="w-full rounded-xl bg-primary text-primary-foreground py-3 font-semibold disabled:opacity-60 flex items-center justify-center gap-2">
              {loading && <Loader2 className="size-4 animate-spin" />} Entrar
            </button>
          </form>

          <p className="text-sm text-center text-muted-foreground mt-6">
            Não tem conta? <Link to="/cadastro" className="text-primary font-semibold">Criar grátis</Link>
          </p>
        </div>
      </div>
      <style>{`.input{width:100%;border-radius:.75rem;background:var(--background);border:1px solid var(--border);padding:.75rem 1rem;font-size:.95rem;color:var(--foreground)} .input:focus{outline:none;border-color:var(--primary)}`}</style>
    </div>
  );
}

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18"><path fill="#4285F4" d="M17.64 9.2c0-.64-.06-1.25-.16-1.84H9v3.48h4.84a4.13 4.13 0 01-1.8 2.71v2.26h2.91c1.7-1.57 2.69-3.88 2.69-6.61z"/><path fill="#34A853" d="M9 18c2.43 0 4.47-.81 5.96-2.18l-2.91-2.26c-.81.54-1.84.86-3.05.86-2.34 0-4.33-1.58-5.03-3.71H.96v2.33A9 9 0 009 18z"/><path fill="#FBBC05" d="M3.97 10.71A5.41 5.41 0 013.68 9c0-.59.1-1.17.29-1.71V4.96H.96A9 9 0 000 9c0 1.45.35 2.83.96 4.04l3.01-2.33z"/><path fill="#EA4335" d="M9 3.58c1.32 0 2.5.45 3.44 1.35l2.58-2.58A9 9 0 00.96 4.96L3.97 7.29C4.67 5.16 6.66 3.58 9 3.58z"/></svg>
  );
}
