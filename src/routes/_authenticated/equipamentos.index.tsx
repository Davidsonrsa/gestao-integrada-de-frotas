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
          className="sm:max-w-md text-slate-900 border border-slate-300 shadow-2xl p-0 overflow-hidden"
        >
          <DialogHeader className="p-4 pb-3 border-b border-slate-200 bg-slate-50">
            <DialogTitle className="text-slate-900 font-bold text-base">
              Vencimentos de Tacógrafo
            </DialogTitle>
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
          className="sm:max-w-md text-slate-900 border border-slate-300 shadow-2xl p-0 overflow-hidden"
        >
          <DialogHeader className="p-4 pb-3 border-b border-slate-200 bg-slate-50">
            <DialogTitle className="text-slate-900 font-bold text-base">
              Gerenciar Seguros
            </DialogTitle>
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

// ----------------------------------------------------
// COMPONENTE: MODAL DE PENDÊNCIAS DE MANUTENÇÃO POR EQUIPAMENTO
// ----------------------------------------------------
function BotaoPendenciasCard({
  equipamentoId,
  numeroEquipamento,
}: {
  equipamentoId: string;
  numeroEquipamento: string;
}) {
  const [open, setOpen] = useState(false);
  const [novaDescricao, setNovaDescricao] = useState("");
  const [executadoPor, setExecutadoPor] = useState("");
  const [editandoId, setEditandoId] = useState<string | null>(null);
  const [editDescricao, setEditDescricao] = useState("");
  const [editExecutado, setEditExecutado] = useState("");
  const { fullName } = useAuth();

  // Buscar pendências do equipamento
  const { data: pendencias = [], refetch } = useQuery({
    queryKey: ["manutencao-pendencias", equipamentoId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("manutencao_pendencias")
        .select("*")
        .eq("equipamento_id", equipamentoId)
        .order("created_at", { ascending: false });

      if (error) {
        console.warn("Aviso ao buscar pendências:", error);
        return [];
      }
      return data ?? [];
    },
  });

  // Filtra apenas as pendências que estão com status PENDENTE
  const pendenciasAbertas = useMemo(() => {
    return pendencias.filter((p: any) => !p.status || p.status === "PENDENTE");
  }, [pendencias]);

  const temPendenciasAbertas = pendenciasAbertas.length > 0;

  const handleSalvar = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!novaDescricao.trim()) return;

    const nomeUsuario = fullName || "Usuário Sistema";
    const statusInicial = executadoPor.trim() ? "CONCLUIDO" : "PENDENTE";

    const { error } = await supabase.from("manutencao_pendencias").insert([
      {
        equipamento_id: equipamentoId,
        descricao: novaDescricao,
        registrado_por: nomeUsuario,
        executado_por: executadoPor.trim() || null,
        status: statusInicial,
      },
    ]);

    if (error) {
      alert("Erro ao salvar pendência.");
      console.error(error);
      return;
    }

    setNovaDescricao("");
    setExecutadoPor("");
    refetch();
  };

  const handleDeletar = async (id: string) => {
    if (!confirm("Deseja realmente excluir esta pendência?")) return;
    const { error } = await supabase.from("manutencao_pendencias").delete().eq("id", id);
    if (error) {
      alert("Erro ao excluir.");
      return;
    }
    refetch();
  };

  const handleAtualizar = async (id: string) => {
    const novoStatus = editExecutado.trim() ? "CONCLUIDO" : "PENDENTE";
    const { error } = await supabase
      .from("manutencao_pendencias")
      .update({
        descricao: editDescricao,
        executado_por: editExecutado.trim() || null,
        status: novoStatus,
      })
      .eq("id", id);

    if (error) {
      alert("Erro ao atualizar.");
      return;
    }

    setEditandoId(null);
    refetch();
  };

  // Função para Enviar via WhatsApp
  const handleEnviarWhatsApp = () => {
    if (pendencias.length === 0) {
      alert("Não há pendências para enviar.");
      return;
    }

    let texto = `📋 *RELATÓRIO DE PENDÊNCIAS — EQUIPAMENTO: ${numeroEquipamento}*\n\n`;

    pendencias.forEach((p: any, index: number) => {
      texto += `${index + 1}. *${p.descricao}*\n`;
      texto += `   • Status: ${p.status || "PENDENTE"}\n`;
      texto += `   • Registrado por: ${p.registrado_por || "N/I"}\n`;
      texto += `   • Executado por: ${p.executado_por || "Pendente"}\n\n`;
    });

    const url = `https://api.whatsapp.com/send?text=${encodeURIComponent(texto)}`;
    window.open(url, "_blank");
  };

  // Função para Imprimir Relatório
  const handleImprimir = () => {
    const janelaImpressao = window.open("", "", "width=800,height=600");
    if (!janelaImpressao) return;

    const html = `
      <html>
        <head>
          <title>Relatório de Pendências - ${numeroEquipamento}</title>
          <style>
            body { font-family: Arial, sans-serif; padding: 20px; color: #333; }
            h2 { border-bottom: 2px solid #333; padding-bottom: 8px; }
            .item { border: 1px solid #ddd; padding: 12px; margin-bottom: 10px; border-radius: 6px; background: #f9f9f9; }
            .pendente { color: #dc2626; font-weight: bold; }
            .concluido { color: #16a34a; font-weight: bold; }
            .meta { font-size: 12px; color: #666; margin-top: 6px; }
          </style>
        </head>
        <body>
          <h2>Relatório de Manutenção — Equipamento: ${numeroEquipamento}</h2>
          <p>Data de emissão: ${new Date().toLocaleString("pt-BR")}</p>
          <hr />
          ${
            pendencias.length === 0
              ? "<p>Nenhuma pendência registrada.</p>"
              : pendencias
                  .map(
                    (p: any) => `
                <div class="item">
                  <strong>${p.descricao}</strong> 
                  <span class="${p.status === "CONCLUIDO" ? "concluido" : "pendente"}">
                    [${p.status || "PENDENTE"}]
                  </span>
                  <div class="meta">
                    Registrado por: ${p.registrado_por || "Não informado"} | 
                    Executado por: ${p.executado_por || "Pendente"} | 
                    Data: ${new Date(p.created_at).toLocaleString("pt-BR")}
                  </div>
                </div>
              `,
                  )
                  .join("")
          }
        </body>
      </html>
    `;

    janelaImpressao.document.write(html);
    janelaImpressao.document.close();
    janelaImpressao.focus();
    setTimeout(() => {
      janelaImpressao.print();
      janelaImpressao.close();
    }, 500);
  };

  return (
    <>
      <Button
        size="sm"
        className={`h-7 px-2.5 text-[11px] gap-1 font-bold shadow-sm transition-all border ${
          temPendenciasAbertas
            ? "text-white border-red-700 animate-pulse"
            : "text-slate-700 border-slate-300 hover:bg-slate-200"
        }`}
        style={
          temPendenciasAbertas
            ? { backgroundColor: "#dc2626", color: "#ffffff", opacity: 1 }
            : { backgroundColor: "#f1f5f9", color: "#334155", opacity: 1 }
        }
        onClick={(e) => {
          e.preventDefault();
          setOpen(true);
        }}
      >
        <AlertCircle
          className={`w-3.5 h-3.5 ${temPendenciasAbertas ? "text-white animate-bounce" : "text-slate-500"}`}
        />
        <span>
          {temPendenciasAbertas ? `Pendências (${pendenciasAbertas.length})` : "Pendências"}
        </span>
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent
          style={{ backgroundColor: "#ffffff", opacity: 1 }}
          className="sm:max-w-lg text-slate-900 border border-slate-300 shadow-2xl p-0 overflow-hidden"
          onClick={(e) => e.stopPropagation()}
        >
          <DialogHeader className="p-4 pb-3 border-b border-slate-200 bg-slate-50 flex flex-row items-center justify-between">
            <DialogTitle className="text-slate-900 font-bold text-base flex items-center gap-2">
              <AlertCircle className="w-5 h-5 text-red-600" />
              Pendências — {numeroEquipamento}
            </DialogTitle>

            {/* BOTÕES DE AÇÃO RÁPIDA (IMPRESSÃO E WHATSAPP) */}
            <div className="flex items-center gap-1.5 mr-6">
              <Button
                size="sm"
                variant="outline"
                className="h-7 text-xs bg-white border-slate-300 text-slate-800 hover:bg-slate-100 gap-1"
                onClick={handleImprimir}
                title="Imprimir Relatório"
              >
                🖨️ Imprimir
              </Button>
              <Button
                size="sm"
                className="h-7 text-xs bg-emerald-600 hover:bg-emerald-700 text-white gap-1"
                onClick={handleEnviarWhatsApp}
                title="Enviar via WhatsApp"
              >
                💬 WhatsApp
              </Button>
            </div>
          </DialogHeader>

          <div className="p-4 max-h-[75vh] overflow-y-auto space-y-4 bg-white">
            <form
              onSubmit={handleSalvar}
              className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-3"
            >
              <p className="text-xs font-bold text-slate-800">Registrar Nova Pendência</p>
              <Textarea
                placeholder="Descreva a pendência ou manutenção necessária..."
                value={novaDescricao}
                onChange={(e) => setNovaDescricao(e.target.value)}
                className="text-xs bg-white border-slate-300 min-h-[60px] text-slate-900"
                required
              />
              <div className="flex gap-2">
                <Input
                  placeholder="Executado por (opcional se concluído)"
                  value={executadoPor}
                  onChange={(e) => setExecutadoPor(e.target.value)}
                  className="text-xs h-8 bg-white border-slate-300 flex-1 text-slate-900"
                />
                <Button
                  type="submit"
                  size="sm"
                  className="h-8 bg-blue-600 hover:bg-blue-700 text-xs text-white"
                >
                  Salvar
                </Button>
              </div>
            </form>

            <div className="space-y-2">
              <p className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                Histórico de Pendências
              </p>
              {pendencias.length === 0 ? (
                <p className="text-xs text-slate-500 text-center py-6 bg-slate-50 rounded-lg border border-dashed border-slate-200">
                  Nenhuma pendência registrada para este equipamento.
                </p>
              ) : (
                pendencias.map((item: any) => (
                  <div
                    key={item.id}
                    className="p-3 rounded-lg border border-slate-200 bg-white shadow-sm space-y-2 text-xs"
                  >
                    {editandoId === item.id ? (
                      <div className="space-y-2">
                        <Textarea
                          value={editDescricao}
                          onChange={(e) => setEditDescricao(e.target.value)}
                          className="text-xs bg-white border-slate-300 text-slate-900"
                        />
                        <Input
                          placeholder="Executado por"
                          value={editExecutado}
                          onChange={(e) => setEditExecutado(e.target.value)}
                          className="text-xs h-8 bg-white border-slate-300 text-slate-900"
                        />
                        <div className="flex justify-end gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-7 text-xs"
                            onClick={() => setEditandoId(null)}
                          >
                            Cancelar
                          </Button>
                          <Button
                            size="sm"
                            className="h-7 text-xs bg-emerald-600 hover:bg-emerald-700 text-white"
                            onClick={() => handleAtualizar(item.id)}
                          >
                            Atualizar
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <>
                        <div className="flex justify-between items-start gap-2">
                          <p className="font-semibold text-slate-900 flex-1">{item.descricao}</p>
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                              item.status === "CONCLUIDO"
                                ? "bg-emerald-100 text-emerald-800"
                                : "bg-red-100 text-red-800"
                            }`}
                          >
                            {item.status || "PENDENTE"}
                          </span>
                        </div>

                        <div className="text-[11px] text-slate-500 space-y-0.5 border-t border-slate-100 pt-1.5">
                          <p>
                            👤 <strong>Registrado por:</strong>{" "}
                            {item.registrado_por || "Não informado"}
                          </p>
                          <p>
                            🛠️ <strong>Executado por:</strong>{" "}
                            {item.executado_por || "Pendente de execução"}
                          </p>
                          <p className="text-[10px] text-slate-400">
                            📅 {new Date(item.created_at).toLocaleString("pt-BR")}
                          </p>
                        </div>

                        <div className="flex justify-end gap-2 pt-1 border-t border-slate-100">
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-7 px-2 text-xs text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                            onClick={() => {
                              setEditandoId(item.id);
                              setEditDescricao(item.descricao);
                              setEditExecutado(item.executado_por || "");
                            }}
                          >
                            <Edit3 className="w-3 h-3 mr-1" /> Editar
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-7 px-2 text-xs text-red-600 hover:text-red-700 hover:bg-red-50"
                            onClick={() => handleDeletar(item.id)}
                          >
                            <Trash2 className="w-3 h-3 mr-1" /> Deletar
                          </Button>
                        </div>
                      </>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
// ----------------------------------------------------
// TELA PRINCIPAL
// ----------------------------------------------------
function BotaoPendenciasAbertas({
  clOptions,
  equipamentos,
}: {
  clOptions: string[];
  equipamentos: Equip[];
}) {
  const [open, setOpen] = useState(false);
  const [clFiltro, setClFiltro] = useState("__all");
  const { data: pendencias = [], isLoading } = useQuery({
    queryKey: ["pendencias-abertas-frota"],
    enabled: open,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("manutencao_pendencias")
        .select("id, equipamento_id, descricao, registrado_por, created_at, status")
        .or("status.is.null,status.eq.PENDENTE")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  const agrupadas = useMemo(() => {
    const porId = new Map(equipamentos.map((equipamento) => [equipamento.id, equipamento]));
    const grupos = new Map<string, { equipamento: Equip; pendencias: typeof pendencias }>();
    pendencias.forEach((pendencia) => {
      if (!pendencia.equipamento_id) return;
      const equipamento = porId.get(pendencia.equipamento_id);
      if (!equipamento || (clFiltro !== "__all" && equipamento.cl !== clFiltro)) return;
      const grupo = grupos.get(equipamento.id);
      grupos.set(equipamento.id, {
        equipamento,
        pendencias: [...(grupo?.pendencias ?? []), pendencia],
      });
    });
    return Array.from(grupos.values()).sort((a, b) =>
      a.equipamento.numero.localeCompare(b.equipamento.numero),
    );
  }, [equipamentos, pendencias, clFiltro]);

  const handleImprimir = () => {
    const janela = window.open("", "", "width=900,height=700");
    if (!janela) return;
    const tituloCl = clFiltro === "__all" ? "Todos os CLs" : `CL ${clFiltro}`;
    const gruposHtml = agrupadas
      .map(
        ({ equipamento, pendencias: itens }) => `
          <h2>${equipamento.numero}${equipamento.cl ? ` - CL ${equipamento.cl}` : ""}</h2>
          ${itens.map((item) => `<div class="item"><strong>${item.descricao}</strong><div class="meta">Registrado por: ${item.registrado_por || "Não informado"} | ${new Date(item.created_at).toLocaleString("pt-BR")}</div></div>`).join("")}
        `,
      )
      .join("");
    janela.document.write(`<html><head><title>Pendências abertas - ${tituloCl}</title><style>body{font-family:Arial;padding:24px;color:#111827}h1{font-size:20px;border-bottom:2px solid #111827;padding-bottom:8px}h2{font-size:16px;margin:20px 0 8px}.item{border:1px solid #d1d5db;padding:10px;margin:6px 0}.meta{color:#6b7280;font-size:11px;margin-top:4px}</style></head><body><h1>Relatório de pendências abertas - ${tituloCl}</h1><p>Emissão: ${new Date().toLocaleString("pt-BR")}</p>${gruposHtml || "<p>Nenhuma pendência aberta encontrada.</p>"}</body></html>`);
    janela.document.close();
    janela.focus();
    setTimeout(() => {
      janela.print();
      janela.close();
    }, 500);
  };

  const gerarTextoRelatorio = () => {
    const titulo = clFiltro === "__all" ? "Todos os CLs" : `CL ${clFiltro}`;
    const linhas = [`RELATÓRIO DE PENDÊNCIAS ABERTAS - ${titulo}`, ""];
    agrupadas.forEach(({ equipamento, pendencias: itens }) => {
      linhas.push(`${equipamento.numero}${equipamento.cl ? ` - CL ${equipamento.cl}` : ""}`);
      itens.forEach((item, index) => {
        linhas.push(`${index + 1}. ${item.descricao}`);
        linhas.push(`   Registrado por: ${item.registrado_por || "Não informado"}`);
      });
      linhas.push("");
    });
    return linhas.join("\n");
  };

  const handleEnviarWhatsApp = () => {
    if (!agrupadas.length) return;
    window.open(`https://wa.me/?text=${encodeURIComponent(gerarTextoRelatorio())}`, "_blank");
  };

  const handleEnviarEmail = () => {
    if (!agrupadas.length) return;
    const titulo = clFiltro === "__all" ? "Todos os CLs" : `CL ${clFiltro}`;
    window.location.href = `mailto:?subject=${encodeURIComponent(`Pendências abertas - ${titulo}`)}&body=${encodeURIComponent(gerarTextoRelatorio())}`;
  };

  return (
    <>
      <Button type="button" size="sm" variant="outline" className="h-9 text-xs border-slate-200 gap-1.5 bg-white" onClick={() => setOpen(true)}>
        <ClipboardList className="w-4 h-4" /> Pendências abertas
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-2xl text-slate-900 bg-white">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><ClipboardList className="w-5 h-5 text-red-600" />Pendências abertas</DialogTitle>
          </DialogHeader>
          <div className="flex items-center justify-between gap-2 border-y border-slate-200 py-3">
            <Select value={clFiltro} onValueChange={setClFiltro}>
              <SelectTrigger className="h-9 w-[180px] text-xs"><SelectValue placeholder="Filtrar por CL" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="__all">Todos os CLs</SelectItem>
                {clOptions.map((opcao) => <SelectItem key={opcao} value={opcao}>CL {opcao}</SelectItem>)}
              </SelectContent>
            </Select>
            <div className="flex items-center gap-1.5">
              <Button type="button" size="sm" variant="outline" className="h-9 text-xs gap-1.5" onClick={handleEnviarWhatsApp} disabled={isLoading || !agrupadas.length}>
                <MessageCircle className="w-4 h-4 text-emerald-600" /> WhatsApp
              </Button>
              <Button type="button" size="sm" variant="outline" className="h-9 text-xs gap-1.5" onClick={handleEnviarEmail} disabled={isLoading || !agrupadas.length}>
                <Mail className="w-4 h-4 text-blue-600" /> E-mail
              </Button>
              <Button type="button" size="sm" variant="outline" className="h-9 text-xs gap-1.5" onClick={handleImprimir} disabled={isLoading}>
                <Printer className="w-4 h-4" /> Imprimir
              </Button>
            </div>
          </div>
          {isLoading ? <p className="py-8 text-center text-xs text-slate-500">Carregando pendências...</p> : agrupadas.length === 0 ? <p className="py-8 text-center text-xs text-slate-500">Nenhuma pendência aberta encontrada para este filtro.</p> : (
            <div className="max-h-[55vh] overflow-y-auto space-y-3">
              {agrupadas.map(({ equipamento, pendencias: itens }) => (
                <div key={equipamento.id} className="rounded-lg border border-slate-200 p-3">
                  <div className="flex items-center justify-between gap-2 mb-2"><p className="text-sm font-bold text-slate-900">{equipamento.numero}</p>{equipamento.cl && <Badge variant="secondary" className="text-[10px]">CL {equipamento.cl}</Badge>}</div>
                  {itens.map((item) => <div key={item.id} className="rounded bg-red-50 px-2.5 py-2 text-xs mb-1.5"><p className="font-medium text-red-900">{item.descricao}</p><p className="mt-1 text-[10px] text-red-700">Registrado por: {item.registrado_por || "Não informado"}</p></div>)}
                </div>
              ))}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}

function EquipamentosList() {
  const { isAdmin } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [q, setQ] = useState("");
  const [cl, setCl] = useState<string>("__all");
  const [onlyOverdue, setOnlyOverdue] = useState(false);
  const [horimetroDrafts, setHorimetroDrafts] = useState<Record<string, string>>({});

  const { data, isLoading } = useQuery({
    queryKey: ["equipamentos"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("equipamentos")
        .select(
          "id, numero, identificacao, placa, localizacao, operador_contato, horimetro_atual, h_revisao, limite_revisao, proxima_revisao_horimetro, data_horimetro_atual, status, cl, cover_storage_path",
        )
        .order("numero", { ascending: true });

      if (error) throw error;
      return (data ?? []) as Equip[];
    },
  });

  useEffect(() => {
    if (!data) return;
    setHorimetroDrafts((drafts) => {
      const next = { ...drafts };
      data.forEach((equipamento) => {
        if (!(equipamento.id in next)) {
          next[equipamento.id] = equipamento.horimetro_atual?.toString() ?? "";
        }
      });
      return next;
    });
  }, [data]);

  const totalEquipamentosVencidos = useMemo(() => {
    if (!data) return 0;
    return data.filter((e) => {
      const hrRodado =
        e.horimetro_atual != null && e.h_revisao != null
          ? Math.max(0, Number(e.horimetro_atual) - Number(e.h_revisao))
          : 0;
      const limite = Number(e.limite_revisao ?? 500);
      return hrRodado > limite;
    }).length;
  }, [data]);

  const [covers, setCovers] = useState<Record<string, string>>({});
  useEffect(() => {
    if (!data) return;
    const paths = data.filter((e) => e.cover_storage_path).map((e) => e.cover_storage_path!);
    if (!paths.length) return;
    (async () => {
      const { data: signed } = await supabase.storage
        .from("equipamento-fotos")
        .createSignedUrls(paths, 60 * 60);
      const map: Record<string, string> = {};
      (signed ?? []).forEach((s) => {
        if (s.path && s.signedUrl) map[s.path] = s.signedUrl;
      });
      setCovers(map);
    })();
  }, [data]);

  const clOptions = useMemo(() => {
    const s = new Set<string>();
    (data ?? []).forEach((e) => e.cl && s.add(e.cl));
    return Array.from(s).sort();
  }, [data]);

  const filtered = useMemo(() => {
    if (!data) return [];
    const s = q.trim().toLowerCase();
    return data.filter((e) => {
      if (cl !== "__all" && (e.cl ?? "") !== cl) return false;
      const hrRodado =
        e.horimetro_atual != null && e.h_revisao != null
          ? Math.max(0, Number(e.horimetro_atual) - Number(e.h_revisao))
          : null;
      const overdue = hrRodado != null && hrRodado > Number(e.limite_revisao ?? 500);
      if (onlyOverdue && !overdue) return false;
      if (
        s &&
        ![e.numero, e.identificacao, e.placa, e.localizacao, e.operador_contato, e.status]
          .filter(Boolean)
          .some((v) => String(v).toLowerCase().includes(s))
      )
        return false;
      return true;
    });
  }, [data, q, cl, onlyOverdue]);

  async function handleStatusChange(equipamentoId: string, status: string) {
    queryClient.setQueryData<Equip[]>(["equipamentos"], (equipamentos) =>
      equipamentos?.map((equipamento) =>
        equipamento.id === equipamentoId ? { ...equipamento, status } : equipamento,
      ),
    );

    const { error } = await supabase
      .from("equipamentos")
      .update({ status })
      .eq("id", equipamentoId);

    if (error) {
      queryClient.invalidateQueries({ queryKey: ["equipamentos"] });
      console.error("Erro ao atualizar status do equipamento:", error);
    }
  }

  async function handleHorimetroChange(equipamentoId: string, value: string) {
    const horimetro = value === "" ? null : Number(value);
    if (horimetro !== null && !Number.isFinite(horimetro)) return;
    const hoje = new Date();
    const dataHorimetro = `${hoje.getFullYear()}-${String(hoje.getMonth() + 1).padStart(2, "0")}-${String(hoje.getDate()).padStart(2, "0")}`;

    const previous = data?.find((equipamento) => equipamento.id === equipamentoId)?.horimetro_atual;
    queryClient.setQueryData<Equip[]>(["equipamentos"], (equipamentos) =>
      equipamentos?.map((equipamento) =>
        equipamento.id === equipamentoId
          ? { ...equipamento, horimetro_atual: horimetro, data_horimetro_atual: dataHorimetro }
          : equipamento,
      ),
    );

    const { error } = await supabase
      .from("equipamentos")
      .update({ horimetro_atual: horimetro, data_horimetro_atual: dataHorimetro })
      .eq("id", equipamentoId);

    if (error) {
      setHorimetroDrafts((drafts) => ({
        ...drafts,
        [equipamentoId]: previous?.toString() ?? "",
      }));
      queryClient.invalidateQueries({ queryKey: ["equipamentos"] });
      toast.error("Não foi possível atualizar o horímetro");
    }
  }

  return (
    <div className="p-3 md:p-6 max-w-7xl mx-auto w-full space-y-3 md:space-y-4">
      {/* Header & Filtros */}
      <div className="sticky top-0 md:top-[76px] z-20 p-2.5 md:p-3 bg-white/95 backdrop-blur-md rounded-xl border border-slate-200 shadow-sm flex flex-col md:flex-row gap-2 md:gap-3 md:items-center justify-between">
        <div className="relative w-full md:max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <Input
            placeholder="Buscar veículo, placa, local..."
            value={q}
            onChange={(e) => setQ(e.target.value)}
            className="pl-9 h-9 text-xs border-slate-200 bg-slate-50/50 focus:bg-white transition-colors"
          />
        </div>

        <div className="flex items-center gap-2 w-full md:w-auto overflow-x-auto pb-1 md:pb-0">
          <BotaoTacografo />
          <BotaoSeguro />
          <BotaoPendenciasAbertas clOptions={clOptions} equipamentos={data ?? []} />

          <Select value={cl} onValueChange={setCl}>
            <SelectTrigger className="h-9 text-xs w-[130px] bg-white border-slate-200">
              <SelectValue placeholder="Classe (CL)" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__all">Todas as CL</SelectItem>
              {clOptions.map((c) => (
                <SelectItem key={c} value={c}>
                  CL {c}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Button
            type="button"
            size="sm"
            variant={onlyOverdue ? "destructive" : "outline"}
            onClick={() => setOnlyOverdue((v) => !v)}
            className="h-9 text-xs border-slate-200 gap-1.5"
          >
            <span>{onlyOverdue ? "Apenas Vencidos" : "Vencidos"}</span>
            {totalEquipamentosVencidos > 0 ? (
              <span
                className="font-bold text-[10px] h-5 min-w-[20px] px-1.5 flex items-center justify-center rounded-full border-none"
                style={{ backgroundColor: "#dc2626", color: "#ffffff" }}
              >
                {totalEquipamentosVencidos}
              </span>
            ) : null}
          </Button>

          <Notificacoes />
        </div>
      </div>

      {/* Contador de Equipamentos */}
      <div className="flex justify-between items-center px-1">
        <p className="text-xs font-semibold text-black uppercase tracking-wider">
          {isLoading ? "Carregando..." : `Frota Cadastrada (${filtered.length})`}
        </p>
      </div>

      {/* Lista/Grid de Cards de Frota */}
      {!isLoading && filtered.length === 0 && (
        <Card className="p-12 text-center border-dashed border-slate-200 bg-slate-50">
          <Gauge className="w-8 h-8 text-slate-400 mx-auto mb-2" />
          <p className="text-xs font-medium text-slate-600">Nenhum equipamento localizado.</p>
        </Card>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3 md:gap-4 pb-20">
        {filtered.map((e) => {
          const hrRodado =
            e.horimetro_atual != null && e.h_revisao != null
              ? Math.max(0, Number(e.horimetro_atual) - Number(e.h_revisao))
              : 0;
          const limite = Number(e.limite_revisao ?? 500);
          const overdue = hrRodado > limite;
          const pct = Math.min(100, Math.round((hrRodado / limite) * 100));
          const coverUrl = e.cover_storage_path ? covers[e.cover_storage_path] : null;

          return (
            <Link key={e.id} to="/equipamentos/$id" params={{ id: e.id }} className="group block">
              <Card
                className={`p-3.5 rounded-2xl transition-all border-2 relative ${
                  overdue
                    ? "border-red-500 bg-red-50 animate-pulse"
                    : "border-slate-200 bg-white hover:border-slate-300"
                }`}
                style={overdue ? { backgroundColor: "#fef2f2", borderColor: "#ef4444" } : undefined}
              >
                <div className="flex gap-3 items-start">
                  {coverUrl ? (
                    <img
                      src={coverUrl}
                      alt={e.numero}
                      className="w-14 h-14 rounded-xl object-cover border border-slate-200 shrink-0"
                    />
                  ) : (
                    <div className="w-14 h-14 rounded-xl bg-slate-100 border border-slate-200 flex items-center justify-center shrink-0 text-slate-400">
                      <Gauge className="w-6 h-6" />
                    </div>
                  )}

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-1">
                      <div className="flex min-w-0 items-center gap-1.5 flex-wrap">
                        <span
                          className={`font-bold text-sm truncate max-w-[10rem] ${overdue ? "text-red-900" : "text-slate-800"}`}
                        >
                          {e.numero}
                        </span>
                        {e.cl && (
                          <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-slate-200/70 text-slate-700">
                            CL {e.cl}
                          </span>
                        )}
                        {overdue && (
                          <span
                            role="button"
                            tabIndex={0}
                            onClick={(event) => {
                              event.preventDefault();
                              event.stopPropagation();
                              navigate({
                                to: "/equipamentos/$id/manutencao",
                                params: { id: e.id },
                                search: {
                                  horimetro: e.horimetro_atual?.toString(),
                                  tipoRevisao: e.proxima_revisao_horimetro
                                    ? `Próxima revisão: ${e.proxima_revisao_horimetro}h`
                                    : `Revisão de ${e.limite_revisao ?? 500}h`,
                                },
                              });
                            }}
                            onKeyDown={(event) => {
                              if (event.key === "Enter" || event.key === " ") {
                                event.preventDefault();
                                event.stopPropagation();
                                navigate({
                                  to: "/equipamentos/$id/manutencao",
                                  params: { id: e.id },
                                  search: {
                                    horimetro: e.horimetro_atual?.toString(),
                                    tipoRevisao: e.proxima_revisao_horimetro
                                      ? `Próxima revisão: ${e.proxima_revisao_horimetro}h`
                                      : `Revisão de ${e.limite_revisao ?? 500}h`,
                                  },
                                });
                              }
                            }}
                            className="text-[10px] font-bold px-2.5 py-0.5 rounded-full text-white shadow-sm inline-block"
                            style={{ backgroundColor: "#ef4444", color: "#ffffff" }}
                            title="Abrir plano de manutenção preventiva"
                          >
                            Revisão vencida
                          </span>
                        )}
                      </div>
                      <ChevronRight className="w-4 h-4 text-slate-400 shrink-0" />
                    </div>

                    {e.identificacao && (
                      <p
                        className={`text-xs mt-0.5 truncate ${overdue ? "text-red-800" : "text-slate-500"}`}
                      >
                        {e.identificacao}
                      </p>
                    )}

                    <div
                      className={`flex items-center gap-2 mt-1 text-[11px] font-mono ${overdue ? "text-red-700" : "text-slate-500"}`}
                    >
                      {e.placa && <span>{e.placa}</span>}
                      {e.localizacao && <span>• {e.localizacao}</span>}
                    </div>
                  </div>
                </div>

                <div className="mt-3 space-y-2">
                  <div className="flex items-center justify-between">
                    {!overdue && (
                      <select
                        value={e.status || "Operacional"}
                        disabled={!isAdmin}
                        onClick={(event) => event.preventDefault()}
                        onChange={(event) => {
                          event.preventDefault();
                          void handleStatusChange(e.id, event.target.value);
                        }}
                        className={`text-[10px] font-medium px-2 py-0.5 rounded-full border ${
                          e.status === "Em manutenção" || e.status === "Manutenção"
                            ? "bg-amber-100 text-amber-800 border-amber-300"
                            : "bg-emerald-50 text-emerald-700 border-emerald-200"
                        }`}
                        aria-label={`Status do equipamento ${e.numero}`}
                      >
                        {STATUS_EQUIPAMENTO.map((status) => (
                          <option key={status} value={status}>
                            {status}
                          </option>
                        ))}
                      </select>
                    )}

                    {/* BOTÃO DE PENDÊNCIAS EM ALERTA NO CARD */}
                    <div className="ml-auto">
                      <BotaoPendenciasCard equipamentoId={e.id} numeroEquipamento={e.numero} />
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <div className="flex-1 bg-slate-200 h-2 rounded-full overflow-hidden">
                      <div
                        className="h-full transition-all duration-300"
                        style={{
                          width: `${pct}%`,
                          backgroundColor: overdue ? "#ef4444" : "#f59e0b",
                        }}
                      />
                    </div>
                    <div
                      className="flex items-center gap-1"
                      onClick={(event) => {
                        event.preventDefault();
                        event.stopPropagation();
                      }}
                    >
                      <Input
                        type="number"
                        inputMode="decimal"
                        aria-label={`Horímetro atual do equipamento ${e.numero}`}
                        value={horimetroDrafts[e.id] ?? ""}
                        onChange={(event) =>
                          setHorimetroDrafts((drafts) => ({
                            ...drafts,
                            [e.id]: event.target.value,
                          }))
                        }
                        onBlur={(event) => void handleHorimetroChange(e.id, event.target.value)}
                        className={`h-7 w-20 px-1.5 text-xs text-right font-bold font-mono ${overdue ? "text-red-800" : "text-slate-700"}`}
                      />
                      <span className="text-xs font-bold font-mono">h</span>
                    </div>
                  </div>

                  <div className="flex justify-between items-center text-xs">
                    <span className="text-black font-semibold">
                      Hr rodado: {hrRodado}h
                    </span>
                    <span className="text-black font-semibold">
                      limite: {limite}h
                    </span>
                  </div>
                </div>
              </Card>
            </Link>
          );
        })}
      </div>

      {isAdmin && (
        <Link to="/admin">
          <Button
            size="icon"
            className="fixed bottom-6 right-6 h-12 w-12 rounded-full shadow-lg bg-blue-600 hover:bg-blue-700 text-white z-30"
          >
            <Plus className="w-5 h-5" />
          </Button>
        </Link>
      )}
    </div>
  );
}
