import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  ArrowDownToLine,
  ArrowUpFromLine,
  Boxes,
  PackageSearch,
} from "lucide-react";
import { estoqueDb as supabase } from "@/lib/estoque-db";
import { formatCurrency, getEstoqueStatus } from "@/lib/estoque";

export const Route = createFileRoute("/_authenticated/estoque/")({
  component: EstoqueDashboardPage,
});

type ProdutoResumo = {
  id: string;
  nome: string;
  categoria_id?: string | null;
  codigo_interno?: string | null;
  estoque_atual?: number | null;
  estoque_minimo?: number | null;
  estoque_maximo?: number | null;
  custo_medio?: number | null;
  ativo?: boolean | null;
  localizacao?: string | null;
  estoque_categorias?: { nome?: string | null } | null;
  estoque_localizacoes?: { nome?: string | null } | null;
};

type MovimentacaoResumo = {
  id: string;
  created_at?: string | null;
  tipo?: string | null;
  quantidade?: number | null;
  produto_id?: string | null;
  equipamento_id?: string | null;
  responsavel?: string | null;
  observacao?: string | null;
  estoque_produtos?: { nome?: string | null } | null;
  equipamentos?: { identificacao?: string | null } | null;
};

export default function EstoqueDashboardPage() {
  const [produtos, setProdutos] = useState<ProdutoResumo[]>([]);
  const [movimentacoes, setMovimentacoes] = useState<MovimentacaoResumo[]>([]);
  const [loading, setLoading] = useState(true);
  const [categoriaFiltro, setCategoriaFiltro] = useState("todos");
  const [produtoFiltro, setProdutoFiltro] = useState("todos");
  const [localizacaoFiltro, setLocalizacaoFiltro] = useState("todos");
  const [statusFiltro, setStatusFiltro] = useState("todos");

  useEffect(() => {
    async function loadDashboard() {
      try {
        setLoading(true);

        const [
          { data: produtosData, error: produtosError },
          { data: movimentacoesData, error: movimentacoesError },
        ] = await Promise.all([
          supabase
            .from("estoque_produtos")
            .select("*, estoque_categorias(nome), estoque_localizacoes(nome)")
            .order("nome", { ascending: true }),
          supabase
            .from("estoque_movimentacoes")
            .select("*, estoque_produtos(nome), equipamentos(identificacao)")
            .order("created_at", { ascending: false })
            .limit(8),
        ]);

        if (produtosError) throw produtosError;
        if (movimentacoesError) throw movimentacoesError;

        setProdutos((produtosData || []) as ProdutoResumo[]);
        setMovimentacoes((movimentacoesData || []) as MovimentacaoResumo[]);
      } catch (error) {
        console.error("Erro ao carregar dashboard de estoque:", error);
      } finally {
        setLoading(false);
      }
    }

    void loadDashboard();
  }, []);

  const categorias = useMemo(
    () =>
      Array.from(new Set(produtos.map((item) => item.estoque_categorias?.nome).filter(Boolean))),
    [produtos],
  );

  const localizacoes = useMemo(
    () =>
      Array.from(new Set(produtos.map((item) => item.estoque_localizacoes?.nome).filter(Boolean))),
    [produtos],
  );

  const filteredProdutos = useMemo(() => {
    return produtos.filter((item) => {
      const categoria = item.estoque_categorias?.nome || "";
      const localizacao = item.estoque_localizacoes?.nome || "";
      const status = getEstoqueStatus(item);

      return (
        (categoriaFiltro === "todos" || categoria === categoriaFiltro) &&
        (produtoFiltro === "todos" || item.nome === produtoFiltro) &&
        (localizacaoFiltro === "todos" || localizacao === localizacaoFiltro) &&
        (statusFiltro === "todos" || status === statusFiltro)
      );
    });
  }, [categoriaFiltro, localizacaoFiltro, produtoFiltro, produtos, statusFiltro]);

  const totalProdutos = filteredProdutos.length;
  const produtosAtivos = filteredProdutos.filter((item) => item.ativo !== false).length;
  const quantidadeTotal = filteredProdutos.reduce(
    (soma, item) => soma + Number(item.estoque_atual ?? 0),
    0,
  );
  const valorTotal = filteredProdutos.reduce(
    (soma, item) => soma + Number(item.estoque_atual ?? 0) * Number(item.custo_medio ?? 0),
    0,
  );
  const estoqueBaixo = filteredProdutos.filter(
    (item) => getEstoqueStatus(item) === "ESTOQUE BAIXO",
  ).length;
  const zerados = filteredProdutos.filter(
    (item) => getEstoqueStatus(item) === "ESTOQUE ZERADO",
  ).length;

  const ultimasMovimentacoes = movimentacoes.filter((item) => item.tipo);

  const cards = [
    { label: "Total de produtos", value: totalProdutos, icon: PackageSearch },
    { label: "Produtos ativos", value: produtosAtivos, icon: Boxes },
    { label: "Quantidade total", value: `${quantidadeTotal}`, icon: Boxes },
    { label: "Valor total", value: formatCurrency(valorTotal), icon: ArrowDownToLine },
    { label: "Baixo mínimo", value: estoqueBaixo, icon: AlertTriangle },
    { label: "Zerados", value: zerados, icon: ArrowUpFromLine },
  ];

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
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

      <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-black text-slate-900">Filtros</h2>
          <Link
            to="/estoque/produtos"
            className="text-sm font-semibold text-sky-700 hover:text-sky-800"
          >
            Ver produtos
          </Link>
        </div>

        <div className="grid gap-3 md:grid-cols-5">
          <select
            value={categoriaFiltro}
            onChange={(e) => setCategoriaFiltro(e.target.value)}
            className="rounded-md border border-slate-300 bg-white p-2 text-sm"
          >
            <option value="todos">Todas as categorias</option>
            {categorias.map((categoria) => (
              <option key={categoria ?? "sem-categoria"} value={categoria ?? ""}>
                {categoria}
              </option>
            ))}
          </select>

          <select
            value={produtoFiltro}
            onChange={(e) => setProdutoFiltro(e.target.value)}
            className="rounded-md border border-slate-300 bg-white p-2 text-sm"
          >
            <option value="todos">Todos os produtos</option>
            {produtos.map((item) => (
              <option key={item.id} value={item.nome}>
                {item.nome}
              </option>
            ))}
          </select>

          <select
            value={localizacaoFiltro}
            onChange={(e) => setLocalizacaoFiltro(e.target.value)}
            className="rounded-md border border-slate-300 bg-white p-2 text-sm"
          >
            <option value="todos">Todas as localizações</option>
            {localizacoes.map((local) => (
              <option key={local ?? "sem-localizacao"} value={local ?? ""}>
                {local}
              </option>
            ))}
          </select>

          <select
            value={statusFiltro}
            onChange={(e) => setStatusFiltro(e.target.value)}
            className="rounded-md border border-slate-300 bg-white p-2 text-sm"
          >
            <option value="todos">Todos os status</option>
            <option value="ESTOQUE NORMAL">Estoque normal</option>
            <option value="ESTOQUE BAIXO">Estoque baixo</option>
            <option value="ESTOQUE ZERADO">Zerados</option>
          </select>

          <button
            type="button"
            onClick={() => {
              setCategoriaFiltro("todos");
              setProdutoFiltro("todos");
              setLocalizacaoFiltro("todos");
              setStatusFiltro("todos");
            }}
            className="rounded-md border border-slate-300 bg-slate-100 px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-200"
          >
            Limpar
          </button>
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.4fr_1fr]">
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <h2 className="mb-4 text-lg font-black text-slate-900">Estoque abaixo do mínimo</h2>

          {loading ? (
            <p className="text-sm text-slate-500">Carregando...</p>
          ) : filteredProdutos.filter((item) => getEstoqueStatus(item) !== "ESTOQUE NORMAL")
              .length > 0 ? (
            <div className="overflow-x-auto">
              <table className="min-w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-slate-200 text-slate-600">
                    <th className="py-2 pr-4 font-semibold">Produto</th>
                    <th className="py-2 pr-4 font-semibold">Categoria</th>
                    <th className="py-2 pr-4 font-semibold">Atual</th>
                    <th className="py-2 pr-4 font-semibold">Mínimo</th>
                    <th className="py-2 font-semibold">Diferença</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredProdutos
                    .filter((item) => getEstoqueStatus(item) !== "ESTOQUE NORMAL")
                    .map((item) => {
                      const status = getEstoqueStatus(item);
                      const diferenca =
                        Number(item.estoque_minimo ?? 0) - Number(item.estoque_atual ?? 0);
                      return (
                        <tr key={item.id} className="border-b border-slate-100">
                          <td className="py-3 pr-4 font-medium text-slate-800">{item.nome}</td>
                          <td className="py-3 pr-4 text-slate-600">
                            {item.estoque_categorias?.nome || "—"}
                          </td>
                          <td className="py-3 pr-4 text-slate-600">{item.estoque_atual ?? 0}</td>
                          <td className="py-3 pr-4 text-slate-600">{item.estoque_minimo ?? 0}</td>
                          <td
                            className={`py-3 font-semibold ${status === "ESTOQUE ZERADO" ? "text-red-600" : "text-yellow-600"}`}
                          >
                            {diferenca}
                          </td>
                        </tr>
                      );
                    })}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="text-sm text-slate-500">
              Nenhum item com estoque abaixo do mínimo foi encontrado.
            </p>
          )}
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <h2 className="mb-4 text-lg font-black text-slate-900">Últimas movimentações</h2>

          {ultimasMovimentacoes.length === 0 ? (
            <p className="text-sm text-slate-500">Sem movimentações registradas.</p>
          ) : (
            <div className="space-y-3">
              {ultimasMovimentacoes.map((mov) => (
                <div key={mov.id} className="rounded-lg border border-slate-200 p-3">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-sm font-bold text-slate-800">
                      {mov.estoque_produtos?.nome || "Produto"}
                    </p>
                    <span className="rounded-lg bg-sky-50 px-2 py-1 text-[10px] font-bold uppercase tracking-wide text-sky-700">
                      {mov.tipo}
                    </span>
                  </div>
                  <div className="mt-2 grid grid-cols-2 gap-2 text-xs text-slate-500">
                    <span>Qtd: {mov.quantidade ?? 0}</span>
                    <span>Resp.: {mov.responsavel || "—"}</span>
                    <span>Equip.: {mov.equipamentos?.identificacao || "—"}</span>
                    <span>
                      {new Date(mov.created_at ?? Date.now()).toLocaleDateString("pt-BR")}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
