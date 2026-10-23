import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { estoqueDb as supabase } from "@/lib/estoque-db";

export const Route = createFileRoute("/_authenticated/estoque/entradas")({
  component: EstoqueEntradasPage,
});

type Produto = {
  id: string;
  nome: string;
  estoque_atual?: number | null;
  unidade?: string | null;
};
type Fornecedor = { id: string; razao_social?: string | null; nome_fantasia?: string | null };

const ITEM_VAZIO = {
  produto_id: "",
  quantidade: "1",
  unidade: "UN",
};

export default function EstoqueEntradasPage() {
  const [produtos, setProdutos] = useState<Produto[]>([]);
  const [fornecedores, setFornecedores] = useState<Fornecedor[]>([]);
  const [saving, setSaving] = useState(false);
  const [itens, setItens] = useState([ITEM_VAZIO]);
  const [form, setForm] = useState({
    data: new Date().toISOString().slice(0, 10),
    fornecedor_id: "",
    numero_nf: "",
  });

  async function loadData() {
    try {
      const [produtosRes, fornecedoresRes] = await Promise.all([
        supabase.from("estoque_produtos").select("*").order("nome", { ascending: true }),
        supabase
          .from("estoque_fornecedores")
          .select("*")
          .order("razao_social", { ascending: true }),
      ]);

      if (produtosRes.error) throw produtosRes.error;
      if (fornecedoresRes.error) throw fornecedoresRes.error;

      setProdutos((produtosRes.data || []) as Produto[]);
      setFornecedores((fornecedoresRes.data || []) as Fornecedor[]);
    } catch (error) {
      console.error("Erro ao carregar dados de entrada:", error);
    }
  }

  useEffect(() => {
    void loadData();
  }, []);

  function updateItem(index: number, field: string, value: string) {
    const nextItens = [...itens];
    nextItens[index] = { ...nextItens[index], [field]: value };
    setItens(nextItens);
  }

  function addItemRow() {
    setItens([...itens, ITEM_VAZIO]);
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setSaving(true);

    try {
      const { data: entrada, error: entradaError } = await supabase
        .from("estoque_entradas")
        .insert([
          {
            data: form.data,
            fornecedor_id: form.fornecedor_id || null,
            numero_nf: form.numero_nf || null,
          },
        ])
        .select()
        .single();

      if (entradaError) throw entradaError;

      const itensPayload = itens
        .filter((item) => item.produto_id)
        .map((item) => ({
          entrada_id: entrada.id,
          produto_id: item.produto_id,
          quantidade: Number(item.quantidade || 0),
          unidade: item.unidade || "UN",
        }));

      if (itensPayload.length === 0) throw new Error("Informe ao menos um produto para a entrada.");

      const { error: itensError } = await supabase
        .from("estoque_entrada_itens")
        .insert(itensPayload);
      if (itensError) throw itensError;

      for (const item of itensPayload) {
        const produto = produtos.find((p) => p.id === item.produto_id);
        const estoqueAtual = Number(produto?.estoque_atual ?? 0);
        const novoEstoque = estoqueAtual + item.quantidade;

        await supabase
          .from("estoque_produtos")
          .update({
            estoque_atual: novoEstoque,
            ultima_compra: form.data,
          })
          .eq("id", item.produto_id);

        await supabase.from("estoque_movimentacoes").insert([
          {
            produto_id: item.produto_id,
            tipo: "ENTRADA",
            quantidade: item.quantidade,
            estoque_anterior: estoqueAtual,
            estoque_posterior: novoEstoque,
            documento: form.numero_nf || entrada.id,
            data_movimento: form.data,
          },
        ]);
      }

      setItens([ITEM_VAZIO]);
      setForm({
        data: new Date().toISOString().slice(0, 10),
        fornecedor_id: "",
        numero_nf: "",
      });
      toast.success("Entrada registrada.");
    } catch (error) {
      console.error("Erro ao registrar entrada:", error);
      toast.error("Não foi possível registrar a entrada.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <h2 className="mb-4 text-lg font-black text-slate-900">Entradas de estoque</h2>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid gap-3 md:grid-cols-3">
          <input
            type="date"
            value={form.data}
            onChange={(e) => setForm({ ...form, data: e.target.value })}
            className="rounded-md border border-slate-300 p-2 text-sm"
          />
          <select
            value={form.fornecedor_id}
            onChange={(e) => setForm({ ...form, fornecedor_id: e.target.value })}
            className="rounded-md border border-slate-300 p-2 text-sm"
          >
            <option value="">Fornecedor</option>
            {fornecedores.map((fornecedor) => (
              <option key={fornecedor.id} value={fornecedor.id}>
                {fornecedor.razao_social || fornecedor.nome_fantasia || "Fornecedor"}
              </option>
            ))}
          </select>
          <input
            value={form.numero_nf}
            onChange={(e) => setForm({ ...form, numero_nf: e.target.value })}
            placeholder="Número NF"
            className="rounded-md border border-slate-300 p-2 text-sm"
          />
        </div>

        <div className="space-y-3">
          {itens.map((item, index) => (
            <div
              key={index}
              className="grid gap-3 rounded-lg border border-slate-200 p-3 md:grid-cols-4"
            >
              <select
                value={item.produto_id}
                onChange={(e) => updateItem(index, "produto_id", e.target.value)}
                className="rounded-md border border-slate-300 p-2 text-sm md:col-span-2"
              >
                <option value="">Produto</option>
                {produtos.map((produto) => (
                  <option key={produto.id} value={produto.id}>
                    {produto.nome}
                  </option>
                ))}
              </select>

              <input
                type="number"
                min="0"
                step="0.01"
                value={item.quantidade}
                onChange={(e) => updateItem(index, "quantidade", e.target.value)}
                placeholder="Qtd"
                className="rounded-md border border-slate-300 p-2 text-sm"
              />
              <input
                value={item.unidade}
                onChange={(e) => updateItem(index, "unidade", e.target.value)}
                placeholder="UN"
                className="rounded-md border border-slate-300 p-2 text-sm"
              />
            </div>
          ))}
        </div>

        <div className="flex flex-wrap gap-3">
          <button
            type="button"
            onClick={addItemRow}
            className="rounded-md border border-slate-300 bg-slate-100 px-3 py-2 text-sm font-semibold text-slate-700"
          >
            Adicionar item
          </button>
          <button
            type="submit"
            disabled={saving}
            className="rounded-md bg-emerald-600 px-4 py-2 text-sm font-bold text-white hover:bg-emerald-700 disabled:bg-slate-300"
          >
            {saving ? "Registrando..." : "Confirmar entrada"}
          </button>
        </div>
      </form>
    </div>
  );
}
