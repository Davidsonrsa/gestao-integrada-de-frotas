import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { CheckCircle2, ImagePlus, PackageX, Plus } from "lucide-react";
import { toast } from "sonner";
import { estoqueDb as supabase } from "@/lib/estoque-db";
import { getEstoqueFotoUrls, uploadEstoqueFoto } from "@/lib/estoque-fotos";
import { getEstoqueStatus, getStatusMeta, estoqueUnidades } from "@/lib/estoque";

export const Route = createFileRoute("/_authenticated/estoque/produtos")({
  component: EstoqueProdutosPage,
});

type Produto = {
  id: string;
  codigo_interno?: string | null;
  codigo_fabricante?: string | null;
  nome: string;
  descricao?: string | null;
  marca?: string | null;
  unidade?: string | null;
  estoque_atual?: number | null;
  estoque_minimo?: number | null;
  ativo?: boolean | null;
  observacao?: string | null;
  foto_path?: string | null;
};

const FORM_VAZIO = {
  codigo_fabricante: "",
  nome: "",
  descricao: "",
  marca: "",
  unidade: "UN",
  estoque_atual: "0",
  observacao: "",
  ativo: true,
};

export default function EstoqueProdutosPage() {
  const [produtos, setProdutos] = useState<Produto[]>([]);
  const [fotoUrls, setFotoUrls] = useState<Map<string, string>>(new Map());
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [filtro, setFiltro] = useState("");
  const [form, setForm] = useState(FORM_VAZIO);
  const [fotoFile, setFotoFile] = useState<File | null>(null);
  const fotoInputRef = useRef<HTMLInputElement>(null);

  async function loadData() {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from("estoque_produtos")
        .select("*")
        .order("nome", { ascending: true });

      if (error) throw error;
      const lista = (data || []) as Produto[];
      setProdutos(lista);
      setFotoUrls(await getEstoqueFotoUrls(lista.map((p) => p.foto_path)));
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
        `${item.codigo_interno ?? ""} ${item.codigo_fabricante ?? ""} ${item.nome} ${item.marca ?? ""}`.toLowerCase();
      return search.includes(termo);
    });
  }, [filtro, produtos]);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setSaving(true);

    try {
      let fotoPath: string | null = null;
      if (fotoFile) {
        fotoPath = await uploadEstoqueFoto("produtos", fotoFile);
      }

      const payload = {
        codigo_fabricante: form.codigo_fabricante || null,
        nome: form.nome.trim(),
        descricao: form.descricao || null,
        marca: form.marca || null,
        unidade: form.unidade || "UN",
        estoque_atual: Number(form.estoque_atual || 0),
        observacao: form.observacao || null,
        ativo: form.ativo,
        foto_path: fotoPath,
        status: getEstoqueStatus({
          estoque_atual: Number(form.estoque_atual || 0),
          estoque_minimo: 0,
        }),
      };

      const { error } = await supabase.from("estoque_produtos").insert([payload]);
      if (error) throw error;

      setForm(FORM_VAZIO);
      setFotoFile(null);
      if (fotoInputRef.current) fotoInputRef.current.value = "";
      toast.success("Produto salvo.");
      await loadData();
    } catch (error) {
      console.error("Erro ao salvar produto:", error);
      toast.error("Não foi possível salvar o produto.");
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
                  <th className="py-2 pr-4 font-semibold">Foto</th>
                  <th className="py-2 pr-4 font-semibold">Produto</th>
                  <th className="py-2 pr-4 font-semibold">Estoque</th>
                  <th className="py-2 pr-4 font-semibold">Status</th>
                  <th className="py-2 font-semibold">Ativo</th>
                </tr>
              </thead>
              <tbody>
                {filteredProdutos.map((produto) => {
                  const status = getEstoqueStatus(produto);
                  const fotoUrl = produto.foto_path
                    ? fotoUrls.get(produto.foto_path)
                    : undefined;
                  return (
                    <tr key={produto.id} className="border-b border-slate-100 align-top">
                      <td className="py-3 pr-4">
                        {fotoUrl ? (
                          <img
                            src={fotoUrl}
                            alt={produto.nome}
                            className="h-12 w-12 rounded-md border border-slate-200 object-cover"
                          />
                        ) : (
                          <span className="text-xs text-slate-400">—</span>
                        )}
                      </td>
                      <td className="py-3 pr-4">
                        <div className="font-bold text-slate-800">{produto.nome}</div>
                        <div className="text-xs text-slate-500">
                          {produto.codigo_fabricante || produto.codigo_interno || "Sem código"}
                        </div>
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
            value={form.nome}
            onChange={(e) => setForm({ ...form, nome: e.target.value })}
            placeholder="Nome do produto"
            required
            className="rounded-md border border-slate-300 p-2 text-sm"
          />
          <input
            value={form.codigo_fabricante}
            onChange={(e) => setForm({ ...form, codigo_fabricante: e.target.value })}
            placeholder="Código fabricante"
            className="rounded-md border border-slate-300 p-2 text-sm"
          />
          <textarea
            value={form.descricao}
            onChange={(e) => setForm({ ...form, descricao: e.target.value })}
            placeholder="Descrição"
            className="min-h-20 rounded-md border border-slate-300 p-2 text-sm"
          />

          <div className="grid gap-3 md:grid-cols-2">
            <input
              value={form.marca}
              onChange={(e) => setForm({ ...form, marca: e.target.value })}
              placeholder="Marca"
              className="rounded-md border border-slate-300 p-2 text-sm"
            />
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
          </div>

          <input
            type="number"
            min="0"
            step="0.01"
            value={form.estoque_atual}
            onChange={(e) => setForm({ ...form, estoque_atual: e.target.value })}
            placeholder="Estoque atual"
            className="rounded-md border border-slate-300 p-2 text-sm"
          />

          <label className="flex cursor-pointer items-center gap-2 rounded-md border border-dashed border-slate-300 p-2 text-sm text-slate-600">
            <ImagePlus className="h-4 w-4 text-sky-700" />
            {fotoFile ? fotoFile.name : "Foto da peça (opcional)"}
            <input
              ref={fotoInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => setFotoFile(e.target.files?.[0] ?? null)}
            />
          </label>

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
