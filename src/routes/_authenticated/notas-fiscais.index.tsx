import { useEffect, useRef, useState } from "react";
import { correspondeBusca, padraoIlikeBusca } from "@/lib/busca";
import { createFileRoute } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { requireAdmin } from "@/lib/route-guards";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import * as XLSX from "xlsx";
import {
  Search,
  PlusCircle,
  FileSpreadsheet,
  Pencil,
  Loader2,
  Trash2,
  Calculator,
  FilterX,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

export const Route = createFileRoute("/_authenticated/notas-fiscais/")({
  beforeLoad: requireAdmin,
  component: NotasFiscaisPage,
});

interface NotaFiscalItem {
  id: string;
  nf: string;
  fornecedor: string;
  identificacao: string;
  cl: string;
  data: string;
  valor: number;
  descricao_produto: string;
  observacao: string;
  venc01: string | null;
  venc02: string | null;
  venc03: string | null;
  venc04: string | null;
  venc05: string | null;
}

interface FornecedorItem {
  id: string;
  nome: string;
}

const IMPORT_BATCH_SIZE = 200;

function normalizeHeader(value: unknown): string {
  return String(value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");
}

function isValidDate(year: number, month: number, day: number): boolean {
  if (!Number.isInteger(year) || !Number.isInteger(month) || !Number.isInteger(day)) return false;
  if (year < 1900 || year > 2200 || month < 1 || month > 12 || day < 1 || day > 31) return false;
  const date = new Date(year, month - 1, day);
  return date.getFullYear() === year && date.getMonth() === month - 1 && date.getDate() === day;
}

function parseExcelDate(value: unknown): string | null {
  if (value === null || value === undefined || value === "") return null;
  if (value instanceof Date) {
    if (Number.isNaN(value.getTime())) return null;
    const year = value.getFullYear();
    const month = value.getMonth() + 1;
    const day = value.getDate();
    return isValidDate(year, month, day)
      ? `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`
      : null;
  }
  if (typeof value === "number" && Number.isFinite(value)) {
    const excelEpoch = new Date(1899, 11, 30);
    const jsDate = new Date(excelEpoch.getTime() + value * 24 * 60 * 60 * 1000);
    const year = jsDate.getFullYear();
    const month = jsDate.getMonth() + 1;
    const day = jsDate.getDate();
    return isValidDate(year, month, day)
      ? `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`
      : null;
  }
  if (typeof value !== "string") return null;
  let text = value.trim();
  if (!text) return null;
  text = text.split(" ")[0];
  if (/^\d+$/.test(text)) {
    const number = Number(text);
    const excelEpoch = new Date(1899, 11, 30);
    const jsDate = new Date(excelEpoch.getTime() + number * 24 * 60 * 60 * 1000);
    const year = jsDate.getFullYear();
    const month = jsDate.getMonth() + 1;
    const day = jsDate.getDate();
    return isValidDate(year, month, day)
      ? `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`
      : null;
  }
  let match = text.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
  if (match) {
    const [, y, m, d] = match;
    const year = Number(y),
      month = Number(m),
      day = Number(d);
    return isValidDate(year, month, day)
      ? `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`
      : null;
  }
  match = text.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2}|\d{4})$/);
  if (match) {
    const day = Number(match[1]),
      month = Number(match[2]);
    let year = match[3];
    if (year.length === 2) year = Number(year) >= 50 ? `19${year}` : `20${year}`;
    const yearNumber = Number(year);
    return isValidDate(yearNumber, month, day)
      ? `${yearNumber}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`
      : null;
  }
  return null;
}

function parseExcelValue(value: unknown): number {
  if (value === null || value === undefined || value === "") return 0;
  if (typeof value === "number") return Number.isFinite(value) ? value : 0;
  let text = String(value)
    .trim()
    .replace(/R\$/gi, "")
    .replace(/\s/g, "")
    .replace(/\u00a0/g, "");
  if (!text) return 0;
  if (text.includes(",") && text.includes(".")) text = text.replace(/\./g, "").replace(",", ".");
  else if (text.includes(",")) text = text.replace(",", ".");
  const number = Number(text);
  return Number.isFinite(number) ? number : 0;
}

function parseText(value: unknown): string {
  if (value === null || value === undefined) return "";
  return String(value).trim();
}

