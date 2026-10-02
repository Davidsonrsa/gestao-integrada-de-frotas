import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { AlertTriangle, BellRing, CheckCircle2, PackageSearch } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { formatCurrency, getEstoqueStatus } from "@/lib/estoque";

export const Route = createFileRoute("/_authenticated/estoque/alertas")({
  component: EstoqueAlertasPage,
});

type ProdutoAlerta = {
  id: string;
  nome: string;
  estoque_atual: number | null;
  estoque_minimo: number | null;
  estoque_maximo: number | null;
  custo_medio: number | null;
  ativo: boolean | null;
  estoque_categorias?: { nome?: string | null } | null;
  estoque_localizacoes?: { nome?: string | null } | null;
};

export default function EstoqueAlertasPage() {
  const [produtos, setProdutos] = useState<ProdutoAlerta[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadAlertas() {
      try {
        setLoading(true);
        const { data, error } = await supabase
          .from("estoque_produtos")
          .select("*, estoque_categorias(nome), estoque_localizacoes(nome)")
          .order("nome", { ascending: true });

        if (error) throw error;
        setProdutos((data || []) as ProdutoAlerta[]);
      } catch (error) {
        console.error("Erro ao carregar alertas de estoque:", error);
      } finally {
        setLoading(false);
      }
    }

    void loadAlertas();
  }, []);

  const alertas = useMemo(
    () =>
      produtos
        .filter((produto) => getEstoqueStatus(produto) !== "ESTOQUE NORMAL")
        .map((produto) => ({
          ...produto,
          status: getEstoqueStatus(produto),
          diferenca: Number(produto.estoque_minimo ?? 0) - Number(produto.estoque_atual ?? 0),
          valorDisponivel: Number(produto.estoque_atual ?? 0) * Number(produto.custo_medio ?? 0),
        })),
    [produtos],
  );

  const resumo = {
    total: alertas.length,
    baixos: alertas.filter((item) => item.status === "ESTOQUE BAIXO").length,
    zerados: alertas.filter((item) => item.status === "ESTOQUE ZERADO").length,
    valor: alertas.reduce((soma, item) => soma + item.valorDisponivel, 0),
  };

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-3">
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                Itens em alerta
              </p>
              <p className="mt-2 text-2xl font-black text-slate-900">{resumo.total}</p>
            </div>
            <div className="rounded-xl bg-amber-50 p-2 text-amber-700">
              <BellRing className="h-5 w-5" />
            </div>
          </div>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                Abaixo do mínimo
              </p>
              <p className="mt-2 text-2xl font-black text-slate-900">{resumo.baixos}</p>
            </div>
            <div className="rounded-xl bg-yellow-50 p-2 text-yellow-700">
              <AlertTriangle className="h-5 w-5" />
            </div>
          </div>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                Valor em alerta
              </p>
              <p className="mt-2 text-2xl font-black text-slate-900">
                {formatCurrency(resumo.valor)}
              </p>
            </div>
            <div className="rounded-xl bg-red-50 p-2 text-red-700">
              <PackageSearch className="h-5 w-5" />
            </div>
          </div>
        </div>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-black text-slate-900">Produtos com atenção</h2>
          <span className="rounded-full bg-slate-100 px-2 py-1 text-xs font-semibold text-slate-600">
            {resumo.zerados} zerados
          </span>
        </div>

        {loading ? (
          <p className="text-sm text-slate-500">Carregando alertas...</p>
        ) : alertas.length === 0 ? (
          <p className="text-sm text-slate-500">Nenhum item em situação de alerta.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-slate-600">
                  <th className="py-2 pr-4 font-semibold">Produto</th>
                  <th className="py-2 pr-4 font-semibold">Categoria</th>
                  <th className="py-2 pr-4 font-semibold">Local</th>
                  <th className="py-2 pr-4 font-semibold">Estoque</th>
                  <th className="py-2 pr-4 font-semibold">Mínimo</th>
                  <th className="py-2 pr-4 font-semibold">Status</th>
                </tr>
              </thead>
              <tbody>
                {alertas.map((produto) => (
                  <tr key={produto.id} className="border-b border-slate-100">
                    <td className="py-3 pr-4 font-medium text-slate-800">{produto.nome}</td>
                    <td className="py-3 pr-4 text-slate-600">
                      {produto.estoque_categorias?.nome || "—"}
                    </td>
                    <td className="py-3 pr-4 text-slate-600">
                      {produto.estoque_localizacoes?.nome || "—"}
                    </td>
                    <td className="py-3 pr-4 text-slate-600">{produto.estoque_atual ?? 0}</td>
                    <td className="py-3 pr-4 text-slate-600">{produto.estoque_minimo ?? 0}</td>
                    <td className="py-3 pr-4">
                      <span
                        className={`inline-flex rounded-full border px-2 py-1 text-[10px] font-bold uppercase ${
                          produto.status === "ESTOQUE ZERADO"
                            ? "border-red-200 bg-red-100 text-red-700"
                            : "border-yellow-200 bg-yellow-100 text-yellow-700"
                        }`}
                      >
                        {produto.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="rounded-xl border border-dashed border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800">
        <div className="flex items-center gap-2 font-semibold">
          <CheckCircle2 className="h-4 w-4" />
          Ações recomendadas
        </div>
        <ul className="mt-2 list-disc space-y-1 pl-5">
          <li>Revisar compras prioritárias para itens abaixo do mínimo.</li>
          <li>Confirmar se o local de armazenamento está correto.</li>
          <li>Validar a necessidade de saída imediata ou ajuste de estoque.</li>
        </ul>
      </div>
    </div>
  );
}
