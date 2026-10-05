import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { CheckCircle2, PackageX, Plus } from "lucide-react";
import { estoqueDb as supabase } from "@/lib/estoque-db";
import { formatCurrency, getEstoqueStatus, getStatusMeta, estoqueUnidades } from "@/lib/estoque";

export const Route = createFileRoute("/_authenticated/estoque/produtos")({
  component: EstoqueProdutosPage,
});

type Produto = {
  id: string;
  codigo_interno?: string | null;
  codigo_fabricante?: string | null;
  nome: string;
  descricao?: string | null;
  categoria_id?: string | null;
  marca?: string | null;
  modelo?: string | null;
  unidade?: string | null;
  estoque_atual?: number | null;
  estoque_minimo?: number | null;
  estoque_maximo?: number | null;
  custo_medio?: number | null;
  ultima_compra?: string | null;
  localizacao_id?: string | null;
  fornecedor_principal_id?: string | null;
  ativo?: boolean | null;
  observacao?: string | null;
  status?: string | null;
  estoque_categorias?: { nome?: string | null } | null;
  estoque_localizacoes?: { nome?: string | null } | null;
  estoque_fornecedores?: { razao_social?: string | null } | null;
};

type Categoria = { id: string; nome: string; ativo?: boolean | null };
type Localizacao = { id: string; nome: string; ativo?: boolean | null };
type Fornecedor = { id: string; razao_social?: string | null; nome_fantasia?: string | null };

