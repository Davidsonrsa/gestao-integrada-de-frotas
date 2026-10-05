import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { estoqueDb as supabase } from "@/lib/estoque-db";

export const Route = createFileRoute("/_authenticated/estoque/inventario")({
  component: EstoqueInventarioPage,
});

type Produto = {
  id: string;
  nome: string;
  estoque_atual?: number | null;
  unidade?: string | null;
  localizacao?: string | null;
};

export default function EstoqueInventarioPage() {
  const [produtos, setProdutos] = useState<Produto[]>([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState<Record<string, number>>({});

  async function loadData() {
    try {
      const { data, error } = await supabase
        .from("estoque_produtos")
        .select("*")
        .order("nome", { ascending: true });
      if (error) throw error;
      setProdutos((data || []) as Produto[]);
      const initial = Object.fromEntries(
        (data || []).map((item) => [item.id, Number(item.estoque_atual ?? 0)]),
      );
      setForm(initial);
    } catch (error) {
      console.error("Erro ao carregar inventário:", error);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadData();
  }, []);

  async function efetivarInventario() {
    try {
      for (const produto of produtos) {
        const contagem = Number(form[produto.id] ?? produto.estoque_atual ?? 0);
        const diferenca = contagem - Number(produto.estoque_atual ?? 0);

        if (diferenca !== 0) {
          const { error } = await supabase.from("estoque_inventarios").insert([
            {
              produto_id: produto.id,
              data: new Date().toISOString().slice(0, 10),
              quantidade_anterior: Number(produto.estoque_atual ?? 0),
              quantidade_nova: contagem,
              diferenca,
              motivo: "Inventário físico",
              responsavel: "Sistema",
            },
          ]);

          if (error) throw error;

          await supabase
            .from("estoque_produtos")
            .update({ estoque_atual: contagem })
            .eq("id", produto.id);
        }
      }
      await loadData();
    } catch (error) {
      console.error("Erro ao efetivar inventário:", error);
    }
  }

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-lg font-black text-slate-900">Inventário físico</h2>
        <button
          type="button"
          onClick={efetivarInventario}
          className="rounded-md bg-sky-600 px-4 py-2 text-sm font-bold text-white hover:bg-sky-700"
        >
          Efetivar ajuste
        </button>
      </div>

      {loading ? (
        <p className="text-sm text-slate-500">Carregando inventário...</p>
      ) : produtos.length === 0 ? (
        <p className="text-sm text-slate-500">Nenhum produto cadastrado.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead>
              <tr className="border-b border-slate-200 text-slate-600">
                <th className="py-2 pr-4 font-semibold">Produto</th>
                <th className="py-2 pr-4 font-semibold">Sistema</th>
                <th className="py-2 pr-4 font-semibold">Contagem física</th>
                <th className="py-2 font-semibold">Diferença</th>
              </tr>
            </thead>
            <tbody>
              {produtos.map((produto) => {
                const sistema = Number(produto.estoque_atual ?? 0);
                const contagem = Number(form[produto.id] ?? sistema);
                const diferenca = contagem - sistema;

                return (
                  <tr key={produto.id} className="border-b border-slate-100">
                    <td className="py-3 pr-4 font-medium text-slate-800">{produto.nome}</td>
                    <td className="py-3 pr-4 text-slate-600">{sistema}</td>
                    <td className="py-3 pr-4">
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={contagem}
                        onChange={(e) => setForm({ ...form, [produto.id]: Number(e.target.value) })}
                        className="w-28 rounded-md border border-slate-300 p-2 text-sm"
                      />
                    </td>
                    <td
                      className={`py-3 font-semibold ${diferenca === 0 ? "text-slate-600" : diferenca > 0 ? "text-emerald-600" : "text-red-600"}`}
                    >
                      {diferenca}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
