import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Search,
  ChevronRight,
  Plus,
  Gauge,
  ShieldCheck,
  AlertTriangle,
  Calendar,
  AlertCircle,
  ClipboardList,
  Printer,
  Mail,
  MessageCircle,
  Trash2,
  Edit3,
  CheckCircle2,
} from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Notificacoes } from "@/components/Notificacoes";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/equipamentos/")({
  component: EquipamentosList,
});

type Equip = {
  id: string;
  numero: string;
  identificacao: string | null;
  placa: string | null;
  localizacao: string | null;
  operador_contato: string | null;
  horimetro_atual: number | null;
  h_revisao: number | null;
  limite_revisao: number | null;
  proxima_revisao_horimetro: number | null;
  data_horimetro_atual: string | null;
  status: string | null;
  cl: string | null;
  cover_storage_path: string | null;
};

function calcularDiasVencimento(dataVencimentoStr: string): number | null {
  if (!dataVencimentoStr) return null;
  const hoje = new Date();
  hoje.setHours(0, 0, 0, 0);

  const [ano, mes, dia] = dataVencimentoStr.split("-").map(Number);
  const dataVenc = new Date(ano, mes - 1, dia);
  dataVenc.setHours(0, 0, 0, 0);

  const diffTempo = dataVenc.getTime() - hoje.getTime();
  return Math.ceil(diffTempo / (1000 * 60 * 60 * 24));
}

const STATUS_EQUIPAMENTO = [
  "Em manutenção",
  "Disponível para venda",
  "Aguardando peças",
  "Operacional",
  "Em trânsito",
] as const;

