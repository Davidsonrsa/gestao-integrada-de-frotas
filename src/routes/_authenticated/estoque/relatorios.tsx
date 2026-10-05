import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  BarChart3,
  Boxes,
  CircleDollarSign,
  PackageCheck,
  TrendingDown,
  TrendingUp,
} from "lucide-react";
import { estoqueDb as supabase } from "@/lib/estoque-db";
import { formatCurrency, getEstoqueStatus } from "@/lib/estoque";

type ProdutoRelatorio = {
  id: string;
  nome: string;
  estoque_atual: number | null;
  estoque_minimo: number | null;
  estoque_maximo: number | null;
  custo_medio: number | null;
  ativo: boolean | null;
  estoque_categorias?: { nome?: string | null } | null;
};

type MovimentacaoRelatorio = {
  id: string;
  tipo?: string | null;
  quantidade?: number | null;
  data_movimento?: string | null;
  valor_total?: number | null;
};

export const Route = createFileRoute("/_authenticated/estoque/relatorios")({
  component: EstoqueRelatoriosPage,
});

export default function EstoqueRelatoriosPage() {
  const [produtos, setProdutos] = useState<ProdutoRelatorio[]>([]);
  const [movimentacoes, setMovimentacoes] = useState<MovimentacaoRelatorio[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadRelatorios() {
      try {
        setLoading(true);

        const [
          { data: produtosData, error: produtosError },
          { data: movimentacoesData, error: movimentacoesError },
        ] = await Promise.all([
          supabase
            .from("estoque_produtos")
            .select("*, estoque_categorias(nome)")
            .order("nome", { ascending: true }),
          supabase
            .from("estoque_movimentacoes")
            .select("id, tipo, quantidade, data_movimento, valor_total")
            .order("data_movimento", { ascending: false }),
        ]);

        if (produtosError) throw produtosError;
        if (movimentacoesError) throw movimentacoesError;

        setProdutos((produtosData || []) as ProdutoRelatorio[]);
        setMovimentacoes((movimentacoesData || []) as MovimentacaoRelatorio[]);
      } catch (error) {
        console.error("Erro ao carregar relatório de estoque:", error);
      } finally {
        setLoading(false);
      }
    }

    void loadRelatorios();
  }, []);

  const resumo = useMemo(() => {
    const totalProdutos = produtos.length;
    const produtosAtivos = produtos.filter((item) => item.ativo !== false).length;
    const unidadesEmEstoque = produtos.reduce(
      (soma, item) => soma + Number(item.estoque_atual ?? 0),
      0,
    );
    const valorEstoque = produtos.reduce(
      (soma, item) => soma + Number(item.estoque_atual ?? 0) * Number(item.custo_medio ?? 0),
      0,
    );
    const estoqueBaixo = produtos.filter(
      (item) => getEstoqueStatus(item) === "ESTOQUE BAIXO",
    ).length;
    const zerados = produtos.filter((item) => getEstoqueStatus(item) === "ESTOQUE ZERADO").length;

    const entradas = movimentacoes
      .filter((item) => item.tipo === "ENTRADA")
      .reduce((soma, item) => soma + Number(item.quantidade ?? 0), 0);
    const saidas = movimentacoes
      .filter((item) => item.tipo === "SAIDA")
      .reduce((soma, item) => soma + Number(item.quantidade ?? 0), 0);

    return {
      totalProdutos,
      produtosAtivos,
      unidadesEmEstoque,
      valorEstoque,
      estoqueBaixo,
      zerados,
      entradas,
      saidas,
    };
  }, [movimentacoes, produtos]);

  const categorias = useMemo(() => {
    const mapa = new Map<string, number>();

    produtos.forEach((produto) => {
      const nome = produto.estoque_categorias?.nome || "Sem categoria";
      mapa.set(nome, (mapa.get(nome) ?? 0) + Number(produto.estoque_atual ?? 0));
    });

    return Array.from(mapa.entries()).map(([nome, total]) => ({ nome, total }));
  }, [produtos]);

  const itensCriticos = useMemo(
    () =>
      produtos
        .filter((produto) => getEstoqueStatus(produto) !== "ESTOQUE NORMAL")
        .sort((a, b) => Number(b.estoque_atual ?? 0) - Number(a.estoque_atual ?? 0))
        .slice(0, 6),
    [produtos],
  );

  const cards = [
    { label: "Produtos ativos", value: resumo.produtosAtivos, icon: PackageCheck },
    { label: "Unidades em estoque", value: resumo.unidadesEmEstoque, icon: Boxes },
    {
      label: "Valor do estoque",
      value: formatCurrency(resumo.valorEstoque),
      icon: CircleDollarSign,
    },
    { label: "Itens críticos", value: resumo.estoqueBaixo + resumo.zerados, icon: AlertTriangle },
  ];

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {cards.map(({ label, value, icon: Icon }) => (
          <div key={label} className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                  {label}
                </p>
                <p className="mt-2 text-2xl font-black text-slate-900">{value}</p>
              </div>
              <div className="rounded-xl bg-sky-50 p-2 text-sky-700">
                <Icon className="h-5 w-5" />
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="mb-4 flex items-center gap-2">
            <BarChart3 className="h-4 w-4 text-sky-700" />
            <h2 className="text-lg font-black text-slate-900">Resumo por categoria</h2>
          </div>

          {loading ? (
            <p className="text-sm text-slate-500">Carregando...</p>
          ) : categorias.length === 0 ? (
            <p className="text-sm text-slate-500">Nenhuma categoria encontrada.</p>
          ) : (
            <div className="space-y-3">
              {categorias.map(({ nome, total }) => (
                <div key={nome}>
                  <div className="mb-1 flex items-center justify-between text-sm text-slate-600">
                    <span>{nome}</span>
                    <span className="font-semibold text-slate-800">{total}</span>
                  </div>
                  <div className="h-2 rounded-full bg-slate-200">
                    <div
                      className="h-2 rounded-full bg-sky-600"
                      style={{
                        width: `${Math.min((total / Math.max(resumo.unidadesEmEstoque || 1, 1)) * 100, 100)}%`,
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="mb-4 flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-emerald-700" />
            <h2 className="text-lg font-black text-slate-900">Movimentação</h2>
          </div>

          <div className="space-y-3">
            <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-3">
              <div className="flex items-center justify-between text-sm text-emerald-800">
                <span>Entradas</span>
                <strong>{resumo.entradas}</strong>
              </div>
            </div>
            <div className="rounded-lg border border-amber-200 bg-amber-50 p-3">
              <div className="flex items-center justify-between text-sm text-amber-800">
                <span>Saídas</span>
                <strong>{resumo.saidas}</strong>
              </div>
            </div>
            <div className="rounded-lg border border-red-200 bg-red-50 p-3">
              <div className="flex items-center justify-between text-sm text-red-800">
                <span>Baixos</span>
                <strong>{resumo.estoqueBaixo}</strong>
              </div>
            </div>
            <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
              <div className="flex items-center justify-between text-sm text-slate-700">
                <span>Zerados</span>
                <strong>{resumo.zerados}</strong>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="mb-4 flex items-center gap-2">
          <TrendingDown className="h-4 w-4 text-amber-700" />
          <h2 className="text-lg font-black text-slate-900">Itens prioritários</h2>
        </div>

        {itensCriticos.length === 0 ? (
          <p className="text-sm text-slate-500">Nenhum item com atenção necessária.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-slate-600">
                  <th className="py-2 pr-4 font-semibold">Produto</th>
                  <th className="py-2 pr-4 font-semibold">Categoria</th>
                  <th className="py-2 pr-4 font-semibold">Estoque atual</th>
                  <th className="py-2 pr-4 font-semibold">Mínimo</th>
                  <th className="py-2 font-semibold">Status</th>
                </tr>
              </thead>
              <tbody>
                {itensCriticos.map((produto) => {
                  const status = getEstoqueStatus(produto);

                  return (
                    <tr key={produto.id} className="border-b border-slate-100">
                      <td className="py-3 pr-4 font-medium text-slate-800">{produto.nome}</td>
                      <td className="py-3 pr-4 text-slate-600">
                        {produto.estoque_categorias?.nome || "Sem categoria"}
                      </td>
                      <td className="py-3 pr-4 text-slate-600">{produto.estoque_atual ?? 0}</td>
                      <td className="py-3 pr-4 text-slate-600">{produto.estoque_minimo ?? 0}</td>
                      <td className="py-3 pr-4">
                        <span
                          className={`inline-flex rounded-full border px-2 py-1 text-[10px] font-bold uppercase ${
                            status === "ESTOQUE ZERADO"
                              ? "border-red-200 bg-red-100 text-red-700"
                              : "border-yellow-200 bg-yellow-100 text-yellow-700"
                          }`}
                        >
                          {status}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
