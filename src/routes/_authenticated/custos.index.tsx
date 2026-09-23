import { useState, useMemo, useEffect } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { DashboardFinanceiro } from "@/components/DashboardFinanceiro";
import { requireAdmin } from "@/lib/route-guards";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogClose,
} from "@/components/ui/dialog";
import {
  PlusCircle,
  Loader2,
  TrendingUp,
  TrendingDown,
  DollarSign,
  PieChart,
  Filter,
  Calendar,
  Trash2,
  Briefcase,
  Pencil,
  Settings,
  Power,
  Maximize2,
  Minimize2,
  X,
} from "lucide-react";

export const Route = createFileRoute("/_authenticated/custos/")({
  beforeLoad: requireAdmin,
  component: CustosPage,
});

export type TipoLancamento = string;

const CLASSIFICACOES_PADRAO = [
  "Receita",
  "Impostos",
  "Mão de Obra",
  "Encargos",
  "Despesas de Manutenção",
  "Despesas de Transporte",
  "Despesas Administrativas",
] as const;
const DESCRICAO_MEDICOES_PREFIXO = "Medições do período - ";

interface ClassificacaoFinanceira {
  id: string;
  nome: string;
}

export interface ContratoItem {
  id: string;
  nome: string;
  ativo: boolean;
}

export interface ItemFinanceiro {
  id: string;
  contrato: string;
  contrato_id?: string | null;
  tipo: TipoLancamento;
  descricao: string;
  valor: number;
  data: string;
}

interface MedicaoFinanceira {
  id: number;
  equipamento: string;
  contrato: string;
  contrato_id: string | null;
  data: string;
  valor_hora: number;
  manha_inicio: number | null;
  manha_final: number | null;
  tarde_inicio: number | null;
  tarde_final: number | null;
}

