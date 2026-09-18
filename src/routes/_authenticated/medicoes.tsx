import { useEffect, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Plus, Edit, Trash2, Save, Calendar, ArrowLeft, Clock, Printer } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { requireAdmin } from "@/lib/route-guards";
import { toast } from "sonner";
export const Route = createFileRoute("/_authenticated/medicoes")({
  beforeLoad: requireAdmin,
  component: MedicoesPage,
});

interface Contrato {
  id: string;
  numero: string;
  contratante: string;
  objeto: string;
}

interface MesAno {
  id: string;
  contratoId: string;
  nome: string;
  ano: number;
  mesIndex: number;
}

interface DiaMedicao {
  dia: number;
  dataStr: string;
  diaSemana: string;
  manhaInicio: string;
  manhaFim: string;
  tardeInicio: string;
  tardeFim: string;
  observacao: string;
}

interface MaquinaMedicao {
  id: string;
  mesId: string;
  codigo: string;
  tipo: string;
  operador: string;
  valorHora: number;
  dataAprovacao: string;
  assinaturaResponsavel: string;
  assinaturaContratante: string;
  dias: DiaMedicao[];
}

const MEDICOES_RASCUNHO_KEY = "gear-sync-medicoes-rascunho";
const MESES_RASCUNHO_KEY = "gear-sync-meses-rascunho";

function lerRascunho<T>(chave: string, valorPadrao: T): T {
  if (typeof window === "undefined") return valorPadrao;
  try {
    const salvo = window.localStorage.getItem(chave);
    return salvo ? (JSON.parse(salvo) as T) : valorPadrao;
  } catch {
    return valorPadrao;
  }
}

