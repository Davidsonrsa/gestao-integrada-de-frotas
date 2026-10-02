import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Tag } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated/estoque/categorias")({
  component: EstoqueCategoriasPage,
});

type Categoria = {
  id: string;
  nome: string;
  ativo?: boolean | null;
  descricao?: string | null;
};

export default function EstoqueCategoriasPage() {
  const [categorias, setCategorias] = useState<Categoria[]>([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({ nome: "", descricao: "", ativo: true });

  async function loadData() {
    try {
      const { data, error } = await supabase
        .from("estoque_categorias")
        .select("*")
        .order("nome", { ascending: true });
      if (error) throw error;
      setCategorias((data || []) as Categoria[]);
    } catch (error) {
      console.error("Erro ao carregar categorias:", error);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadData();
  }, []);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    try {
      const { error } = await supabase.from("estoque_categorias").insert([
        {
          nome: form.nome.trim(),
          descricao: form.descricao || null,
          ativo: form.ativo,
        },
      ]);
      if (error) throw error;
      setForm({ nome: "", descricao: "", ativo: true });
      await loadData();
    } catch (error) {
      console.error("Erro ao salvar categoria:", error);
    }
  }

  async function toggleAtivo(categoria: Categoria) {
    try {
      const { error } = await supabase
        .from("estoque_categorias")
        .update({ ativo: !categoria.ativo })
        .eq("id", categoria.id);
      if (error) throw error;
      await loadData();
    } catch (error) {
      console.error("Erro ao alterar categoria:", error);
    }
  }

  return (
    <div className="grid gap-6 xl:grid-cols-[1fr_0.9fr]">
      <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <h2 className="mb-4 text-lg font-black text-slate-900">Categorias</h2>

        {loading ? (
          <p className="text-sm text-slate-500">Carregando...</p>
        ) : categorias.length === 0 ? (
          <p className="text-sm text-slate-500">Nenhuma categoria cadastrada.</p>
        ) : (
          <div className="space-y-2">
            {categorias.map((categoria) => (
              <div
                key={categoria.id}
                className="flex items-center justify-between rounded-lg border border-slate-200 p-3"
              >
                <div>
                  <p className="font-bold text-slate-800">{categoria.nome}</p>
                  <p className="text-xs text-slate-500">{categoria.descricao || "Sem descrição"}</p>
                </div>
                <button
                  type="button"
                  onClick={() => toggleAtivo(categoria)}
                  className={`rounded-full px-2 py-1 text-[10px] font-bold uppercase ${categoria.ativo === false ? "bg-slate-100 text-slate-600" : "bg-emerald-100 text-emerald-700"}`}
                >
                  {categoria.ativo === false ? "Inativo" : "Ativo"}
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      <form
        onSubmit={handleSubmit}
        className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm"
      >
        <div className="mb-4 flex items-center gap-2">
          <Tag className="h-5 w-5 text-sky-700" />
          <h2 className="text-lg font-black text-slate-900">Nova categoria</h2>
        </div>

        <div className="grid gap-3">
          <input
            value={form.nome}
            onChange={(e) => setForm({ ...form, nome: e.target.value })}
            placeholder="Nome da categoria"
            required
            className="rounded-md border border-slate-300 p-2 text-sm"
          />
          <textarea
            value={form.descricao}
            onChange={(e) => setForm({ ...form, descricao: e.target.value })}
            placeholder="Descrição"
            className="min-h-20 rounded-md border border-slate-300 p-2 text-sm"
          />

          <label className="flex items-center gap-2 text-sm font-medium text-slate-700">
            <input
              type="checkbox"
              checked={form.ativo}
              onChange={(e) => setForm({ ...form, ativo: e.target.checked })}
            />
            Categoria ativa
          </label>

          <button
            type="submit"
            className="rounded-md bg-sky-600 px-4 py-2 text-sm font-bold text-white hover:bg-sky-700"
          >
            Salvar categoria
          </button>
        </div>
      </form>
    </div>
  );
}
