import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState, useEffect, useCallback, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { requireAdmin } from "@/lib/route-guards";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  ArrowLeft,
  Plus,
  Trash2,
  Printer,
  Loader2,
  CheckCircle2,
  FileText,
  MessageCircle,
  Mail,
} from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/cotacoes/$id/")({
  beforeLoad: requireAdmin,
  component: DetalheCotacaoPage,
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

interface Cotacao {
  id: string;
  numero: string;
  patrimonio?: string | null;
  setor?: string | null;
  data_cotacao?: string | null;
  observacoes?: string | null;
  status?: string | null;
  solicitante_id?: string | null; // ALTERADO DE CRIADO POR PARA SOLICITANTE
}

interface ItemCotacao {
  id: string;
  cotacao_id: string;
  codigo?: string | null;
  descricao: string;
  quantidade: number;
  unidade: string;
}

interface Fornecedor {
  id: string;
  razao_social: string;
  nome_fantasia?: string | null;
  cnpj?: string | null;
  telefone?: string | null;
  email?: string | null;
}

interface CotacaoFornecedor {
  id: string;
  cotacao_id: string;
  fornecedor_id: string;
  status?: string | null;
  fornecedores?: Fornecedor;
}

interface RespostaPreco {
  id: string;
  cotacao_id: string;
  fornecedor_id: string;
  cotacao_item_id: string;
  preco: number | null;
  marca?: string | null;
}

export default function DetalheCotacaoPage() {
  const { id } = Route.useParams();
  const navigate = useNavigate();
  const [nomeSolicitanteFixo, setNomeSolicitanteFixo] = useState("—");
  const [cotacao, setCotacao] = useState<Cotacao | null>(null);
  const [itens, setItens] = useState<ItemCotacao[]>([]);
  const [fornecedoresCotacao, setFornecedoresCotacao] = useState<CotacaoFornecedor[]>([]);
  const [respostas, setRespostas] = useState<RespostaPreco[]>([]);
  const [todosFornecedores, setTodosFornecedores] = useState<Fornecedor[]>([]);
  const [usuarioNome, setUsuarioNome] = useState("Usuário");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Estados para o formulário de NOVA COTAÇÃO (caso id === "nova")
  const [novaNumero, setNovaNumero] = useState("");
  const [novaPatrimonio, setNovaPatrimonio] = useState("");
  const [novaSetor, setNovaSetor] = useState("");
  const [novaData, setNovaData] = useState("");
  const [novaObs, setNovaObs] = useState("");
  const [statusOrcamento, setStatusOrcamento] = useState("aberto");

  // Modais
  const [isNovoItemOpen, setIsNovoItemOpen] = useState(false);
  const [isVincularFornecedorOpen, setIsVincularFornecedorOpen] = useState(false);
  const [isPrecosOpen, setIsPrecosOpen] = useState(false);
  const [isOrcamentoOpen, setIsOrcamentoOpen] = useState(false);
  const [fornecedorOrcamentoAtivo, setFornecedorOrcamentoAtivo] =
    useState<CotacaoFornecedor | null>(null);

  // Form Item
  const [codigoItem, setCodigoItem] = useState("");
  const [descricaoItem, setDescricaoItem] = useState("");
  const [quantidadeItem, setQuantidadeItem] = useState("1");
  const [unidadeItem, setUnidadeItem] = useState("UN");

  // Vinculação de Fornecedor
  const [fornecedorIdSelecionado, setFornecedorIdSelecionado] = useState("");

  // Inserção/Edição de Preços
  const [fornecedorPrecoAtivo, setFornecedorPrecoAtivo] = useState<CotacaoFornecedor | null>(null);
  const [precosTemp, setPrecosTemp] = useState<{
    [itemId: string]: { preco: string; marca: string };
  }>({});

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);

      // Buscar usuário logado atual (usado no envio de orçamento ou fallback)
      const {
        data: { user },
      } = await supabase.auth.getUser();
      let nomeAtual = "Usuário";
      if (user) {
        const { data: profile } = await supabase
          .from("profiles")
          .select("full_name")
          .eq("id", user.id)
          .single();

        if (profile?.full_name) {
          nomeAtual = profile.full_name;
        } else if (user.user_metadata?.name) {
          nomeAtual = user.user_metadata.name;
        } else if (user.email) {
          nomeAtual = user.email.split("@")[0].toUpperCase();
        }
        setUsuarioNome(nomeAtual);
      }

      if (id === "nova") {
        setCotacao(null);
        setItens([]);
        setFornecedoresCotacao([]);
        setRespostas([]);

        const { data: cotacoesExistentes, error: numerosErr } = await supabase
          .from("cotacoes")
          .select("numero");
        if (numerosErr) throw numerosErr;

        const maiorNumero = (cotacoesExistentes || []).reduce((maior, item) => {
          const numero = Number.parseInt(String(item.numero).match(/\d+/)?.[0] || "0", 10);
          return Number.isNaN(numero) ? maior : Math.max(maior, numero);
        }, 0);
        setNovaNumero(String(maiorNumero + 1).padStart(4, "0"));

        const { data: allForn, error: allFornErr } = await supabase
          .from("fornecedores")
          .select("*")
          .order("razao_social", { ascending: true });
        if (allFornErr) throw allFornErr;
        setTodosFornecedores(allForn || []);

        setLoading(false);
        return;
      }

      const { data: cotData, error: cotErr } = await supabase
        .from("cotacoes")
        .select("*")
        .eq("id", id)
        .single();
      if (cotErr) throw cotErr;
      setCotacao(cotData);
