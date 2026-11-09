import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { correspondeBusca } from "@/lib/busca";
import { useState, useEffect, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Search, Plus, Eye, Trash2, Loader2, Users } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/cotacoes/")({
  component: ListaCotacoesPage,
});

const brl = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

const formatarData = (dataStr?: string | null) => {
  if (!dataStr) return "—";
  const partes = dataStr.split("T")[0].split("-");
  if (partes.length === 3) {
    const [ano, mes, dia] = partes;
    return `${dia}/${mes}/${ano}`;
  }
  return dataStr;
};

const statusConfig = {
  aberto: { label: "Em Aberto", color: "bg-slate-100 text-slate-700 border-slate-200" },
  analise: { label: "Em Análise", color: "bg-amber-100 text-amber-700 border-amber-200" },
  aprovada: { label: "Aprovada", color: "bg-emerald-100 text-emerald-700 border-emerald-200" },
  recusada: { label: "Recusada", color: "bg-rose-100 text-rose-700 border-rose-200" },
} as const;

type StatusCotacao = keyof typeof statusConfig;

function normalizarStatus(status?: string | null): StatusCotacao {
  const statusNormalizado = String(status || "").toLowerCase();
  if (statusNormalizado === "rascunho") return "aberto";
  if (statusNormalizado === "finalizada") return "aprovada";
  return statusNormalizado in statusConfig ? (statusNormalizado as StatusCotacao) : "aberto";
}

interface Cotacao {
  id: string;
  numero: string;
  patrimonio?: string | null;
  setor?: string | null;
  data_cotacao?: string | null;
  status?: string | null;
  valor_total?: number | null;
}

