import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated/estoque/saidas")({
  component: EstoqueSaidasPage,
});

type Produto = {
  id: string;
  nome: string;
  estoque_atual?: number | null;
  unidade?: string | null;
  custo_medio?: number | null;
};
type Equipamento = { id: string; numero: string; identificacao?: string | null };

export default function EstoqueSaidasPage() {
  const [produtos, setProdutos] = useState<Produto[]>([]);
  const [equipamentos, setEquipamentos] = useState<Equipamento[]>([]);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    data: new Date().toISOString().slice(0, 10),
    produto_id: "",
    quantidade: "1",
    motivo: "Manutenção preventiva",
    responsavel: "",
    equipamento_id: "",
    horimetro: "",
    manutencao_relacionada: "",
    observacao: "",
  });

  async function loadData() {
    try {
      const [produtosRes, equipamentosRes] = await Promise.all([
        supabase.from("estoque_produtos").select("*").order("nome", { ascending: true }),
        supabase
          .from("equipamentos")
          .select("id, numero, identificacao")
          .order("numero", { ascending: true }),
      ]);

      if (produtosRes.error) throw produtosRes.error;
      if (equipamentosRes.error) throw equipamentosRes.error;

      setProdutos((produtosRes.data || []) as Produto[]);
      setEquipamentos((equipamentosRes.data || []) as Equipamento[]);
    } catch (error) {
      console.error("Erro ao carregar dados de saída:", error);
    }
  }

  useEffect(() => {
    void loadData();
  }, []);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setSaving(true);

    try {
      const produto = produtos.find((item) => item.id === form.produto_id);
      const quantidade = Number(form.quantidade || 0);
      const estoqueAtual = Number(produto?.estoque_atual ?? 0);

      if (!produto) throw new Error("Selecione um produto.");
      if (quantidade <= 0) throw new Error("Quantidade inválida.");
      if (quantidade > estoqueAtual) {
        throw new Error("ESTOQUE INSUFICIENTE");
      }

      const { data: saida, error: saidaError } = await supabase
        .from("estoque_saidas")
        .insert([
          {
            data: form.data,
            produto_id: form.produto_id,
            quantidade,
            motivo: form.motivo,
            responsavel: form.responsavel || null,
            equipamento_id: form.equipamento_id || null,
            horimetro: form.horimetro || null,
            manutencao_relacionada: form.manutencao_relacionada || null,
            observacao: form.observacao || null,
          },
        ])
        .select()
        .single();

      if (saidaError) throw saidaError;

      const novoEstoque = estoqueAtual - quantidade;
      await supabase
        .from("estoque_produtos")
        .update({ estoque_atual: novoEstoque })
        .eq("id", produto.id);

      await supabase.from("estoque_saida_itens").insert([
        {
          saida_id: saida.id,
          produto_id: produto.id,
          quantidade,
          unidade: produto.unidade || "UN",
          valor_unitario: produto.custo_medio ?? 0,
        },
      ]);

      await supabase.from("estoque_movimentacoes").insert([
        {
          produto_id: produto.id,
          tipo: "SAÍDA",
          quantidade,
          estoque_anterior: estoqueAtual,
          estoque_posterior: novoEstoque,
          valor_total: Number(produto.custo_medio ?? 0) * quantidade,
          equipamento_id: form.equipamento_id || null,
          responsavel: form.responsavel || null,
          documento: saida.id,
          observacao: form.observacao || null,
          data_movimento: form.data,
        },
      ]);

      setForm({
        data: new Date().toISOString().slice(0, 10),
        produto_id: "",
        quantidade: "1",
        motivo: "Manutenção preventiva",
        responsavel: "",
        equipamento_id: "",
        horimetro: "",
        manutencao_relacionada: "",
        observacao: "",
      });
    } catch (error) {
      console.error("Erro ao registrar saída:", error);
      alert(error instanceof Error ? error.message : "Erro ao registrar saída de estoque.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <h2 className="mb-4 text-lg font-black text-slate-900">Saídas de estoque</h2>

      <form onSubmit={handleSubmit} className="grid gap-4">
        <div className="grid gap-3 md:grid-cols-2">
          <input
            type="date"
            value={form.data}
            onChange={(e) => setForm({ ...form, data: e.target.value })}
            className="rounded-md border border-slate-300 p-2 text-sm"
          />
          <select
            value={form.produto_id}
            onChange={(e) => setForm({ ...form, produto_id: e.target.value })}
            className="rounded-md border border-slate-300 p-2 text-sm"
          >
            <option value="">Produto</option>
            {produtos.map((produto) => (
              <option key={produto.id} value={produto.id}>
                {produto.nome}
              </option>
            ))}
          </select>
        </div>

        <div className="grid gap-3 md:grid-cols-2">
          <input
            type="number"
            min="0"
            step="0.01"
            value={form.quantidade}
            onChange={(e) => setForm({ ...form, quantidade: e.target.value })}
            placeholder="Quantidade"
            className="rounded-md border border-slate-300 p-2 text-sm"
          />
          <select
            value={form.motivo}
            onChange={(e) => setForm({ ...form, motivo: e.target.value })}
            className="rounded-md border border-slate-300 p-2 text-sm"
          >
            <option>Manutenção preventiva</option>
            <option>Manutenção corretiva</option>
            <option>Consumo</option>
            <option>Transferência</option>
            <option>Perda</option>
            <option>Danificação</option>
            <option>Ajuste</option>
            <option>Outros</option>
          </select>
        </div>

        <div className="grid gap-3 md:grid-cols-2">
          <input
            value={form.responsavel}
            onChange={(e) => setForm({ ...form, responsavel: e.target.value })}
            placeholder="Responsável"
            className="rounded-md border border-slate-300 p-2 text-sm"
          />
          <select
            value={form.equipamento_id}
            onChange={(e) => setForm({ ...form, equipamento_id: e.target.value })}
            className="rounded-md border border-slate-300 p-2 text-sm"
          >
            <option value="">Equipamento</option>
            {equipamentos.map((equipamento) => (
              <option key={equipamento.id} value={equipamento.id}>
                {equipamento.nome || equipamento.identificacao || "Equipamento"}
              </option>
            ))}
          </select>
        </div>

        <div className="grid gap-3 md:grid-cols-2">
          <input
            value={form.horimetro}
            onChange={(e) => setForm({ ...form, horimetro: e.target.value })}
            placeholder="Horímetro"
            className="rounded-md border border-slate-300 p-2 text-sm"
          />
          <input
            value={form.manutencao_relacionada}
            onChange={(e) => setForm({ ...form, manutencao_relacionada: e.target.value })}
            placeholder="Manutenção relacionada"
            className="rounded-md border border-slate-300 p-2 text-sm"
          />
        </div>

        <textarea
          value={form.observacao}
          onChange={(e) => setForm({ ...form, observacao: e.target.value })}
          placeholder="Observação"
          className="min-h-20 rounded-md border border-slate-300 p-2 text-sm"
        />

        <button
          type="submit"
          disabled={saving}
          className="rounded-md bg-amber-600 px-4 py-2 text-sm font-bold text-white hover:bg-amber-700 disabled:bg-slate-300"
        >
          {saving ? "Processando..." : "Confirmar saída"}
        </button>
      </form>
    </div>
  );
}