function CustosPage() {
  const [lancamentos, setLancamentos] = useState<ItemFinanceiro[]>([]);
    const [medicoes, setMedicoes] = useState<MedicaoFinanceira[]>([]);
  const [contratos, setContratos] = useState<ContratoItem[]>([]);
  const [classificacoes, setClassificacoes] = useState<ClassificacaoFinanceira[]>([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [contratoDialogAberto, setContratoDialogAberto] = useState(false);
  const [listaContratosAberta, setListaContratosAberta] = useState(false);
  const [dashboardExpandido, setDashboardExpandido] = useState(false);
  const [classificacaoDialogAberto, setClassificacaoDialogAberto] = useState(false);
  const [novaClassificacao, setNovaClassificacao] = useState("");

  // Form states (Custos)
  const [contratoSelecionado, setContratoSelecionado] = useState<string>("");
  const [novoContratoNome, setNovoContratoNome] = useState<string>("");
  const [isCriandoContrato, setIsCriandoContrato] = useState<boolean>(false);
  const [contratoEditando, setContratoEditando] = useState<ContratoItem | null>(null);
  const [novoNomeEditado, setNovoNomeEditado] = useState("");
  const [lancamentoEditando, setLancamentoEditando] = useState<ItemFinanceiro | null>(null);

  const [tipo, setTipo] = useState<TipoLancamento>("Despesas de Manutenção");
  const [description, setDescription] = useState("");
  const [value, setValue] = useState("");
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);

  // Filter states
  const [filtroContrato, setFiltroContrato] = useState<string>("");
  const [filtroDataInicial, setFiltroDataInicial] = useState<string>("");
  const [filtroDataFinal, setFiltroDataFinal] = useState<string>("");
  const [mostrarLancamentos, setMostrarLancamentos] = useState(true);

  const formatBRL = (val: number) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(val);
  };

  useEffect(() => {
    fetchContratos();
    fetchData();
    fetchClassificacoes();
    fetchMedicoes();
  }, []);

  async function fetchClassificacoes() {
    const { data, error } = await supabase
      .from("classificacoes_financeiras")
      .select("id, nome")
      .order("nome");
    if (error) {
      console.error("Erro ao carregar classificações financeiras:", error);
      return;
    }
    setClassificacoes(data ?? []);
  }

  const todasClassificacoes = useMemo(
    () => [
      ...CLASSIFICACOES_PADRAO,
      ...classificacoes.map((classificacao) => classificacao.nome),
    ].filter((nome, index, lista) => lista.indexOf(nome) === index),
    [classificacoes],
  );

  async function handleSalvarClassificacao(e: React.FormEvent) {
    e.preventDefault();
    const nome = novaClassificacao.trim();
    if (!nome || todasClassificacoes.some((item) => item.toLowerCase() === nome.toLowerCase())) {
      setMessage({ type: "error", text: "Informe uma classificação nova e válida." });
      return;
    }
    const { data, error } = await supabase
      .from("classificacoes_financeiras")
      .insert({ nome })
      .select("id, nome")
      .single();
    if (error || !data) {
      setMessage({ type: "error", text: "Não foi possível cadastrar a classificação." });
      return;
    }
    setClassificacoes((prev) => [...prev, data]);
    setTipo(nome);
    setNovaClassificacao("");
    setClassificacaoDialogAberto(false);
  }

  async function handleExcluirClassificacao(classificacao: ClassificacaoFinanceira) {
    if (!window.confirm(`Excluir a classificação "${classificacao.nome}"?`)) return;
    const { error } = await supabase
      .from("classificacoes_financeiras")
      .delete()
      .eq("id", classificacao.id);
    if (error) {
      setMessage({ type: "error", text: "Não foi possível excluir a classificação." });
      return;
    }
    setClassificacoes((prev) => prev.filter((item) => item.id !== classificacao.id));
    if (tipo === classificacao.nome) setTipo("Despesas de Manutenção");
  }

  async function fetchContratos() {
    try {
      const { data, error } = await supabase.from("contratos").select("*");
      if (error) throw error;
      if (data) {
          const lista: ContratoItem[] = data
          .map((c: any) => ({
            id: String(c.id),
            nome: String(c.nome_contrato || c.nome || c.descricao || c.cliente || "").trim(),
            ativo: c.ativo !== false,
          }))
          .filter((c) => c.nome !== "");

        setContratos(lista);
        const contratosAtivos = lista.filter((contrato) => contrato.ativo);
        if (contratosAtivos.length > 0) {
          if (!contratoSelecionado) setContratoSelecionado(contratosAtivos[0].nome);
        }
      }
    } catch (err) {
      console.error("Erro ao carregar contratos:", err);
    }
  }

  async function fetchData() {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("custos")
        .select("*")
        .order("data", { ascending: false });

      if (error) throw error;

      if (data) {
        const mappedData: ItemFinanceiro[] = data.map((item: any) => ({
          id: item.id?.toString() || crypto.randomUUID(),
          contrato: item.contrato || "",
          contrato_id: item.contrato_id ? String(item.contrato_id) : undefined,
          tipo: (item.categoria || item.tipo || "Despesas de Manutenção") as TipoLancamento,
          descricao: item.descricao || "",
          valor: Number(item.valor) || 0,
          data: item.data || new Date().toISOString().split("T")[0],
        }));
        setLancamentos(mappedData);
      }
    } catch (err) {
      console.error("Erro ao carregar lançamentos:", err);
    } finally {
      setLoading(false);
    }
  }

  async function fetchMedicoes() {
    const { data, error } = await supabase
      .from("medicoes_diarias")
      .select(
        "id, equipamento, contrato, contrato_id, data, valor_hora, manha_inicio, manha_final, tarde_inicio, tarde_final",
      );
    if (error) {
      console.error("Erro ao carregar medições para os custos:", error);
      return;
    }
    setMedicoes(
      Array.from(
        (data ?? []).reduce((unicos, item) => {
          const chave = `${item.contrato_id ?? item.contrato}|${item.data}|${item.equipamento}`;
          const anterior = unicos.get(chave);
          if (!anterior || Number(item.id) > Number(anterior.id)) unicos.set(chave, item);
          return unicos;
        }, new Map<string, any>()).values(),
      ).map((item) => ({
        id: item.id,
        equipamento: item.equipamento,
        contrato: item.contrato,
        contrato_id: item.contrato_id ? String(item.contrato_id) : null,
        data: item.data,
        valor_hora: Number(item.valor_hora) || 0,
        manha_inicio: item.manha_inicio,
        manha_final: item.manha_final,
        tarde_inicio: item.tarde_inicio,
        tarde_final: item.tarde_final,
      })),
    );
  }

  const totalMedicoesPeriodo = useMemo(() => {
    const contrato = contratos.find((item) => item.nome === filtroContrato);
    const contratoCasan = filtroContrato.toUpperCase().includes("CASAN");
    const mesReferencia = date.substring(0, 7);
    const dataInicialEfetiva = filtroDataInicial || `${mesReferencia}-01`;
    const dataFinalEfetiva =
      filtroDataFinal ||
      `${mesReferencia}-${String(new Date(Number(mesReferencia.substring(0, 4)), Number(mesReferencia.substring(5, 7)), 0).getDate()).padStart(2, "0")}`;
    const medicoesDoPeriodo = medicoes.filter((medicao) => {
      const mesmoContrato = contrato
        ? medicao.contrato_id === contrato.id ||
          medicao.contrato.trim().toLowerCase() === contrato.nome.trim().toLowerCase()
        : medicao.contrato.trim().toLowerCase() === filtroContrato.trim().toLowerCase();
      return (
        mesmoContrato &&
        medicao.data >= dataInicialEfetiva &&
        medicao.data <= dataFinalEfetiva
      );
    });

    if (contratoCasan) {
      const valoresMensaisPorEquipamento = new Map<string, number>();
      medicoesDoPeriodo.forEach((medicao) => {
        const mes = medicao.data.substring(0, 7);
        valoresMensaisPorEquipamento.set(
          `${mes}|${medicao.equipamento.trim().toLowerCase()}`,
          medicao.valor_hora,
        );
      });
      return Array.from(valoresMensaisPorEquipamento.values()).reduce(
        (total, valorMensal) => total + valorMensal,
        0,
      );
    }

    return medicoesDoPeriodo.reduce((total, medicao) => {
      const horasManha =
        medicao.manha_inicio != null && medicao.manha_final != null
          ? Math.max(0, medicao.manha_final - medicao.manha_inicio)
          : 0;
      const horasTarde =
        medicao.tarde_inicio != null && medicao.tarde_final != null
          ? Math.max(0, medicao.tarde_final - medicao.tarde_inicio)
          : 0;
      return total + (horasManha + horasTarde) * medicao.valor_hora;
    }, 0);
  }, [contratos, medicoes, filtroContrato, filtroDataInicial, filtroDataFinal, date]);

  const listaTodosContratos = useMemo(() => {
    const mapaContratos = new Map<string, ContratoItem>();
    contratos.forEach((c) => {
      if (c.nome && c.nome.trim()) {
        if (c.ativo) {
          mapaContratos.set(c.nome.trim().toLowerCase(), {
            id: c.id,
            nome: c.nome.trim(),
            ativo: true,
          });
        }
      }
    });
    lancamentos.forEach((l) => {
      if (l.contrato && l.contrato.trim()) {
        const chave = l.contrato.trim().toLowerCase();
        const contratoCadastrado = contratos.find(
          (contrato) => contrato.nome.trim().toLowerCase() === chave,
        );
        if (contratoCadastrado && !contratoCadastrado.ativo) return;
        if (!mapaContratos.has(chave)) {
          mapaContratos.set(chave, {
            id: l.contrato_id || `virtual-${l.contrato.trim()}`,
            nome: l.contrato.trim(),
            ativo: true,
          });
        }
      }
    });
    return Array.from(mapaContratos.values()).sort((a, b) => a.nome.localeCompare(b.nome));
  }, [contratos, lancamentos]);

  useEffect(() => {
    if (!filtroContrato && listaTodosContratos.length > 0) {
      setFiltroContrato(listaTodosContratos[0].nome);
    }
  }, [filtroContrato, listaTodosContratos]);

  async function handleSalvarContrato(e: React.FormEvent) {
    e.preventDefault();
    const nome = novoNomeEditado.trim();
    if (!nome) return;

    try {
      if (contratoEditando) {
        const { error } = await supabase
          .from("contratos")
          .update({ nome_contrato: nome })
          .eq("id", contratoEditando.id);
        if (error) throw error;
        await supabase.from("custos").update({ contrato: nome }).eq("contrato_id", contratoEditando.id);
        setContratos((prev) =>
          prev.map((contrato) =>
            contrato.id === contratoEditando.id ? { ...contrato, nome } : contrato,
          ),
        );
        setLancamentos((prev) =>
          prev.map((item) =>
            item.contrato_id === contratoEditando.id ? { ...item, contrato: nome } : item,
          ),
        );
        if (contratoSelecionado === contratoEditando.nome) setContratoSelecionado(nome);
        if (filtroContrato === contratoEditando.nome) setFiltroContrato(nome);
      } else {
        const { data, error } = await supabase
          .from("contratos")
          .insert([{ nome_contrato: nome }])
          .select()
          .single();
        if (error) throw error;
        const novoContrato = { id: String(data.id), nome, ativo: true };
        setContratos((prev) => [...prev, novoContrato]);
        setContratoSelecionado(nome);
      }
      setContratoDialogAberto(false);
      setContratoEditando(null);
      setNovoNomeEditado("");
    } catch (err) {
      console.error("Erro ao salvar contrato:", err);
      setMessage({ type: "error", text: "Não foi possível salvar o contrato." });
    }
  }

  async function handleDeletarContrato(contrato: ContratoItem) {
    if (!window.confirm(`Excluir o contrato "${contrato.nome}"?`)) return;
    try {
      const { error } = await supabase.from("contratos").delete().eq("id", contrato.id);
      if (error) throw error;
      setContratos((prev) => prev.filter((item) => item.id !== contrato.id));
      if (contratoSelecionado === contrato.nome) setContratoSelecionado("");
      if (filtroContrato === contrato.nome) {
        const proximoContrato = listaTodosContratos.find((item) => item.nome !== contrato.nome);
        setFiltroContrato(proximoContrato?.nome || "");
      }
    } catch (err) {
      console.error("Erro ao deletar contrato:", err);
      setMessage({ type: "error", text: "Não foi possível excluir o contrato." });
    }
  }

  async function handleAlternarContrato(contrato: ContratoItem) {
    const ativo = !contrato.ativo;
    const { error } = await supabase
      .from("contratos")
      .update({ ativo })
      .eq("id", contrato.id);
    if (error) {
      setMessage({ type: "error", text: "Não foi possível alterar o status do contrato." });
      return;
    }
    setContratos((prev) =>
      prev.map((item) => (item.id === contrato.id ? { ...item, ativo } : item)),
    );
    if (!ativo && filtroContrato === contrato.nome) {
      setFiltroContrato("");
      setContratoSelecionado("");
    }
  }

  async function handleSubmitCusto(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setMessage(null);

    const numValue = parseFloat(value);
    if (isNaN(numValue) || numValue <= 0) {
      setMessage({ type: "error", text: "Informe um valor numérico válido maior que zero." });
      setSubmitting(false);
      return;
    }

    let nomeContratoFinal = contratoSelecionado;
    if (isCriandoContrato && novoContratoNome.trim() !== "") {
      nomeContratoFinal = novoContratoNome.trim();
      try {
        const { data: newContract, error: contractErr } = await supabase
          .from("contratos")
          .insert([{ nome_contrato: nomeContratoFinal }])
          .select()
          .single();

        if (contractErr) throw contractErr;
        if (newContract) {
          setContratos((prev) => [
            ...prev,
            { id: String(newContract.id), nome: nomeContratoFinal, ativo: true },
          ]);
        }
      } catch (err) {
        console.warn("Erro ao salvar novo contrato:", err);
      }
    }

    const itemContratoObj = contratos.find((c) => c.nome === nomeContratoFinal);

    try {
      const { data, error } = await supabase
        .from("custos")
        .insert([
          {
            contrato: nomeContratoFinal,
            contrato_id: itemContratoObj?.id || null,
            categoria: tipo,
            descricao: description,
            valor: numValue,
            data: date,
          },
        ])
        .select()
        .single();

      if (error) throw error;

      const novoItem: ItemFinanceiro = {
        id: data?.id?.toString() || Date.now().toString(),
        contrato: nomeContratoFinal,
        contrato_id: itemContratoObj?.id,
        tipo,
        descricao: description,
        valor: numValue,
        data: date,
      };

      setLancamentos((prev) => [novoItem, ...prev]);
      setMessage({ type: "success", text: "Lançamento registrado com sucesso!" });
      setDescription("");
      setValue("");
      setNovoContratoNome("");
      setIsCriandoContrato(false);
    } catch (err) {
      console.error("Erro ao salvar lançamento:", err);
      setMessage({ type: "error", text: "Erro ao salvar lançamento." });
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDeletarCusto(id: string) {
    if (!window.confirm("Excluir este lançamento?")) return;
    try {
      const { error } = await supabase.from("custos").delete().eq("id", id);
      if (error) throw error;
      setLancamentos((prev) => prev.filter((item) => item.id !== id));
      setMessage({ type: "success", text: "Lançamento excluído com sucesso." });
    } catch (err) {
      console.error("Erro ao deletar registro:", err);
      setMessage({ type: "error", text: "Não foi possível excluir o lançamento." });
    }
  }

  async function handleAtualizarCusto(e: React.FormEvent) {
    e.preventDefault();
    if (!lancamentoEditando) return;

    const numValue = parseFloat(value);
    if (isNaN(numValue) || numValue <= 0) {
      setMessage({ type: "error", text: "Informe um valor numérico válido maior que zero." });
      return;
    }

    setSubmitting(true);
    try {
      const itemContratoObj = contratos.find((contrato) => contrato.nome === contratoSelecionado);
      const { error } = await supabase
        .from("custos")
        .update({
          contrato: contratoSelecionado,
          contrato_id: itemContratoObj?.id || null,
          categoria: tipo,
          descricao: description,
          valor: numValue,
          data: date,
        })
        .eq("id", lancamentoEditando.id);

      if (error) throw error;

      setLancamentos((prev) =>
        prev.map((item) =>
          item.id === lancamentoEditando.id
            ? {
                ...item,
                contrato: contratoSelecionado,
                contrato_id: itemContratoObj?.id,
                tipo,
                descricao: description,
                valor: numValue,
                data: date,
              }
            : item,
        ),
      );
      setLancamentoEditando(null);
      setMessage({ type: "success", text: "Lançamento atualizado com sucesso." });
    } catch (err) {
      console.error("Erro ao atualizar lançamento:", err);
      setMessage({ type: "error", text: "Não foi possível atualizar o lançamento." });
    } finally {
      setSubmitting(false);
    }
  }

  function abrirEdicaoLancamento(item: ItemFinanceiro) {
    setLancamentoEditando(item);
    setContratoSelecionado(item.contrato);
    setTipo(item.tipo);
    setDescription(item.descricao);
    setValue(String(item.valor));
    setDate(item.data);
  }

  const lancamentosFiltrados = useMemo(() => {
    return lancamentos.filter((item) => {
      const matchContrato =
        Boolean(filtroContrato) &&
        item.contrato.trim().toLowerCase() === filtroContrato.trim().toLowerCase();
      const matchDataInicial = !filtroDataInicial || item.data >= filtroDataInicial;
      const matchDataFinal = !filtroDataFinal || item.data <= filtroDataFinal;
      return matchContrato && matchDataInicial && matchDataFinal;
    });
  }, [lancamentos, filtroContrato, filtroDataInicial, filtroDataFinal]);

  const lancamentosFinanceiros = useMemo(
    () =>
      lancamentosFiltrados.filter(
        (item) => !item.descricao.startsWith(DESCRICAO_MEDICOES_PREFIXO),
      ),
    [lancamentosFiltrados],
  );

  const lancamentoMedicoesExportado = useMemo(
    () =>
      lancamentosFiltrados.find((item) =>
        item.descricao.startsWith(DESCRICAO_MEDICOES_PREFIXO),
      ),
    [lancamentosFiltrados],
  );

  async function exportarMedicoesParaCustos() {
    if (!filtroContrato || totalMedicoesPeriodo <= 0) return;
    const contrato = contratos.find((item) => item.nome === filtroContrato);
    const dataLancamento = filtroDataInicial || date;
    const payload = {
      contrato: filtroContrato,
      contrato_id: contrato?.id || null,
      categoria: "Receita",
      descricao: `${DESCRICAO_MEDICOES_PREFIXO}${filtroContrato}${filtroDataInicial || filtroDataFinal ? ` (${filtroDataInicial || "início"} a ${filtroDataFinal || "fim"})` : ""}`,
      valor: totalMedicoesPeriodo,
      data: dataLancamento,
    };
    const query = lancamentoMedicoesExportado
      ? supabase.from("custos").update(payload).eq("id", lancamentoMedicoesExportado.id)
      : supabase.from("custos").insert(payload).select().single();
    const { data, error } = await query;
    if (error) {
      setMessage({ type: "error", text: "Não foi possível exportar as medições para Custos." });
      return;
    }
    if (lancamentoMedicoesExportado) {
      setLancamentos((prev) =>
        prev.map((item) =>
          item.id === lancamentoMedicoesExportado.id ? { ...item, ...payload } : item,
        ),
      );
    } else if (data) {
      setLancamentos((prev) => [
        {
          id: String(data.id),
          contrato: payload.contrato,
          contrato_id: payload.contrato_id,
          tipo: "Receita",
          descricao: payload.descricao,
          valor: payload.valor,
          data: payload.data,
        },
        ...prev,
      ]);
    }
    setMessage({ type: "success", text: "Medições exportadas para os lançamentos financeiros." });
  }

  const resumos = useMemo(() => {
    let receita = 0,
      impostos = 0,
      maoDeObra = 0,
      encargos = 0,
      manutencao = 0,
      transporte = 0,
      administrativas = 0;
    lancamentosFinanceiros.forEach((item) => {
      switch (item.tipo) {
        case "Receita":
          receita += item.valor;
          break;
        case "Impostos":
          impostos += item.valor;
          break;
        case "Mão de Obra":
          maoDeObra += item.valor;
          break;
        case "Encargos":
          encargos += item.valor;
          break;
        case "Despesas de Manutenção":
          manutencao += item.valor;
          break;
        case "Despesas de Transporte":
          transporte += item.valor;
          break;
        case "Despesas Administrativas":
          administrativas += item.valor;
          break;
      }
    });
    const despesasTotais =
      impostos + maoDeObra + encargos + manutencao + transporte + administrativas;
    const receitaBruta = receita + totalMedicoesPeriodo;
    const resultadoFinal = receitaBruta - despesasTotais;
    const margemLucro = receitaBruta > 0 ? (resultadoFinal / receitaBruta) * 100 : 0;
    return {
      receita: receitaBruta,
      receitaLancamentos: receita,
      totalMedicoes: totalMedicoesPeriodo,
      impostos,
      maoDeObra,
      encargos,
      manutencao,
      transporte,
      administrativas,
      despesasTotais,
      resultadoFinal,
      margemLucro,
    };
  }, [lancamentosFinanceiros, totalMedicoesPeriodo, lancamentoMedicoesExportado]);

  return (
    <div className="p-4 md:p-6 max-w-7xl mx-auto space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Gestão Financeira e Medições</h1>
          <p className="text-sm text-muted-foreground">
            Acompanhamento de receitas, impostos, custos operacionais e medições diárias.
          </p>
        </div>

        <div className="flex items-center gap-3">
          {/* DASHBOARD MODAL */}
          <Dialog>
            <DialogTrigger asChild>
              <Button variant="outline" className="flex items-center gap-2">
                <PieChart className="w-4 h-4 text-primary" />
                Dashboard
              </Button>
            </DialogTrigger>
            <DialogContent
              className={`${dashboardExpandido ? "w-[calc(100vw-2rem)] max-w-none h-[calc(100vh-2rem)]" : "max-w-5xl max-h-[90vh]"} border-slate-800 text-slate-100 p-0 overflow-hidden shadow-2xl !bg-[#0f172a]`}
            >
              <div className="relative w-full h-full p-6 overflow-y-auto bg-[#0f172a]">
                <DialogHeader className="mb-4 flex flex-row items-center justify-between">
                  <DialogTitle className="text-slate-100">Painel de Desempenho Financeiro</DialogTitle>
                  <div className="flex items-center gap-1">
                    <Button
                      type="button"
                      size="icon"
                      variant="ghost"
                      className="text-slate-300 hover:bg-slate-700 hover:text-white"
                      title={dashboardExpandido ? "Reduzir dashboard" : "Expandir dashboard"}
                      onClick={() => setDashboardExpandido((expandido) => !expandido)}
                    >
                      {dashboardExpandido ? (
                        <Minimize2 className="h-4 w-4" />
                      ) : (
                        <Maximize2 className="h-4 w-4" />
                      )}
                    </Button>
                    <DialogClose asChild>
                      <Button
                        type="button"
                        size="icon"
                        variant="ghost"
                        className="text-slate-300 hover:bg-red-600 hover:text-white"
                        title="Fechar dashboard"
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </DialogClose>
                  </div>
                </DialogHeader>
                <DashboardFinanceiro lancamentos={lancamentosFiltrados} />
              </div>
            </DialogContent>
          </Dialog>
          <Dialog open={listaContratosAberta} onOpenChange={setListaContratosAberta}>
            <DialogTrigger asChild>
              <Button variant="outline" className="flex items-center gap-2">
                <Briefcase className="w-4 h-4 text-primary" />
                Contratos
              </Button>
            </DialogTrigger>
            <DialogContent className="bg-white text-slate-900 sm:max-w-2xl">
              <DialogHeader>
                <DialogTitle className="flex items-center justify-between gap-3">
                  <span>Contratos cadastrados</span>
                  <Button
                    type="button"
                    size="sm"
                    onClick={() => {
                      setContratoEditando(null);
                      setNovoNomeEditado("");
                      setContratoDialogAberto(true);
                    }}
                  >
                    <PlusCircle className="mr-2 h-4 w-4" /> Novo contrato
                  </Button>
                </DialogTitle>
              </DialogHeader>
              <div className="max-h-[60vh] space-y-2 overflow-y-auto">
                {contratos.length === 0 ? (
                  <p className="text-sm text-muted-foreground">Nenhum contrato cadastrado.</p>
                ) : (
                  contratos.map((contrato) => (
                    <div
                      key={contrato.id}
                      className="flex items-center justify-between gap-3 rounded-md border px-3 py-2"
                    >
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium">{contrato.nome}</p>
                        <span
                          className={`text-xs font-semibold ${contrato.ativo ? "text-emerald-600" : "text-slate-500"}`}
                        >
                          {contrato.ativo ? "Ativo" : "Inativo"}
                        </span>
                      </div>
                      <div className="flex shrink-0 items-center gap-1">
                        <Button
                          type="button"
                          size="icon"
                          variant="ghost"
                          title={contrato.ativo ? "Desativar contrato" : "Ativar contrato"}
                          onClick={() => void handleAlternarContrato(contrato)}
                        >
                          <Power
                            className={`h-4 w-4 ${contrato.ativo ? "text-emerald-600" : "text-slate-400"}`}
                          />
                        </Button>
                        <Button
                          type="button"
                          size="icon"
                          variant="ghost"
                          title={`Editar ${contrato.nome}`}
                          onClick={() => {
                            setContratoEditando(contrato);
                            setNovoNomeEditado(contrato.nome);
                            setContratoDialogAberto(true);
                          }}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          type="button"
                          size="icon"
                          variant="ghost"
                          className="text-rose-600 hover:bg-rose-50"
                          title={`Excluir ${contrato.nome}`}
                          onClick={() => void handleDeletarContrato(contrato)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <Card className="border-primary/30 bg-primary/5 shadow-sm">
        <CardContent className="flex flex-col gap-2 p-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-primary">
              Contrato de trabalho
            </p>
            <p className="text-sm text-muted-foreground">
              Selecione o contrato para consultar e lançar os custos financeiros.
            </p>
          </div>
          <select
            aria-label="Contrato de trabalho"
            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm font-medium shadow-sm sm:max-w-md"
            value={filtroContrato}
            onChange={(e) => {
              setFiltroContrato(e.target.value);
              setContratoSelecionado(e.target.value);
            }}
            disabled={listaTodosContratos.length === 0}
          >
            {listaTodosContratos.length === 0 ? (
              <option value="">Nenhum contrato cadastrado</option>
            ) : (
              listaTodosContratos.map((contrato) => (
                <option key={contrato.id} value={contrato.nome}>
                  {contrato.nome}
                </option>
              ))
            )}
          </select>
        </CardContent>
      </Card>

      {/* Filtros */}
      <Card className="bg-white border shadow-sm">
        <CardContent className="p-4 flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-2 text-sm font-medium">
            <Filter className="w-4 h-4 text-primary" />
            Filtros:
          </div>
          <div className="flex items-center gap-2 min-w-[180px]">
            <Label className="text-xs whitespace-nowrap">De:</Label>
            <input
              type="date"
              className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm"
              value={filtroDataInicial}
              onChange={(e) => setFiltroDataInicial(e.target.value)}
            />
          </div>
          <div className="flex items-center gap-2 min-w-[220px]">
            <Label className="text-xs whitespace-nowrap">Até:</Label>
            <input
              type="date"
              className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm"
              value={filtroDataFinal}
              min={filtroDataInicial || undefined}
              onChange={(e) => setFiltroDataFinal(e.target.value)}
            />
          </div>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => {
              setFiltroDataInicial("");
              setFiltroDataFinal("");
            }}
          >
            Limpar período
          </Button>
        </CardContent>
      </Card>

      <Card className="hidden bg-white border shadow-sm">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-lg flex items-center gap-2">
            <Briefcase className="w-5 h-5 text-primary" />
            Contratos
          </CardTitle>
          <Dialog
            open={contratoDialogAberto}
            onOpenChange={(aberto) => {
              setContratoDialogAberto(aberto);
              if (!aberto) {
                setContratoEditando(null);
                setNovoNomeEditado("");
              }
            }}
          >
            <DialogTrigger asChild>
              <Button
                size="sm"
                onClick={() => {
                  setContratoEditando(null);
                  setNovoNomeEditado("");
                }}
              >
                <PlusCircle className="mr-2 h-4 w-4" />
                Novo contrato
              </Button>
            </DialogTrigger>
            <DialogContent className="bg-white text-slate-900">
              <DialogHeader>
                <DialogTitle>{contratoEditando ? "Editar contrato" : "Novo contrato"}</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSalvarContrato} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="nome-contrato">Nome do contrato</Label>
                  <Input
                    id="nome-contrato"
                    value={novoNomeEditado}
                    onChange={(e) => setNovoNomeEditado(e.target.value)}
                    placeholder="Ex: Contrato Norte"
                    required
                  />
                </div>
                <div className="flex justify-end">
                  <Button type="submit">
                    <Settings className="mr-2 h-4 w-4" />
                    Salvar contrato
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </CardHeader>
        <CardContent className="space-y-2">
          {contratos.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nenhum contrato cadastrado.</p>
          ) : (
            contratos.map((contrato) => (
              <div
                key={contrato.id}
                className="flex items-center justify-between gap-3 rounded-md border px-3 py-2"
              >
                <span className="text-sm font-medium truncate">{contrato.nome}</span>
                <div className="flex items-center gap-1 shrink-0">
                  <Button
                    type="button"
                    size="icon"
                    variant="ghost"
                    title={`Editar ${contrato.nome}`}
                    onClick={() => {
                      setContratoEditando(contrato);
                      setNovoNomeEditado(contrato.nome);
                      setContratoDialogAberto(true);
                    }}
                  >
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button
                    type="button"
                    size="icon"
                    variant="ghost"
                    className="text-rose-600 hover:bg-rose-50"
                    title={`Excluir ${contrato.nome}`}
                    onClick={() => handleDeletarContrato(contrato)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))
          )}
        </CardContent>
      </Card>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="bg-white border-l-4 border-l-emerald-500 shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-semibold text-muted-foreground uppercase">
              Receita Bruta
            </CardTitle>
            <TrendingUp className="w-4 h-4 text-emerald-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-emerald-600">{formatBRL(resumos.receita)}</div>
            <p className="mt-1 text-xs text-muted-foreground">
              Inclui {formatBRL(resumos.totalMedicoes)} em medições
            </p>
            <Button
              type="button"
              size="sm"
              variant="outline"
              className="mt-2 h-8 text-xs"
              onClick={() => void exportarMedicoesParaCustos()}
              disabled={!filtroContrato || totalMedicoesPeriodo <= 0}
            >
              {lancamentoMedicoesExportado ? "Atualizar em Custos" : "Exportar medições"}
            </Button>
          </CardContent>
        </Card>

        <Card className="bg-white border-l-4 border-l-amber-500 shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-semibold text-muted-foreground uppercase">
              Impostos
            </CardTitle>
            <PieChart className="w-4 h-4 text-amber-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-amber-600">{formatBRL(resumos.impostos)}</div>
          </CardContent>
        </Card>

        <Card className="bg-white border-l-4 border-l-rose-500 shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-semibold text-muted-foreground uppercase">
              Custos / Despesas
            </CardTitle>
            <TrendingDown className="w-4 h-4 text-rose-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-rose-600">
              {formatBRL(resumos.despesasTotais - resumos.impostos)}
            </div>
          </CardContent>
        </Card>

        <Card
          className={`bg-white border-l-4 shadow-sm ${resumos.resultadoFinal >= 0 ? "border-l-blue-600" : "border-l-red-600"}`}
        >
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-semibold text-muted-foreground uppercase">
              Resultado Final
            </CardTitle>
            <DollarSign
              className={`w-4 h-4 ${resumos.resultadoFinal >= 0 ? "text-blue-600" : "text-red-600"}`}
            />
          </CardHeader>
          <CardContent>
            <div
              className={`text-2xl font-bold ${resumos.resultadoFinal >= 0 ? "text-blue-600" : "text-red-600"}`}
            >
              {formatBRL(resumos.resultadoFinal)}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Formulário de Custos Financeiros */}
      <Card className="bg-white shadow-sm">
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <PlusCircle className="w-5 h-5 text-primary" />
            Novo Lançamento Financeiro
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmitCusto} className="space-y-4">
            {message && (
              <div
                className={`p-3 rounded-md text-sm ${message.type === "success" ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"}`}
              >
                {message.text}
              </div>
            )}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="mes-lancamento">Mês do lançamento</Label>
                <Input
                  id="mes-lancamento"
                  type="month"
                  value={date.substring(0, 7)}
                  onChange={(e) => {
                    if (e.target.value) setDate(`${e.target.value}-01`);
                  }}
                  required
                />
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <Label htmlFor="tipo">Classificação Financeira</Label>
                  <Dialog
                    open={classificacaoDialogAberto}
                    onOpenChange={setClassificacaoDialogAberto}
                  >
                    <DialogTrigger asChild>
                      <Button type="button" variant="ghost" size="sm" className="h-7 px-2 text-xs">
                        <Settings className="mr-1 h-3.5 w-3.5" /> Gerenciar
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="bg-white text-slate-900 sm:max-w-md">
                      <DialogHeader>
                        <DialogTitle>Classificações financeiras</DialogTitle>
                      </DialogHeader>
                      <form onSubmit={handleSalvarClassificacao} className="flex gap-2">
                        <Input
                          value={novaClassificacao}
                          onChange={(e) => setNovaClassificacao(e.target.value)}
                          placeholder="Nova classificação"
                          required
                        />
                        <Button type="submit">Cadastrar</Button>
                      </form>
                      <div className="max-h-60 space-y-1 overflow-y-auto">
                        {CLASSIFICACOES_PADRAO.map((nome) => (
                          <div key={nome} className="rounded border px-3 py-2 text-sm text-slate-600">
                            {nome}
                          </div>
                        ))}
                        {classificacoes.map((classificacao) => (
                          <div
                            key={classificacao.id}
                            className="flex items-center justify-between rounded border px-3 py-2 text-sm"
                          >
                            <span>{classificacao.nome}</span>
                            <Button
                              type="button"
                              size="icon"
                              variant="ghost"
                              className="h-7 w-7 text-rose-600 hover:bg-rose-50"
                              title="Excluir classificação"
                              onClick={() => void handleExcluirClassificacao(classificacao)}
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        ))}
                      </div>
                    </DialogContent>
                  </Dialog>
                </div>
                <select
                  id="tipo"
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  value={tipo}
                  onChange={(e) => setTipo(e.target.value)}
                >
                  {todasClassificacoes.map((classificacao) => (
                    <option key={classificacao} value={classificacao}>
                      {classificacao}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="valor">Valor (R$)</Label>
                <Input
                  id="valor"
                  type="number"
                  step="0.01"
                  placeholder="0,00"
                  value={value}
                  onChange={(e) => setValue(e.target.value)}
                  required
                />
              </div>

              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="descricao">Descrição</Label>
                <Input
                  id="descricao"
                  type="text"
                  placeholder="Detalhes do lançamento"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="data">Data</Label>
                <Input
                  id="data"
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  required
                />
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <Button type="submit" disabled={submitting}>
                {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Salvar Lançamento
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <Card className="bg-white border shadow-sm">
        <CardHeader className="flex flex-row items-center justify-between gap-3">
          <CardTitle className="text-lg">Lançamentos do período</CardTitle>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setMostrarLancamentos((visivel) => !visivel)}
          >
            {mostrarLancamentos ? "Ocultar lançamentos" : "Visualizar lançamentos"}
          </Button>
        </CardHeader>
        {mostrarLancamentos && (
          <CardContent>
            {lancamentosFiltrados.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                Nenhum lançamento encontrado para este contrato e mês.
              </p>
            ) : (
              <div className="space-y-2">
                {lancamentosFiltrados.map((item) => (
                  <div
                    key={item.id}
                    className="flex flex-col gap-3 rounded-md border p-3 md:flex-row md:items-center md:justify-between"
                  >
                    <div className="min-w-0">
                      <p className="font-medium truncate">{item.descricao}</p>
                      <p className="text-xs text-muted-foreground">
                        {item.data} | {item.tipo}
                      </p>
                    </div>
                    <div className="flex items-center justify-between gap-3 shrink-0">
                      <span
                        className={`font-semibold ${item.tipo === "Receita" ? "text-emerald-600" : "text-rose-600"}`}
                      >
                        {item.tipo === "Receita" ? "+" : "-"} {formatBRL(item.valor)}
                      </span>
                      <div className="flex items-center gap-1">
                        <Button
                          type="button"
                          size="icon"
                          variant="ghost"
                          title="Editar lançamento"
                          onClick={() => abrirEdicaoLancamento(item)}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          type="button"
                          size="icon"
                          variant="ghost"
                          className="text-rose-600 hover:bg-rose-50"
                          title="Excluir lançamento"
                          onClick={() => handleDeletarCusto(item.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        )}
      </Card>

      <Dialog
        open={lancamentoEditando !== null}
        onOpenChange={(aberto) => {
          if (!aberto) setLancamentoEditando(null);
        }}
      >
        <DialogContent className="bg-white text-slate-900">
          <DialogHeader>
            <DialogTitle>Editar lançamento financeiro</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleAtualizarCusto} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="editar-contrato">Contrato</Label>
              <select
                id="editar-contrato"
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                value={contratoSelecionado}
                onChange={(e) => {
                  setContratoSelecionado(e.target.value);
                  setFiltroContrato(e.target.value);
                }}
                required
              >
                {listaTodosContratos.map((contrato) => (
                  <option key={contrato.id} value={contrato.nome}>
                    {contrato.nome}
                  </option>
                ))}
              </select>
            </div>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="editar-tipo">Classificação Financeira</Label>
                <select
                  id="editar-tipo"
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  value={tipo}
                  onChange={(e) => setTipo(e.target.value)}
                >
                  {todasClassificacoes.map((classificacao) => (
                    <option key={classificacao} value={classificacao}>
                      {classificacao}
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="editar-valor">Valor (R$)</Label>
                <Input
                  id="editar-valor"
                  type="number"
                  step="0.01"
                  value={value}
                  onChange={(e) => setValue(e.target.value)}
                  required
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="editar-descricao">Descrição</Label>
              <Input
                id="editar-descricao"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="editar-data">Data</Label>
              <Input
                id="editar-data"
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                required
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setLancamentoEditando(null)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={submitting}>
                {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Atualizar lançamento
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

    </div>
  );
}