// ----------------------------------------------------
// COMPONENTE: TACOGRAFO
// ----------------------------------------------------
function BotaoTacografo() {
  const [open, setOpen] = useState(false);
  const [filtro, setFiltro] = useState("");
  const [editandoId, setEditandoId] = useState<string | null>(null);
  const [novaData, setNovaData] = useState("");
  const [salvando, setSalvando] = useState(false);
  const { isAdmin } = useAuth();
  const queryClient = useQueryClient();

  const salvarData = async (equipamentoId: string) => {
    if (!novaData) {
      toast.error("Informe a nova data de vencimento");
      return;
    }
    setSalvando(true);
    const { error } = await supabase
      .from("equipamentos")
      .update({ afericao_taco: novaData })
      .eq("id", equipamentoId);
    setSalvando(false);
    if (error) {
      toast.error("Não foi possível salvar a data");
      return;
    }
    toast.success("Data de vencimento atualizada");
    setEditandoId(null);
    setNovaData("");
    queryClient.invalidateQueries({ queryKey: ["tacografos-vencimentos"] });
  };

  const { data: tacografos, isLoading } = useQuery({
    queryKey: ["tacografos-vencimentos"],
    queryFn: async () => {
      const { data, error } = await supabase.from("tacografos_vencimentos").select("*");

      if (error) {
        console.error("Erro ao carregar tacógrafos:", error);
        return [];
      }
      return data ?? [];
    },
  });

  const tacografosVencidos = useMemo(() => {
    if (!tacografos) return [];
    return tacografos.filter((item: any) => {
      const dataVal = item.data_vencimento || item.vencimento_tacografo || item.vencimento;
      if (!dataVal) return false;
      const dias = calcularDiasVencimento(dataVal);
      return dias !== null && dias < 0;
    });
  }, [tacografos]);

  const tacografosComAlerta = useMemo(() => {
    if (!tacografos) return [];
    return tacografos.filter((item: any) => {
      const dataVal = item.data_vencimento || item.vencimento_tacografo || item.vencimento;
      if (!dataVal) return false;
      const dias = calcularDiasVencimento(dataVal);
      return dias !== null && dias <= 30;
    });
  }, [tacografos]);

  const todosComStatus = useMemo(() => {
    if (!tacografos) return [];
    return tacografos
      .filter((item: any) => {
        const dataVal = item.data_vencimento || item.vencimento_tacografo || item.vencimento;
        return Boolean(dataVal);
      })
      .map((item: any) => {
        const dataVal = item.data_vencimento || item.vencimento_tacografo || item.vencimento;
        const diasRestantes = dataVal ? calcularDiasVencimento(dataVal) : null;

        const isVencido = diasRestantes !== null && diasRestantes < 0;
        const isVencendoEmBreve =
          diasRestantes !== null && diasRestantes >= 0 && diasRestantes <= 30;

        return {
          ...item,
          dataVal,
          diasRestantes,
          isVencido,
          isVencendoEmBreve,
        };
      })
      .sort((a, b) => {
        const pA = a.isVencido ? 0 : a.isVencendoEmBreve ? 1 : 2;
        const pB = b.isVencido ? 0 : b.isVencendoEmBreve ? 1 : 2;
        return pA - pB;
      });
  }, [tacografos]);

  const listaFiltrada = useMemo(() => {
    const f = filtro.toLowerCase().trim();
    if (!f) return todosComStatus;
    return todosComStatus.filter((item: any) =>
      Object.values(item).some((val) =>
        String(val ?? "")
          .toLowerCase()
          .includes(f),
      ),
    );
  }, [todosComStatus, filtro]);

  // Função para Enviar Relatório via WhatsApp (Tacógrafos)
  const handleEnviarWhatsAppTacografo = () => {
    if (todosComStatus.length === 0) {
      toast.error("Não há dados de tacógrafos para enviar.");
      return;
    }

    let texto = `📊 *RELATÓRIO DE VENCIMENTOS DE TACÓGRAFOS*\n\n`;

    todosComStatus.forEach((item: any, idx: number) => {
      const nome = item.numero || item.veiculo_equipamento || item.equipamento || "Equipamento";
      const statusStr = item.isVencido ? "🚨 VENCIDO" : item.isVencendoEmBreve ? "⚠️ Vencendo em breve" : "✅ Em dia";
      const dataFmt = item.dataVal ? new Date(item.dataVal + "T00:00:00").toLocaleDateString("pt-BR") : "-";
      
      texto += `${idx + 1}. *${nome}* ${item.placa ? `(${item.placa})` : ""}\n`;
      texto += `   • Vencimento: ${dataFmt}\n`;
      texto += `   • Situação: ${statusStr}\n\n`;
    });

    const url = `https://api.whatsapp.com/send?text=${encodeURIComponent(texto)}`;
    window.open(url, "_blank");
  };

  // Função para Imprimir Relatório (Tacógrafos)
  const handleImprimirTacografo = () => {
    const janela = window.open("", "", "width=800,height=600");
    if (!janela) return;

    const html = `
      <html>
        <head>
          <title>Relatório de Vencimentos de Tacógrafos</title>
          <style>
            body { font-family: Arial, sans-serif; padding: 20px; color: #333; }
            h2 { border-bottom: 2px solid #333; padding-bottom: 8px; }
            table { width: 100%; border-collapse: collapse; margin-top: 20px; }
            th, td { border: 1px solid #ddd; padding: 8px 12px; text-align: left; font-size: 12px; }
            th { background-color: #f2f2f2; }
            .vencido { color: #dc2626; font-weight: bold; }
            .atencao { color: #d97706; font-weight: bold; }
            .ok { color: #16a34a; }
          </style>
        </head>
        <body>
          <h2>Relatório de Vencimentos de Tacógrafos</h2>
          <p>Gerado em: ${new Date().toLocaleDateString("pt-BR")} às ${new Date().toLocaleTimeString("pt-BR")}</p>
          <table>
            <thead>
              <tr>
                <th>Equipamento</th>
                <th>Placa</th>
                <th>Vencimento</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              ${todosComStatus.map((item: any) => {
                const nome = item.numero || item.veiculo_equipamento || item.equipamento || "Equipamento";
                const dataFmt = item.dataVal ? new Date(item.dataVal + "T00:00:00").toLocaleDateString("pt-BR") : "-";
                let statusClass = "ok";
                let statusText = "Em dia";
                if (item.isVencido) {
                  statusClass = "vencido";
                  statusText = "Vencido";
                } else if (item.isVencendoEmBreve) {
                  statusClass = "atencao";
                  statusText = item.diasRestantes === 0 ? "Vence Hoje" : `Vence em ${item.diasRestantes}d`;
                }
                return `
                  <tr>
                    <td><b>${nome}</b></td>
                    <td>${item.placa || "-"}</td>
                    <td>${dataFmt}</td>
                    <td class="${statusClass}">${statusText}</td>
                  </tr>
                `;
              }).join("")}
            </tbody>
          </table>
        </body>
      </html>
    `;
    janela.document.write(html);
    janela.document.close();
    janela.print();

    const obterStatusSeguro = (item: any) => {
    if (item.isVencido) return "Vencido";
    if (item.isVencendoEmBreve) {
      return item.diasRestantes === 0 ? "Vence hoje" : `Vence em ${item.diasRestantes} dias`;
    }
    return "Em dia";
  };

  const gerarRelatorioSeguros = () => {
    const linhas = [
      "RELATÓRIO DE SEGUROS CADASTRADOS",
      `Emissão: ${new Date().toLocaleString("pt-BR")}`,
      filtro.trim() ? `Filtro: ${filtro.trim()}` : "Filtro: Todos os seguros",
      "",
    ];

    listaFiltrada.forEach((item: any, index: number) => {
      const equipamento =
        item.equipamento || item.numero || item.veiculo_equipamento || "Equipamento";
      const vencimento = item.dataVal
        ? new Date(item.dataVal + "T00:00:00").toLocaleDateString("pt-BR")
        : "Não informado";
      linhas.push(`${index + 1}. ${equipamento}`);
      linhas.push(`   Seguradora: ${item.seguradora || item.empresa || "Não informada"}`);
      linhas.push(`   Vencimento: ${vencimento} | Situação: ${obterStatusSeguro(item)}`);
      if (item.contato_sinistro_nome || item.contato_sinistro_telefone) {
        linhas.push(
          `   Contato de sinistro: ${item.contato_sinistro_nome || "Não informado"}${item.contato_sinistro_telefone ? ` - ${item.contato_sinistro_telefone}` : ""}`,
        );
      }
      linhas.push("");
    });

    if (listaFiltrada.length === 0) linhas.push("Nenhum seguro encontrado.");
    return linhas.join("\n");
  };

  const handleEnviarRelatorioWhatsApp = () => {
    if (listaFiltrada.length === 0) {
      alert("Não há seguros para enviar.");
      return;
    }
    window.open(`https://wa.me/?text=${encodeURIComponent(gerarRelatorioSeguros())}`, "_blank");
  };

  const handleImprimirRelatorioSeguros = () => {
    const janela = window.open("", "", "width=900,height=700");
    if (!janela) return;

    const itensHtml = listaFiltrada
      .map((item: any, index: number) => {
        const equipamento =
          item.equipamento || item.numero || item.veiculo_equipamento || "Equipamento";
        const vencimento = item.dataVal
          ? new Date(item.dataVal + "T00:00:00").toLocaleDateString("pt-BR")
          : "Não informado";
        return `<div class="item"><h3>${index + 1}. ${equipamento}</h3><p><strong>Seguradora:</strong> ${item.seguradora || item.empresa || "Não informada"}</p><p><strong>Vencimento:</strong> ${vencimento} | <strong>Situação:</strong> ${obterStatusSeguro(item)}</p><p><strong>Contato de sinistro:</strong> ${item.contato_sinistro_nome || "Não informado"}${item.contato_sinistro_telefone ? ` - ${item.contato_sinistro_telefone}` : ""}</p></div>`;
      })
      .join("");

    janela.document.write(`<html><head><title>Relatório de Seguros</title><style>body{font-family:Arial,sans-serif;padding:24px;color:#1f2937}h1{font-size:22px;border-bottom:2px solid #1f2937;padding-bottom:8px}h3{margin:0 0 8px}.meta{color:#6b7280;font-size:12px}.item{border:1px solid #d1d5db;border-radius:6px;padding:12px;margin:10px 0}.item p{margin:4px 0;font-size:13px}</style></head><body><h1>Relatório de Seguros Cadastrados</h1><p class="meta">Emissão: ${new Date().toLocaleString("pt-BR")}</p>${itensHtml || "<p>Nenhum seguro encontrado.</p>"}</body></html>`);
    janela.document.close();
    janela.focus();
    setTimeout(() => {
      janela.print();
      janela.close();
    }, 500);
  };

  return (
    <>
      <Button
        size="sm"
        variant="outline"
        className="h-9 relative bg-white hover:bg-slate-100 text-slate-900 border-slate-300 gap-1.5"
        onClick={() => setOpen(true)}
      >
        <Calendar className="w-4 h-4 text-slate-900" />
        <span>Tacógrafo</span>
        {tacografosVencidos.length > 0 ? (
          <span
            className="font-bold text-[10px] h-5 min-w-[20px] px-1.5 flex items-center justify-center rounded-full border-none"
            style={{ backgroundColor: "#dc2626", color: "#ffffff" }}
          >
            {tacografosVencidos.length}
          </span>
        ) : null}
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent
          style={{ backgroundColor: "#ffffff", opacity: 1 }}
          className="sm:max-w-lg text-slate-900 border border-slate-300 shadow-2xl p-0 overflow-hidden"
        >
          <DialogHeader className="p-4 pb-3 border-b border-slate-200 bg-slate-50 flex flex-row items-center justify-between">
            <DialogTitle className="text-slate-900 font-bold text-base">
              Vencimentos de Tacógrafo
            </DialogTitle>
            <div className="flex items-center gap-1.5">
              <Button
                size="sm"
                variant="outline"
                className="h-7 text-xs gap-1 border-slate-300 bg-white"
                onClick={handleImprimirTacografo}
              >
                <Printer className="w-3.5 h-3.5 text-slate-700" />
                Imprimir
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="h-7 text-xs gap-1 border-emerald-300 text-emerald-700 bg-emerald-50 hover:bg-emerald-100"
                onClick={handleEnviarWhatsAppTacografo}
              >
                <MessageCircle className="w-3.5 h-3.5 text-emerald-600" />
                WhatsApp
              </Button>
            </div>
          </DialogHeader>

          <div className="p-4 max-h-[70vh] overflow-y-auto space-y-3 bg-white">
            {tacografosComAlerta.length > 0 && (
              <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg flex items-start gap-2 text-amber-900 text-xs">
                <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                <div>
                  <p className="font-semibold">Atenção aos Vencimentos!</p>
                  <p className="text-[11px] text-amber-800">
                    Existe(m) <strong>{tacografosComAlerta.length}</strong> tacógrafo(s) vencido(s)
                    ou que vence(m) nos próximos 30 dias.
                  </p>
                </div>
              </div>
            )}

            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
              <Input
                placeholder="Filtrar por equipamento, placa..."
                value={filtro}
                onChange={(e) => setFiltro(e.target.value)}
                className="pl-8 h-8 text-xs bg-white border-slate-300 text-slate-900"
              />
            </div>

            {isLoading ? (
              <p className="text-xs text-slate-500 text-center py-4">Carregando dados...</p>
            ) : listaFiltrada.length === 0 ? (
              <p className="text-xs text-slate-500 text-center py-4">
                Nenhum equipamento com data de vencimento cadastrada.
              </p>
            ) : (
              <div className="space-y-2">
                {listaFiltrada.map((item: any, idx: number) => {
                  let bgCard = "bg-slate-50 border-slate-200";
                  let badgeStyle = { backgroundColor: "#e2e8f0", color: "#334155" };
                  let badgeText = "Em dia";

                  if (item.isVencido) {
                    bgCard = "bg-red-50 border-red-200";
                    badgeStyle = { backgroundColor: "#dc2626", color: "#ffffff" };
                    badgeText = "Vencido";
                  } else if (item.isVencendoEmBreve) {
                    bgCard = "bg-amber-50 border-amber-200";
                    badgeStyle = { backgroundColor: "#f59e0b", color: "#ffffff" };
                    badgeText =
                      item.diasRestantes === 0 ? "Hoje" : `Vence em ${item.diasRestantes}d`;
                  }

                  return (
                    <div
                      key={item.id || idx}
                      className={`p-3 rounded-lg border text-xs flex justify-between items-center shadow-sm ${bgCard}`}
                    >
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="font-bold text-slate-900">
                            {item.numero ||
                              item.veiculo_equipamento ||
                              item.equipamento ||
                              "Equipamento"}
                          </p>
                          <span
                            className="text-[10px] px-1.5 py-0.5 rounded-full font-bold shadow-sm inline-block"
                            style={badgeStyle}
                          >
                            {badgeText}
                          </span>
                        </div>
                        {item.placa && (
                          <p className="text-slate-500 font-mono mt-0.5">{item.placa}</p>
                        )}
                      </div>

                      <div className="text-right">
                        <p className="text-slate-500 font-medium text-[10px]">Vencimento:</p>
                        {editandoId === item.id ? (
                          <div className="flex items-center gap-1 mt-0.5">
                            <Input
                              type="date"
                              value={novaData}
                              onChange={(e) => setNovaData(e.target.value)}
                              className="h-7 w-[130px] text-xs bg-white border-slate-300 text-slate-900"
                            />
                            <Button
                              size="sm"
                              className="h-7 px-2 bg-blue-600 hover:bg-blue-700 text-white text-[10px]"
                              disabled={salvando}
                              onClick={() => salvarData(item.id)}
                            >
                              {salvando ? "..." : "Salvar"}
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-7 px-2 text-[10px]"
                              onClick={() => {
                                setEditandoId(null);
                                setNovaData("");
                              }}
                            >
                              X
                            </Button>
                          </div>
                        ) : (
                          <div className="flex items-center gap-1 justify-end">
                            <p className="font-bold font-mono text-slate-900">
                              {item.dataVal
                                ? new Date(item.dataVal + "T00:00:00").toLocaleDateString("pt-BR")
                                : "-"}
                            </p>
                            {isAdmin && (
                              <Button
                                size="sm"
                                variant="outline"
                                className="h-6 px-2 text-[10px] border-slate-300"
                                onClick={() => {
                                  setEditandoId(item.id);
                                  setNovaData(item.dataVal || "");
                                }}
                              >
                                Editar
                              </Button>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

// ----------------------------------------------------
// COMPONENTE: SEGURO
// ----------------------------------------------------
function BotaoSeguro() {
  const [open, setOpen] = useState(false);
  const [filtro, setFiltro] = useState("");
  const [form, setForm] = useState({
    veiculo_equipamento: "",
    seguradora: "",
    data_vencimento: "",
    contato_sinistro_nome: "",
    contato_sinistro_telefone: "",
  });
  const [editandoId, setEditandoId] = useState<string | null>(null);
  const [salvando, setSalvando] = useState(false);

  const {
    data: seguros,
    isLoading,
    refetch,
  } = useQuery({
    queryKey: ["seguros-vencimentos"],
    queryFn: async () => {
      const { data, error } = await supabase.from("seguros").select("*");

      if (error) {
        console.error("Erro ao carregar seguros:", error);
        return [];
      }
      return data ?? [];
    },
  });

  function limpar() {
    setForm({
      veiculo_equipamento: "",
      seguradora: "",
      data_vencimento: "",
      contato_sinistro_nome: "",
      contato_sinistro_telefone: "",
    });
    setEditandoId(null);
  }

  async function salvarSeguro() {
    if (!form.veiculo_equipamento.trim() || !form.seguradora.trim() || !form.data_vencimento) {
      alert("Preencha equipamento, seguradora e data de vencimento.");
      return;
    }
    setSalvando(true);
    const payload = {
      veiculo_equipamento: form.veiculo_equipamento.trim(),
      seguradora: form.seguradora.trim(),
      data_vencimento: form.data_vencimento,
      contato_sinistro_nome: form.contato_sinistro_nome.trim() || null,
      contato_sinistro_telefone: form.contato_sinistro_telefone.trim() || null,
    };
    const { error } = editandoId
      ? await supabase.from("seguros").update(payload).eq("id", editandoId)
      : await supabase.from("seguros").insert(payload);
    setSalvando(false);
    if (error) {
      alert("Erro ao salvar seguro: " + error.message);
      return;
    }
    limpar();
    refetch();
  }

  async function excluirSeguro(id: string) {
    if (!confirm("Excluir este seguro?")) return;
    const { error } = await supabase.from("seguros").delete().eq("id", id);
    if (error) {
      alert("Erro ao excluir: " + error.message);
      return;
    }
    if (editandoId === id) limpar();
    refetch();
  }

  const segurosVencidos = useMemo(() => {
    if (!seguros) return [];
    return seguros.filter((item: any) => {
      const dataVal = item.vencimento || item.data_vencimento || item.vencimento_seguro;
      if (!dataVal) return false;
      const dias = calcularDiasVencimento(dataVal);
      return dias !== null && dias < 0;
    });
  }, [seguros]);

  const segurosComAlerta = useMemo(() => {
    if (!seguros) return [];
    return seguros.filter((item: any) => {
      const dataVal = item.vencimento || item.data_vencimento || item.vencimento_seguro;
      if (!dataVal) return false;
      const dias = calcularDiasVencimento(dataVal);
      return dias !== null && dias <= 30;
    });
  }, [seguros]);

  const todosComStatus = useMemo(() => {
    if (!seguros) return [];
    return seguros
      .map((item: any) => {
        const dataVal = item.vencimento || item.data_vencimento || item.vencimento_seguro;
        const diasRestantes = dataVal ? calcularDiasVencimento(dataVal) : null;

        const isVencido = diasRestantes !== null && diasRestantes < 0;
        const isVencendoEmBreve =
          diasRestantes !== null && diasRestantes >= 0 && diasRestantes <= 30;

        return {
          ...item,
          dataVal,
          diasRestantes,
          isVencido,
          isVencendoEmBreve,
        };
      })
      .sort((a, b) => {
        const pA = a.isVencido ? 0 : a.isVencendoEmBreve ? 1 : 2;
        const pB = b.isVencido ? 0 : b.isVencendoEmBreve ? 1 : 2;
        return pA - pB;
      });
  }, [seguros]);

  const listaFiltrada = useMemo(() => {
    const f = filtro.toLowerCase().trim();
    if (!f) return todosComStatus;
    return todosComStatus.filter((item: any) =>
      Object.values(item).some((val) =>
        String(val ?? "")
          .toLowerCase()
          .includes(f),
      ),
    );
  }, [todosComStatus, filtro]);

  // Função para Enviar Relatório via WhatsApp (Seguros)
  const handleEnviarWhatsAppSeguro = () => {
    if (todosComStatus.length === 0) {
      toast.error("Não há dados de seguros para enviar.");
      return;
    }

    let texto = `🛡️ *RELATÓRIO DE VENCIMENTOS DE SEGUROS*\n\n`;

    todosComStatus.forEach((item: any, idx: number) => {
      const equip = item.equipamento || item.numero || item.veiculo_equipamento || "Equipamento";
      const seguradora = item.seguradora || item.empresa || "N/I";
      const statusStr = item.isVencido ? "🚨 VENCIDO" : item.isVencendoEmBreve ? "⚠️ Vencendo em breve" : "✅ Em dia";
      const dataFmt = item.dataVal ? new Date(item.dataVal + "T00:00:00").toLocaleDateString("pt-BR") : "-";

      texto += `${idx + 1}. *${equip}* - Seguradora: ${seguradora}\n`;
      texto += `   • Vencimento: ${dataFmt}\n`;
      texto += `   • Situação: ${statusStr}\n`;
      if (item.contato_sinistro_nome || item.contato_sinistro_telefone) {
        texto += `   • Sinistro: ${item.contato_sinistro_nome || "-"} (${item.contato_sinistro_telefone || "-"})\n`;
      }
      texto += `\n`;
    });

    const url = `https://api.whatsapp.com/send?text=${encodeURIComponent(texto)}`;
    window.open(url, "_blank");
  };

  // Função para Imprimir Relatório (Seguros)
  const handleImprimirSeguro = () => {
    const janela = window.open("", "", "width=800,height=600");
    if (!janela) return;

    const html = `
      <html>
        <head>
          <title>Relatório de Vencimentos de Seguros</title>
          <style>
            body { font-family: Arial, sans-serif; padding: 20px; color: #333; }
            h2 { border-bottom: 2px solid #333; padding-bottom: 8px; }
            table { width: 100%; border-collapse: collapse; margin-top: 20px; }
            th, td { border: 1px solid #ddd; padding: 8px 12px; text-align: left; font-size: 12px; }
            th { background-color: #f2f2f2; }
            .vencido { color: #dc2626; font-weight: bold; }
            .atencao { color: #d97706; font-weight: bold; }
            .ok { color: #16a34a; }
          </style>
        </head>
        <body>
          <h2>Relatório de Vencimentos de Seguros</h2>
          <p>Gerado em: ${new Date().toLocaleDateString("pt-BR")} às ${new Date().toLocaleTimeString("pt-BR")}</p>
          <table>
            <thead>
              <tr>
                <th>Equipamento</th>
                <th>Seguradora</th>
                <th>Vencimento</th>
                <th>Contato Sinistro</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              ${todosComStatus.map((item: any) => {
                const equip = item.equipamento || item.numero || item.veiculo_equipamento || "Equipamento";
                const seguradora = item.seguradora || item.empresa || "N/I";
                const dataFmt = item.dataVal ? new Date(item.dataVal + "T00:00:00").toLocaleDateString("pt-BR") : "-";
                const contato = `${item.contato_sinistro_nome || "-"} ${item.contato_sinistro_telefone ? `(${item.contato_sinistro_telefone})` : ""}`;
                
                let statusClass = "ok";
                let statusText = "Em dia";
                if (item.isVencido) {
                  statusClass = "vencido";
                  statusText = "Vencido";
                } else if (item.isVencendoEmBreve) {
                  statusClass = "atencao";
                  statusText = item.diasRestantes === 0 ? "Vence Hoje" : `Vence em ${item.diasRestantes}d`;
                }

                return `
                  <tr>
                    <td><b>${equip}</b></td>
                    <td>${seguradora}</td>
                    <td>${dataFmt}</td>
                    <td>${contato}</td>
                    <td class="${statusClass}">${statusText}</td>
                  </tr>
                `;
              }).join("")}
            </tbody>
          </table>
        </body>
      </html>
    `;
    janela.document.write(html);
    janela.document.close();
    janela.print();
  };

  return (
    <>
      <Button
        size="sm"
        variant="outline"
        className="h-9 relative bg-white hover:bg-slate-100 text-slate-900 border-slate-300 gap-1.5"
        onClick={() => setOpen(true)}
      >
        <ShieldCheck className="w-4 h-4 text-slate-900" />
        <span>Seguro</span>
        {segurosVencidos.length > 0 ? (
          <span
            className="font-bold text-[10px] h-5 min-w-[20px] px-1.5 flex items-center justify-center rounded-full border-none"
            style={{ backgroundColor: "#dc2626", color: "#ffffff" }}
          >
            {segurosVencidos.length}
          </span>
        ) : null}
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent
          style={{ backgroundColor: "#ffffff", opacity: 1 }}
          className="sm:max-w-lg text-slate-900 border border-slate-300 shadow-2xl p-0 overflow-hidden"
        >
          <DialogHeader className="p-4 pb-3 border-b border-slate-200 bg-slate-50 flex flex-row items-center justify-between">
            <DialogTitle className="text-slate-900 font-bold text-base">
              Gerenciar Seguros
            </DialogTitle>
            <div className="flex items-center gap-1.5">
              <Button
                size="sm"
                variant="outline"
                className="h-7 text-xs gap-1 border-slate-300 bg-white"
                onClick={handleImprimirSeguro}
              >
                <Printer className="w-3.5 h-3.5 text-slate-700" />
                Imprimir
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="h-7 text-xs gap-1 border-emerald-300 text-emerald-700 bg-emerald-50 hover:bg-emerald-100"
                onClick={handleEnviarWhatsAppSeguro}
              >
                <MessageCircle className="w-3.5 h-3.5 text-emerald-600" />
                WhatsApp
              </Button>

          <DialogHeader className="p-4 pb-3 border-b border-slate-200 bg-slate-50">
            <div className="flex items-center justify-between gap-2">
              <DialogTitle className="text-slate-900 font-bold text-base">
                Gerenciar Seguros
              </DialogTitle>
              <div className="flex items-center gap-1.5">
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  className="h-8 gap-1 text-xs"
                  onClick={handleImprimirRelatorioSeguros}
                  disabled={isLoading}
                  title="Imprimir relatório de seguros"
                >
                  <Printer className="h-3.5 w-3.5" /> Imprimir
                </Button>
                <Button
                  type="button"
                  size="sm"
                  className="h-8 gap-1 bg-emerald-600 text-xs text-white hover:bg-emerald-700"
                  onClick={handleEnviarRelatorioWhatsApp}
                  disabled={isLoading || listaFiltrada.length === 0}
                  title="Enviar relatório via WhatsApp"
                >
                  <MessageCircle className="h-3.5 w-3.5" /> WhatsApp
                </Button>
              </div>
            </div>
          </DialogHeader>

          <div className="p-4 max-h-[70vh] overflow-y-auto space-y-3 bg-white">
            {segurosComAlerta.length > 0 && (
              <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg flex items-start gap-2 text-amber-900 text-xs">
                <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                <div>
                  <p className="font-semibold">Atenção aos Vencimentos!</p>
                  <p className="text-[11px] text-amber-800">
                    Existe(m) <strong>{segurosComAlerta.length}</strong> seguro(s) vencido(s) ou que
                    vence(m) nos próximos 30 dias.
                  </p>
                </div>
              </div>
            )}

            <div className="p-3 rounded-lg border border-slate-200 bg-slate-50 space-y-2">
              <p className="text-xs font-bold text-slate-900">
                {editandoId ? "Editar seguro" : "Cadastrar seguro"}
              </p>
              <Input
                placeholder="Veículo / Equipamento *"
                value={form.veiculo_equipamento}
                onChange={(e) => setForm({ ...form, veiculo_equipamento: e.target.value })}
                className="h-8 text-xs bg-white border-slate-300 text-slate-900"
              />
              <Input
                placeholder="Seguradora *"
                value={form.seguradora}
                onChange={(e) => setForm({ ...form, seguradora: e.target.value })}
                className="h-8 text-xs bg-white border-slate-300 text-slate-900"
              />
              <Input
                type="date"
                value={form.data_vencimento}
                onChange={(e) => setForm({ ...form, data_vencimento: e.target.value })}
                className="h-8 text-xs bg-white border-slate-300 text-slate-900"
              />
              <div className="pt-1 border-t border-slate-200">
                <p className="text-[11px] font-semibold text-slate-600 mb-1.5">
                  Em caso de sinistro, contactar:
                </p>
                <div className="space-y-2">
                  <Input
                    placeholder="Nome do contato"
                    value={form.contato_sinistro_nome}
                    onChange={(e) =>
                      setForm({ ...form, contato_sinistro_nome: e.target.value })
                    }
                    className="h-8 text-xs bg-white border-slate-300 text-slate-900"
                  />
                  <Input
                    placeholder="Telefone do contato"
                    value={form.contato_sinistro_telefone}
                    onChange={(e) =>
                      setForm({ ...form, contato_sinistro_telefone: e.target.value })
                    }
                    className="h-8 text-xs bg-white border-slate-300 text-slate-900"
                  />
                </div>
              </div>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  onClick={salvarSeguro}
                  disabled={salvando}
                  className="h-8 text-xs flex-1 bg-blue-700 hover:bg-blue-600 text-white"
                >
                  {salvando ? "Salvando..." : editandoId ? "Salvar alterações" : "Cadastrar"}
                </Button>
                {editandoId && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={limpar}
                    className="h-8 text-xs border-slate-300 text-slate-700"
                  >
                    Cancelar
                  </Button>
                )}
              </div>
            </div>

            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
              <Input
                placeholder="Filtrar equipamento ou seguradora..."
                value={filtro}
                onChange={(e) => setFiltro(e.target.value)}
                className="pl-8 h-8 text-xs bg-white border-slate-300 text-slate-900"
              />
            </div>

            {isLoading ? (
              <p className="text-xs text-slate-500 text-center py-4">Carregando dados...</p>
            ) : listaFiltrada.length === 0 ? (
              <p className="text-xs text-slate-500 text-center py-4">Nenhum seguro encontrado.</p>
            ) : (
              <div className="space-y-2">
                {listaFiltrada.map((item: any, idx: number) => {
                  let bgCard = "bg-slate-50 border-slate-200";
                  let badgeStyle = { backgroundColor: "#e2e8f0", color: "#334155" };
                  let badgeText = "Em dia";

                  if (item.isVencido) {
                    bgCard = "bg-red-50 border-red-200";
                    badgeStyle = { backgroundColor: "#dc2626", color: "#ffffff" };
                    badgeText = "Vencido";
                  } else if (item.isVencendoEmBreve) {
                    bgCard = "bg-amber-50 border-amber-200";
                    badgeStyle = { backgroundColor: "#f59e0b", color: "#ffffff" };
                    badgeText =
                      item.diasRestantes === 0 ? "Hoje" : `Vence em ${item.diasRestantes}d`;
                  }

                  return (
                    <div
                      key={item.id || idx}
                      className={`p-3 rounded-lg border text-xs flex justify-between items-center shadow-sm ${bgCard}`}
                    >
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="font-bold text-slate-900">
                            {item.equipamento ||
                              item.numero ||
                              item.veiculo_equipamento ||
                              "Equipamento"}
                          </p>
                          <span
                            className="text-[10px] px-1.5 py-0.5 rounded-full font-bold shadow-sm inline-block"
                            style={badgeStyle}
                          >
                            {badgeText}
                          </span>
                        </div>
                        <p className="text-slate-500 font-medium mt-0.5">
                          {item.seguradora || item.empresa || "Seguradora não informada"}
                        </p>
                        {(item.contato_sinistro_nome || item.contato_sinistro_telefone) && (
                          <p className="text-[11px] text-slate-600 mt-0.5">
                            Sinistro: {item.contato_sinistro_nome || "-"}{" "}
                            {item.contato_sinistro_telefone
                              ? `• ${item.contato_sinistro_telefone}`
                              : ""}
                          </p>
                        )}
                      </div>

                      <div className="flex items-center gap-2">
                        <div className="text-right">
                          <p className="text-slate-500 font-medium text-[10px]">Vencimento:</p>
                          <p className="font-bold font-mono text-slate-900">
                            {item.dataVal
                              ? new Date(item.dataVal + "T00:00:00").toLocaleDateString("pt-BR")
                              : "-"}
                          </p>
                        </div>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-7 w-7"
                          onClick={() => {
                            setEditandoId(item.id);
                            setForm({
                              veiculo_equipamento: item.veiculo_equipamento ?? "",
                              seguradora: item.seguradora ?? "",
                              data_vencimento: item.dataVal ?? "",
                              contato_sinistro_nome: item.contato_sinistro_nome ?? "",
                              contato_sinistro_telefone: item.contato_sinistro_telefone ?? "",
                            });
                          }}
                        >
                          <Edit3 className="w-3.5 h-3.5 text-blue-700" />
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-7 w-7"
                          onClick={() => excluirSeguro(item.id)}
                        >
                          <Trash2 className="w-3.5 h-3.5 text-red-600" />
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