export default function ListaCotacoesPage() {
  const navigate = useNavigate();
  const [cotacoes, setCotacoes] = useState<Cotacao[]>([]);
  const [loading, setLoading] = useState(true);

  const [filtroNumero, setFiltroNumero] = useState("");
  const [filtroPatrimonio, setFiltroPatrimonio] = useState("");
  const [filtroSetor, setFiltroSetor] = useState("");
  const [filtroStatus, setFiltroStatus] = useState("TODOS");
  const [salvandoStatusId, setSalvandoStatusId] = useState<string | null>(null);

  const fetchCotacoes = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from("cotacoes")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      setCotacoes(data || []);
    } catch (error: unknown) {
      const err = error as Error;
      toast.error("Erro ao carregar cotações: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCotacoes();
  }, []);

  const cotacoesFiltradas = useMemo(() => {
    return cotacoes.filter((cot) => {
      const matchNumero = String(cot.numero).toLowerCase().includes(filtroNumero.toLowerCase());

      const matchPatrimonio = correspondeBusca(filtroPatrimonio, cot.patrimonio);

      const matchSetor = (cot.setor || "").toLowerCase().includes(filtroSetor.toLowerCase());

      const matchStatus =
        filtroStatus === "TODOS" || normalizarStatus(cot.status) === filtroStatus;

      return matchNumero && matchPatrimonio && matchSetor && matchStatus;
    });
  }, [cotacoes, filtroNumero, filtroPatrimonio, filtroSetor, filtroStatus]);

  async function handleDelete(id: string) {
    if (!confirm("Deseja realmente excluir esta cotação?")) return;
    try {
      const { error } = await supabase.from("cotacoes").delete().eq("id", id);
      if (error) throw error;
      toast.success("Cotação excluída com sucesso!");
      fetchCotacoes();
    } catch (error: unknown) {
      const err = error as Error;
      toast.error("Erro ao excluir: " + err.message);
    }
  }

  async function handleStatusChange(id: string, status: StatusCotacao) {
    const statusAnterior = cotacoes.find((cotacao) => cotacao.id === id)?.status;
    setSalvandoStatusId(id);
    setCotacoes((cotacoesAtuais) =>
      cotacoesAtuais.map((cotacao) =>
        cotacao.id === id ? { ...cotacao, status } : cotacao,
      ),
    );

    try {
      const { error } = await supabase.from("cotacoes").update({ status }).eq("id", id);
      if (error) throw error;
      toast.success("Status da cotação atualizado!");
    } catch (error: unknown) {
      setCotacoes((cotacoesAtuais) =>
        cotacoesAtuais.map((cotacao) =>
          cotacao.id === id ? { ...cotacao, status: statusAnterior } : cotacao,
        ),
      );
      const err = error as Error;
      toast.error("Erro ao atualizar status: " + err.message);
    } finally {
      setSalvandoStatusId(null);
    }
  }

  if (loading) {
    return (
      <div className="flex justify-center items-center h-96">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 max-w-7xl mx-auto space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Gerenciamento de Cotações</h1>
          <p className="text-sm text-slate-600">
            Acompanhe e registre cotações de peças e serviços da frota
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <Button
            variant="outline"
            onClick={() => navigate({ to: "/fornecedores" })}
            className="gap-2 border-slate-300 text-slate-700 hover:bg-slate-50"
          >
            <Users className="w-4 h-4" /> Consultar Fornecedores
          </Button>

          <Button
            onClick={() => navigate({ to: "/cotacoes/$id", params: { id: "nova" } })}
            className="bg-blue-600 hover:bg-blue-700 text-white gap-2"
          >
            <Plus className="w-4 h-4" /> Nova Cotação
          </Button>
        </div>
      </div>

      <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
        <div>
          <label className="text-xs font-semibold text-slate-600">Filtrar por Número</label>
          <div className="relative mt-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-2.5 top-3" />
            <Input
              placeholder="Ex: 0004"
              value={filtroNumero}
              onChange={(e) => setFiltroNumero(e.target.value)}
              className="pl-9"
            />
          </div>
        </div>

        <div>
          <label className="text-xs font-semibold text-slate-600">Patrimônio / Equipamento</label>
          <Input
            placeholder="Ex: RE50"
            value={filtroPatrimonio}
            onChange={(e) => setFiltroPatrimonio(e.target.value)}
            className="mt-1"
          />
        </div>

        <div>
          <label className="text-xs font-semibold text-slate-600">Setor</label>
          <Input
            placeholder="Ex: Manutenção"
            value={filtroSetor}
            onChange={(e) => setFiltroSetor(e.target.value)}
            className="mt-1"
          />
        </div>

        <div>
          <label className="text-xs font-semibold text-slate-600">Status</label>
          <select
            value={filtroStatus}
            onChange={(e) => setFiltroStatus(e.target.value)}
            className="w-full mt-1 border border-slate-300 rounded-md p-2 text-sm bg-white h-10"
          >
            <option value="TODOS">Todos</option>
            <option value="aberto">Em Aberto</option>
            <option value="analise">Em Análise</option>
            <option value="aprovada">Aprovada</option>
            <option value="recusada">Recusada</option>
          </select>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm border-collapse">
            <thead className="bg-slate-100 text-slate-700 text-xs uppercase">
              <tr>
                <th className="p-3 border-b">Número</th>
                <th className="p-3 border-b">Data</th>
                <th className="p-3 border-b">Patrimônio / Equipamento</th>
                <th className="p-3 border-b">Setor</th>
                <th className="p-3 border-b">Status</th>
                <th className="p-3 border-b">Total / Vencedor</th>
                <th className="p-3 border-b text-center">Ações</th>
              </tr>
            </thead>
            <tbody>
              {cotacoesFiltradas.length === 0 ? (
                <tr>
                  <td colSpan={7} className="p-6 text-center text-slate-500">
                    Nenhuma cotação encontrada com os filtros informados.
                  </td>
                </tr>
              ) : (
                cotacoesFiltradas.map((cot) => (
                  <tr key={cot.id} className="border-b border-slate-100 hover:bg-slate-50">
                    <td className="p-3 font-medium text-slate-800">{cot.numero}</td>
                    <td className="p-3 text-slate-600">{formatarData(cot.data_cotacao)}</td>
                    <td className="p-3 text-slate-800">{cot.patrimonio || "—"}</td>
                    <td className="p-3 text-slate-600">{cot.setor || "—"}</td>
                    <td className="p-3">
                      <select
                        value={normalizarStatus(cot.status)}
                        onChange={(e) =>
                          handleStatusChange(cot.id, e.target.value as StatusCotacao)
                        }
                        disabled={salvandoStatusId === cot.id}
                        title="Selecionar status da cotação"
                        className={`rounded border px-2 py-1 text-xs font-bold outline-none ${statusConfig[normalizarStatus(cot.status)].color}`}
                      >
                        <option value="aberto">Em Aberto</option>
                        <option value="analise">Em Análise</option>
                        <option value="aprovada">Aprovada</option>
                        <option value="recusada">Recusada</option>
                      </select>
                    </td>
                    <td className="p-3 font-semibold text-slate-800">
                      {cot.valor_total ? brl(cot.valor_total) : "R$ 0,00"}
                    </td>
                    <td className="p-3 text-center">
                      <div className="flex items-center justify-center gap-1">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => navigate({ to: `/cotacoes/${cot.id}` })}
                          className="h-8 px-2 text-blue-600 border-blue-200 hover:bg-blue-50"
                        >
                          <Eye className="w-3.5 h-3.5 mr-1" /> Detalhes
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => handleDelete(cot.id)}
                          className="h-8 w-8 text-red-600 hover:bg-red-50 hover:text-red-700"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