export function MedicoesPage() {
  const [visao, setVisao] = useState<"contratos" | "meses" | "maquina">("contratos");

  const [contratos, setContratos] = useState<Contrato[]>([]);

  const [meses, setMeses] = useState<MesAno[]>(() =>
    lerRascunho<MesAno[]>(MESES_RASCUNHO_KEY, []).filter(
      (mes) => mes.contratoId && mes.contratoId !== "1",
    ),
  );


  const gerarDiasDoMesEmBranco = (ano: number, mesIndex: number): DiaMedicao[] => {
    const quantidadeDias = new Date(ano, mesIndex + 1, 0).getDate();
    const diasSemanaNomes = [
      "domingo",
      "segunda-feira",
      "terça-feira",
      "quarta-feira",
      "quinta-feira",
      "sexta-feira",
      "sábado",
    ];
    const mesesCurtos = [
      "jan",
      "fev",
      "mar",
      "abr",
      "mai",
      "jun",
      "jul",
      "ago",
      "set",
      "out",
      "nov",
      "dez",
    ];

    return Array.from({ length: quantidadeDias }, (_, i) => {
      const diaNum = i + 1;
      const dataObj = new Date(ano, mesIndex, diaNum);
      const diaSemana = diasSemanaNomes[dataObj.getDay()];
      const dataStr = `${diaNum}-${mesesCurtos[mesIndex]}-${String(ano).slice(2)}`;

      return {
        dia: diaNum,
        dataStr,
        diaSemana,
        manhaInicio: "",
        manhaFim: "",
        tardeInicio: "",
        tardeFim: "",
        observacao: "",
      };
    });
  };

  const [maquinas, setMaquinas] = useState<MaquinaMedicao[]>([]);


  const [contratoSelecionado, setContratoSelecionado] = useState<Contrato | null>(null);
  const [mesSelecionado, setMesSelecionado] = useState<MesAno | null>(null);
  const [maquinaSelecionadaId, setMaquinaSelecionadaId] = useState<string | null>(null);
  const [mensagemSucesso, setMensagemSucesso] = useState("");

  const [modalContratoAberto, setModalContratoAberto] = useState(false);
  const [contratoEditando, setContratoEditando] = useState<Contrato | null>(null);
  const [formNumero, setFormNumero] = useState("");
  const [formContratante, setFormContratante] = useState("");
  const [formObjeto, setFormObjeto] = useState("");

  const [modalMaquinaAberto, setModalMaquinaAberto] = useState(false);
  const [maquinaEditando, setMaquinaEditando] = useState<MaquinaMedicao | null>(null);
  const [formCodigo, setFormCodigo] = useState("");
  const [formTipo, setFormTipo] = useState("");
  const [formOperador, setFormOperador] = useState("");
  const [formValorHora, setFormValorHora] = useState("193.62");
  const [rascunhoCarregado, setRascunhoCarregado] = useState(false);

  useEffect(() => {
    const rascunho = lerRascunho<MaquinaMedicao[] | null>(MEDICOES_RASCUNHO_KEY, null);
    if (rascunho) setMaquinas(rascunho);
    setRascunhoCarregado(true);
  }, []);

  useEffect(() => {
    if (!rascunhoCarregado) return;
    window.localStorage.setItem(MEDICOES_RASCUNHO_KEY, JSON.stringify(maquinas));
  }, [maquinas, rascunhoCarregado]);

  useEffect(() => {
    window.localStorage.setItem(MESES_RASCUNHO_KEY, JSON.stringify(meses));
  }, [meses]);

  useEffect(() => {
    async function carregarDados() {
      const { data: dadosContratos, error: erroContratos } = await supabase
        .from("contratos")
        .select("id, nome_contrato")
        .order("created_at");
      if (erroContratos) return console.error("Erro ao carregar contratos:", erroContratos);

      setContratos(
        (dadosContratos ?? []).map((item) => {
          try {
            const contrato = JSON.parse(item.nome_contrato) as Partial<Contrato>;
            if (contrato.numero && contrato.contratante) {
              return {
                id: String(item.id),
                numero: contrato.numero,
                contratante: contrato.contratante,
                objeto: contrato.objeto ?? "",
              };
            }
          } catch {
            // Mantém compatibilidade com contratos antigos em texto simples.
          }
          return {
            id: String(item.id),
            numero: item.nome_contrato,
            contratante: item.nome_contrato,
            objeto: "",
          };
        }),
      );

      const contratosCarregados = (dadosContratos ?? []).map((item) => {
        try {
          const contrato = JSON.parse(item.nome_contrato) as Partial<Contrato>;
          return {
            id: String(item.id),
            numero: contrato.numero ?? item.nome_contrato,
          };
        } catch {
          return { id: String(item.id), numero: item.nome_contrato };
        }
      });

      const { data: dadosMedicoes, error: erroMedicoes } = await supabase
        .from("medicoes_diarias")
        .select("*")
        .order("data");
      if (erroMedicoes) {
        console.error("Erro ao carregar medições:", erroMedicoes);
        return;
      }

      const nomesMeses = [
        "Janeiro",
        "Fevereiro",
        "Março",
        "Abril",
        "Maio",
        "Junho",
        "Julho",
        "Agosto",
        "Setembro",
        "Outubro",
        "Novembro",
        "Dezembro",
      ];
      const mesesCarregados = [...meses];

      const normalizar = (valor: string) => (valor ?? "").trim().toLowerCase();
      const primeiroToken = (valor: string) => normalizar(valor).split(/\s+/)[0] ?? "";

      const resolverContratoId = (item: { contrato: string; contrato_id: string | null }) => {
        if (item.contrato_id) {
          const porId = contratosCarregados.find(
            (contrato) => contrato.id === String(item.contrato_id),
          );
          if (porId) return porId.id;
        }
        const porNumero = contratosCarregados.find(
          (contrato) =>
            normalizar(contrato.numero) === normalizar(item.contrato) ||
            primeiroToken(contrato.numero) === primeiroToken(item.contrato),
        );
        return porNumero?.id ?? (item.contrato_id ? String(item.contrato_id) : null);
      };

      const temLancamento = (item: {
        manha_inicio: number | null;
        manha_final: number | null;
        tarde_inicio: number | null;
        tarde_final: number | null;
        observacao: string | null;
      }) =>
        item.manha_inicio != null ||
        item.manha_final != null ||
        item.tarde_inicio != null ||
        item.tarde_final != null ||
        Boolean(item.observacao);

      (dadosMedicoes ?? []).filter(temLancamento).forEach((item) => {
        const dataItem = new Date(`${item.data}T00:00:00`);
        const contratoId = resolverContratoId(item);
        if (!contratoId) return;
        const mesExiste = mesesCarregados.some(
          (itemMes) =>
            itemMes.ano === dataItem.getFullYear() &&
            itemMes.mesIndex === dataItem.getMonth() &&
            itemMes.contratoId === contratoId,
        );

        if (!mesExiste) {
          mesesCarregados.push({
            id: `db-${contratoId}-${dataItem.getFullYear()}-${dataItem.getMonth()}`,
            contratoId,
            nome: nomesMeses[dataItem.getMonth()],
            ano: dataItem.getFullYear(),
            mesIndex: dataItem.getMonth(),
          });
        }
      });

      if (mesesCarregados.length !== meses.length) setMeses(mesesCarregados);

      setMaquinas((atuais) => {
        const persistidas = new Map<string, MaquinaMedicao>();
        (dadosMedicoes ?? []).filter(temLancamento).forEach((item) => {
          const dataItem = new Date(`${item.data}T00:00:00`);
          const contratoId = resolverContratoId(item);
          if (!contratoId) return;
          const mes = mesesCarregados.find(
            (itemMes) =>
              itemMes.ano === dataItem.getFullYear() &&
              itemMes.mesIndex === dataItem.getMonth() &&
              itemMes.contratoId === contratoId,
          );

          const mesId = mes?.id;
          if (!mesId) return;

          const chave = `${contratoId}:${mesId}:${item.equipamento}:${item.operador}:${item.valor_hora}`;
          let maquina = persistidas.get(chave);
          if (!maquina) {
            const atual = atuais.find(
              (itemAtual) =>
                itemAtual.id === chave ||
                (itemAtual.mesId === mesId && itemAtual.codigo === item.equipamento),
            );
            maquina = atual ?? {
              id: chave,
              mesId,
              codigo: item.equipamento,
              tipo: item.equipamento,
              operador: item.operador,
              valorHora: item.valor_hora,
              dataAprovacao: "",
              assinaturaResponsavel: "",
              assinaturaContratante: "",
              dias: gerarDiasDoMesEmBranco(mes.ano, mes.mesIndex),
            };
            maquina = { ...maquina, dias: maquina.dias.map((dia) => ({ ...dia })) };
            persistidas.set(chave, maquina);
          }

          const dia = maquina.dias[dataItem.getDate() - 1];
          if (!dia) return;
          const formatarHora = (valor: number | null) =>
            valor == null
              ? ""
              : `${String(Math.floor(valor)).padStart(2, "0")}:${String(Math.round((valor % 1) * 60)).padStart(2, "0")}`;
          dia.manhaInicio = formatarHora(item.manha_inicio);
          dia.manhaFim = formatarHora(item.manha_final);
          dia.tardeInicio = formatarHora(item.tarde_inicio);
          dia.tardeFim = formatarHora(item.tarde_final);
          dia.observacao = item.observacao ?? "";
        });

        return [
          ...atuais.filter(
            (atual) => ![...persistidas.values()].some((item) => item.id === atual.id),
          ),
          ...persistidas.values(),
        ];
      });
    }
    void carregarDados();
  }, []);

  const handleSalvarContrato = async (e: React.FormEvent) => {
    e.preventDefault();
    const contrato = {
      numero: formNumero.trim(),
      contratante: formContratante.trim(),
      objeto: formObjeto.trim(),
    };
    const nomeContrato = JSON.stringify(contrato);
    if (contratoEditando) {
      const { error } = await supabase
        .from("contratos")
        .update({ nome_contrato: nomeContrato })
        .eq("id", contratoEditando.id);
      if (error) return console.error("Erro ao atualizar contrato:", error);
      setContratos(
        contratos.map((c) => (c.id === contratoEditando.id ? { ...c, ...contrato } : c)),
      );
    } else {
      const { data, error } = await supabase
        .from("contratos")
        .insert({ nome_contrato: nomeContrato })
        .select("id")
        .single();
      if (error || !data) return console.error("Erro ao inserir contrato:", error);
      setContratos([...contratos, { id: String(data.id), ...contrato }]);
    }
    setModalContratoAberto(false);
  };

  const handleSalvarMaquina = (e: React.FormEvent) => {
    e.preventDefault();
    if (!mesSelecionado) return;

    if (maquinaEditando) {
      setMaquinas(
        maquinas.map((m) =>
          m.id === maquinaEditando.id
            ? {
                ...m,
                codigo: formCodigo,
                tipo: formTipo,
                operador: formOperador,
                valorHora: Number(formValorHora),
              }
            : m,
        ),
      );
    } else {
      const novoId = String(Date.now());
      const nova: MaquinaMedicao = {
        id: novoId,
        mesId: mesSelecionado.id,
        codigo: formCodigo,
        tipo: formTipo,
        operador: formOperador || "Não informado",
        valorHora: Number(formValorHora) || 0,
        dataAprovacao: new Date().toISOString().split("T")[0],
        assinaturaResponsavel: "Responsável Técnico",
        assinaturaContratante: "Fiscal",
        dias: gerarDiasDoMesEmBranco(mesSelecionado.ano, mesSelecionado.mesIndex),
      };
      setMaquinas([...maquinas, nova]);
      setMaquinaSelecionadaId(novoId);
    }
    setModalMaquinaAberto(false);
  };

  const handleExcluirMaquina = async (maquina: MaquinaMedicao) => {
    if (!contratoSelecionado || !mesSelecionado) return;
    if (!confirm(`Deseja excluir o equipamento ${maquina.codigo}?`)) return;

    const dataInicial = `${mesSelecionado.ano}-${String(mesSelecionado.mesIndex + 1).padStart(2, "0")}-01`;
    const ultimoDia = new Date(mesSelecionado.ano, mesSelecionado.mesIndex + 1, 0).getDate();
    const dataFinal = `${mesSelecionado.ano}-${String(mesSelecionado.mesIndex + 1).padStart(2, "0")}-${String(ultimoDia).padStart(2, "0")}`;

    const { error } = await supabase
      .from("medicoes_diarias")
      .delete()
      .eq("contrato_id", contratoSelecionado.id)
      .eq("equipamento", maquina.codigo)
      .gte("data", dataInicial)
      .lte("data", dataFinal);

    if (error) {
      console.error("Erro ao excluir equipamento da medição:", error);
      setMensagemSucesso(`Não foi possível excluir: ${error.message}`);
      return;
    }

    setMaquinas((atuais) => atuais.filter((item) => item.id !== maquina.id));
    setMaquinaSelecionadaId(null);
    setMensagemSucesso("Equipamento excluído com sucesso!");
    setTimeout(() => setMensagemSucesso(""), 3000);
  };

  const calcularSubtotal = (inicio: string, fim: string) => {
    if (!inicio || !fim) return 0;
    const partesIn = inicio.split(":");
    const partesFim = fim.split(":");
    if (partesIn.length < 2 || partesFim.length < 2) return 0;

    const hIn = Number(partesIn[0]) || 0;
    const mIn = Number(partesIn[1]) || 0;
    const hFim = Number(partesFim[0]) || 0;
    const mFim = Number(partesFim[1]) || 0;

    const totalMin = hFim * 60 + mFim - (hIn * 60 + mIn);
    return totalMin > 0 ? totalMin / 60 : 0;
  };

  const formatarHoraInput = (valor: string): string => {
    const limpo = valor.replace(/\D/g, "");
    if (!limpo) return "";

    if (limpo.length <= 2) {
      const hora = limpo.padStart(2, "0");
      return `${hora}:00`;
    } else if (limpo.length === 3) {
      const hora = limpo.slice(0, 1).padStart(2, "0");
      const min = limpo.slice(1, 3);
      return `${hora}:${min}`;
    } else {
      const hora = limpo.slice(0, 2);
      const min = limpo.slice(2, 4);
      return `${hora}:${min}`;
    }
  };
const calcularTotalMes = (mesId: string) => {
    const maquinasDoMes = maquinas.filter((m) => m.mesId === mesId);
    let totalMes = 0;

    maquinasDoMes.forEach((maq) => {
      if (maq.dias && Array.isArray(maq.dias)) {
        maq.dias.forEach((d) => {
          const subM = calcularSubtotal(d.manhaInicio, d.manhaFim);
          const subT = calcularSubtotal(d.tardeInicio, d.tardeFim);
          totalMes += (subM + subT) * (Number(maq.valorHora) || 0);
        });
      }
    });

    return totalMes;
  };

  const handleSalvarMedicao = async () => {
    if (!contratoSelecionado || !mesSelecionado) return;

    const maquina =
      maquinas.find((item) => item.id === maquinaSelecionadaId) ??
      maquinas.find((item) => item.mesId === mesSelecionado.id);
    if (!maquina) return;

    const converterHora = (valor: string) => {
      if (!valor) return null;
      const [hora, minuto] = valor.split(":").map(Number);
      return (hora || 0) + (minuto || 0) / 60;
    };

    const diasComLancamento = maquina.dias.filter(
      (dia) =>
        dia.manhaInicio ||
        dia.manhaFim ||
        dia.tardeInicio ||
        dia.tardeFim ||
        dia.observacao,
    );
    const lancamentos = diasComLancamento.map((dia) => ({
      contrato: contratoSelecionado.numero,
      contrato_id: contratoSelecionado.id,
      equipamento: maquina.codigo,
      operador: maquina.operador || "Não informado",
      valor_hora: maquina.valorHora,
      data: `${mesSelecionado.ano}-${String(mesSelecionado.mesIndex + 1).padStart(2, "0")}-${String(dia.dia).padStart(2, "0")}`,
      manha_inicio: converterHora(dia.manhaInicio),
      manha_final: converterHora(dia.manhaFim),
      tarde_inicio: converterHora(dia.tardeInicio),
      tarde_final: converterHora(dia.tardeFim),
      observacao: dia.observacao || null,
    }));

    const { error } = await supabase
      .from("medicoes_diarias")
      .upsert(lancamentos, { onConflict: "contrato,equipamento,data" });

    if (error?.code === "42P10") {
      for (const lancamento of lancamentos) {
        const { data: existente, error: erroBusca } = await supabase
          .from("medicoes_diarias")
          .select("id")
          .eq("contrato", lancamento.contrato)
          .eq("equipamento", lancamento.equipamento)
          .eq("data", lancamento.data)
          .maybeSingle();

        if (erroBusca) {
          console.error("Erro ao localizar medição:", erroBusca);
          setMensagemSucesso(`Não foi possível salvar: ${erroBusca.message}`);
          return;
        }

        const resultado = existente
          ? await supabase.from("medicoes_diarias").update(lancamento).eq("id", existente.id)
          : await supabase.from("medicoes_diarias").insert(lancamento);

        if (resultado.error) {
          console.error("Erro ao salvar medição:", resultado.error);
          setMensagemSucesso(`Não foi possível salvar: ${resultado.error.message}`);
          return;
        }
      }
    } else if (error) {
      console.error("Erro ao salvar medição:", error);
      setMensagemSucesso(`Não foi possível salvar: ${error.message}`);
      return;
    }

    setMensagemSucesso("Medição salva com sucesso!");
    setTimeout(() => setMensagemSucesso(""), 3000);
  };

  return (
    <div className="p-4 md:p-6 max-w-7xl mx-auto space-y-6 print:p-0 print:m-0 print:max-w-none">
      <style>{`
        @media print {
          @page {
            size: A4 portrait;
            margin: 8mm;
          }
          body {
            background-color: white !important;
            color: black !important;
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }
          header, nav, footer, .print\\:hidden {
            display: none !important;
          }
          .print\\:block {
            display: block !important;
          }
          .bg-gray-100 {
            background-color: #f3f4f6 !important;
          }
          .bg-gray-200 {
            background-color: #e5e7eb !important;
          }
        }
      `}</style>

      <div className="flex justify-between items-center bg-white p-4 rounded-xl shadow-sm border border-gray-100 print:hidden">
        <h1 className="text-xl font-bold text-gray-800 flex items-center gap-2">
          <Clock className="text-orange-500" /> Medições e Contratos
        </h1>
        <div className="flex gap-2">
          {visao === "meses" && (
            <button
              onClick={() => setVisao("contratos")}
              className="flex items-center gap-1 px-3 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg text-sm"
            >
              <ArrowLeft size={16} /> Voltar
            </button>
          )}
          {visao === "maquina" && (
            <button
              onClick={() => setVisao("meses")}
              className="flex items-center gap-1 px-3 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg text-sm"
            >
              <ArrowLeft size={16} /> Voltar
            </button>
          )}
          {visao === "contratos" && (
            <button
              onClick={() => {
                setContratoEditando(null);
                setFormNumero("");
                setFormContratante("");
                setFormObjeto("");
                setModalContratoAberto(true);
              }}
              className="flex items-center gap-1 bg-orange-600 hover:bg-orange-700 text-white px-3 py-1.5 rounded-lg text-sm"
            >
              <Plus size={16} /> Novo Contrato
            </button>
          )}
        </div>
      </div>

      {mensagemSucesso && (
        <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded-xl text-sm flex items-center justify-between print:hidden">
          <span>{mensagemSucesso}</span>
        </div>
      )}

      {visao === "contratos" && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {contratos.map((c) => (
            <div
              key={c.id}
              className="bg-white p-5 rounded-xl shadow-sm border border-gray-200 hover:border-orange-500 transition flex flex-col justify-between gap-4"
            >
              <div className="flex justify-between items-start">
                <span className="bg-orange-100 text-orange-700 text-xs font-semibold px-2 py-0.5 rounded">
                  Contrato nº {c.numero}
                </span>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => {
                      setContratoEditando(c);
                      setFormNumero(c.numero);
                      setFormContratante(c.contratante);
                      setFormObjeto(c.objeto);
                      setModalContratoAberto(true);
                    }}
                    className="p-1.5 text-gray-500 hover:text-blue-600 hover:bg-gray-100 rounded-lg transition"
                    title="Editar Contrato"
                  >
                    <Edit size={16} />
                  </button>
                  <button
                    onClick={() => {
                      if (confirm(`Deseja excluir o contrato nº ${c.numero}?`)) {
                        setContratos(contratos.filter((item) => item.id !== c.id));
                      }
                    }}
                    className="p-1.5 rounded-lg bg-red-600 text-white hover:bg-red-700 transition"
                    title="Excluir Contrato"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
              <div
                onClick={() => {
                  setContratoSelecionado(c);
                  setVisao("meses");
                }}
                className="cursor-pointer"
              >
                <h3 className="font-bold text-gray-800">{c.contratante}</h3>
                <p className="text-gray-500 text-xs mt-1">{c.objeto}</p>
              </div>
            </div>
          ))}
        </div>
      )}

      {visao === "meses" && contratoSelecionado && (
        <div className="space-y-4">
          <div className="bg-orange-50 border border-orange-200 p-4 rounded-xl flex justify-between items-center">
            <div>
              <span className="text-xs font-bold text-orange-600 uppercase">Contrato Ativo</span>
              <h2 className="text-md font-bold text-gray-800">
                {contratoSelecionado.contratante} (Nº {contratoSelecionado.numero})
              </h2>
            </div>
            <button
              onClick={() => {
                const nomeMes = prompt("Nome do Mês (Ex: Outubro):");
                const anoStr = prompt("Ano (Ex: 2026):", "2026");
                const mesIdxStr = prompt("Número do Mês de 1 a 12 (Ex: 10 para Outubro):", "10");
                if (nomeMes && anoStr && mesIdxStr) {
                  const ano = Number(anoStr);
                  const mesIndex = Number(mesIdxStr) - 1;
                  const novoMesId = String(Date.now());
                  setMeses([
                    ...meses,
                    {
                      id: novoMesId,
                      contratoId: contratoSelecionado.id,
                      nome: nomeMes,
                      ano,
                      mesIndex,
                    },
                  ]);
                }
              }}
              className="bg-orange-600 text-white px-3 py-1.5 rounded-lg text-sm flex items-center gap-1"
            >
              <Calendar size={16} /> Adicionar Mês
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {meses
              .filter((m) => m.contratoId === contratoSelecionado.id)
              .map((m) => {
                const totalMesValor = calcularTotalMes(m.id);
                return (
                  <div
                    key={m.id}
                    onClick={() => {
                      setMesSelecionado(m);
                      setMaquinaSelecionadaId(null);
                      setVisao("maquina");
                    }}
                    className="bg-white p-4 rounded-xl shadow-sm border border-gray-200 hover:border-orange-500 cursor-pointer flex flex-col justify-between group gap-3"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Calendar className="text-orange-500" size={20} />
                        <div>
                          <h4 className="font-bold text-gray-800 text-sm">
                            {m.nome} / {m.ano}
                          </h4>
                        </div>
                      </div>
                      <button
                       onClick={async (e) => {
  e.stopPropagation();
  if (confirm("Deseja realmente excluir este mês/contrato?")) {
    try {
      // 1. Apaga no banco de dados do Supabase (verifique se o nome da tabela é 'medicoes' ou 'contratos')
      const { error } = await supabase
        .from("contratos") 
        .delete()
        .eq("id", m.id);

      if (error) throw error;

      // 2. Se der certo no banco, remove da tela
      setMeses((mesesAtuais) => mesesAtuais.filter((x) => x.id !== m.id));
      toast.success("Excluído com sucesso!");
    } catch (error: unknown) {
      const err = error as Error;
      console.error("Erro detalhado do Supabase:", err);
      toast.error("Erro ao excluir: " + (err.message || "Erro desconhecido"));
      alert("Erro detalhado do banco: " + JSON.stringify(err, null, 2));
    }
  }
}}
                        className="rounded-md bg-red-600 p-1.5 text-white hover:bg-red-700"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
     
<div className="bg-orange-50/60 p-2.5 rounded-lg border border-orange-100 flex justify-between items-center">
  <span className="text-xs font-semibold text-gray-600">
    Total Medição:
  </span>

  <span className="text-sm font-bold text-orange-700">
    {`R$ ${maquinas
      .filter((eq) => eq.mesId === m.id)
      .reduce((acc, maq) => {
        // ==========================================
        // CASAN
        // ==========================================
        const isCasan =
          contratoSelecionado?.numero?.includes("1546") ||
          contratoSelecionado?.contratante?.toUpperCase().includes("CASAN");

        if (isCasan) {
          const valorMensal = Number(maq.valorHora) || 0;
          const taxa50 = Number((maq as any).taxa50) || 142.72;
          const taxa100 = Number((maq as any).taxa100) || 170.63;

          let extras50 = 0;
          let extras100 = 0;

          if (Array.isArray(maq.dias)) {
            maq.dias.forEach((d: any) => {
              extras50 += (Number(d.horas50) || 0) * taxa50;
              extras100 += (Number(d.horas100) || 0) * taxa100;
            });
          }

          return acc + valorMensal + extras50 + extras100;
        }

        // ==========================================
        // OUTROS CONTRATOS
        // ==========================================
        let valorTotal = 0;

        if (Array.isArray(maq.dias)) {
          maq.dias.forEach((d) => {
            const horasManha = calcularSubtotal(
              d.manhaInicio,
              d.manhaFim,
            );

            const horasTarde = calcularSubtotal(
              d.tardeInicio,
              d.tardeFim,
            );

            const totalHorasDia = horasManha + horasTarde;

            valorTotal +=
              totalHorasDia * (Number(maq.valorHora) || 0);
          });
        }

        return acc + valorTotal;
      }, 0)
      .toLocaleString("pt-BR", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      })}`}
  </span>
</div>
                  </div>
                );
                 })}
              </div>
            </div>
          )}
{visao === "maquina" && mesSelecionado && contratoSelecionado && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 space-y-4 print:border-none print:p-0 print:m-0">
          <div className="flex justify-between items-center border-b pb-3 print:hidden">
            <h2 className="text-lg font-bold text-gray-800">
              Apontamento - {mesSelecionado.nome} de {mesSelecionado.ano}
            </h2>
            <div className="flex gap-2">
              <button
                onClick={handleSalvarMedicao}
                className="flex items-center gap-1 bg-green-600 hover:bg-green-700 text-white px-3 py-1.5 rounded-lg text-sm font-semibold"
              >
                <Save size={16} /> Salvar Medição
              </button>
              <button
                onClick={() => {
                  setMaquinaEditando(null);
                  setFormCodigo("");
                  setFormTipo("");
                  setFormOperador("");
                  setFormValorHora("193.62");
                  setModalMaquinaAberto(true);
                }}
                className="flex items-center gap-1 bg-orange-600 text-white px-3 py-1.5 rounded-lg text-sm"
              >
                <Plus size={16} /> Novo Equipamento
              </button>
              <button
                onClick={() => window.print()}
                className="flex items-center gap-1 bg-blue-600 text-white px-3 py-1.5 rounded-lg text-sm"
              >
                <Printer size={16} /> Imprimir A4
              </button>
            </div>
          </div>

          <div className="print:hidden">
            <div className="flex items-center justify-between gap-3 mb-2">
              <div>
                <p className="text-xs font-bold uppercase tracking-wide text-gray-500">
                  Equipamentos cadastrados
                </p>
                <p className="text-xs text-gray-400">
                  Selecione um equipamento para lançar as horas
                </p>
              </div>
              <span className="shrink-0 rounded-full bg-orange-50 px-2.5 py-1 text-xs font-bold text-orange-700">
                {maquinas.filter((eq) => eq.mesId === mesSelecionado.id).length} cadastrados
              </span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-2.5">
              {maquinas
                .filter((eq) => eq.mesId === mesSelecionado.id)
                .map((eq, index) => {
                  const ativa = maquinaSelecionadaId ? eq.id === maquinaSelecionadaId : index === 0;
                  return (
                    <div
                      key={eq.id}
                      className={`flex items-stretch gap-1.5 rounded-xl border border-gray-300 bg-transparent p-1.5 text-black transition ${
                        ativa
                          ? "border-gray-700 shadow-sm ring-1 ring-gray-300"
                          : "hover:border-gray-500"
                      }`}
                    >
                      <button
                        onClick={() => setMaquinaSelecionadaId(eq.id)}
                        className="medicao-equipamento min-w-0 flex-1 rounded-lg bg-transparent px-2.5 py-2 text-left text-black"
                      >
                        <span className="block truncate text-sm font-extrabold text-black">
                          {eq.codigo}
                        </span>
                        <span className="block truncate text-[11px] font-medium uppercase text-black">
                          {eq.tipo}
                        </span>
                      </button>
                      <button
                        onClick={() => {
                          setMaquinaEditando(eq);
                          setFormCodigo(eq.codigo);
                          setFormTipo(eq.tipo);
                          setFormOperador(eq.operador);
                          setFormValorHora(String(eq.valorHora));
                          setModalMaquinaAberto(true);
                        }}
                        className="self-center rounded-md p-1.5 text-gray-400 hover:bg-blue-50 hover:text-blue-600"
                        title="Editar Equipamento"
                      >
                        <Edit size={14} />
                      </button>
                      <button
                        onClick={() => void handleExcluirMaquina(eq)}
                        className="medicao-lixeira self-center rounded-md bg-red-600 p-1.5 text-white hover:bg-red-700"
                        title="Excluir Equipamento"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  );
                })}
            </div>
          </div>

         {(() => {
            const listaMes = maquinas.filter((eq) => eq.mesId === mesSelecionado.id);
            const maqAtiva = listaMes.find((eq) => eq.id === maquinaSelecionadaId) || listaMes[0];
            
            if (!maqAtiva) {
              return (
                <div className="text-center py-8 space-y-3 print:hidden">
                  <p className="text-gray-500">Nenhum equipamento cadastrado neste mês.</p>
                  <button
                    onClick={() => {
                      setMaquinaEditando(null);
                      setFormCodigo("RE01");
                      setFormTipo("Retroescavadeira");
                      setFormOperador("");
                      setFormValorHora("193.62");
                      setModalMaquinaAberto(true);
                    }}
                    className="bg-orange-600 text-white px-4 py-2 rounded-lg text-sm"
                  >
                    Cadastrar Primeiro Equipamento
                  </button>
                </div>
              );
            }

            const isCasanContrato = contratoSelecionado?.numero.includes("1546") || contratoSelecionado?.contratante.includes("CASAN");

 // ==========================================
            // 1. LAYOUT EXCLUSIVO PARA O CONTRATO DA CASAN
            // ==========================================
            if (isCasanContrato) {
              const valorMensalFixo = maqAtiva.valorHora ?? 60569.41;
              const taxa50 = (maqAtiva as any).taxa50 ?? 142.72;
              const taxa100 = (maqAtiva as any).taxa100 ?? 170.63;

              let totalValor50Mes = 0;
              let totalValor100Mes = 0;
              let totalHoras50Mes = 0;
              let totalHoras100Mes = 0;

              return (
                <div className="space-y-1 print:space-y-0.5">
                  <style>{`
                    @media print {
                      @page {
                        size: A4 portrait;
                        margin: 4mm !important;
                      }
                      body {
                        font-size: 8px !important;
                        background: white !important;
                        color: black !important;
                      }
                      input {
                        border: none !important;
                        background: transparent !important;
                        text-align: center !important;
                        padding: 0 !important;
                      }
                      .print\\:hidden {
                        display: none !important;
                      }
                    }
                  `}</style>

                  <div className="border border-gray-800 text-[10px] print:text-[7.5px]">
                    <div className="bg-gray-200 text-center font-bold py-0.5 border-b border-gray-800 uppercase">
                      RESUMO DA MEDIÇÃO - CASAN - {mesSelecionado.nome.toUpperCase()} / {mesSelecionado.ano}
                    </div>
                    
                    <div className="grid grid-cols-2 border-b border-gray-800 p-1 font-semibold items-center">
                      <div>CONTRATANTE: COMPANHIA CATARINENSE DE AGUAS E SANEAMENTO - CASAN</div>
                      <div className="flex items-center gap-1 justify-end">
                        <span>CONTRATO Nº:</span>
                        <input
                          type="text"
                          value={contratoSelecionado.numero}
                          onChange={(e) => {
                            const novoNumero = e.target.value;
                            setContratoSelecionado({ ...contratoSelecionado, numero: novoNumero });
                            setContratos(contratos.map(c => c.id === contratoSelecionado.id ? { ...c, numero: novoNumero } : c));
                          }}
                          className="w-36 p-0.5 border rounded bg-white text-right font-bold print:border-none"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 p-1 font-semibold items-center gap-1">
                      <div>EQUIPAMENTO: {maqAtiva.tipo.toUpperCase()} ({maqAtiva.codigo})</div>
                      <div>OPERADOR: {maqAtiva.operador.toUpperCase()}</div>
                      
                      <div className="flex items-center gap-1 justify-end text-[10px] flex-wrap">
                        <span className="font-bold">VALOR MENSAL R$:</span>
                        <input
                          type="text"
                          value={maqAtiva.valorHora === 0 ? "" : maqAtiva.valorHora}
                          onChange={(e) => {
                            const raw = e.target.value;
                            if (raw === "") {
                              setMaquinas(maquinas.map((m) => m.id === maqAtiva.id ? { ...m, valorHora: 0 } : m));
                              return;
                            }
                            const val = Number(raw);
                            if (!isNaN(val)) {
                              setMaquinas(maquinas.map((m) => m.id === maqAtiva.id ? { ...m, valorHora: val } : m));
                            }
                          }}
                          className="w-20 p-0.5 border rounded text-right font-bold bg-white print:border-none"
                        />
                        <span className="font-bold ml-1">50%:</span>
                        <input
                          type="text"
                          value={taxa50 === 0 ? "" : taxa50}
                          onChange={(e) => {
                            const raw = e.target.value;
                            const val = raw === "" ? 0 : Number(raw);
                            if (!isNaN(val)) {
                              setMaquinas(maquinas.map((m) => m.id === maqAtiva.id ? { ...m, taxa50: val } as any : m));
                            }
                          }}
                          className="w-14 p-0.5 border rounded text-right font-bold bg-white print:border-none"
                        />
                        <span className="font-bold ml-1">100%:</span>
                        <input
                          type="text"
                          value={taxa100 === 0 ? "" : taxa100}
                          onChange={(e) => {
                            const raw = e.target.value;
                            const val = raw === "" ? 0 : Number(raw);
                            if (!isNaN(val)) {
                              setMaquinas(maquinas.map((m) => m.id === maqAtiva.id ? { ...m, taxa100: val } as any : m));
                            }
                          }}
                          className="w-14 p-0.5 border rounded text-right font-bold bg-white print:border-none"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="overflow-x-auto border border-gray-800">
                    <table className="w-full text-left border-collapse text-[10px] print:text-[7.5px]">
                      <thead>
                        <tr className="bg-gray-200 text-gray-900 border-b border-gray-800 text-center font-bold">
                          <th className="p-0.5 border-r border-gray-800" rowSpan={2}>Data</th>
                          <th className="p-0.5 border-r border-gray-800" rowSpan={2}>DIA</th>
                          <th className="p-0.5 border-r border-gray-800" colSpan={2}>HORAS NORMAIS</th>
                          <th className="p-0.5 border-r border-gray-800" rowSpan={2}>VALOR MENSAL R$</th>
                          <th className="p-0.5 border-r border-gray-800" colSpan={2}>HR EXTRAS QTD</th>
                          <th className="p-0.5 border-r border-gray-800" colSpan={2}>VALORES EXTRAS</th>
                          <th className="p-0.5" rowSpan={2}>OBSERVAÇÃO</th>
                        </tr>
                        <tr className="bg-gray-100 text-gray-800 border-b border-gray-800 text-center font-semibold">
                          <th className="p-0.2 border-r border-gray-800">INICIO</th>
                          <th className="p-0.2 border-r border-gray-800">FINAL</th>
                          <th className="p-0.2 border-r border-gray-800">HR 50%</th>
                          <th className="p-0.2 border-r border-gray-800">HR 100%</th>
                          <th className="p-0.2 border-r border-gray-800">HR 50% (R$ {taxa50.toFixed(2)})</th>
                          <th className="p-0.2 border-r border-gray-800">HR 100% (R$ {taxa100.toFixed(2)})</th>
                        </tr>
                      </thead>
                      <tbody>
                        {maqAtiva.dias.map((d, i) => {
                          const subNormal = calcularSubtotal(d.manhaInicio, d.manhaFim);
                          const h50 = Number((d as any).horas50) || 0;
                          const h100 = Number((d as any).horas100) || 0;
                          const valor50Dia = h50 * taxa50;
                          const valor100Dia = h100 * taxa100;

                          totalHoras50Mes += h50;
                          totalHoras100Mes += h100;
                          totalValor50Mes += valor50Dia;
                          totalValor100Mes += valor100Dia;

                          const isFDS = d.diaSemana === "sábado" || d.diaSemana === "domingo";

                          return (
                            <tr key={i} className={`border-b border-gray-300 text-center ${isFDS ? "bg-gray-100" : ""}`}>
                              <td className="p-0.5 border-r border-gray-300">{d.dataStr}</td>
                              <td className="p-0.5 border-r border-gray-300">{d.diaSemana}</td>
                              
                              <td className="p-0.5 border-r border-gray-300">
                                <input
                                  type="text"
                                  value={d.manhaInicio}
                                  onChange={(e) => {
                                    const val = e.target.value;
                                    setMaquinas(maquinas.map((m) => m.id !== maqAtiva.id ? m : {
                                      ...m, dias: m.dias.map((di, idx) => idx === i ? { ...di, manhaInicio: val } : di)
                                    }));
                                  }}
                                  onBlur={(e) => {
                                    const formatado = formatarHoraInput(e.target.value);
                                    setMaquinas(maquinas.map((m) => m.id !== maqAtiva.id ? m : {
                                      ...m, dias: m.dias.map((di, idx) => idx === i ? { ...di, manhaInicio: formatado } : di)
                                    }));
                                  }}
                                  className="w-12 p-0.5 text-center border rounded bg-white text-[10px] print:border-none"
                                  placeholder="07:00"
                                />
                              </td>
                              <td className="p-0.5 border-r border-gray-300">
                                <input
                                  type="text"
                                  value={d.manhaFim}
                                  onChange={(e) => {
                                    const val = e.target.value;
                                    setMaquinas(maquinas.map((m) => m.id !== maqAtiva.id ? m : {
                                      ...m, dias: m.dias.map((di, idx) => idx === i ? { ...di, manhaFim: val } : di)
                                    }));
                                  }}
                                  onBlur={(e) => {
                                    const formatado = formatarHoraInput(e.target.value);
                                    setMaquinas(maquinas.map((m) => m.id !== maqAtiva.id ? m : {
                                      ...m, dias: m.dias.map((di, idx) => idx === i ? { ...di, manhaFim: formatado } : di)
                                    }));
                                  }}
                                  className="w-12 p-0.5 text-center border rounded bg-white text-[10px] print:border-none"
                                  placeholder="19:00"
                                />
                              </td>
                              <td className="p-0.5 border-r border-gray-300 font-bold bg-orange-50 text-orange-800">
                                {subNormal > 0 ? `${subNormal.toFixed(2)}:00` : ""}
                              </td>

                              <td className="p-0.5 border-r border-gray-300">
                                <input
                                  type="number"
                                  step="0.5"
                                  value={(d as any).horas50 || ""}
                                  onChange={(e) => {
                                    const val = e.target.value;
                                    setMaquinas(maquinas.map((m) => m.id !== maqAtiva.id ? m : {
                                      ...m, dias: m.dias.map((di, idx) => idx === i ? { ...di, horas50: val } : di) as any
                                    }));
                                  }}
                                  className="w-10 p-0.5 text-center border rounded bg-white text-[10px] print:border-none"
                                  placeholder="0"
                                />
                              </td>
                              <td className="p-0.5 border-r border-gray-300">
                                <input
                                  type="number"
                                  step="0.5"
                                  value={(d as any).horas100 || ""}
                                  onChange={(e) => {
                                    const val = e.target.value;
                                    setMaquinas(maquinas.map((m) => m.id !== maqAtiva.id ? m : {
                                      ...m, dias: m.dias.map((di, idx) => idx === i ? { ...di, horas100: val } : di) as any
                                    }));
                                  }}
                                  className="w-10 p-0.5 text-center border rounded bg-white text-[10px] print:border-none"
                                  placeholder="0"
                                />
                              </td>

                              <td className="p-0.5 border-r border-gray-300 text-green-700 font-semibold bg-gray-50">
                                {valor50Dia > 0 ? `R$ ${valor50Dia.toFixed(2)}` : "R$ -"}
                              </td>
                              <td className="p-0.5 border-r border-gray-300 text-green-700 font-semibold bg-gray-50">
                                {valor100Dia > 0 ? `R$ ${valor100Dia.toFixed(2)}` : "R$ -"}
                              </td>

                              <td className="p-0.5">
                                <input
                                  type="text"
                                  value={d.observacao}
                                  onChange={(e) => {
                                    const val = e.target.value;
                                    setMaquinas(maquinas.map((m) => m.id !== maqAtiva.id ? m : {
                                      ...m, dias: m.dias.map((di, idx) => idx === i ? { ...di, observacao: val } : di)
                                    }));
                                  }}
                                  className="w-full p-0.5 border rounded text-[10px] bg-white print:border-none"
                                  placeholder="Obs..."
                                />
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                      <tfoot>
                        <tr className="bg-gray-200 font-bold text-center border-t border-gray-800 text-[10px]">
                          <td className="p-0.5 border-r border-gray-800" colSpan={4}>TOTAL GERAL</td>
                          <td className="p-0.5 border-r border-gray-800 text-orange-900">
                            R$ {valorMensalFixo.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                          </td>
                          <td className="p-0.5 border-r border-gray-800">{totalHoras50Mes > 0 ? totalHoras50Mes.toFixed(2) : ""}</td>
                          <td className="p-0.5 border-r border-gray-800">{totalHoras100Mes > 0 ? totalHoras100Mes.toFixed(2) : ""}</td>
                          <td className="p-0.5 border-r border-gray-800 text-green-900">
                            R$ {totalValor50Mes.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                          </td>
                          <td className="p-0.5 border-r border-gray-800 text-green-900">
                            R$ {totalValor100Mes.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                          </td>
                          <td className="p-0.5 text-right font-extrabold text-blue-900">
                            TOTAL: R$ {(valorMensalFixo + totalValor50Mes + totalValor100Mes).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                          </td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>

                  <div className="border border-gray-800 p-2 space-y-2 bg-white text-xs print:mt-1">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-[10px]">DATA DE APROVAÇÃO:</span>
                      <input
                        type="date"
                        value={maqAtiva.dataAprovacao || ""}
                        onChange={(e) => {
                          const val = e.target.value;
                          setMaquinas(maquinas.map((m) => m.id !== maqAtiva.id ? m : { ...m, dataAprovacao: val }));
                        }}
                        className="border rounded p-0.5 text-xs print:border-none"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-8 pt-6 text-center text-[10px]">
                      <div className="border-t border-gray-800 pt-1 font-semibold">
                        Responsável pela Medição / Executante
                      </div>
                      <div className="border-t border-gray-800 pt-1 font-semibold">
                        Fiscal / Gestor do Contrato
                      </div>
                    </div>
                  </div>
                </div>
              );
            }
            // ==========================================
            // 2. LAYOUT ORIGINAL COMPLETO PARA OS OUTROS CONTRATOS
            // ==========================================
            let totalGeralHoras = 0;
            let totalGeralValor = 0;
            const totalContrato = listaMes.reduce(
              (totais, maquina) => {
                maquina.dias.forEach((dia) => {
                  const horas =
                    calcularSubtotal(dia.manhaInicio, dia.manhaFim) +
                    calcularSubtotal(dia.tardeInicio, dia.tardeFim);
                  totais.horas += horas;
                  totais.valor += horas * maquina.valorHora;
                });
                return totais;
              },
              { horas: 0, valor: 0 },
            );

            return (
              <div className="space-y-2 print:space-y-1">
                <div className="border border-gray-800 text-[10px] print:text-[8px]">
                  <div className="bg-gray-200 text-center font-bold py-1 border-b border-gray-800 uppercase">
                    CONTROLE DE MEDIÇÃO DE HORAS - {mesSelecionado.nome.toUpperCase()} /{" "}
                    {mesSelecionado.ano}
                  </div>
                  <div className="grid grid-cols-2 border-b border-gray-800 p-1 font-semibold">
                    <div>CONTRATANTE: {contratoSelecionado.contratante.toUpperCase()}</div>
                    <div>CONTRATO Nº: {contratoSelecionado.numero}</div>
                  </div>
                  <div className="grid grid-cols-3 p-1 font-semibold items-center">
                    <div>
                      EQUIPAMENTO: {maqAtiva.tipo.toUpperCase()} ({maqAtiva.codigo})
                    </div>
                    <div>OPERADOR: {maqAtiva.operador.toUpperCase()}</div>
                    <div className="flex items-center gap-1 justify-end print:block">
                      <span>VALOR HORA (R$):</span>
                      <input
                        type="number"
                        step="0.01"
                        value={maqAtiva.valorHora}
                        onChange={(e) => {
                          const val = Number(e.target.value);
                          setMaquinas(
                            maquinas.map((m) =>
                              m.id === maqAtiva.id ? { ...m, valorHora: val } : m,
                            ),
                          );
                        }}
                        className="w-20 p-0.5 border rounded text-right font-bold bg-white print:border-none"
                      />
                    </div>
                  </div>
                </div>
                <div className="overflow-x-auto border border-gray-800">
                  <table className="w-full text-left border-collapse text-[10px] print:text-[8px]">
                    <thead>
                      <tr className="bg-gray-200 text-gray-900 border-b border-gray-800 text-center font-bold">
                        <th className="p-1 border-r border-gray-800">Data</th>
                        <th className="p-1 border-r border-gray-800">Dia</th>
                        <th className="p-1 border-r border-gray-800" colSpan={3}>
                          MANHÃ
                        </th>
                        <th className="p-1 border-r border-gray-800" colSpan={3}>
                          TARDE
                        </th>
                        <th className="p-1 border-r border-gray-800">TOTAL</th>
                        <th className="p-1 border-r border-gray-800">VALOR (R$)</th>
                        <th className="p-1">OBS</th>
                      </tr>
                      <tr className="bg-gray-100 text-gray-800 border-b border-gray-800 text-center font-semibold">
                        <th className="p-0.5 border-r border-gray-800"></th>
                        <th className="p-0.5 border-r border-gray-800"></th>
                        <th className="p-0.5 border-r border-gray-800">INI</th>
                        <th className="p-0.5 border-r border-gray-800">FIM</th>
                        <th className="p-0.5 border-r border-gray-800">SUB</th>
                        <th className="p-0.5 border-r border-gray-800">INI</th>
                        <th className="p-0.5 border-r border-gray-800">FIM</th>
                        <th className="p-0.5 border-r border-gray-800">SUB</th>
                        <th className="p-0.5 border-r border-gray-800"></th>
                        <th className="p-0.5 border-r border-gray-800">
                          R$ {maqAtiva.valorHora.toFixed(2)}
                        </th>
                        <th className="p-0.5"></th>
                      </tr>
                    </thead>
                    <tbody>
                      {maqAtiva.dias.map((d, i) => {
                        const subManha = calcularSubtotal(d.manhaInicio, d.manhaFim);
                        const subTarde = calcularSubtotal(d.tardeInicio, d.tardeFim);
                        const totalHorasDia = subManha + subTarde;
                        const valorTotalDia = totalHorasDia * maqAtiva.valorHora;

                        totalGeralHoras += totalHorasDia;
                        totalGeralValor += valorTotalDia;

                        const isFDS = d.diaSemana === "sábado" || d.diaSemana === "domingo";

                        return (
                          <tr
                            key={i}
                            className={`border-b border-gray-300 text-center ${isFDS ? "bg-gray-100" : ""}`}
                          >
                            <td className="p-0.5 border-r border-gray-300">{d.dataStr}</td>
                            <td className="p-0.5 border-r border-gray-300">{d.diaSemana}</td>
                            <td className="p-0.5 border-r border-gray-300">
                              <input
                                type="text"
                                value={d.manhaInicio}
                                onChange={(e) => {
                                  const val = e.target.value;
                                  setMaquinas(
                                    maquinas.map((m) =>
                                      m.id === maqAtiva.id
                                        ? {
                                            ...m,
                                            dias: m.dias.map((di, idx) =>
                                              idx === i ? { ...di, manhaInicio: val } : di,
                                            ),
                                          }
                                        : m,
                                    ),
                                  );
                                }}
                                onBlur={(e) => {
                                  const formatado = formatarHoraInput(e.target.value);
                                  setMaquinas(
                                    maquinas.map((m) =>
                                      m.id === maqAtiva.id
                                        ? {
                                            ...m,
                                            dias: m.dias.map((di, idx) =>
                                              idx === i ? { ...di, manhaInicio: formatado } : di,
                                            ),
                                          }
                                        : m,
                                    ),
                                  );
                                }}
                                className="w-12 p-0.5 text-center border rounded bg-white text-[10px] print:border-none print:bg-transparent"
                              />
                            </td>
                            <td className="p-0.5 border-r border-gray-300">
                              <input
                                type="text"
                                value={d.manhaFim}
                                onChange={(e) => {
                                  const val = e.target.value;
                                  setMaquinas(
                                    maquinas.map((m) =>
                                      m.id === maqAtiva.id
                                        ? {
                                            ...m,
                                            dias: m.dias.map((di, idx) =>
                                              idx === i ? { ...di, manhaFim: val } : di,
                                            ),
                                          }
                                        : m,
                                    ),
                                  );
                                }}
                                onBlur={(e) => {
                                  const formatado = formatarHoraInput(e.target.value);
                                  setMaquinas(
                                    maquinas.map((m) =>
                                      m.id === maqAtiva.id
                                        ? {
                                            ...m,
                                            dias: m.dias.map((di, idx) =>
                                              idx === i ? { ...di, manhaFim: formatado } : di,
                                            ),
                                          }
                                        : m,
                                    ),
                                  );
                                }}
                                className="w-12 p-0.5 text-center border rounded bg-white text-[10px] print:border-none print:bg-transparent"
                              />
                            </td>
                            <td className="p-0.5 border-r border-gray-300">
                              {subManha > 0 ? subManha.toFixed(2) : ""}
                            </td>
                            <td className="p-0.5 border-r border-gray-300">
                              <input
                                type="text"
                                value={d.tardeInicio}
                                onChange={(e) => {
                                  const val = e.target.value;
                                  setMaquinas(
                                    maquinas.map((m) =>
                                      m.id === maqAtiva.id
                                        ? {
                                            ...m,
                                            dias: m.dias.map((di, idx) =>
                                              idx === i ? { ...di, tardeInicio: val } : di,
                                            ),
                                          }
                                        : m,
                                    ),
                                  );
                                }}
                                onBlur={(e) => {
                                  const formatado = formatarHoraInput(e.target.value);
                                  setMaquinas(
                                    maquinas.map((m) =>
                                      m.id === maqAtiva.id
                                        ? {
                                            ...m,
                                            dias: m.dias.map((di, idx) =>
                                              idx === i ? { ...di, tardeInicio: formatado } : di,
                                            ),
                                          }
                                        : m,
                                    ),
                                  );
                                }}
                                className="w-12 p-0.5 text-center border rounded bg-white text-[10px] print:border-none print:bg-transparent"
                              />
                            </td>
                            <td className="p-0.5 border-r border-gray-300">
                              <input
                                type="text"
                                value={d.tardeFim}
                                onChange={(e) => {
                                  const val = e.target.value;
                                  setMaquinas(
                                    maquinas.map((m) =>
                                      m.id === maqAtiva.id
                                        ? {
                                            ...m,
                                            dias: m.dias.map((di, idx) =>
                                              idx === i ? { ...di, tardeFim: val } : di,
                                            ),
                                          }
                                        : m,
                                    ),
                                  );
                                }}
                                onBlur={(e) => {
                                  const formatado = formatarHoraInput(e.target.value);
                                  setMaquinas(
                                    maquinas.map((m) =>
                                      m.id === maqAtiva.id
                                        ? {
                                            ...m,
                                            dias: m.dias.map((di, idx) =>
                                              idx === i ? { ...di, tardeFim: formatado } : di,
                                            ),
                                          }
                                        : m,
                                    ),
                                  );
                                }}
                                className="w-12 p-0.5 text-center border rounded bg-white text-[10px] print:border-none print:bg-transparent"
                              />
                            </td>
                            <td className="p-0.5 border-r border-gray-300">
                              {subTarde > 0 ? subTarde.toFixed(2) : ""}
                            </td>
                            <td className="p-0.5 border-r border-gray-300 font-bold">
                              {totalHorasDia > 0 ? totalHorasDia.toFixed(2) : ""}
                            </td>
                            <td className="p-0.5 border-r border-gray-300 text-green-700">
                              {valorTotalDia > 0
                                ? valorTotalDia.toLocaleString("pt-BR", {
                                    minimumFractionDigits: 2,
                                  })
                                : ""}
                            </td>
                            <td className="p-0.5">
                              <input
                                type="text"
                                value={d.observacao}
                                onChange={(e) => {
                                  const val = e.target.value;
                                  setMaquinas(
                                    maquinas.map((m) =>
                                      m.id === maqAtiva.id
                                        ? {
                                            ...m,
                                            dias: m.dias.map((di, idx) =>
                                              idx === i ? { ...di, observacao: val } : di,
                                            ),
                                          }
                                        : m,
                                    ),
                                  );
                                }}
                                className="w-full p-0.5 border rounded text-[10px] bg-white print:border-none print:bg-transparent"
                              />
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                    <tfoot>
                      <tr className="bg-gray-200 font-bold text-center border-t border-gray-800 text-[10px]">
                        <td className="p-1 border-r border-gray-800" colSpan={4}>
                          TOTAL GERAL
                        </td>
                        <td className="p-1 border-r border-gray-800"></td>
                        <td className="p-1 border-r border-gray-800" colSpan={2}></td>
                        <td className="p-1 border-r border-gray-800"></td>
                        <td className="p-1 border-r border-gray-800">
                          {totalGeralHoras.toFixed(2)}
                        </td>
                        <td className="p-1 border-r border-gray-800 text-green-800">
                          R$ {totalGeralValor.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                        </td>
                        <td></td>
                      </tr>
                    </tfoot>
                  </table>
                </div>

                <div className="flex flex-wrap justify-end gap-4 border border-gray-800 bg-orange-50 p-2 text-xs font-bold text-gray-900 print:hidden">
                  <span>
                    Total do contrato no mês: {totalContrato.horas.toFixed(2)}h | R${" "}
                    {totalContrato.valor.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                  </span>
                </div>

                {/* RODAPÉ PADRÃO DOS OUTROS CONTRATOS */}
                <div className="border border-gray-800 p-3 space-y-4 bg-white text-xs print:mt-4">
                  <div className="flex items-center gap-2 print:hidden">
                    <span className="font-bold">DATA DE APROVAÇÃO:</span>
                    <input
                      type="date"
                      value={maqAtiva.dataAprovacao || ""}
                      onChange={(e) => {
                        const val = e.target.value;
                        setMaquinas(maquinas.map((m) => m.id !== maqAtiva.id ? m : { ...m, dataAprovacao: val }));
                      }}
                      className="border rounded p-1 text-xs"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-8 pt-12 text-center">
                    <div className="border-t border-gray-800 pt-1 font-semibold">
                      {maqAtiva.assinaturaResponsavel || "Responsável pela Medição / Executante"}
                    </div>
                    <div className="border-t border-gray-800 pt-1 font-semibold">
                      {maqAtiva.assinaturaContratante || "Fiscal / Gestor do Contrato"}
                    </div>
                  </div>
                </div>
              </div>
            );
          })()}
        </div>
      )}

      {/* Modal Contrato */}
      {modalContratoAberto && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50 print:hidden">
          <div className="bg-white p-6 rounded-xl max-w-md w-full space-y-4">
            <h3 className="text-lg font-bold">
              {contratoEditando ? "Editar Contrato" : "Novo Contrato"}
            </h3>
            <form onSubmit={handleSalvarContrato} className="space-y-3">
              <div>
                <label className="text-xs font-semibold">Número do Contrato</label>
                <input
                  type="text"
                  value={formNumero}
                  onChange={(e) => setFormNumero(e.target.value)}
                  required
                  className="w-full border p-2 rounded text-sm"
                  placeholder="Ex: 48/2022"
                />
              </div>
              <div>
                <label className="text-xs font-semibold">Contratante</label>
                <input
                  type="text"
                  value={formContratante}
                  onChange={(e) => setFormContratante(e.target.value)}
                  required
                  className="w-full border p-2 rounded text-sm"
                  placeholder="Nome da Prefeitura/Órgão"
                />
              </div>
              <div>
                <label className="text-xs font-semibold">Objeto</label>
                <input
                  type="text"
                  value={formObjeto}
                  onChange={(e) => setFormObjeto(e.target.value)}
                  required
                  className="w-full border p-2 rounded text-sm"
                  placeholder="Ex: Locação de Maquinário Pesado"
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setModalContratoAberto(false)}
                  className="px-4 py-2 border rounded text-sm"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-orange-600 text-white rounded text-sm"
                >
                  Salvar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Máquina */}
      {modalMaquinaAberto && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50 print:hidden">
          <div className="bg-white p-6 rounded-xl max-w-md w-full space-y-4">
            <h3 className="text-lg font-bold">
              {maquinaEditando ? "Editar Equipamento" : "Novo Equipamento"}
            </h3>
            <form onSubmit={handleSalvarMaquina} className="space-y-3">
              <div>
                <label className="text-xs font-semibold">Código (Ex: RE23)</label>
                <input
                  type="text"
                  value={formCodigo}
                  onChange={(e) => setFormCodigo(e.target.value)}
                  required
                  className="w-full border p-2 rounded text-sm"
                />
              </div>
              <div>
                <label className="text-xs font-semibold">Tipo (Ex: Retroescavadeira)</label>
                <input
                  type="text"
                  value={formTipo}
                  onChange={(e) => setFormTipo(e.target.value)}
                  required
                  className="w-full border p-2 rounded text-sm"
                />
              </div>
              <div>
                <label className="text-xs font-semibold">Operador</label>
                <input
                  type="text"
                  value={formOperador}
                  onChange={(e) => setFormOperador(e.target.value)}
                  className="w-full border p-2 rounded text-sm"
                />
              </div>
              <div>
                <label className="text-xs font-semibold">Valor da Hora (R$)</label>
                <input
                  type="number"
                  step="0.01"
                  value={formValorHora}
                  onChange={(e) => setFormValorHora(e.target.value)}
                  required
                  className="w-full border p-2 rounded text-sm"
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setModalMaquinaAberto(false)}
                  className="px-4 py-2 border rounded text-sm"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-orange-600 text-white rounded text-sm"
                >
                  Salvar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