function parseNumeroNF(value: unknown): string {
  if (value === null || value === undefined || value === "") return "";
  if (value instanceof Date) return "";
  if (typeof value === "number")
    return Number.isInteger(value) ? String(value) : String(value).replace(/\.0+$/, "");
  const str = String(value).trim();
  if (/GMT|Sun|Mon|Tue|Wed|Thu|Fri|Sat/.test(str)) return "";
  return str;
}

function getExcelValue(row: Record<string, unknown>, aliases: string[]): unknown {
  const normalizedAliases = aliases.map(normalizeHeader);
  for (const key of Object.keys(row)) {
    if (normalizedAliases.includes(normalizeHeader(key))) return row[key];
  }
  return null;
}

function formatBRL(value: number): string {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value || 0);
}

function formatDate(dateStr: unknown): string {
  if (!dateStr || dateStr === "—") return "";
  try {
    const cleanDate = String(dateStr).split("T")[0];
    const parts = cleanDate.split("-");
    if (parts.length === 3) return `${parts[2]}/${parts[1]}/${parts[0]}`;
    return String(dateStr);
  } catch {
    return String(dateStr);
  }
}

function NotasFiscaisPage() {
  const [openModalCadastro, setOpenModalCadastro] = useState(false);
  const [openModalEdicao, setOpenModalEdicao] = useState(false);
  const [notaSelecionada, setNotaSelecionada] = useState<NotaFiscalItem | null>(null);
  const [notasList, setNotasList] = useState<NotaFiscalItem[]>([]);
  const [fornecedoresList, setFornecedoresList] = useState<FornecedorItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [importing, setImporting] = useState(false);
  const [importProgress, setImportProgress] = useState(0);
  const [importTotal, setImportTotal] = useState(0);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [busca, setBusca] = useState("");
  const [clFiltro, setClFiltro] = useState("");
  const [dataInicio, setDataInicio] = useState("");
  const [dataFim, setDataFim] = useState("");
  const [paginaAtual, setPaginaAtual] = useState(1);
  const itensPorPagina = 50;
  const [totalRegistros, setTotalRegistros] = useState(0);
  const [clsCadastrados, setClsCadastrados] = useState<string[]>([]);

  const [numeroNf, setNumeroNf] = useState("");
  const [fornecedor, setFornecedor] = useState("");
  const [equipamento, setEquipamento] = useState("");
  const [cl, setCl] = useState("");
  const [emissao, setEmissao] = useState("");
  const [valorTotal, setValorTotal] = useState("");
  const [descricaoProduto, setDescricaoProduto] = useState("");
  const [venc01, setVenc01] = useState("");
  const [venc02, setVenc02] = useState("");
  const [venc03, setVenc03] = useState("");
  const [venc04, setVenc04] = useState("");
  const [venc05, setVenc05] = useState("");
  const [observacao, setObservacao] = useState("");
  const [mostrarNovoFornecedor, setMostrarNovoFornecedor] = useState(false);
  const [novaRazaoSocial, setNovaRazaoSocial] = useState("");
  const [novoNomeFantasia, setNovoNomeFantasia] = useState("");
  const [salvandoFornecedor, setSalvandoFornecedor] = useState(false);

  const fetchNotas = async (termoBusca = "") => {
    setLoading(true);
    try {
      let query = supabase
        .from("notas_fiscais")
        .select("*", { count: "exact" })
        .order("created_at", { ascending: false })
        .order("id", { ascending: false });

      const termo = termoBusca.trim().replace(/[(),]/g, " ");
      if (termo) {
        const p = padraoIlikeBusca(termo) || `%${termo}%`;
        query = query.or(
          `nf.ilike.${p},fornecedor.ilike.${p},cl.ilike.${p},identificacao.ilike.${p},descricao_produto.ilike.${p},observacao.ilike.${p}`,
        );
      }
      if (clFiltro) query = query.eq("cl", clFiltro);
      if (dataInicio) query = query.gte("data", dataInicio);
      if (dataFim) query = query.lte("data", dataFim);

      const inicio = (paginaAtual - 1) * itensPorPagina;
      const fim = inicio + itensPorPagina - 1;
      const { data, error, count } = await query.range(inicio, fim);

      if (error) throw error;
      setTotalRegistros(count ?? 0);

      const mapped: NotaFiscalItem[] = (data ?? []).map((item: any) => ({
        id: String(item.id ?? ""),
        nf: String(item.nf ?? "—"),
        fornecedor: String(item.fornecedor ?? "—"),
        identificacao: String(item.identificacao ?? "—"),
        cl: String(item.cl ?? "—"),
        data: String(item.data ?? "—"),
        valor: Number(item.valor ?? 0),
        descricao_produto: String(item.descricao_produto ?? "—"),
        observacao: String(item.observacao ?? "—"),
        venc01: item.venc01 ? item.venc01.split("T")[0] : "",
        venc02: item.venc02 ? item.venc02.split("T")[0] : "",
        venc03: item.venc03 ? item.venc03.split("T")[0] : "",
        venc04: item.venc04 ? item.venc04.split("T")[0] : "",
        venc05: item.venc05 ? item.venc05.split("T")[0] : "",
      }));

      setNotasList(mapped);
    } catch (error: any) {
      toast.error("Erro ao carregar notas fiscais.");
    } finally {
      setLoading(false);
    }
  };

  const fetchFornecedores = async () => {
    try {
      const { data, error } = await supabase
        .from("fornecedores") 
        .select("*");

      if (error) {
        console.log("Erro retornado pelo Supabase:", error);
        toast.error("Erro ao buscar fornecedores: " + error.message);
        return;
      }

      const mappedForn: FornecedorItem[] = (data ?? []).map((item: any) => ({
        id: String(item.id ?? ""),
        nome: String(
          item.nome_fantasia || item.razao_social || item.fornecedor || item.nome || item.descricao || "",
        ),
      }));

      setFornecedoresList(mappedForn.filter((item) => item.nome));
    } catch (error: any) {
      console.error("Erro crítico em fetchFornecedores:", error);
    }
  };

  const fetchCls = async () => {
    try {
      const pageSize = 1000;
      const cls = new Set<string>();
      let pageStart = 0;

      while (true) {
        const { data, error } = await supabase
          .from("notas_fiscais")
          .select("cl")
          .not("cl", "is", null)
          .range(pageStart, pageStart + pageSize - 1);

        if (error) throw error;
        (data ?? []).forEach((item: any) => {
          const valor = String(item.cl ?? "").trim();
          if (valor) cls.add(valor);
        });
        if (!data || data.length < pageSize) break;
        pageStart += pageSize;
      }

      setClsCadastrados(
        Array.from(cls).sort((a, b) => a.localeCompare(b, undefined, { numeric: true })),
      );
    } catch {
      toast.error("Erro ao carregar os CLs cadastrados.");
    }
  };

  useEffect(() => {
    fetchFornecedores();
    fetchCls();
  }, []);

  useEffect(() => {
    fetchNotas(busca);
  }, [paginaAtual, busca, clFiltro, dataInicio, dataFim]);

  const handleDeletarNota = async (id: string, numeroNF: string) => {
    if (!window.confirm(`Tem certeza que deseja excluir a nota fiscal #${numeroNF}?`)) return;
    try {
      const { error } = await supabase.from("notas_fiscais").delete().eq("id", id);
      if (error) throw error;
      toast.success("Nota fiscal excluída com sucesso!");
      await fetchNotas();
    } catch (error: any) {
      toast.error("Erro ao excluir nota.");
    }
  };

  const abrirEdicao = (nota: NotaFiscalItem) => {
    setNotaSelecionada(nota);
    setNumeroNf(nota.nf);
    setFornecedor(nota.fornecedor === "—" ? "" : nota.fornecedor);
    setEquipamento(nota.identificacao === "—" ? "" : nota.identificacao);
    setCl(nota.cl === "—" ? "" : nota.cl);
    setEmissao(nota.data && nota.data !== "—" ? nota.data.split("T")[0] : "");
    setValorTotal(String(nota.valor || ""));
    setDescricaoProduto(nota.descricao_produto === "—" ? "" : nota.descricao_produto);
    setVenc01(nota.venc01 || "");
    setVenc02(nota.venc02 || "");
    setVenc03(nota.venc03 || "");
    setVenc04(nota.venc04 || "");
    setVenc05(nota.venc05 || "");
    setObservacao(nota.observacao === "—" ? "" : nota.observacao);
    setOpenModalEdicao(true);
  };

  const limparFormulario = () => {
    setNumeroNf("");
    setFornecedor("");
    setEquipamento("");
    setCl("");
    setEmissao("");
    setValorTotal("");
    setDescricaoProduto("");
    setVenc01("");
    setVenc02("");
    setVenc03("");
    setVenc04("");
    setVenc05("");
    setObservacao("");
    setNotaSelecionada(null);
    setMostrarNovoFornecedor(false);
    setNovaRazaoSocial("");
    setNovoNomeFantasia("");
  };

  const handleCadastrarFornecedor = async () => {
    const razaoSocial = novaRazaoSocial.trim();
    const nomeFornecedor = (novoNomeFantasia.trim() || razaoSocial).trim();
    if (!razaoSocial) {
      toast.error("Informe a razão social do fornecedor.");
      return;
    }

    setSalvandoFornecedor(true);
    try {
      const { data, error } = await supabase
        .from("fornecedores")
        .insert({
          razao_social: razaoSocial,
          nome_fantasia: novoNomeFantasia.trim() || null,
        })
        .select("id, razao_social, nome_fantasia")
        .single();

      if (error) throw error;

      const novoFornecedor = { id: String(data.id), nome: nomeFornecedor };
      setFornecedoresList((listaAtual) =>
        [...listaAtual.filter((item) => item.id !== novoFornecedor.id), novoFornecedor].sort((a, b) =>
          a.nome.localeCompare(b.nome),
        ),
      );
      setFornecedor(novoFornecedor.nome);
      setNovaRazaoSocial("");
      setNovoNomeFantasia("");
      setMostrarNovoFornecedor(false);
      toast.success("Fornecedor cadastrado e selecionado.");
    } catch (error: any) {
      toast.error("Erro ao cadastrar fornecedor: " + (error?.message || "Erro desconhecido"));
    } finally {
      setSalvandoFornecedor(false);
    }
  };

  const handleSalvarNota = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const payload = {
        nf: numeroNf.trim(),
        fornecedor: fornecedor.trim() || null,
        identificacao: equipamento.trim() || null,
        cl: cl.trim() || null,
        data: emissao || null,
        valor: parseExcelValue(valorTotal),
        descricao_produto: descricaoProduto.trim() || null,
        venc01: venc01 || null,
        venc02: venc02 || null,
        venc03: venc03 || null,
        venc04: venc04 || null,
        venc05: venc05 || null,
        observacao: observacao.trim() || null,
      };

      if (notaSelecionada) {
        const { error } = await supabase
          .from("notas_fiscais")
          .update(payload)
          .eq("id", notaSelecionada.id);

        if (error) throw error;
        toast.success("Nota fiscal atualizada com sucesso!");
        setOpenModalEdicao(false);
      } else {
        const { error } = await supabase.from("notas_fiscais").insert([payload]);
        if (error) throw error;
        toast.success("Nota fiscal cadastrada com sucesso!");
        setOpenModalCadastro(false);
      }

      await fetchNotas();
      limparFormulario();
    } catch (error: any) {
      toast.error("Erro ao salvar nota: " + (error?.message || "Erro desconhecido"));
    } finally {
      setSubmitting(false);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setImporting(true);
    setImportProgress(0);
    setImportTotal(0);

    try {
      const data = await file.arrayBuffer();
      const workbook = XLSX.read(data, { cellDates: true });
      const worksheet = workbook.Sheets[workbook.SheetNames[0]];
      const jsonData = XLSX.utils.sheet_to_json<Record<string, unknown>>(worksheet, {
        defval: null,
        raw: true,
      });

      const formattedData = jsonData
        .map((row) => ({
          nf: parseNumeroNF(getExcelValue(row, ["Número NF", "Numero NF", "NF", "numero_nf"])),
          fornecedor: parseText(getExcelValue(row, ["Fornecedor", "fornecedor"])) || null,
          identificacao:
            parseText(getExcelValue(row, ["Equipamento", "Identificação", "identificacao"])) ||
            null,
          cl: parseText(getExcelValue(row, ["CL", "cl"])) || null,
          data: parseExcelDate(getExcelValue(row, ["Emissão", "Data", "data"])),
          valor: parseExcelValue(getExcelValue(row, ["Valor Total", "Valor", "valor"])),
          descricao_produto:
            parseText(getExcelValue(row, ["Descrição", "Produto", "descricao"])) || null,
          observacao:
            parseText(getExcelValue(row, ["obersvação", "observação", "observacao", "obs"])) ||
            null,
          venc01: parseExcelDate(getExcelValue(row, ["Venc. 01", "Venc01", "venc01"])),
          venc02: parseExcelDate(getExcelValue(row, ["Venc. 02", "Venc02", "venc02"])),
          venc03: parseExcelDate(getExcelValue(row, ["Venc. 03", "Venc03", "venc03"])),
          venc04: parseExcelDate(getExcelValue(row, ["Venc. 04", "Venc04", "venc04"])),
          venc05: parseExcelDate(getExcelValue(row, ["Venc. 05", "Venc05", "venc05"])),
        }))
        .filter((item) => {
          if (item.nf === "") {
            return false;
          }
          return true;
        });

      setImportTotal(formattedData.length);
      let importedCount = 0;

      for (let start = 0; start < formattedData.length; start += IMPORT_BATCH_SIZE) {
        const batch = formattedData.slice(start, start + IMPORT_BATCH_SIZE);
        const { error } = await supabase.from("notas_fiscais").insert(batch);
        if (error) throw error;
        importedCount += batch.length;
        setImportProgress(importedCount);
      }

      toast.success(`${importedCount} notas fiscais importadas com sucesso!`);
      await fetchNotas();
    } catch (error: any) {
      toast.error("Erro ao importar Excel: " + (error?.message || "Erro desconhecido"));
    } finally {
      setImporting(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const notasFiltradas = notasList.filter((nota) => {
    const termo = busca.trim().toLowerCase();
    const clSelecionado = clFiltro.trim().toLowerCase();
    const matchBusca =
      !termo ||
      correspondeBusca(
        termo,
        nota.nf,
        nota.fornecedor,
        nota.identificacao,
        nota.cl,
        nota.descricao_produto,
        nota.observacao,
      );

    let matchData = true;
    const matchCl = !clSelecionado || nota.cl.toLowerCase() === clSelecionado;
    const dataNota = nota.data && nota.data !== "—" ? nota.data.split("T")[0] : "";

    if (dataInicio && dataNota) {
      if (dataNota < dataInicio) matchData = false;
    }
    if (dataFim && dataNota) {
      if (dataNota > dataFim) matchData = false;
    }
    if ((dataInicio || dataFim) && !dataNota) {
      matchData = false;
    }

    return matchBusca && matchCl && matchData;
  });

  const valorTotalSomatoria = notasFiltradas.reduce((acc, nota) => acc + (nota.valor || 0), 0);

  return (
    <div className="p-2 md:p-4 w-full max-w-full space-y-3">
      <div className="flex flex-row items-center justify-between">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-slate-900">
            Controle de Notas Fiscais
          </h1>
          <p className="text-xs text-slate-500">
            Consulte, gerencie e acompanhe os vencimentos fiscais registrados.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileUpload}
            accept=".xlsx, .xls, .csv"
            className="hidden"
          />
          <Button
            variant="outline"
            onClick={() => fileInputRef.current?.click()}
            disabled={importing}
            className="rounded-full text-xs"
          >
            {importing ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
            )}
            {importing ? `Importando (${importProgress}/${importTotal})` : "Importar Excel"}
          </Button>

          <Dialog
            open={openModalCadastro}
            onOpenChange={(open) => {
              setOpenModalCadastro(open);
              if (!open) limparFormulario();
            }}
          >
            <DialogTrigger asChild>
              <Button variant="outline" className="rounded-full text-xs">
                <PlusCircle className="w-3.5 h-3.5" /> Nova Nota Fiscal
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Cadastrar Nova Nota Fiscal</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSalvarNota} className="space-y-4 pt-2">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label>Número da NF</Label>
                    <Input
                      value={numeroNf}
                      onChange={(e) => setNumeroNf(e.target.value)}
                      required
                    />
                  </div>
                  <div>
                    <Label>Fornecedor</Label>
                    <div className="flex gap-2">
                      <select
                        className="flex h-10 min-w-0 flex-1 rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                        value={fornecedor}
                        onChange={(e) => setFornecedor(e.target.value)}
                        required
                      >
                        <option value="">Selecione um fornecedor...</option>
                        {fornecedoresList.map((f) => (
                          <option key={f.id} value={f.nome}>
                            {f.nome}
                          </option>
                        ))}
                      </select>
                      <Button
                        type="button"
                        variant="outline"
                        size="icon"
                        title="Cadastrar novo fornecedor"
                        onClick={() => setMostrarNovoFornecedor((aberto) => !aberto)}
                      >
                        <PlusCircle className="h-4 w-4" />
                      </Button>
                    </div>
                    {mostrarNovoFornecedor && (
                      <div className="mt-2 space-y-2 rounded-md border border-slate-200 bg-slate-50 p-2">
                        <Input
                          placeholder="Razão social *"
                          value={novaRazaoSocial}
                          onChange={(e) => setNovaRazaoSocial(e.target.value)}
                        />
                        <Input
                          placeholder="Nome fantasia (opcional)"
                          value={novoNomeFantasia}
                          onChange={(e) => setNovoNomeFantasia(e.target.value)}
                        />
                        <Button
                          type="button"
                          size="sm"
                          onClick={handleCadastrarFornecedor}
                          disabled={salvandoFornecedor}
                        >
                          {salvandoFornecedor && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                          Salvar fornecedor
                        </Button>
                      </div>
                    )}
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label>Equipamento</Label>
                    <Input value={equipamento} onChange={(e) => setEquipamento(e.target.value)} />
                  </div>
                  <div>
                    <Label>CL</Label>
                    <Input value={cl} onChange={(e) => setCl(e.target.value)} />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label>Data de Emissão</Label>
                    <Input
                      type="date"
                      value={emissao}
                      onChange={(e) => setEmissao(e.target.value)}
                    />
                  </div>
                  <div>
                    <Label>Valor Total</Label>
                    <Input value={valorTotal} onChange={(e) => setValorTotal(e.target.value)} />
                  </div>
                </div>
               
                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <Label className="text-xs">Venc 01</Label>
                    <Input type="date" value={venc01} onChange={(e) => setVenc01(e.target.value)} />
                  </div>
                  <div>
                    <Label className="text-xs">Venc 02</Label>
                    <Input type="date" value={venc02} onChange={(e) => setVenc02(e.target.value)} />
                  </div>
                  <div>
                    <Label className="text-xs">Venc 03</Label>
                    <Input type="date" value={venc03} onChange={(e) => setVenc03(e.target.value)} />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <Label className="text-xs">Venc 04</Label>
                    <Input type="date" value={venc04} onChange={(e) => setVenc04(e.target.value)} />
                  </div>
                  <div>
                    <Label className="text-xs">Venc 05</Label>
                    <Input type="date" value={venc05} onChange={(e) => setVenc05(e.target.value)} />
                  </div>
                </div>
                <div>
                  <Label>Descrição/Observação</Label>
                  <Textarea value={observacao} onChange={(e) => setObservacao(e.target.value)} />
                </div>
                <div className="flex justify-end gap-2 pt-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setOpenModalCadastro(false)}
                  >
                    Cancelar
                  </Button>
                  <Button type="submit" disabled={submitting}>
                    Salvar Nota
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <div className="flex flex-col md:flex-row gap-2 items-center justify-between bg-white p-3 rounded-lg border border-slate-200">
        <div className="flex flex-col md:flex-row gap-2 items-center w-full md:w-auto">
          <div className="relative w-full md:w-64">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-400" />
            <Input
              placeholder="Buscar..."
              className="pl-8 text-xs h-9"
              value={busca}
              onChange={(e) => {
                setBusca(e.target.value);
                setPaginaAtual(1);
              }}
            />
          </div>
          <select
            className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-2 text-xs md:w-44"
            value={clFiltro}
            onChange={(e) => {
              setClFiltro(e.target.value);
              setPaginaAtual(1);
            }}
            title="Filtrar por CL"
          >
            <option value="">Todos os CLs</option>
            {clsCadastrados.map((valor) => (
              <option key={valor} value={valor}>
                CL {valor}
              </option>
            ))}
          </select>
          <div className="flex items-center gap-1.5 w-full md:w-auto">
            <div className="flex flex-col">
              <span className="text-[10px] text-slate-500 font-medium">Data Início</span>
              <Input
                type="date"
                className="text-xs h-9 w-full md:w-36"
                value={dataInicio}
                onChange={(e) => {
                  setDataInicio(e.target.value);
                  setPaginaAtual(1);
                }}
              />
            </div>
            <span className="text-slate-400 mt-4">-</span>
            <div className="flex flex-col">
              <span className="text-[10px] text-slate-500 font-medium">Data Fim</span>
              <Input
                type="date"
                className="text-xs h-9 w-full md:w-36"
                value={dataFim}
                onChange={(e) => {
                  setDataFim(e.target.value);
                  setPaginaAtual(1);
                }}
              />
            </div>
            {(dataInicio || dataFim || busca || clFiltro) && (
              <Button
                variant="ghost"
                size="icon"
                className="h-9 w-9 mt-4 text-slate-500 hover:text-slate-800"
                onClick={() => {
                  setBusca("");
                  setClFiltro("");
                  setDataInicio("");
                  setDataFim("");
                  setPaginaAtual(1);
                }}
                title="Limpar Filtros"
              >
                <FilterX className="w-4 h-4" />
              </Button>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2 px-3 py-1.5 bg-blue-50 border border-blue-100 rounded-md text-blue-900 text-xs font-medium w-full md:w-auto justify-between md:justify-end">
          <div className="flex items-center gap-1.5">
            <Calculator className="w-4 h-4 text-blue-600" />
            <span>Valor Total Lançado:</span>
          </div>
          <span className="font-bold text-sm text-blue-700">{formatBRL(valorTotalSomatoria)}</span>
        </div>
      </div>

      <div className="bg-white rounded-lg border border-slate-200 overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-700 font-semibold">
              <tr>
                <th className="p-3">NF</th>
                <th className="p-3">Fornecedor</th>
                <th className="p-3">Equipamento</th>
                <th className="p-3">CL</th>
                <th className="p-3">Emissão</th>
                <th className="p-3">Vencimentos</th>
                <th className="p-3">Descrição/Observação</th>
                <th className="p-3 text-right">Valor</th>
                <th className="p-3 text-center">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {loading ? (
                <tr>
                  <td colSpan={10} className="p-6 text-center text-slate-500">
                    <Loader2 className="w-5 h-5 animate-spin mx-auto mb-2" /> Carregando...
                  </td>
                </tr>
              ) : notasFiltradas.length === 0 ? (
                <tr>
                  <td colSpan={10} className="p-6 text-center text-slate-500">
                    Nenhuma nota encontrada.
                  </td>
                </tr>
              ) : (
                notasFiltradas.map((nota) => (
                  <tr key={nota.id} className="hover:bg-slate-50/50">
                    <td className="p-3 font-medium">{nota.nf}</td>
                    <td className="p-3">{nota.fornecedor}</td>
                    <td className="p-3">{nota.identificacao}</td>
                    <td className="p-3 font-semibold text-blue-600">{nota.cl || "—"}</td>
                    <td className="p-3">{formatDate(nota.data)}</td>
                    <td className="p-3 text-[11px] text-slate-600">
                      {[nota.venc01, nota.venc02, nota.venc03, nota.venc04, nota.venc05]
                        .filter(Boolean)
                        .map(formatDate)
                        .join(", ") || "—"}
                    </td>
                    <td className="p-3 max-w-[150px] truncate">
                      {nota.descricao_produto !== "—"
                        ? nota.descricao_produto
                        : nota.observacao || "—"}
                    </td>
                    <td className="p-3 text-right font-medium">{formatBRL(nota.valor)}</td>
                    <td className="p-3 text-center">
                      <div className="flex items-center justify-center gap-1.5">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-blue-600 hover:bg-blue-50"
                          onClick={() => abrirEdicao(nota)}
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-red-600 hover:bg-red-50"
                          onClick={() => handleDeletarNota(nota.id, nota.nf)}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        <div className="flex flex-col gap-2 border-t border-slate-200 px-3 py-2 text-xs text-slate-600 sm:flex-row sm:items-center sm:justify-between">
          <span>
            Página {paginaAtual} de {Math.max(1, Math.ceil(totalRegistros / itensPorPagina))} ({totalRegistros} registros)
          </span>
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={paginaAtual === 1 || loading}
              onClick={() => setPaginaAtual((pagina) => Math.max(1, pagina - 1))}
            >
              <ChevronLeft className="h-4 w-4" />
              Anterior
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={paginaAtual >= Math.ceil(totalRegistros / itensPorPagina) || loading}
              onClick={() => setPaginaAtual((pagina) => pagina + 1)}
            >
              Próxima
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      <Dialog
        open={openModalEdicao}
        onOpenChange={(open) => {
          setOpenModalEdicao(open);
          if (!open) limparFormulario();
        }}
      >
        <DialogContent className="sm:max-w-xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Editar Nota Fiscal #{numeroNf}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSalvarNota} className="space-y-4 pt-2">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Número da NF</Label>
                <Input value={numeroNf} onChange={(e) => setNumeroNf(e.target.value)} required />
              </div>
              <div>
                <Label>Fornecedor</Label>
                <div className="flex gap-2">
                  <select
                    className="flex h-10 min-w-0 flex-1 rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                    value={fornecedor}
                    onChange={(e) => setFornecedor(e.target.value)}
                    required
                  >
                    <option value="">Selecione um fornecedor...</option>
                    {fornecedoresList.map((f) => (
                      <option key={f.id} value={f.nome}>
                        {f.nome}
                      </option>
                    ))}
                  </select>
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    title="Cadastrar novo fornecedor"
                    onClick={() => setMostrarNovoFornecedor((aberto) => !aberto)}
                  >
                    <PlusCircle className="h-4 w-4" />
                  </Button>
                </div>
                {mostrarNovoFornecedor && (
                  <div className="mt-2 space-y-2 rounded-md border border-slate-200 bg-slate-50 p-2">
                    <Input
                      placeholder="Razão social *"
                      value={novaRazaoSocial}
                      onChange={(e) => setNovaRazaoSocial(e.target.value)}
                    />
                    <Input
                      placeholder="Nome fantasia (opcional)"
                      value={novoNomeFantasia}
                      onChange={(e) => setNovoNomeFantasia(e.target.value)}
                    />
                    <Button
                      type="button"
                      size="sm"
                      onClick={handleCadastrarFornecedor}
                      disabled={salvandoFornecedor}
                    >
                      {salvandoFornecedor && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                      Salvar fornecedor
                    </Button>
                  </div>
                )}
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Equipamento</Label>
                <Input value={equipamento} onChange={(e) => setEquipamento(e.target.value)} />
              </div>
              <div>
                <Label>CL</Label>
                <Input value={cl} onChange={(e) => setCl(e.target.value)} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Data de Emissão</Label>
                <Input type="date" value={emissao} onChange={(e) => setEmissao(e.target.value)} />
              </div>
              <div>
                <Label>Valor Total</Label>
                <Input value={valorTotal} onChange={(e) => setValorTotal(e.target.value)} />
              </div>
            </div>
            <div className="grid grid-cols-3 gap-2">
              <div>
                <Label className="text-xs">Venc 01</Label>
                <Input type="date" value={venc01} onChange={(e) => setVenc01(e.target.value)} />
              </div>
              <div>
                <Label className="text-xs">Venc 02</Label>
                <Input type="date" value={venc02} onChange={(e) => setVenc02(e.target.value)} />
              </div>
              <div>
                <Label className="text-xs">Venc 03</Label>
                <Input type="date" value={venc03} onChange={(e) => setVenc03(e.target.value)} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label className="text-xs">Venc 04</Label>
                <Input type="date" value={venc04} onChange={(e) => setVenc04(e.target.value)} />
              </div>
              <div>
                <Label className="text-xs">Venc 05</Label>
                <Input type="date" value={venc05} onChange={(e) => setVenc05(e.target.value)} />
              </div>
            </div>
            <div>
              <Label>Descrição do Produto / Observação</Label>
              <Textarea
                value={descricaoProduto}
                onChange={(e) => setDescricaoProduto(e.target.value)}
              />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setOpenModalEdicao(false)}
              >
                Cancelar
              </Button>
              <Button type="submit" disabled={submitting}>
                Salvar Alterações
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