if (cotData?.solicitante_id) {
        const { data: profileData } = await supabase
          .from("profiles")
          .select("full_name")
          .eq("id", cotData.solicitante_id)
          .single();

        if (profileData?.full_name) {
          setNomeSolicitanteFixo(profileData.full_name);
        } else {
          setNomeSolicitanteFixo("Administrador");
        }
      }
      const { data: itensData, error: itensErr } = await supabase
        .from("cotacao_itens")
        .select("*")
        .eq("cotacao_id", id)
        .order("created_at", { ascending: true });
      if (itensErr) throw itensErr;
      setItens(itensData || []);

      const { data: fornCotData, error: fornCotErr } = await supabase
        .from("cotacao_fornecedores")
        .select("*, fornecedores(*)")
        .eq("cotacao_id", id);
      if (fornCotErr) throw fornCotErr;
      setFornecedoresCotacao(fornCotData || []);

      const { data: respData, error: respErr } = await supabase
        .from("cotacao_respostas")
        .select("*")
        .eq("cotacao_id", id);
      if (respErr) throw respErr;
      setRespostas(respData || []);

      const { data: allForn, error: allFornErr } = await supabase
        .from("fornecedores")
        .select("*")
        .order("razao_social", { ascending: true });
      if (allFornErr) throw allFornErr;
      setTodosFornecedores(allForn || []);
    } catch (error: unknown) {
      const err = error as Error;
      toast.error(`Erro ao carregar dados: ${err.message || "Erro desconhecido"}`);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  async function handleCriarCotacao(e: React.FormEvent) {
    e.preventDefault();
    if (!novaNumero.trim()) return toast.error("Informe o número da cotação.");

    try {
      setSaving(true);

      // Obtém o usuário criador logado no momento exato da criação
      const { data: { user } } = await supabase.auth.getUser();
      let nomeCriador = "Administrador";
      if (user) {
        const { data: profile } = await supabase
          .from("profiles")
          .select("full_name")
          .eq("id", user.id)
          .single();
        if (profile?.full_name) {
          nomeCriador = profile.full_name;
        } else if (user.user_metadata?.name) {
          nomeCriador = user.user_metadata.name;
        } else if (user.email) {
          nomeCriador = user.email.split("@")[0].toUpperCase();
        }
      }

      const { data, error } = await supabase
        .from("cotacoes")
        .insert([
          {
            numero: novaNumero.trim(),
            patrimonio: novaPatrimonio.trim() || null,
            setor: novaSetor.trim() || null,
            data_cotacao: novaData || new Date().toISOString().split("T")[0],
            observacoes: novaObs.trim() || null,
            status: "aberto",
            valor_total: 0,
            solicitante_id: user?.id || null, //Salva o ID fixo do criador no banc
          },
        ])
        .select()
        .single();

      if (error) throw error;
      toast.success("Cotação criada com sucesso!");
      navigate({ to: `/cotacoes/${data.id}` });
    } catch (error: unknown) {
      const err = error as Error;
      toast.error("Erro ao criar cotação: " + err.message);
    } finally {
      setSaving(false);
    }
  }

  const { menoresPrecosPorItem, valorTotalOtimo } = useMemo(() => {
    const menoresMap: {
      [itemId: string]: {
        menorTotal: number;
        menorUnitario: number;
        fornecedorNome: string;
        marca: string;
      };
    } = {};
    let totalOtimo = 0;

    itens.forEach((item) => {
      let menorUnit: number | null = null;
      let fornNome = "—";
      let marcaStr = "—";
      const qtd = item.quantidade || 1;

      fornecedoresCotacao.forEach((fc) => {
        const fornId = fc.fornecedor_id || (fc as any).fornecedores?.id;
        const resp = respostas.find(
          (r) =>
            String(r.fornecedor_id).trim() === String(fornId).trim() &&
            String(r.cotacao_item_id).trim() === String(item.id).trim(),
        );

        if (resp && typeof resp.preco === "number" && resp.preco > 0) {
          if (menorUnit === null || resp.preco < menorUnit) {
            menorUnit = resp.preco;
            fornNome =
              fc.fornecedores?.nome_fantasia || fc.fornecedores?.razao_social || "Fornecedor";
            marcaStr = resp.marca || "—";
          }
        }
      });

      if (menorUnit !== null) {
        const subtotalItem = menorUnit * qtd;
        menoresMap[item.id] = {
          menorTotal: subtotalItem,
          menorUnitario: menorUnit,
          fornecedorNome: fornNome,
          marca: marcaStr,
        };
        totalOtimo += subtotalItem;
      }
    });

    return { menoresPrecosPorItem: menoresMap, valorTotalOtimo: totalOtimo };
  }, [itens, fornecedoresCotacao, respostas]);

  const totaisPorFornecedor = useMemo(
    () =>
      fornecedoresCotacao.map((fc) => {
        const fornecedorId = fc.fornecedor_id || fc.fornecedores?.id || "";
        return itens.reduce((total, item) => {
          const resposta = respostas.find(
            (registro) =>
              String(registro.fornecedor_id).trim() === String(fornecedorId).trim() &&
              String(registro.cotacao_item_id).trim() === String(item.id).trim(),
          );
          const preco = resposta?.preco ?? 0;
          return total + (preco > 0 ? preco * (item.quantidade || 1) : 0);
        }, 0);
      }),
    [fornecedoresCotacao, itens, respostas],
  );

  useEffect(() => {
    async function atualizarTotalCotacao() {
      if (id === "nova" || !id || itens.length === 0) return;
      try {
        await supabase
          .from("cotacoes")
          .update({
            valor_total: valorTotalOtimo,
          })
          .eq("id", id);
      } catch (e) {
        console.error("Erro ao atualizar total da cotação", e);
      }
    }
    atualizarTotalCotacao();
  }, [id, valorTotalOtimo, itens.length]);

  async function handleAddItem(e: React.FormEvent) {
    e.preventDefault();
    if (!descricaoItem.trim()) return toast.error("Informe a descrição do item.");
    try {
      setSaving(true);
      const { error } = await supabase.from("cotacao_itens").insert([
        {
          cotacao_id: id,
          codigo: codigoItem.trim() || null,
          descricao: descricaoItem.trim(),
          quantidade: parseFloat(quantidadeItem) || 1,
          unidade: unidadeItem.trim(),
        },
      ]);
      if (error) throw error;
      toast.success("Item adicionado!");
      setIsNovoItemOpen(false);
      setCodigoItem("");
      setDescricaoItem("");
      setQuantidadeItem("1");
      setUnidadeItem("UN");
      fetchData();
    } catch (error: unknown) {
      const err = error as Error;
      toast.error("Erro ao adicionar item: " + err.message);
    } finally {
      setSaving(false);
    }
  }

  async function handleDeleteItem(itemId: string) {
    if (!confirm("Deseja excluir este item?")) return;
    try {
      await supabase.from("cotacao_itens").delete().eq("id", itemId);
      await supabase.from("cotacao_respostas").delete().eq("cotacao_item_id", itemId);
      toast.success("Item excluído.");
      fetchData();
    } catch (error: unknown) {
      const err = error as Error;
      toast.error("Erro ao excluir item: " + err.message);
    }
  }

  async function handleVincularFornecedor(e: React.FormEvent) {
    e.preventDefault();
    if (!fornecedorIdSelecionado) return toast.error("Selecione um fornecedor.");
    try {
      setSaving(true);
      const { error } = await supabase.from("cotacao_fornecedores").insert([
        {
          cotacao_id: id,
          fornecedor_id: fornecedorIdSelecionado,
          status: "aberto",
        },
      ]);
      if (error) throw error;
      toast.success("Fornecedor vinculado!");
      setIsVincularFornecedorOpen(false);
      setFornecedorIdSelecionado("");
      fetchData();
    } catch (error: unknown) {
      const err = error as Error;
      toast.error("Erro ao vincular: " + err.message);
    } finally {
      setSaving(false);
    }
  }

  async function handleRemoverFornecedor(fornecedorId: string) {
    if (!confirm("Remover fornecedor desta cotação e seus preços?")) return;
    try {
      await supabase
        .from("cotacao_respostas")
        .delete()
        .eq("cotacao_id", id)
        .eq("fornecedor_id", fornecedorId);
      await supabase
        .from("cotacao_fornecedores")
        .delete()
        .eq("cotacao_id", id)
        .eq("fornecedor_id", fornecedorId);
      toast.success("Fornecedor removido.");
      fetchData();
    } catch (error: unknown) {
      const err = error as Error;
      toast.error("Erro ao remover fornecedor: " + err.message);
    }
  }

  function abrirModalPrecos(fc: CotacaoFornecedor) {
    setFornecedorPrecoAtivo(fc);
    const map: { [itemId: string]: { preco: string; marca: string } } = {};
    const fornId = fc.fornecedor_id || (fc as any).fornecedores?.id;

    itens.forEach((item) => {
      const resp = respostas.find(
        (r) =>
          String(r.fornecedor_id).trim() === String(fornId).trim() &&
          String(r.cotacao_item_id).trim() === String(item.id).trim(),
      );
      map[item.id] = {
        preco: resp && resp.preco !== null && resp.preco !== undefined ? resp.preco.toString() : "",
        marca: resp ? resp.marca || "" : "",
      };
    });
    setPrecosTemp(map);
    setIsPrecosOpen(true);
  }

  function abrirModalOrcamento(fc: CotacaoFornecedor) {
    setFornecedorOrcamentoAtivo(fc);
    setStatusOrcamento(
      fc.status === "RASCUNHO"
        ? "aberto"
        : fc.status === "FINALIZADA"
          ? "aprovada"
          : fc.status || "aberto",
    );
    setIsOrcamentoOpen(true);
  }

  function gerarTextoOrcamento() {
    const fornNome =
      fornecedorOrcamentoAtivo?.fornecedores?.nome_fantasia ||
      fornecedorOrcamentoAtivo?.fornecedores?.razao_social ||
      "Prezado Fornecedor";
    let texto = `*SOLICITAÇÃO DE ORÇAMENTO - COTAÇÃO Nº ${cotacao?.numero}*\n`;
    texto += `*Fornecedor:* ${fornNome}\n`;
    texto += `*Solicitante:* ${nomeSolicitanteFixo}\n`;
    texto += `*Equipamento/Patrimônio:* ${cotacao?.patrimonio || "—"}\n`;
    texto += `*Setor:* ${cotacao?.setor || "—"} | *Data:* ${formatarData(cotacao?.data_cotacao)}\n\n`;
    texto += `*ITENS SOLICITADOS:*\n`;

    itens.forEach((item, index) => {
      texto += `${index + 1}. *${item.descricao}* (Cód: ${item.codigo || "N/D"}) - Qtd: ${item.quantidade} ${item.unidade}\n`;
    });

    if (cotacao?.observacoes) {
      texto += `\n*Obs:* ${cotacao.observacoes}\n`;
    }
    texto += `\nPor gentileza, retornar com os preços unitários e marcas dos itens acima. Obrigado!`;
    return texto;
  }

  function enviarPorWhatsApp() {
    const telefone = fornecedorOrcamentoAtivo?.fornecedores?.telefone?.replace(/\D/g, "") || "";
    const texto = encodeURIComponent(gerarTextoOrcamento());
    const url = telefone
      ? `https://wa.me/55${telefone}?text=${texto}`
      : `https://wa.me/?text=${texto}`;
    window.open(url, "_blank");
  }

  function enviarPorEmail() {
    const email = fornecedorOrcamentoAtivo?.fornecedores?.email || "";
    const assunto = encodeURIComponent(`Solicitação de Orçamento - Cotação Nº ${cotacao?.numero}`);
    const corpo = encodeURIComponent(gerarTextoOrcamento().replace(/\*/g, ""));
    const url = `mailto:${email}?subject=${assunto}&body=${corpo}`;
    window.open(url, "_blank");
  }

  async function salvarStatusOrcamento() {
    if (!fornecedorOrcamentoAtivo) return;
    try {
      setSaving(true);
      const { data, error } = await supabase
        .from("cotacao_fornecedores")
        .update({ status: statusOrcamento })
        .eq("id", fornecedorOrcamentoAtivo.id)
        .select("*")
        .single();

      if (error) throw error;
      setFornecedoresCotacao((fornecedores) =>
        fornecedores.map((fornecedor) =>
          fornecedor.id === data.id ? { ...fornecedor, status: data.status } : fornecedor,
        ),
      );
      setFornecedorOrcamentoAtivo((fornecedor) =>
        fornecedor ? { ...fornecedor, status: data.status } : fornecedor,
      );
      toast.success("Status do orçamento atualizado!");
    } catch (error: unknown) {
      const err = error as Error;
      toast.error("Erro ao atualizar status: " + err.message);
    } finally {
      setSaving(false);
    }
  }

  async function handleSalvarPrecos(e: React.FormEvent) {
    e.preventDefault();
    if (!fornecedorPrecoAtivo) return;
    try {
      setSaving(true);
      const fornecedorIdReal =
        fornecedorPrecoAtivo.fornecedor_id || (fornecedorPrecoAtivo as any).fornecedores?.id;

      for (const item of itens) {
        const dados = precosTemp[item.id];
        const precoStr = dados && dados.preco ? dados.preco.toString().replace(",", ".") : "";
        const precoNum = precoStr ? parseFloat(precoStr) : NaN;
        const marcaStr = dados ? dados.marca : null;

        const existente = respostas.find(
          (r) =>
            String(r.fornecedor_id).trim() === String(fornecedorIdReal).trim() &&
            String(r.cotacao_item_id).trim() === String(item.id).trim(),
        );

        if (existente) {
          if (!isNaN(precoNum) && precoNum > 0) {
            await supabase
              .from("cotacao_respostas")
              .update({ preco: precoNum, marca: marcaStr })
              .eq("id", existente.id);
          } else {
            await supabase.from("cotacao_respostas").delete().eq("id", existente.id);
          }
        } else if (!isNaN(precoNum) && precoNum > 0) {
          await supabase.from("cotacao_respostas").insert([
            {
              cotacao_id: id,
              fornecedor_id: fornecedorIdReal,
              cotacao_item_id: item.id,
              preco: precoNum,
              marca: marcaStr,
            },
          ]);
        }
      }

      toast.success("Preços salvos!");
      setIsPrecosOpen(false);
      await fetchData();
    } catch (error: unknown) {
      const err = error as Error;
      toast.error("Erro ao salvar preços: " + err.message);
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="flex justify-center items-center h-96">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  if (id === "nova") {
    return (
      <div className="p-4 md:p-6 max-w-3xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <Button variant="outline" onClick={() => navigate({ to: "/cotacoes" })} className="gap-2">
            <ArrowLeft className="w-4 h-4" /> Voltar às Cotações
          </Button>
          <h1 className="text-xl font-bold text-slate-800">Nova Cotação</h1>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
          <form onSubmit={handleCriarCotacao} className="space-y-4">
            <div>
              <Label className="text-xs font-semibold text-slate-700">Número da Cotação *</Label>
              <Input
                placeholder="Ex: 0005"
                value={novaNumero}
                onChange={(e) => setNovaNumero(e.target.value)}
                required
                className="mt-1"
              />
            </div>

            <div>
              <Label className="text-xs font-semibold text-slate-700">
                Patrimônio / Equipamento
              </Label>
              <Input
                placeholder="Ex: RE50- VIDRO"
                value={novaPatrimonio}
                onChange={(e) => setNovaPatrimonio(e.target.value)}
                className="mt-1"
              />
            </div>

            <div>
              <Label className="text-xs font-semibold text-slate-700">Setor</Label>
              <Input
                placeholder="Ex: MANUTENÇÃO"
                value={novaSetor}
                onChange={(e) => setNovaSetor(e.target.value)}
                className="mt-1"
              />
            </div>

            <div>
              <Label className="text-xs font-semibold text-slate-700">Data da Cotação</Label>
              <Input
                type="date"
                value={novaData}
                onChange={(e) => setNovaData(e.target.value)}
                className="mt-1"
              />
            </div>

            <div>
              <Label className="text-xs font-semibold text-slate-700">Observações</Label>
              <Input
                placeholder="Observações adicionais..."
                value={novaObs}
                onChange={(e) => setNovaObs(e.target.value)}
                className="mt-1"
              />
            </div>

            <div className="flex justify-end gap-2 pt-4">
              <Button type="button" variant="outline" onClick={() => navigate({ to: "/cotacoes" })}>
                Cancelar
              </Button>
              <Button
                type="submit"
                disabled={saving}
                className="bg-blue-600 hover:bg-blue-700 text-white"
              >
                {saving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                Avançar para Adicionar Itens
              </Button>
            </div>
          </form>
        </div>
      </div>
    );
  }

  if (!cotacao) return <div className="p-6 text-center">Cotação não encontrada.</div>;

  return (
    <div className="p-4 md:p-6 max-w-7xl mx-auto space-y-6 print:p-0">
      <style>{`
        @media print {
          header, nav, .navbar, .top-bar, footer, button, .print\\:hidden {
            display: none !important;
          }
          body {
            zoom: 82%;
            background: white !important;
          }
          .shadow-sm, .shadow, .rounded-xl {
            box-shadow: none !important;
            border: none !important;
          }
          .cotacao-assinaturas {
            break-inside: avoid;
            page-break-inside: avoid;
          }
        }
      `}</style>
      <div className="flex flex-wrap items-center justify-between gap-3 print:hidden">
        <Button variant="outline" onClick={() => navigate({ to: "/cotacoes" })} className="gap-2">
          <ArrowLeft className="w-4 h-4" /> Voltar às Cotações
        </Button>
        <div className="flex gap-2">
          <Button
            onClick={() => window.print()}
            className="bg-slate-800 hover:bg-slate-900 text-white gap-2"
          >
            <Printer className="w-4 h-4" /> Imprimir Comparativo
          </Button>
        </div>
      </div>

      <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 print:border-none print:shadow-none">
        <div className="flex justify-between items-start">
          <div>
            <span className="text-xs uppercase bg-blue-100 text-blue-800 font-bold px-2 py-1 rounded">
              Cotação Nº {cotacao.numero}
            </span>
            <h1 className="text-2xl font-bold text-slate-800 mt-2">
              Patrimônio / Equipamento: {cotacao.patrimonio || "Não informado"}
            </h1>
            <p className="text-sm text-slate-600 mt-1">
              Setor: {cotacao.setor || "—"} | Data: {formatarData(cotacao.data_cotacao)} |{" "}
              <strong>Solicitante:</strong> {nomeSolicitanteFixo}
            </p>
            {cotacao.observacoes && (
              <p className="text-xs text-slate-500 mt-2">Obs: {cotacao.observacoes}</p>
            )}
          </div>
          <div className="text-right print:hidden">
            <span className="block text-xs text-slate-500">
              Valor Total Otimizado (Menores Preços):
            </span>
            <span className="text-2xl font-extrabold text-green-600">{brl(valorTotalOtimo)}</span>
          </div>
        </div>
      </div>

      <div className="flex flex-wrap gap-3 print:hidden">
        <Button
          onClick={() => setIsNovoItemOpen(true)}
          className="bg-blue-600 hover:bg-blue-700 text-white gap-2"
        >
          <Plus className="w-4 h-4" /> Adicionar Item / Peça
        </Button>
        <Button
          onClick={() => setIsVincularFornecedorOpen(true)}
          variant="outline"
          className="border-blue-600 text-blue-600 hover:bg-blue-50 gap-2"
        >
          <Plus className="w-4 h-4" /> Vincular Fornecedor
        </Button>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="p-4 bg-slate-50 border-b border-slate-200 flex justify-between items-center print:hidden">
          <h2 className="font-bold text-slate-800 text-base">Quadro Comparativo de Preços</h2>
          <span className="text-xs text-slate-500">Valores em Reais (R$)</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm border-collapse">
            <thead className="bg-slate-100 text-slate-700 text-xs uppercase">
              <tr>
                <th className="p-3 border-b">Cód.</th>
                <th className="p-3 border-b">Item</th>
                <th className="p-3 border-b text-center">Qtd</th>
                <th className="p-3 border-b text-center">Un</th>
                {fornecedoresCotacao.map((fc) => {
                  const fornId = fc.fornecedor_id || (fc as any).fornecedores?.id;
                  return (
                    <th key={fornId} className="p-3 border-b text-right">
                      <div className="font-bold">
                        {fc.fornecedores?.nome_fantasia ||
                          fc.fornecedores?.razao_social ||
                          "Fornecedor"}
                      </div>
                      <div className="text-[10px] text-slate-500 print:hidden flex justify-end gap-1 mt-1">
                        <button
                          type="button"
                          onClick={() => abrirModalOrcamento(fc)}
                          className="text-emerald-700 hover:underline font-semibold"
                        >
                          Orçamento
                        </button>
                        <span>|</span>
                        <button
                          type="button"
                          onClick={() => abrirModalPrecos(fc)}
                          className="text-blue-600 hover:underline"
                        >
                          Editar Preços
                        </button>
                        <span>|</span>
                        <button
                          type="button"
                          onClick={() => handleRemoverFornecedor(fornId)}
                          className="text-red-600 hover:underline"
                        >
                          Excluir
                        </button>
                      </div>
                    </th>
                  );
                })}
                <th className="p-3 border-b text-right bg-emerald-50 text-emerald-900 font-bold">
                  Menor Preço (Total)
                </th>
                <th className="p-3 border-b text-center print:hidden">Ações Item</th>
              </tr>
            </thead>
            <tbody>
              {itens.length === 0 ? (
                <tr>
                  <td
                    colSpan={6 + fornecedoresCotacao.length}
                    className="p-6 text-center text-slate-500"
                  >
                    Nenhum item cadastrado nesta cotação.
                  </td>
                </tr>
              ) : (
                itens.map((item) => {
                  const menorInfo = menoresPrecosPorItem[item.id];
                  return (
                    <tr key={item.id} className="border-b border-slate-100 hover:bg-slate-50">
                      <td className="p-3 text-xs text-slate-500 font-mono">{item.codigo || "—"}</td>
                      <td className="p-3 text-slate-800 font-medium">{item.descricao}</td>
                      <td className="p-3 text-center text-slate-600">{item.quantidade}</td>
                      <td className="p-3 text-center text-slate-600">{item.unidade}</td>

                      {fornecedoresCotacao.map((fc) => {
                        const fornId = fc.fornecedor_id || (fc as any).fornecedores?.id;
                        const resp = respostas.find(
                          (r) =>
                            String(r.fornecedor_id).trim() === String(fornId).trim() &&
                            String(r.cotacao_item_id).trim() === String(item.id).trim(),
                        );
                        const precoResp = resp?.preco ?? 0;
                        const subtotalForn = precoResp > 0 ? precoResp * (item.quantidade || 1) : 0;
                        const isMenor = menorInfo && resp && precoResp === menorInfo.menorUnitario;

                        return (
                          <td
                            key={fornId}
                            className={`p-3 text-right ${isMenor ? "bg-green-50 font-bold text-green-700" : "text-slate-700"}`}
                          >
                            {subtotalForn > 0 ? (
                              <div>
                                <div>{brl(subtotalForn)}</div>
                                <div className="text-[10px] text-slate-500 font-normal">
                                  Unit: {brl(precoResp)} {resp?.marca ? `(${resp.marca})` : ""}
                                </div>
                              </div>
                            ) : (
                              <span className="text-slate-300">—</span>
                            )}
                          </td>
                        );
                      })}

                      <td className="p-3 text-right bg-emerald-50/60 font-semibold text-emerald-800">
                        {menorInfo ? (
                          <div>
                            <div className="flex items-center justify-end gap-1">
                              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                              {brl(menorInfo.menorTotal)}
                            </div>
                            <div className="text-[10px] text-slate-600 font-normal">
                              {menorInfo.fornecedorNome}{" "}
                              {menorInfo.marca !== "—" ? `(${menorInfo.marca})` : ""}
                            </div>
                          </div>
                        ) : (
                          <span className="text-slate-400 font-normal">Sem cotação</span>
                        )}
                      </td>

                      <td className="p-3 text-center print:hidden">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleDeleteItem(item.id)}
                          className="text-red-600 h-8 w-8 p-0"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
            {itens.length > 0 && (
              <tfoot>
                <tr className="border-t-2 border-slate-400 bg-slate-100 font-bold text-slate-900">
                  <td className="p-3 text-right" colSpan={4}>
                    TOTAL
                  </td>
                  {totaisPorFornecedor.map((total, index) => (
                    <td key={fornecedoresCotacao[index]?.id ?? index} className="p-3 text-right">
                      {brl(total)}
                    </td>
                  ))}
                  <td className="p-3 text-right bg-emerald-100 text-emerald-900">
                    {brl(valorTotalOtimo)}
                  </td>
                  <td className="print:hidden" />
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </div>

      <div className="cotacao-assinaturas grid grid-cols-3 gap-8 pt-14 pb-4 px-4 bg-white">
        {[
          "Responsável Técnico / Compras",
          "Gerência de Manutenção",
          "Diretoria / Financeiro",
        ].map((titulo) => (
          <div key={titulo} className="pt-8 border-t border-slate-700 text-center">
            <span className="text-xs font-semibold text-slate-800">{titulo}</span>
          </div>
        ))}
      </div>

      {/* Modal Adicionar Item */}
      <Dialog open={isNovoItemOpen} onOpenChange={setIsNovoItemOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Adicionar Item à Cotação</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleAddItem} className="space-y-4">
            <div>
              <Label>Código (Opcional)</Label>
              <Input
                value={codigoItem}
                onChange={(e) => setCodigoItem(e.target.value)}
                placeholder="Ex: PEÇA-01"
              />
            </div>
            <div>
              <Label>Descrição *</Label>
              <Input
                value={descricaoItem}
                onChange={(e) => setDescricaoItem(e.target.value)}
                placeholder="Ex: Filtro de Óleo"
                required
              />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label>Quantidade</Label>
                <Input
                  type="number"
                  step="any"
                  value={quantidadeItem}
                  onChange={(e) => setQuantidadeItem(e.target.value)}
                  required
                />
              </div>
              <div>
                <Label>Unidade</Label>
                <Input
                  value={unidadeItem}
                  onChange={(e) => setUnidadeItem(e.target.value)}
                  placeholder="UN, PC, JG..."
                  required
                />
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsNovoItemOpen(false)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={saving}>Adicionar</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Modal Vincular Fornecedor */}
      <Dialog open={isVincularFornecedorOpen} onOpenChange={setIsVincularFornecedorOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Vincular Fornecedor à Cotação</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleVincularFornecedor} className="space-y-4">
            <div>
              <Label>Selecione o Fornecedor</Label>
              <select
                value={fornecedorIdSelecionado}
                onChange={(e) => setFornecedorIdSelecionado(e.target.value)}
                className="w-full mt-1 border border-slate-300 rounded-md p-2 text-sm bg-white h-10"
                required
              >
                <option value="">Selecione...</option>
                {todosFornecedores.map((f) => (
                  <option key={f.id} value={f.id}>
                    {f.nome_fantasia || f.razao_social} {f.cnpj ? `(${f.cnpj})` : ""}
                  </option>
                ))}
              </select>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsVincularFornecedorOpen(false)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={saving}>Vincular</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Modal Editar Preços */}
      <Dialog open={isPrecosOpen} onOpenChange={setIsPrecosOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              Preços do Fornecedor:{" "}
              {fornecedorPrecoAtivo?.fornecedores?.nome_fantasia ||
                fornecedorPrecoAtivo?.fornecedores?.razao_social}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSalvarPrecos} className="space-y-4">
            <div className="space-y-3">
              {itens.map((item) => (
                <div key={item.id} className="p-3 border rounded-lg bg-slate-50 space-y-2">
                  <div className="font-medium text-sm text-slate-800">
                    {item.descricao} <span className="text-xs text-slate-500">(Qtd: {item.quantidade} {item.unidade})</span>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <Label className="text-xs">Preço Unitário (R$)</Label>
                      <Input
                        type="text"
                        placeholder="0,00"
                        value={precosTemp[item.id]?.preco || ""}
                        onChange={(e) => {
                          const val = e.target.value;
                          setPrecosTemp((prev) => ({
                            ...prev,
                            [item.id]: { ...prev[item.id], preco: val },
                          }));
                        }}
                      />
                    </div>
                    <div>
                      <Label className="text-xs">Marca / Obs</Label>
                      <Input
                        type="text"
                        placeholder="Ex: HPARTS"
                        value={precosTemp[item.id]?.marca || ""}
                        onChange={(e) => {
                          const val = e.target.value;
                          setPrecosTemp((prev) => ({
                            ...prev,
                            [item.id]: { ...prev[item.id], marca: val },
                          }));
                        }}
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsPrecosOpen(false)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={saving}>Salvar Preços</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Modal Enviar Orçamento */}
      <Dialog open={isOrcamentoOpen} onOpenChange={setIsOrcamentoOpen}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle>Solicitação de Orçamento</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label className="text-xs">Texto gerado para envio:</Label>
              <textarea
                readOnly
                rows={8}
                className="w-full mt-1 border rounded-md p-2 text-xs font-mono bg-slate-50"
                value={gerarTextoOrcamento()}
              />
            </div>
            <div className="flex flex-wrap gap-2 justify-between items-center pt-2">
              <div className="flex gap-2">
                <Button onClick={enviarPorWhatsApp} className="bg-emerald-600 hover:bg-emerald-700 text-white gap-2">
                  <MessageCircle className="w-4 h-4" /> WhatsApp
                </Button>
                <Button onClick={enviarPorEmail} variant="outline" className="gap-2">
                  <Mail className="w-4 h-4" /> E-mail
                </Button>
              </div>
              <Button variant="ghost" onClick={() => setIsOrcamentoOpen(false)}>
                Fechar
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}