export default function EstoqueProdutosPage() {
  const [produtos, setProdutos] = useState<Produto[]>([]);
  const [categorias, setCategorias] = useState<Categoria[]>([]);
  const [localizacoes, setLocalizacoes] = useState<Localizacao[]>([]);
  const [fornecedores, setFornecedores] = useState<Fornecedor[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [filtro, setFiltro] = useState("");
  const [form, setForm] = useState({
    codigo_interno: "",
    codigo_fabricante: "",
    nome: "",
    descricao: "",
    categoria_id: "",
    marca: "",
    modelo: "",
    unidade: "UN",
    estoque_atual: "0",
    estoque_minimo: "0",
    estoque_maximo: "0",
    custo_medio: "0",
    ultima_compra: "",
    localizacao_id: "",
    fornecedor_principal_id: "",
    ativo: true,
    observacao: "",
  });

  async function loadData() {
    try {
      setLoading(true);
      const [produtosRes, categoriasRes, localizacoesRes, fornecedoresRes] = await Promise.all([
        supabase
          .from("estoque_produtos")
          .select(
            "*, estoque_categorias(nome), estoque_localizacoes(nome), estoque_fornecedores(razao_social)",
          )
          .order("nome", { ascending: true }),
        supabase.from("estoque_categorias").select("*").order("nome", { ascending: true }),
        supabase.from("estoque_localizacoes").select("*").order("nome", { ascending: true }),
        supabase
          .from("estoque_fornecedores")
          .select("*")
          .order("razao_social", { ascending: true }),
      ]);

      if (produtosRes.error) throw produtosRes.error;
      if (categoriasRes.error) throw categoriasRes.error;
      if (localizacoesRes.error) throw localizacoesRes.error;
      if (fornecedoresRes.error) throw fornecedoresRes.error;

      setProdutos((produtosRes.data || []) as Produto[]);
      setCategorias((categoriasRes.data || []) as Categoria[]);
      setLocalizacoes((localizacoesRes.data || []) as Localizacao[]);
      setFornecedores((fornecedoresRes.data || []) as Fornecedor[]);
    } catch (error) {
      console.error("Erro ao carregar produtos de estoque:", error);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadData();
  }, []);

  const filteredProdutos = useMemo(() => {
    const termo = filtro.trim().toLowerCase();
    if (!termo) return produtos;
    return produtos.filter((item) => {
      const search =
        `${item.codigo_interno ?? ""} ${item.nome} ${item.marca ?? ""} ${item.modelo ?? ""} ${item.estoque_fornecedores?.razao_social ?? ""}`.toLowerCase();
      return search.includes(termo);
    });
  }, [filtro, produtos]);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setSaving(true);

    try {
      const payload = {
        codigo_interno: form.codigo_interno || null,
        codigo_fabricante: form.codigo_fabricante || null,
        nome: form.nome.trim(),
        descricao: form.descricao || null,
        categoria_id: form.categoria_id || null,
        marca: form.marca || null,
        modelo: form.modelo || null,
        unidade: form.unidade || "UN",
        estoque_atual: Number(form.estoque_atual || 0),
        estoque_minimo: Number(form.estoque_minimo || 0),
        estoque_maximo: Number(form.estoque_maximo || 0),
        custo_medio: Number(form.custo_medio || 0),
        ultima_compra: form.ultima_compra || null,
        localizacao_id: form.localizacao_id || null,
        fornecedor_principal_id: form.fornecedor_principal_id || null,
        ativo: form.ativo,
        observacao: form.observacao || null,
        status: getEstoqueStatus({
          estoque_atual: Number(form.estoque_atual || 0),
          estoque_minimo: Number(form.estoque_minimo || 0),
        }),
      };

      const { error } = await supabase.from("estoque_produtos").insert([payload]);
      if (error) throw error;

      setForm({
        codigo_interno: "",
        codigo_fabricante: "",
        nome: "",
        descricao: "",
        categoria_id: "",
        marca: "",
        modelo: "",
        unidade: "UN",
        estoque_atual: "0",
        estoque_minimo: "0",
        estoque_maximo: "0",
        custo_medio: "0",
        ultima_compra: "",
        localizacao_id: "",
        fornecedor_principal_id: "",
        ativo: true,
        observacao: "",
      });
      await loadData();
    } catch (error) {
      console.error("Erro ao salvar produto:", error);
    } finally {
      setSaving(false);
    }
  }

  async function toggleAtivo(produto: Produto) {
    try {
      const { error } = await supabase
        .from("estoque_produtos")
        .update({ ativo: !produto.ativo })
        .eq("id", produto.id);
      if (error) throw error;
      await loadData();
    } catch (error) {
      console.error("Erro ao atualizar status do produto:", error);
    }
  }

  return (
    <div className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
      <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-black text-slate-900">Produtos</h2>
          <input
            value={filtro}
            onChange={(e) => setFiltro(e.target.value)}
            placeholder="Pesquisar código, nome, marca..."
            className="w-64 rounded-md border border-slate-300 bg-white px-3 py-2 text-sm"
          />
        </div>

        {loading ? (
          <p className="text-sm text-slate-500">Carregando produtos...</p>
        ) : filteredProdutos.length === 0 ? (
          <div className="rounded-lg border border-dashed border-slate-300 bg-slate-50 p-6 text-sm text-slate-500">
            Nenhum produto encontrado.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-slate-600">
                  <th className="py-2 pr-4 font-semibold">Produto</th>
                  <th className="py-2 pr-4 font-semibold">Categoria</th>
                  <th className="py-2 pr-4 font-semibold">Estoque</th>
                  <th className="py-2 pr-4 font-semibold">Status</th>
                  <th className="py-2 font-semibold">Ativo</th>
                </tr>
              </thead>
              <tbody>
                {filteredProdutos.map((produto) => {
                  const status = getEstoqueStatus(produto);
                  return (
                    <tr key={produto.id} className="border-b border-slate-100 align-top">
                      <td className="py-3 pr-4">
                        <div className="font-bold text-slate-800">{produto.nome}</div>
                        <div className="text-xs text-slate-500">
                          {produto.codigo_interno || produto.codigo_fabricante || "Sem código"}
                        </div>
                      </td>
                      <td className="py-3 pr-4 text-slate-600">
                        {produto.estoque_categorias?.nome || "—"}
                      </td>
                      <td className="py-3 pr-4 text-slate-600">
                        {produto.estoque_atual ?? 0} {produto.unidade || "UN"}
                      </td>
                      <td className="py-3 pr-4">
                        <span
                          className={`inline-flex rounded-full border px-2 py-1 text-[10px] font-bold uppercase ${getStatusMeta(status).className}`}
                        >
                          {status}
                        </span>
                      </td>
                      <td className="py-3">
                        <button
                          type="button"
                          onClick={() => toggleAtivo(produto)}
                          className={`inline-flex items-center gap-1 rounded-full px-2 py-1 text-[10px] font-bold uppercase ${produto.ativo === false ? "bg-slate-100 text-slate-600" : "bg-emerald-100 text-emerald-700"}`}
                        >
                          {produto.ativo === false ? (
                            <PackageX className="h-3 w-3" />
                          ) : (
                            <CheckCircle2 className="h-3 w-3" />
                          )}
                          {produto.ativo === false ? "Inativo" : "Ativo"}
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <form
        onSubmit={handleSubmit}
        className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm"
      >
        <div className="mb-4 flex items-center gap-2">
          <Plus className="h-5 w-5 text-sky-700" />
          <h2 className="text-lg font-black text-slate-900">Novo produto</h2>
        </div>

        <div className="grid gap-3">
          <input
            value={form.codigo_interno}
            onChange={(e) => setForm({ ...form, codigo_interno: e.target.value })}
            placeholder="Código interno"
            className="rounded-md border border-slate-300 p-2 text-sm"
          />
          <input
            value={form.codigo_fabricante}
            onChange={(e) => setForm({ ...form, codigo_fabricante: e.target.value })}
            placeholder="Código fabricante"
            className="rounded-md border border-slate-300 p-2 text-sm"
          />
          <input
            value={form.nome}
            onChange={(e) => setForm({ ...form, nome: e.target.value })}
            placeholder="Nome do produto"
            required
            className="rounded-md border border-slate-300 p-2 text-sm"
          />
          <textarea
            value={form.descricao}
            onChange={(e) => setForm({ ...form, descricao: e.target.value })}
            placeholder="Descrição"
            className="min-h-20 rounded-md border border-slate-300 p-2 text-sm"
          />

          <div className="grid gap-3 md:grid-cols-2">
            <select
              value={form.categoria_id}
              onChange={(e) => setForm({ ...form, categoria_id: e.target.value })}
              className="rounded-md border border-slate-300 p-2 text-sm"
            >
              <option value="">Categoria</option>
              {categorias.map((categoria) => (
                <option key={categoria.id} value={categoria.id}>
                  {categoria.nome}
                </option>
              ))}
            </select>
            <select
              value={form.localizacao_id}
              onChange={(e) => setForm({ ...form, localizacao_id: e.target.value })}
              className="rounded-md border border-slate-300 p-2 text-sm"
            >
              <option value="">Localização</option>
              {localizacoes.map((local) => (
                <option key={local.id} value={local.id}>
                  {local.nome}
                </option>
              ))}
            </select>
          </div>

          <div className="grid gap-3 md:grid-cols-2">
            <input
              value={form.marca}
              onChange={(e) => setForm({ ...form, marca: e.target.value })}
              placeholder="Marca"
              className="rounded-md border border-slate-300 p-2 text-sm"
            />
            <input
              value={form.modelo}
              onChange={(e) => setForm({ ...form, modelo: e.target.value })}
              placeholder="Modelo"
              className="rounded-md border border-slate-300 p-2 text-sm"
            />
          </div>

          <div className="grid gap-3 md:grid-cols-2">
            <select
              value={form.unidade}
              onChange={(e) => setForm({ ...form, unidade: e.target.value })}
              className="rounded-md border border-slate-300 p-2 text-sm"
            >
              {estoqueUnidades.map((unit) => (
                <option key={unit} value={unit}>
                  {unit}
                </option>
              ))}
              <option value="OUTRA">Outra</option>
            </select>
            <select
              value={form.fornecedor_principal_id}
              onChange={(e) => setForm({ ...form, fornecedor_principal_id: e.target.value })}
              className="rounded-md border border-slate-300 p-2 text-sm"
            >
              <option value="">Fornecedor principal</option>
              {fornecedores.map((fornecedor) => (
                <option key={fornecedor.id} value={fornecedor.id}>
                  {fornecedor.razao_social || fornecedor.nome_fantasia || "Fornecedor"}
                </option>
              ))}
            </select>
          </div>

          <div className="grid gap-3 md:grid-cols-2">
            <input
              type="number"
              min="0"
              step="0.01"
              value={form.estoque_atual}
              onChange={(e) => setForm({ ...form, estoque_atual: e.target.value })}
              placeholder="Estoque atual"
              className="rounded-md border border-slate-300 p-2 text-sm"
            />
            <input
              type="number"
              min="0"
              step="0.01"
              value={form.estoque_minimo}
              onChange={(e) => setForm({ ...form, estoque_minimo: e.target.value })}
              placeholder="Estoque mínimo"
              className="rounded-md border border-slate-300 p-2 text-sm"
            />
            <input
              type="number"
              min="0"
              step="0.01"
              value={form.estoque_maximo}
              onChange={(e) => setForm({ ...form, estoque_maximo: e.target.value })}
              placeholder="Estoque máximo"
              className="rounded-md border border-slate-300 p-2 text-sm"
            />
            <input
              type="number"
              min="0"
              step="0.01"
              value={form.custo_medio}
              onChange={(e) => setForm({ ...form, custo_medio: e.target.value })}
              placeholder="Custo médio"
              className="rounded-md border border-slate-300 p-2 text-sm"
            />
          </div>

          <input
            type="date"
            value={form.ultima_compra}
            onChange={(e) => setForm({ ...form, ultima_compra: e.target.value })}
            className="rounded-md border border-slate-300 p-2 text-sm"
          />
          <textarea
            value={form.observacao}
            onChange={(e) => setForm({ ...form, observacao: e.target.value })}
            placeholder="Observação"
            className="min-h-20 rounded-md border border-slate-300 p-2 text-sm"
          />

          <label className="flex items-center gap-2 text-sm font-medium text-slate-700">
            <input
              type="checkbox"
              checked={form.ativo}
              onChange={(e) => setForm({ ...form, ativo: e.target.checked })}
            />
            Produto ativo
          </label>

          <button
            type="submit"
            disabled={saving || !form.nome.trim()}
            className="rounded-md bg-sky-600 px-4 py-2 text-sm font-bold text-white hover:bg-sky-700 disabled:cursor-not-allowed disabled:bg-slate-300"
          >
            {saving ? "Salvando..." : "Salvar produto"}
          </button>
        </div>
      </form>
    </div>
  );
}
