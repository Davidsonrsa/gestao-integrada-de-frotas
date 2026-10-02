import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { formatCurrency } from "@/lib/estoque";

export const Route = createFileRoute("/_authenticated/estoque/movimentacoes")({
  component: EstoqueMovimentacoesPage,
});

type Movimentacao = {
  id: string;
  created_at?: string | null;
  tipo?: string | null;
  quantidade?: number | null;
  estoque_anterior?: number | null;
  estoque_posterior?: number | null;
  valor_total?: number | null;
  documento?: string | null;
  responsavel?: string | null;
  observacao?: string | null;
  estoque_produtos?: { nome?: string | null } | null;
  equipamentos?: { nome?: string | null } | null;
};

export default function EstoqueMovimentacoesPage() {
  const [movimentacoes, setMovimentacoes] = useState<Movimentacao[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadMovimentacoes() {
      try {
        const { data, error } = await supabase
          .from("estoque_movimentacoes")
          .select("*, estoque_produtos(nome), equipamentos(nome)")
          .order("created_at", { ascending: false });

        if (error) throw error;
        setMovimentacoes((data || []) as Movimentacao[]);
      } catch (error) {
        console.error("Erro ao carregar movimentações:", error);
      } finally {
        setLoading(false);
      }
    }

    void loadMovimentacoes();
  }, []);

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <h2 className="mb-4 text-lg font-black text-slate-900">Histórico de movimentações</h2>

      {loading ? (
        <p className="text-sm text-slate-500">Carregando movimentações...</p>
      ) : movimentacoes.length === 0 ? (
        <p className="text-sm text-slate-500">Nenhuma movimentação registrada.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead>
              <tr className="border-b border-slate-200 text-slate-600">
                <th className="py-2 pr-4 font-semibold">Data</th>
                <th className="py-2 pr-4 font-semibold">Produto</th>
                <th className="py-2 pr-4 font-semibold">Tipo</th>
                <th className="py-2 pr-4 font-semibold">Quantidade</th>
                <th className="py-2 pr-4 font-semibold">Anterior</th>
                <th className="py-2 pr-4 font-semibold">Posterior</th>
                <th className="py-2 pr-4 font-semibold">Valor</th>
                <th className="py-2 pr-4 font-semibold">Equipamento</th>
                <th className="py-2 pr-4 font-semibold">Responsável</th>
                <th className="py-2 font-semibold">Documento</th>
              </tr>
            </thead>
            <tbody>
              {movimentacoes.map((mov) => (
                <tr key={mov.id} className="border-b border-slate-100">
                  <td className="py-3 pr-4 text-slate-600">
                    {new Date(mov.created_at ?? Date.now()).toLocaleDateString("pt-BR")}
                  </td>
                  <td className="py-3 pr-4 font-medium text-slate-800">
                    {mov.estoque_produtos?.nome || "—"}
                  </td>
                  <td className="py-3 pr-4 text-slate-600">{mov.tipo || "—"}</td>
                  <td className="py-3 pr-4 text-slate-600">{mov.quantidade ?? 0}</td>
                  <td className="py-3 pr-4 text-slate-600">{mov.estoque_anterior ?? 0}</td>
                  <td className="py-3 pr-4 text-slate-600">{mov.estoque_posterior ?? 0}</td>
                  <td className="py-3 pr-4 text-slate-600">
                    {formatCurrency(mov.valor_total ?? 0)}
                  </td>
                  <td className="py-3 pr-4 text-slate-600">{mov.equipamentos?.nome || "—"}</td>
                  <td className="py-3 pr-4 text-slate-600">{mov.responsavel || "—"}</td>
                  <td className="py-3 text-slate-600">{mov.documento || "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
