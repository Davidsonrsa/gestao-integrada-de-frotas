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
  Pencil,
  Trash2,
  Printer,
  Loader2,
  MessageCircle,
  Mail,
  ShoppingCart,
  FileText,
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
  solicitante_id?: string | null;
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
  endereco?: string | null;
  cidade?: string | null;
  estado?: string | null;
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

  // Estados para nova cotação
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

  // Estados do Modal de Envio (Orçamento vs Compra e Itens Selecionados)
  const [tipoEnvio, setTipoEnvio] = useState<"orcamento" | "compra">("orcamento");
  const [itensCompraSelecionados, setItensCompraSelecionados] = useState<{ [itemId: string]: boolean }>({});

  // Form Item
  const [codigoItem, setCodigoItem] = useState("");
  const [descricaoItem, setDescricaoItem] = useState("");
  const [quantidadeItem, setQuantidadeItem] = useState("1");
  const [unidadeItem, setUnidadeItem] = useState("UN");
  const [itemEditando, setItemEditando] = useState<ItemCotacao | null>(null);

  // Vinculação
  const [fornecedorIdSelecionado, setFornecedorIdSelecionado] = useState("");

  // Preços
  const [fornecedorPrecoAtivo, setFornecedorPrecoAtivo] = useState<CotacaoFornecedor | null>(null);
  const [precosTemp, setPrecosTemp] = useState<{
    [itemId: string]: { preco: string; marca: string };
  }>({});

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);

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
      const { data: { user } } = await supabase.auth.getUser();

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
            solicitante_id: user?.id || null,
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

  // Cálculo dos totais por fornecedor e menor preço global
  const { totaisPorFornecedor, menoresPrecosPorItem, valorTotalOtimo } = useMemo(() => {
    const totaisMap: { [fornId: string]: number } = {};
    const menoresMap: {
      [itemId: string]: {
        menorTotal: number;
        menorUnitario: number;
        fornecedorName: string;
        marca: string;
      };
    } = {};
    let totalOtimo = 0;

    fornecedoresCotacao.forEach((fc) => {
      const fornId = fc.fornecedor_id || (fc as any).fornecedores?.id;
      let somaForn = 0;

      itens.forEach((item) => {
        const resp = respostas.find(
          (r) =>
            String(r.fornecedor_id).trim() === String(fornId).trim() &&
            String(r.cotacao_item_id).trim() === String(item.id).trim(),
        );

        if (resp && typeof resp.preco === "number" && resp.preco > 0) {
          somaForn += resp.preco * (item.quantidade || 1);
        }
      });
      totaisMap[fornId] = somaForn;
    });

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
          fornecedorName: fornNome,
          marca: marcaStr,
        };
        totalOtimo += subtotalItem;
      }
    });

    return { totaisPorFornecedor: totaisMap, menoresPrecosPorItem: menoresMap, valorTotalOtimo: totalOtimo };
  }, [itens, fornecedoresCotacao, respostas]);

  useEffect(() => {
    async function atualizarTotalCotacao() {
      if (id === "nova" || !id || itens.length === 0) return;
      try {
        await supabase
          .from("cotacoes")
          .update({ valor_total: valorTotalOtimo })
          .eq("id", id);
      } catch (e) {
        console.error("Erro ao atualizar total da cotação", e);
      }
    }
    atualizarTotalCotacao();
  }, [id, valorTotalOtimo, itens.length]);

  function limparFormularioItem() {
    setCodigoItem("");
    setDescricaoItem("");
    setQuantidadeItem("1");
    setUnidadeItem("UN");
    setItemEditando(null);
  }

  function abrirEdicaoItem(item: ItemCotacao) {
    setItemEditando(item);
    setCodigoItem(item.codigo ?? "");
    setDescricaoItem(item.descricao);
    setQuantidadeItem(String(item.quantidade));
    setUnidadeItem(item.unidade);
    setIsNovoItemOpen(true);
  }

  async function handleSalvarItem(e: React.FormEvent) {
    e.preventDefault();
    if (!descricaoItem.trim()) return toast.error("Informe a descrição do item.");
    const quantidade = Number.parseFloat(quantidadeItem.replace(",", "."));
    if (!Number.isFinite(quantidade) || quantidade <= 0) {
      return toast.error("Informe uma quantidade válida maior que zero.");
    }
    if (!unidadeItem.trim()) return toast.error("Informe a unidade do item.");

    try {
      setSaving(true);
      const payload = {
        codigo: codigoItem.trim() || null,
        descricao: descricaoItem.trim(),
        quantidade,
        unidade: unidadeItem.trim().toUpperCase(),
      };
      const { error } = itemEditando
        ? await supabase.from("cotacao_itens").update(payload).eq("id", itemEditando.id)
        : await supabase.from("cotacao_itens").insert([{ cotacao_id: id, ...payload }]);
      if (error) throw error;
      toast.success(itemEditando ? "Item atualizado!" : "Item adicionado!");
      setIsNovoItemOpen(false);
      limparFormularioItem();
      await fetchData();
    } catch (error: unknown) {
      const err = error as Error;
      toast.error(`Erro ao ${itemEditando ? "atualizar" : "adicionar"} item: ${err.message}`);
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
    setTipoEnvio("orcamento");
    const selMap: { [itemId: string]: boolean } = {};
    itens.forEach((it) => {
      selMap[it.id] = true;
    });
    setItensCompraSelecionados(selMap);

    setStatusOrcamento(
      fc.status === "RASCUNHO"
        ? "aberto"
        : fc.status === "FINALIZADA"
          ? "aprovada"
          : fc.status || "aberto",
    );
    setIsOrcamentoOpen(true);
  }

  function gerarTextoMensagem() {
    const fornNome =
      fornecedorOrcamentoAtivo?.fornecedores?.nome_fantasia ||
      fornecedorOrcamentoAtivo?.fornecedores?.razao_social ||
      "Prezado Fornecedor";
    const fornId = fornecedorOrcamentoAtivo?.fornecedor_id || (fornecedorOrcamentoAtivo as any)?.fornecedores?.id;

    if (tipoEnvio === "compra") {
      let texto = `*PEDIDO / SOLICITAÇÃO DE COMPRA - COTAÇÃO Nº ${cotacao?.numero}*\n`;
      texto += `*Fornecedor:* ${fornNome}\n`;
      texto += `*Solicitante:* ${nomeSolicitanteFixo}\n`;
      texto += `*Equipamento/Patrimônio:* ${cotacao?.patrimonio || "—"}\n`;
      texto += `*Setor:* ${cotacao?.setor || "—"} | *Data:* ${formatarData(cotacao?.data_cotacao)}\n\n`;
      texto += `*ITENS DO PEDIDO DE COMPRA:*\n`;

      let totalPedido = 0;
      let contador = 1;

      itens.forEach((item) => {
        if (!itensCompraSelecionados[item.id]) return;

        const resp = respostas.find(
          (r) =>
            String(r.fornecedor_id).trim() === String(fornId).trim() &&
            String(r.cotacao_item_id).trim() === String(item.id).trim(),
        );

        const precoUnit = resp && typeof resp.preco === "number" ? resp.preco : 0;
        const subtotal = precoUnit * (item.quantidade || 1);
        totalPedido += subtotal;

        texto += `${contador}. *${item.descricao}* (Cód: ${item.codigo || "N/D"})\n`;
        texto += `   ↳ Qtd: ${item.quantidade} ${item.unidade} | Preço Unit.: ${brl(precoUnit)} | Subtotal: ${brl(subtotal)}`;
        if (resp?.marca) {
          texto += ` | Marca: ${resp.marca}`;
        }
        texto += `\n`;
        contador++;
      });

      texto += `\n*VALOR TOTAL DO PEDIDO:* *${brl(totalPedido)}*\n`;
      if (cotacao?.observacoes) {
        texto += `\n*Obs:* ${cotacao.observacoes}\n`;
      }
      texto += `\nFavor confirmar o recebimento deste pedido e previsão de entrega. Obrigado!`;
      return texto;
    } else {
      let texto = `*SOLICITAÇÃO DE ORÇAMENTO - COTAÇÃO Nº ${cotacao?.numero}*\n`;
      texto += `*Fornecedor:* ${fornNome}\n`;
      texto += `*Solicitante:* ${nomeSolicitanteFixo}\n`;
      texto += `*Equipamento/Patrimônio:* ${cotacao?.patrimonio || "—"}\n`;
      texto += `*Setor:* ${cotacao?.setor || "—"} | *Data:* ${formatarData(cotacao?.data_cotacao)}\n\n`;
      texto += `*ITENS SOLICITADOS:*\n`;

      itens.forEach((item, index) => {
        texto += `${index + 1}. *${item.descricao}* (Cód: ${item.codigo || "N/D"}) - Qtd: ${item.quantidade} ${item.unidade}`;
        
        const resp = respostas.find(
          (r) =>
            String(r.fornecedor_id).trim() === String(fornId).trim() &&
            String(r.cotacao_item_id).trim() === String(item.id).trim(),
        );

        if (resp && typeof resp.preco === "number" && resp.preco > 0) {
          texto += `\n   ↳ *Preço Unit.:* ${brl(resp.preco)} | *Marca:* ${resp.marca || "—"} | *Subtotal:* ${brl(resp.preco * (item.quantidade || 1))}`;
        }
        texto += `\n`;
      });

      if (cotacao?.observacoes) {
        texto += `\n*Obs:* ${cotacao.observacoes}\n`;
      }
      texto += `\nPor gentileza, retornar com os preços unitários e marcas dos itens acima. Obrigado!`;
      return texto;
    }
  }

  function enviarPorWhatsApp() {
    const telefone = fornecedorOrcamentoAtivo?.fornecedores?.telefone?.replace(/\D/g, "") || "";
    const texto = encodeURIComponent(gerarTextoMensagem());
    const url = telefone
      ? `https://wa.me/55${telefone}?text=${texto}`
      : `https://wa.me/?text=${texto}`;
    window.open(url, "_blank");
  }

  function enviarPorEmail() {
    const email = fornecedorOrcamentoAtivo?.fornecedores?.email || "";
    const assunto = encodeURIComponent(
      tipoEnvio === "compra"
        ? `Pedido / Solicitação de Compra - Cotação Nº ${cotacao?.numero}`
        : `Solicitação de Orçamento - Cotação Nº ${cotacao?.numero}`
    );
    const corpo = encodeURIComponent(gerarTextoMensagem().replace(/\*/g, ""));
    const url = `mailto:${email}?subject=${assunto}&body=${corpo}`;
    window.open(url, "_blank");
  }

  function imprimirDocumentoFornecedor() {
    const forn = fornecedorOrcamentoAtivo?.fornecedores;
    const fornNome = forn?.nome_fantasia || forn?.razao_social || "Prezado Fornecedor";
    const fornId = fornecedorOrcamentoAtivo?.fornecedor_id || (fornecedorOrcamentoAtivo as any)?.fornecedores?.id;

    let itensHtml = "";
    let totalGeral = 0;
    let contador = 1;

    itens.forEach((item) => {
      if (tipoEnvio === "compra" && !itensCompraSelecionados[item.id]) return;

      const resp = respostas.find(
        (r) =>
          String(r.fornecedor_id).trim() === String(fornId).trim() &&
          String(r.cotacao_item_id).trim() === String(item.id).trim(),
      );

      const precoUnit = resp && typeof resp.preco === "number" ? resp.preco : 0;
      const subtotal = precoUnit * (item.quantidade || 1);
      totalGeral += subtotal;

      itensHtml += `
        <tr>
          <td style="padding: 8px; border-bottom: 1px solid #cbd5e1; text-align: center;">${contador}</td>
          <td style="padding: 8px; border-bottom: 1px solid #cbd5e1; font-family: monospace;">${item.codigo || "—"}</td>
          <td style="padding: 8px; border-bottom: 1px solid #cbd5e1; font-weight: 500;">${item.descricao}</td>
          <td style="padding: 8px; border-bottom: 1px solid #cbd5e1; text-align: center;">${item.quantidade} ${item.unidade}</td>
          ${tipoEnvio === "compra" ? `
            <td style="padding: 8px; border-bottom: 1px solid #cbd5e1; text-align: right;">${brl(precoUnit)}</td>
            <td style="padding: 8px; border-bottom: 1px solid #cbd5e1; text-align: right; font-weight: bold;">${brl(subtotal)}</td>
          ` : `
            <td style="padding: 8px; border-bottom: 1px solid #cbd5e1; text-align: right;">${precoUnit > 0 ? brl(precoUnit) : "—"}</td>
            <td style="padding: 8px; border-bottom: 1px solid #cbd5e1; text-align: center;">${resp?.marca || "—"}</td>
          `}
        </tr>
      `;
      contador++;
    });

    const janelaPrint = window.open("", "_blank");
    if (!janelaPrint) return toast.error("Permita pop-ups no navegador para imprimir.");

    janelaPrint.document.write(`
      <html>
        <head>
          <title>${tipoEnvio === "compra" ? "Pedido de Compra" : "Solicitação de Orçamento"} - ${cotacao?.numero}</title>
          <style>
            body { font-family: Arial, sans-serif; color: #1e293b; margin: 20px; font-size: 14px; }
            .header { border-bottom: 2px solid #334155; padding-bottom: 15px; margin-bottom: 20px; display: flex; justify-content: space-between; align-items: flex-start; }
            .title { font-size: 20px; font-weight: bold; color: #0f172a; text-transform: uppercase; }
            .info-box { background: #f8fafc; border: 1px solid #e2e8f0; padding: 12px; border-radius: 6px; margin-bottom: 20px; }
            .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; }
            table { width: 100%; border-collapse: collapse; margin-top: 10px; margin-bottom: 20px; }
            th { background: #f1f5f9; padding: 10px; border-bottom: 2px solid #cbd5e1; text-align: left; font-size: 12px; text-transform: uppercase; }
            .total-row { font-weight: bold; text-align: right; font-size: 16px; padding: 10px; background: #f8fafc; }
            .footer { margin-top: 40px; text-align: center; font-size: 12px; color: #64748b; border-top: 1px solid #cbd5e1; padding-top: 15px; }
          </style>
        </head>
        <body>
          <div class="header">
            <div>
              <div class="title">${tipoEnvio === "compra" ? "Pedido / Solicitação de Compra" : "Solicitação de Orçamento"}</div>
              <div style="font-size: 14px; color: #475569; margin-top: 4px;">Cotação Nº <strong>${cotacao?.numero}</strong></div>
            </div>
            <div style="text-align: right; font-size: 12px; color: #475569;">
              Data: ${formatarData(cotacao?.data_cotacao)}<br/>
              Solicitante: ${nomeSolicitanteFixo}
            </div>
          </div>

          <div class="info-box">
            <div style="font-weight: bold; margin-bottom: 6px; color: #334155; font-size: 13px; text-transform: uppercase;">Dados do Fornecedor</div>
            <div style="font-size: 14px; font-weight: bold;">${fornNome}</div>
            <div style="font-size: 12px; color: #475569; margin-top: 2px;">
              ${forn?.cnpj ? `CNPJ: ${forn.cnpj} | ` : ""}
              ${forn?.telefone ? `Tel: ${forn.telefone} | ` : ""}
              ${forn?.email ? `E-mail: ${forn.email}` : ""}
            </div>
          </div>

          <div style="margin-bottom: 10px; font-size: 13px;">
            <strong>Patrimônio / Equipamento:</strong> ${cotacao?.patrimonio || "—"} &nbsp;|&nbsp; <strong>Setor:</strong> ${cotacao?.setor || "—"}
          </div>

          <table>
            <thead>
              <tr>
                <th style="width: 40px; text-align: center;">Item</th>
                <th style="width: 100px;">Código</th>
                <th>Descrição do Produto / Peça</th>
                <th style="width: 80px; text-align: center;">Qtd</th>
                ${tipoEnvio === "compra" ? `
                  <th style="width: 100px; text-align: right;">Preço Unit.</th>
                  <th style="width: 110px; text-align: right;">Subtotal</th>
                ` : `
                  <th style="width: 100px; text-align: right;">Preço Unit.</th>
                  <th style="width: 120px; text-align: center;">Marca</th>
                `}
              </tr>
            </thead>
            <tbody>
              ${itensHtml}
            </tbody>
          </table>

          ${tipoEnvio === "compra" ? `
            <div class="total-row">
              Valor Total do Pedido: ${brl(totalGeral)}
            </div>
          ` : ""}

          ${cotacao?.observacoes ? `
            <div style="margin-top: 20px; padding: 10px; background: #fef9c3; border: 1px solid #fde047; border-radius: 4px; font-size: 13px;">
              <strong>Observações:</strong> ${cotacao.observacoes}
            </div>
          ` : ""}

          <div class="footer">
            Documento gerado pelo sistema de cotações de manutenção. Favor conferir os dados acima.
          </div>

          <script>
            window.onload = function() { window.print(); window.close(); }
          </script>
        </body>
      </html>
    `);
    janelaPrint.document.close();
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
      toast.success("Status atualizado!");
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
          onClick={() => {
            limparFormularioItem();
            setIsNovoItemOpen(true);
          }}
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
                          Orçamento / Compra
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
                        return (
                          <td key={fornId} className="p-3 text-right">
                            {precoResp > 0 ? (
                              <div>
                                <div className="font-semibold text-slate-800">{brl(precoResp)}</div>
                                <div className="text-[10px] text-slate-500">
                                  Marca: {resp?.marca || "—"}
                                </div>
                                <div className="text-[10px] text-emerald-600 font-medium">
                                  Total: {brl(precoResp * (item.quantidade || 1))}
                                </div>
                              </div>
                            ) : (
                              <span className="text-xs text-slate-400">—</span>
                            )}
                          </td>
                        );
                      })}

                      <td className="p-3 text-right bg-emerald-50/50">
                        {menorInfo ? (
                          <div>
                            <div className="font-bold text-emerald-700">
                              {brl(menorInfo.menorTotal)}
                            </div>
                            <div className="text-[10px] text-slate-600">
                              Unit: {brl(menorInfo.menorUnitario)} ({menorInfo.fornecedorName})
                            </div>
                            <div className="text-[10px] text-slate-500">
                              Marca: {menorInfo.marca}
                            </div>
                          </div>
                        ) : (
                          <span className="text-xs text-slate-400">—</span>
                        )}
                      </td>
                      <td className="p-3 text-center print:hidden">
                        <div className="flex items-center justify-center gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => abrirEdicaoItem(item)}
                            className="h-8 w-8 text-blue-600 hover:text-blue-800"
                          >
                            <Pencil className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleDeleteItem(item.id)}
                            className="h-8 w-8 text-red-600 hover:text-red-800"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
            <tfoot className="bg-slate-50 font-bold text-slate-800 border-t-2 border-slate-200">
              <tr>
                <td colSpan={4} className="p-3 text-right uppercase text-xs">
                  Total
                </td>
                {fornecedoresCotacao.map((fc) => {
                  const fornId = fc.fornecedor_id || (fc as any).fornecedores?.id;
                  const totalForn = totaisPorFornecedor[fornId] || 0;
                  return (
                    <td key={fornId} className="p-3 text-right">
                      {totalForn > 0 ? brl(totalForn) : "—"}
                    </td>
                  );
                })}
                <td className="p-3 text-right bg-emerald-100 text-emerald-900">
                  {brl(valorTotalOtimo)}
                </td>
                <td className="print:hidden"></td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

      <div className="cotacao-assinaturas mt-12 pt-12 grid grid-cols-3 gap-8 text-center text-xs text-slate-600">
        <div className="border-t border-slate-400 pt-2">
          <p className="font-semibold text-slate-800">Responsável Técnico / Compras</p>
        </div>
        <div className="border-t border-slate-400 pt-2">
          <p className="font-semibold text-slate-800">Gerência de Manutenção</p>
        </div>
        <div className="border-t border-slate-400 pt-2">
          <p className="font-semibold text-slate-800">Diretoria / Financeiro</p>
        </div>
      </div>

      {/* MODAL ADICIONAR / EDITAR ITEM */}
      <Dialog open={isNovoItemOpen} onOpenChange={setIsNovoItemOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{itemEditando ? "Editar Item" : "Adicionar Novo Item"}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSalvarItem} className="space-y-4">
            <div>
              <Label className="text-xs font-semibold text-slate-700">Código do Produto / Peça</Label>
              <Input
                placeholder="Ex: PEC-00123"
                value={codigoItem}
                onChange={(e) => setCodigoItem(e.target.value)}
                className="mt-1 font-mono"
              />
            </div>
            <div>
              <Label className="text-xs font-semibold text-slate-700">Descrição *</Label>
              <Input
                placeholder="Ex: Filtro de Óleo do Motor"
                value={descricaoItem}
                onChange={(e) => setDescricaoItem(e.target.value)}
                required
                className="mt-1"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-xs font-semibold text-slate-700">Quantidade *</Label>
                <Input
                  type="number"
                  step="any"
                  min="0.001"
                  value={quantidadeItem}
                  onChange={(e) => setQuantidadeItem(e.target.value)}
                  required
                  className="mt-1"
                />
              </div>
              <div>
                <Label className="text-xs font-semibold text-slate-700">Unidade *</Label>
                <Input
                  placeholder="Ex: UN, PC, LT"
                  value={unidadeItem}
                  onChange={(e) => setUnidadeItem(e.target.value)}
                  required
                  className="mt-1 uppercase"
                />
              </div>
            </div>
            <DialogFooter className="pt-4">
              <Button type="button" variant="outline" onClick={() => setIsNovoItemOpen(false)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={saving} className="bg-blue-600 hover:bg-blue-700 text-white">
                {saving && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
                Salvar Item
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* MODAL VINCULAR FORNECEDOR */}
      <Dialog open={isVincularFornecedorOpen} onOpenChange={setIsVincularFornecedorOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Vincular Fornecedor à Cotação</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleVincularFornecedor} className="space-y-4">
            <div>
              <Label className="text-xs font-semibold text-slate-700">Selecione o Fornecedor *</Label>
              <select
                value={fornecedorIdSelecionado}
                onChange={(e) => setFornecedorIdSelecionado(e.target.value)}
                required
                className="w-full mt-1 border border-slate-300 rounded-md p-2 text-sm bg-white"
              >
                <option value="">Selecione...</option>
                {todosFornecedores.map((f) => (
                  <option key={f.id} value={f.id}>
                    {f.nome_fantasia ? `${f.nome_fantasia} (${f.razao_social})` : f.razao_social}
                  </option>
                ))}
              </select>
            </div>
            <DialogFooter className="pt-4">
              <Button type="button" variant="outline" onClick={() => setIsVincularFornecedorOpen(false)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={saving} className="bg-blue-600 hover:bg-blue-700 text-white">
                {saving && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
                Vincular
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* MODAL INSERIR / EDITAR PREÇOS */}
      <Dialog open={isPrecosOpen} onOpenChange={setIsPrecosOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              Editar Preços - {fornecedorPrecoAtivo?.fornecedores?.nome_fantasia || fornecedorPrecoAtivo?.fornecedores?.razao_social}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSalvarPrecos} className="space-y-4">
            <div className="space-y-3">
              {itens.map((item) => (
                <div key={item.id} className="p-3 bg-slate-50 rounded-lg border border-slate-200 grid grid-cols-1 md:grid-cols-12 gap-3 items-center">
                  <div className="md:col-span-6">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-mono bg-slate-200 text-slate-700 px-1.5 py-0.5 rounded">
                        {item.codigo || "SEM CÓD."}
                      </span>
                      <span className="font-medium text-slate-800 text-sm">{item.descricao}</span>
                    </div>
                    <span className="text-xs text-slate-500">
                      Qtd: {item.quantidade} {item.unidade}
                    </span>
                  </div>
                  <div className="md:col-span-3">
                    <Label className="text-[10px] text-slate-600">Preço Unitário (R$)</Label>
                    <Input
                      type="text"
                      placeholder="0.00"
                      value={precosTemp[item.id]?.preco || ""}
                      onChange={(e) => {
                        const val = e.target.value;
                        setPrecosTemp((prev) => ({
                          ...prev,
                          [item.id]: { ...prev[item.id], preco: val },
                        }));
                      }}
                      className="mt-0.5 bg-white"
                    />
                  </div>
                  <div className="md:col-span-3">
                    <Label className="text-[10px] text-slate-600">Marca</Label>
                    <Input
                      type="text"
                      placeholder="Marca / Fabricante"
                      value={precosTemp[item.id]?.marca || ""}
                      onChange={(e) => {
                        const val = e.target.value;
                        setPrecosTemp((prev) => ({
                          ...prev,
                          [item.id]: { ...prev[item.id], marca: val },
                        }));
                      }}
                      className="mt-0.5 bg-white"
                    />
                  </div>
                </div>
              ))}
            </div>
            <DialogFooter className="pt-4">
              <Button type="button" variant="outline" onClick={() => setIsPrecosOpen(false)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={saving} className="bg-blue-600 hover:bg-blue-700 text-white">
                {saving && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
                Salvar Preços
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* MODAL ORÇAMENTO / PEDIDO DE COMPRA (TELA AMPLIADA MAX-W-4XL) */}
      <Dialog open={isOrcamentoOpen} onOpenChange={setIsOrcamentoOpen}>
        <DialogContent className="max-w-4xl max-h-[92vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold flex items-center gap-2">
              {tipoEnvio === "compra" ? (
                <ShoppingCart className="w-6 h-6 text-blue-600" />
              ) : (
                <FileText className="w-6 h-6 text-emerald-600" />
              )}
              {tipoEnvio === "compra" ? "Pedido / Solicitação de Compra" : "Solicitação de Orçamento"}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-5">
            {/* ABAS DE SELEÇÃO: ORÇAMENTO vs COMPRA */}
            <div className="flex rounded-lg bg-slate-100 p-1.5 border border-slate-200">
              <button
                type="button"
                onClick={() => setTipoEnvio("orcamento")}
                className={`flex-1 py-2.5 text-sm font-bold rounded-md transition-all flex items-center justify-center gap-2 ${
                  tipoEnvio === "orcamento"
                    ? "bg-white text-slate-800 shadow-sm"
                    : "text-slate-500 hover:text-slate-800"
                }`}
              >
                <FileText className="w-4 h-4 text-emerald-600" /> Solicitação de Orçamento
              </button>
              <button
                type="button"
                onClick={() => setTipoEnvio("compra")}
                className={`flex-1 py-2.5 text-sm font-bold rounded-md transition-all flex items-center justify-center gap-2 ${
                  tipoEnvio === "compra"
                    ? "bg-white text-slate-800 shadow-sm"
                    : "text-slate-500 hover:text-slate-800"
                }`}
              >
                <ShoppingCart className="w-4 h-4 text-blue-600" /> Pedido / Compra
              </button>
            </div>

            <div>
              <Label className="text-xs font-semibold text-slate-700">Status do Processo</Label>
              <div className="flex gap-2 mt-1">
                <select
                  value={statusOrcamento}
                  onChange={(e) => setStatusOrcamento(e.target.value)}
                  className="w-full border border-slate-300 rounded-md p-2.5 text-sm bg-white"
                >
                  <option value="aberto">Aberto / Enviado</option>
                  <option value="respondido">Respondido</option>
                  <option value="aprovada">Aprovado / Pedido Fechado</option>
                  <option value="recusado">Recusado</option>
                </select>
                <Button type="button" onClick={salvarStatusOrcamento} disabled={saving} variant="outline" className="px-5">
                  Atualizar
                </Button>
              </div>
            </div>

            {/* SE FOR MODO COMPRA, EXIBE SELEÇÃO DE ITENS AMPLIADA */}
            {tipoEnvio === "compra" && (
              <div className="bg-blue-50/70 p-4 rounded-xl border border-blue-200 space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-xs font-bold text-blue-900 uppercase tracking-wide">
                    Selecione os itens que farão parte deste pedido de compra:
                  </span>
                  <div className="space-x-3 text-xs">
                    <button
                      type="button"
                      onClick={() => {
                        const all: { [k: string]: boolean } = {};
                        itens.forEach((it) => (all[it.id] = true));
                        setItensCompraSelecionados(all);
                      }}
                      className="text-blue-600 hover:underline font-bold"
                    >
                      Marcar Todos
                    </button>
                    <span>|</span>
                    <button
                      type="button"
                      onClick={() => setItensCompraSelecionados({})}
                      className="text-slate-600 hover:underline font-bold"
                    >
                      Desmarcar Todos
                    </button>
                  </div>
                </div>

                <div className="max-h-56 overflow-y-auto space-y-2 pr-1">
                  {itens.map((item) => {
                    const fornId =
                      fornecedorOrcamentoAtivo?.fornecedor_id ||
                      (fornecedorOrcamentoAtivo as any)?.fornecedores?.id;
                    const resp = respostas.find(
                      (r) =>
                        String(r.fornecedor_id).trim() === String(fornId).trim() &&
                        String(r.cotacao_item_id).trim() === String(item.id).trim(),
                    );
                    const preco = resp && resp.preco ? resp.preco : 0;
                    const subtotal = preco * (item.quantidade || 1);

                    return (
                      <label
                        key={item.id}
                        className="flex items-center justify-between p-3 bg-white rounded-lg border border-blue-100 text-sm cursor-pointer hover:bg-blue-50/60 shadow-xs transition-colors"
                      >
                        <div className="flex items-center gap-3">
                          <input
                            type="checkbox"
                            checked={!!itensCompraSelecionados[item.id]}
                            onChange={(e) => {
                              const checked = e.target.checked;
                              setItensCompraSelecionados((prev) => ({
                                ...prev,
                                [item.id]: checked,
                              }));
                            }}
                            className="rounded border-slate-300 text-blue-600 focus:ring-blue-500 h-5 w-5"
                          />
                          <div>
                            <span className="font-semibold text-slate-800">{item.descricao}</span>
                            <span className="text-slate-500 ml-2 text-xs">
                              (Cód: {item.codigo || "N/D"} | Qtd: {item.quantidade} {item.unidade})
                            </span>
                          </div>
                        </div>
                        <div className="text-right">
                          <span className="font-bold text-emerald-600 text-base">{brl(subtotal)}</span>
                          <span className="text-xs text-slate-400 block">
                            Unit: {brl(preco)} {resp?.marca ? `• Marca: ${resp.marca}` : ""}
                          </span>
                        </div>
                      </label>
                    );
                  })}
                </div>
              </div>
            )}

            <div>
              <Label className="text-xs font-semibold text-slate-700">Prévia da Mensagem (WhatsApp / E-mail)</Label>
              <textarea
                readOnly
                value={gerarTextoMensagem()}
                rows={10}
                className="w-full mt-1 p-3 text-xs font-mono bg-slate-50 border border-slate-200 rounded-lg resize-none"
              />
            </div>

            <div className="flex flex-wrap gap-3 pt-2">
              <Button onClick={enviarPorWhatsApp} className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white gap-2 py-6 text-sm font-bold">
                <MessageCircle className="w-5 h-5" /> Enviar WhatsApp
              </Button>
              <Button onClick={enviarPorEmail} variant="outline" className="flex-1 gap-2 py-6 text-sm font-bold border-slate-300">
                <Mail className="w-5 h-5" /> Enviar E-mail
              </Button>
              <Button onClick={imprimirDocumentoFornecedor} variant="outline" className="flex-1 gap-2 py-6 text-sm font-bold border-slate-300 bg-slate-100 hover:bg-slate-200 text-slate-800">
                <Printer className="w-5 h-5" /> Imprimir / PDF
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}