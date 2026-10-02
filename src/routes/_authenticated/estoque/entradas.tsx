import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated/estoque/entradas")({
  component: EstoqueEntradasPage,
});

type Produto = {
  id: string;
  nome: string;
  estoque_atual?: number | null;
  unidade?: string | null;
  custo_medio?: number | null;
};
type Fornecedor = { id: string; razao_social?: string | null; nome_fantasia?: string | null };
type Localizacao = { id: string; nome: string };

export default function EstoqueEntradasPage() {
  const [produtos, setProdutos] = useState<Produto[]>([]);
  const [fornecedores, setFornecedores] = useState<Fornecedor[]>([]);
  const [localizacoes, setLocalizacoes] = useState<Localizacao[]>([]);
  const [saving, setSaving] = useState(false);
  const [itens, setItens] = useState([
    {
      produto_id: "",
      quantidade: "1",
      unidade: "UN",
      valor_unitario: "0",
      desconto: "0",
      localizacao_id: "",
    },
  ]);
  const [form, setForm] = useState({
    data: new Date().toISOString().slice(0, 10),
    fornecedor_id: "",
    numero_nf: "",
    serie: "",
    responsavel: "",
    observacao: "",
  });

  async function loadData() {
    try {
      const [produtosRes, fornecedoresRes, localizacoesRes] = await Promise.all([
        supabase.from("estoque_produtos").select("*").order("nome", { ascending: true }),
        supabase
          .from("estoque_fornecedores")
          .select("*")
          .order("razao_social", { ascending: true }),
        supabase.from("estoque_localizacoes").select("*").order("nome", { ascending: true }),
      ]);

      if (produtosRes.error) throw produtosRes.error;
      if (fornecedoresRes.error) throw fornecedoresRes.error;
      if (localizacoesRes.error) throw localizacoesRes.error;

      setProdutos((produtosRes.data || []) as Produto[]);
      setFornecedores((fornecedoresRes.data || []) as Fornecedor[]);
      setLocalizacoes((localizacoesRes.data || []) as Localizacao[]);
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
    setItens([
      ...itens,
      {
        produto_id: "",
        quantidade: "1",
        unidade: "UN",
        valor_unitario: "0",
        desconto: "0",
        localizacao_id: "",
      },
    ]);
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
            serie: form.serie || null,
            responsavel: form.responsavel || null,
            observacao: form.observacao || null,
          },
        ])
        .select()
        .single();

      if (entradaError) throw entradaError;

      const itensPayload = itens
        .filter((item) => item.produto_id)
        .map((item) => {
          const quantity = Number(item.quantidade || 0);
          const unitValue = Number(item.valor_unitario || 0);
          const discount = Number(item.desconto || 0);
          const total = quantity * unitValue - discount;
          return {
            entrada_id: entrada.id,
            produto_id: item.produto_id,
            quantidade: quantity,
            unidade: item.unidade || "UN",
            valor_unitario: unitValue,
            desconto: discount,
            valor_total: total,
            localizacao_id: item.localizacao_id || null,
          };
        });

      if (itensPayload.length === 0) throw new Error("Informe ao menos um produto para a entrada.");

      const { error: itensError } = await supabase
        .from("estoque_entrada_itens")
        .insert(itensPayload);
      if (itensError) throw itensError;

      for (const item of itensPayload) {
        const produto = produtos.find((p) => p.id === item.produto_id);
        const estoqueAtual = Number(produto?.estoque_atual ?? 0);
        const novoEstoque = estoqueAtual + item.quantidade;
        const custoMedio = Number(produto?.custo_medio ?? 0) || item.valor_unitario;

        await supabase
          .from("estoque_produtos")
          .update({
            estoque_atual: novoEstoque,
            custo_medio: custoMedio,
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
            valor_total: item.valor_total,
            documento: form.numero_nf || entrada.id,
            responsavel: form.responsavel || null,
            observacao: form.observacao || null,
            data_movimento: form.data,
          },
        ]);
      }

      setItens([
        {
          produto_id: "",
          quantidade: "1",
          unidade: "UN",
          valor_unitario: "0",
          desconto: "0",
          localizacao_id: "",
        },
      ]);
      setForm({
        data: new Date().toISOString().slice(0, 10),
        fornecedor_id: "",
        numero_nf: "",
        serie: "",
        responsavel: "",
        observacao: "",
      });
    } catch (error) {
      console.error("Erro ao registrar entrada:", error);
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

        <div className="grid gap-3 md:grid-cols-2">
          <input
            value={form.serie}
            onChange={(e) => setForm({ ...form, serie: e.target.value })}
            placeholder="Série"
            className="rounded-md border border-slate-300 p-2 text-sm"
          />
          <input
            value={form.responsavel}
            onChange={(e) => setForm({ ...form, responsavel: e.target.value })}
            placeholder="Responsável"
            className="rounded-md border border-slate-300 p-2 text-sm"
          />
        </div>

        <textarea
          value={form.observacao}
          onChange={(e) => setForm({ ...form, observacao: e.target.value })}
          placeholder="Observação"
          className="min-h-20 w-full rounded-md border border-slate-300 p-2 text-sm"
        />

        <div className="space-y-3">
          {itens.map((item, index) => (
            <div
              key={index}
              className="grid gap-3 rounded-lg border border-slate-200 p-3 md:grid-cols-6"
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
              <input
                type="number"
                min="0"
                step="0.01"
                value={item.valor_unitario}
                onChange={(e) => updateItem(index, "valor_unitario", e.target.value)}
                placeholder="Valor unit."
                className="rounded-md border border-slate-300 p-2 text-sm"
              />
              <input
                type="number"
                min="0"
                step="0.01"
                value={item.desconto}
                onChange={(e) => updateItem(index, "desconto", e.target.value)}
                placeholder="Desconto"
                className="rounded-md border border-slate-300 p-2 text-sm"
              />

              <select
                value={item.localizacao_id}
                onChange={(e) => updateItem(index, "localizacao_id", e.target.value)}
                className="rounded-md border border-slate-300 p-2 text-sm md:col-span-2"
              >
                <option value="">Localização</option>
                {localizacoes.map((local) => (
                  <option key={local.id} value={local.id}>
                    {local.nome}
                  </option>
                ))}
              </select>
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
