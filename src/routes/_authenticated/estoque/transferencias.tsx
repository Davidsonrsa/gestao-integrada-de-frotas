import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ArrowLeftRight, CheckCircle2, Package2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

type ProdutoTransferencia = {
  id: string;
  nome: string;
  estoque_atual?: number | null;
  ativo?: boolean | null;
};

type LocalizacaoTransferencia = {
  id: string;
  nome: string;
};

export const Route = createFileRoute("/_authenticated/estoque/transferencias")({
  component: EstoqueTransferenciasPage,
});

export default function EstoqueTransferenciasPage() {
  const [produtos, setProdutos] = useState<ProdutoTransferencia[]>([]);
  const [localizacoes, setLocalizacoes] = useState<LocalizacaoTransferencia[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({
    produto_id: "",
    origem_id: "",
    destino_id: "",
    quantidade: "1",
    responsavel: "",
    observacao: "",
  });

  useEffect(() => {
    async function loadData() {
      try {
        setLoading(true);
        const [
          { data: produtosData, error: produtosError },
          { data: localizacoesData, error: localizacoesError },
        ] = await Promise.all([
          supabase
            .from("estoque_produtos")
            .select("id, nome, estoque_atual, ativo")
            .order("nome", { ascending: true }),
          supabase
            .from("estoque_localizacoes")
            .select("id, nome")
            .order("nome", { ascending: true }),
        ]);

        if (produtosError) throw produtosError;
        if (localizacoesError) throw localizacoesError;

        setProdutos((produtosData || []) as ProdutoTransferencia[]);
        setLocalizacoes((localizacoesData || []) as LocalizacaoTransferencia[]);
      } catch (loadError) {
        console.error("Erro ao carregar dados de transferências:", loadError);
        setError("Não foi possível carregar as informações de produtos e locais.");
      } finally {
        setLoading(false);
      }
    }

    void loadData();
  }, []);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFeedback(null);
    setError(null);

    const quantidade = Number(form.quantidade || 0);

    if (!form.produto_id || !form.origem_id || !form.destino_id) {
      setError("Selecione produto, origem e destino.");
      return;
    }

    if (form.origem_id === form.destino_id) {
      setError("Origem e destino devem ser diferentes.");
      return;
    }

    if (quantidade <= 0) {
      setError("Informe uma quantidade maior que zero.");
      return;
    }

    const produtoAtual = produtos.find((produto) => produto.id === form.produto_id);
    const estoqueAtual = Number(produtoAtual?.estoque_atual ?? 0);

    if (estoqueAtual < quantidade) {
      setError("A quantidade transferida não pode ser maior que o saldo atual do produto.");
      return;
    }

    try {
      setSaving(true);

      const { error: insertError } = await supabase.from("estoque_transferencias").insert({
        produto_id: form.produto_id,
        origem_id: form.origem_id,
        destino_id: form.destino_id,
        quantidade,
        responsavel: form.responsavel || null,
        data: new Date().toISOString().slice(0, 10),
        observacao: form.observacao || null,
      });

      if (insertError) throw insertError;

      const { error: movimentacaoError } = await supabase.from("estoque_movimentacoes").insert({
        produto_id: form.produto_id,
        tipo: "TRANSFERENCIA",
        quantidade,
        estoque_anterior: estoqueAtual,
        estoque_posterior: estoqueAtual,
        responsavel: form.responsavel || null,
        documento: "TRANSFERENCIA",
        observacao: `Transferência de ${form.origem_id} para ${form.destino_id}`,
        data_movimento: new Date().toISOString().slice(0, 10),
      });

      if (movimentacaoError) throw movimentacaoError;

      setFeedback("Transferência registrada com sucesso.");
      setForm((prev) => ({ ...prev, quantidade: "1", responsavel: "", observacao: "" }));
    } catch (submitError) {
      console.error("Erro ao registrar transferência:", submitError);
      setError("Falha ao registrar transferência. Verifique os dados e tente novamente.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="mb-4 flex items-center gap-2">
          <div className="rounded-xl bg-sky-50 p-2 text-sky-700">
            <ArrowLeftRight className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-lg font-black text-slate-900">Transferências entre locais</h2>
            <p className="text-sm text-slate-500">
              Registre movimentações entre áreas, estoque e almoxarifado.
            </p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="grid gap-4 md:grid-cols-2">
          <label className="space-y-2 text-sm text-slate-700 md:col-span-1">
            <span className="font-semibold">Produto</span>
            <select
              value={form.produto_id}
              onChange={(event) => setForm((prev) => ({ ...prev, produto_id: event.target.value }))}
              className="w-full rounded-md border border-slate-300 bg-white p-2.5"
              disabled={loading}
            >
              <option value="">Selecione o produto</option>
              {produtos.map((produto) => (
                <option key={produto.id} value={produto.id}>
                  {produto.nome} ({produto.estoque_atual ?? 0})
                </option>
              ))}
            </select>
          </label>

          <label className="space-y-2 text-sm text-slate-700 md:col-span-1">
            <span className="font-semibold">Quantidade</span>
            <input
              type="number"
              min="1"
              step="1"
              value={form.quantidade}
              onChange={(event) => setForm((prev) => ({ ...prev, quantidade: event.target.value }))}
              className="w-full rounded-md border border-slate-300 bg-white p-2.5"
            />
          </label>

          <label className="space-y-2 text-sm text-slate-700">
            <span className="font-semibold">Origem</span>
            <select
              value={form.origem_id}
              onChange={(event) => setForm((prev) => ({ ...prev, origem_id: event.target.value }))}
              className="w-full rounded-md border border-slate-300 bg-white p-2.5"
            >
              <option value="">Selecione a origem</option>
              {localizacoes.map((local) => (
                <option key={local.id} value={local.id}>
                  {local.nome}
                </option>
              ))}
            </select>
          </label>

          <label className="space-y-2 text-sm text-slate-700">
            <span className="font-semibold">Destino</span>
            <select
              value={form.destino_id}
              onChange={(event) => setForm((prev) => ({ ...prev, destino_id: event.target.value }))}
              className="w-full rounded-md border border-slate-300 bg-white p-2.5"
            >
              <option value="">Selecione o destino</option>
              {localizacoes.map((local) => (
                <option key={local.id} value={local.id}>
                  {local.nome}
                </option>
              ))}
            </select>
          </label>

          <label className="space-y-2 text-sm text-slate-700 md:col-span-2">
            <span className="font-semibold">Responsável</span>
            <input
              value={form.responsavel}
              onChange={(event) =>
                setForm((prev) => ({ ...prev, responsavel: event.target.value }))
              }
              placeholder="Nome do responsável"
              className="w-full rounded-md border border-slate-300 bg-white p-2.5"
            />
          </label>

          <label className="space-y-2 text-sm text-slate-700 md:col-span-2">
            <span className="font-semibold">Observação</span>
            <textarea
              value={form.observacao}
              onChange={(event) => setForm((prev) => ({ ...prev, observacao: event.target.value }))}
              rows={3}
              placeholder="Detalhes da transferência"
              className="w-full rounded-md border border-slate-300 bg-white p-2.5"
            />
          </label>

          <div className="md:col-span-2 flex flex-wrap items-center gap-3">
            <button
              type="submit"
              disabled={saving || loading}
              className="rounded-md bg-sky-600 px-4 py-2 text-sm font-bold text-white transition hover:bg-sky-700 disabled:cursor-not-allowed disabled:bg-slate-300"
            >
              {saving ? "Registrando..." : "Registrar transferência"}
            </button>

            {feedback && (
              <span className="inline-flex items-center gap-2 rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-700">
                <CheckCircle2 className="h-3.5 w-3.5" />
                {feedback}
              </span>
            )}

            {error && (
              <span className="inline-flex items-center gap-2 rounded-full bg-red-100 px-3 py-1 text-xs font-semibold text-red-700">
                <Package2 className="h-3.5 w-3.5" />
                {error}
              </span>
            )}
          </div>
        </form>
      </div>
    </div>
  );
}
