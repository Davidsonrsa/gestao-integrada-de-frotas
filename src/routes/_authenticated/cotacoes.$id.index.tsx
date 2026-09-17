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
  criado_por?: string | null; 
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

      // Buscar usuário logado atual
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (user) {
        // Tenta buscar nome do perfil se houver tabela profiles, senão pega do metadata ou email
        const { data: profile } = await supabase
          .from("profiles")
          .select("full_name")
          .eq("id", user.id)
          .single();

        if (profile?.full_name) {
          setUsuarioNome(profile.full_name);
        } else if (user.user_metadata?.name) {
          setUsuarioNome(user.user_metadata.name);
        } else if (user.email) {
          setUsuarioNome(user.email.split("@")[0].toUpperCase());
        }
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
    texto += `*Solicitante:* ${usuarioNome}\n`;
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
              <strong>Solicitante:</strong> {cotacao.criado_por ||usuarioNome}
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
            <tfoot className="bg-slate-100 font-bold text-slate-800">
              <tr>
                <td colSpan={4} className="p-3 text-right">
                  VALOR TOTAL:
                </td>
                {fornecedoresCotacao.map((fc) => {
                  const fornId = fc.fornecedor_id || (fc as any).fornecedores?.id;
                  let totalForn = 0;
                  itens.forEach((item) => {
                    const resp = respostas.find(
                      (r) =>
                        String(r.fornecedor_id).trim() === String(fornId).trim() &&
                        String(r.cotacao_item_id).trim() === String(item.id).trim(),
                    );
                    if (resp && (resp.preco ?? 0) > 0) {
                      totalForn += (resp.preco ?? 0) * (item.quantidade || 1);
                    }
                  });
                  return (
                    <td key={fornId} className="p-3 text-right">
                      {totalForn > 0 ? brl(totalForn) : "—"}
                    </td>
                  );
                })}
                <td className="p-3 text-right bg-emerald-100 text-emerald-900 text-base">
                  {brl(valorTotalOtimo)}
                </td>
                <td className="print:hidden"></td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

      <div className="hidden print:block mt-12 pt-8 border-t border-slate-400">
        <div className="grid grid-cols-3 gap-8 text-center">
          <div className="space-y-2">
            <div className="border-b border-black pb-12"></div>
            <p className="text-xs font-bold text-black">Responsável Técnico / Compras</p>
            <p className="text-[10px] text-slate-600">Data: ____/____/________</p>
          </div>
          <div className="space-y-2">
            <div className="border-b border-black pb-12"></div>
            <p className="text-xs font-bold text-black">Gerência de Manutenção</p>
            <p className="text-[10px] text-slate-600">Data: ____/____/________</p>
          </div>
          <div className="space-y-2">
            <div className="border-b border-black pb-12"></div>
            <p className="text-xs font-bold text-black">Diretoria / Financeiro</p>
            <p className="text-[10px] text-slate-600">Data: ____/____/________</p>
          </div>
        </div>
      </div>

      {/* MODAL DE ORÇAMENTO ESPECÍFICO PARA O FORNECEDOR */}
      <Dialog open={isOrcamentoOpen} onOpenChange={setIsOrcamentoOpen}>
        <DialogContent className="sm:max-w-2xl bg-white max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileText className="w-5 h-5 text-blue-600" />
              Solicitação de Orçamento -{" "}
              {fornecedorOrcamentoAtivo?.fornecedores?.nome_fantasia ||
                fornecedorOrcamentoAtivo?.fornecedores?.razao_social}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="bg-slate-50 p-3 rounded-lg border border-slate-200 text-xs space-y-1">
              <p>
                <strong>Cotação Nº:</strong> {cotacao.numero}
              </p>
              <p>
                <strong>Equipamento / Patrimônio:</strong> {cotacao.patrimonio || "—"}
              </p>
              <p>
                <strong>Setor:</strong> {cotacao.setor || "—"} | <strong>Data:</strong>{" "}
                {formatarData(cotacao.data_cotacao)}
              </p>
              <p>
                <strong>Solicitante:</strong>{" "}
                <span className="text-blue-700 font-bold">{usuarioNome}</span>
              </p>
              {fornecedorOrcamentoAtivo?.fornecedores?.cnpj && (
                <p>
                  <strong>CNPJ Fornecedor:</strong> {fornecedorOrcamentoAtivo.fornecedores.cnpj}
                </p>
              )}
              {fornecedorOrcamentoAtivo?.fornecedores?.telefone && (
                <p>
                  <strong>Telefone:</strong> {fornecedorOrcamentoAtivo.fornecedores.telefone}
                </p>
              )}
              {fornecedorOrcamentoAtivo?.fornecedores?.email && (
                <p>
                  <strong>E-mail:</strong> {fornecedorOrcamentoAtivo.fornecedores.email}
                </p>
              )}
            </div>

            <div className="flex flex-col gap-2 rounded-lg border border-blue-100 bg-blue-50 p-3 sm:flex-row sm:items-end sm:justify-between">
              <div className="flex-1">
                <Label className="text-xs font-semibold text-slate-700">
                  Status do orçamento
                </Label>
                <select
                  value={statusOrcamento}
                  onChange={(e) => setStatusOrcamento(e.target.value)}
                  className="mt-1 h-10 w-full rounded-md border border-slate-300 bg-white px-3 text-sm"
                >
                  <option value="aberto">Em Aberto</option>
                  <option value="analise">Em Análise</option>
                  <option value="aprovada">Aprovada</option>
                  <option value="recusada">Recusada</option>
                </select>
              </div>
              <Button
                type="button"
                onClick={salvarStatusOrcamento}
                disabled={saving}
                className="bg-blue-600 text-white hover:bg-blue-700"
              >
                {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Salvar status
              </Button>
            </div>

            <div>
              <h4 className="text-xs font-bold uppercase text-slate-700 mb-2">
                Itens solicitados para cotação:
              </h4>
              <div className="border border-slate-200 rounded-lg overflow-hidden">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-100 text-slate-700">
                    <tr>
                      <th className="p-2 border-b">Cód.</th>
                      <th className="p-2 border-b">Descrição</th>
                      <th className="p-2 border-b text-center">Qtd</th>
                      <th className="p-2 border-b text-center">Un</th>
                      <th className="p-2 border-b text-right">Preço Unit. (R$)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {itens.map((item) => (
                      <tr key={item.id} className="border-b border-slate-100">
                        <td className="p-2 font-mono text-slate-500">{item.codigo || "—"}</td>
                        <td className="p-2 font-medium text-slate-800">{item.descricao}</td>
                        <td className="p-2 text-center">{item.quantidade}</td>
                        <td className="p-2 text-center">{item.unidade}</td>
                        <td className="p-2 text-right text-slate-400">________</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {cotacao.observacoes && (
              <div className="text-xs text-slate-600 bg-amber-50 border border-amber-200 p-2.5 rounded">
                <strong>Observações:</strong> {cotacao.observacoes}
              </div>
            )}
          </div>

          <DialogFooter className="flex flex-wrap gap-2 justify-between items-center pt-2 border-t">
            <div className="flex gap-2">
              <Button
                type="button"
                onClick={enviarPorWhatsApp}
                className="bg-emerald-600 hover:bg-emerald-700 text-white gap-2 text-xs"
              >
                <MessageCircle className="w-4 h-4" /> Enviar por WhatsApp
              </Button>
              <Button
                type="button"
                onClick={enviarPorEmail}
                className="bg-blue-600 hover:bg-blue-700 text-white gap-2 text-xs"
              >
                <Mail className="w-4 h-4" /> Enviar por E-mail
              </Button>
            </div>
            <div className="flex gap-2">
              <Button
                type="button"
                onClick={() => window.print()}
                variant="outline"
                className="gap-2 text-xs"
              >
                <Printer className="w-4 h-4" /> Imprimir PDF
              </Button>
              <Button
                type="button"
                variant="ghost"
                onClick={() => setIsOrcamentoOpen(false)}
                className="text-xs"
              >
                Fechar
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* MODAIS DE ITEM, FORNECEDOR E PREÇOS */}
      <Dialog open={isNovoItemOpen} onOpenChange={setIsNovoItemOpen}>
        <DialogContent className="sm:max-w-md bg-white">
          <DialogHeader>
            <DialogTitle>Adicionar Item / Peça</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleAddItem} className="space-y-4 mt-2">
            <div>
              <Label className="text-xs font-semibold text-slate-700">
                Código do Produto / Peça
              </Label>
              <Input
                value={codigoItem}
                onChange={(e) => setCodigoItem(e.target.value)}
                placeholder="Ex: FIL-01"
                className="mt-1"
              />
            </div>
            <div>
              <Label className="text-xs font-semibold text-slate-700">Descrição *</Label>
              <Input
                value={descricaoItem}
                onChange={(e) => setDescricaoItem(e.target.value)}
                placeholder="Ex: Filtro de Óleo"
                required
                className="mt-1"
              />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label className="text-xs font-semibold text-slate-700">Quantidade</Label>
                <Input
                  type="number"
                  step="any"
                  value={quantidadeItem}
                  onChange={(e) => setQuantidadeItem(e.target.value)}
                  required
                  className="mt-1"
                />
              </div>
              <div>
                <Label className="text-xs font-semibold text-slate-700">Unidade</Label>
                <Input
                  value={unidadeItem}
                  onChange={(e) => setUnidadeItem(e.target.value)}
                  required
                  className="mt-1"
                />
              </div>
            </div>
            <DialogFooter className="mt-4 flex gap-2 justify-end">
              <Button type="button" variant="outline" onClick={() => setIsNovoItemOpen(false)}>
                Cancelar
              </Button>
              <Button type="submit" className="bg-blue-600 hover:bg-blue-700 text-white">
                Salvar
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={isVincularFornecedorOpen} onOpenChange={setIsVincularFornecedorOpen}>
        <DialogContent className="sm:max-w-md bg-white">
          <DialogHeader>
            <DialogTitle>Vincular Fornecedor</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleVincularFornecedor} className="space-y-4 mt-2">
            <div>
              <Label className="text-xs font-semibold text-slate-700">Fornecedor *</Label>
              <select
                className="w-full mt-1 border border-slate-300 rounded-md p-2 text-sm bg-white"
                value={fornecedorIdSelecionado}
                onChange={(e) => setFornecedorIdSelecionado(e.target.value)}
                required
              >
                <option value="">Selecione...</option>
                {todosFornecedores.map((f) => (
                  <option key={f.id} value={f.id}>
                    {f.nome_fantasia || f.razao_social}
                  </option>
                ))}
              </select>
            </div>
            <DialogFooter className="mt-4 flex gap-2 justify-end">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsVincularFornecedorOpen(false)}
              >
                Cancelar
              </Button>
              <Button type="submit" className="bg-blue-600 hover:bg-blue-700 text-white">
                Vincular
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

    <Dialog open={isPrecosOpen} onOpenChange={setIsPrecosOpen}>
        <DialogContent className="sm:max-w-2xl bg-white max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Informar Preços</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSalvarPrecos} className="space-y-4 mt-2">
            <div className="space-y-3">
              {itens.map((item) => (
                <div
                  key={item.id}
                  className="grid grid-cols-1 md:grid-cols-12 gap-2 items-center bg-slate-50 p-3 rounded-lg border border-slate-200"
                >
                  <div className="md:col-span-6 text-sm">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xs font-mono font-bold bg-slate-200 px-1.5 py-0.5 rounded text-slate-700">
                        {item.codigo || "SEM CÓD."}
                      </span>
                      <span className="text-xs text-slate-500">
                        Qtd: {item.quantidade} {item.unidade}
                      </span>
                    </div>
                    <span className="font-semibold text-slate-800 block">{item.descricao}</span>
                  </div>
                  <div className="md:col-span-3">
                    <Input
                      placeholder="Preço (R$)"
                      value={precosTemp[item.id]?.preco || ""}
                      onChange={(e) =>
                        setPrecosTemp({
                          ...precosTemp,
                          [item.id]: { ...precosTemp[item.id], preco: e.target.value },
                        })
                      }
                    />
                  </div>
                  <div className="md:col-span-3">
                    <Input
                      placeholder="Marca"
                      value={precosTemp[item.id]?.marca || ""}
                      onChange={(e) =>
                        setPrecosTemp({
                          ...precosTemp,
                          [item.id]: { ...precosTemp[item.id], marca: e.target.value },
                        })
                      }
                    />
                  </div>
                </div>
              ))}
            </div>
            <DialogFooter className="mt-4 flex gap-2 justify-end">
              <Button type="button" variant="outline" onClick={() => setIsPrecosOpen(false)}>
                Cancelar
              </Button>
              <Button type="submit" className="bg-blue-600 hover:bg-blue-700 text-white">
                Salvar Preços
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
