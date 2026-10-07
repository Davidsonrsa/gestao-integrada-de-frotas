import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import {
  ArrowLeft,
  Save,
  Printer,
  Camera,
  Trash2,
  ImagePlus,
  Paperclip,
  FileIcon,
  Download,
  FileSpreadsheet,
} from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/hooks/use-auth";
import { MANUTENCAO_TEMPLATE, type ManutencaoItem, STATUS_LABELS } from "@/lib/manutencao-template";
import * as XLSX from "xlsx";
import {
  Document,
  Packer,
  Paragraph,
  TextRun,
  Table,
  TableRow,
  TableCell,
  HeadingLevel,
  AlignmentType,
  WidthType,
  BorderStyle,
  ShadingType,
} from "docx";

const REPORT_TAG = "[RELATORIO]";

async function buildReportDocx(params: {
  equipNumero: string;
  equipIdent: string;
  data: string;
  horimetro: string;
  tipoRevisao: string;
  executante: string;
  observacoes: string;
  itens: ManutencaoItem[];
}) {
  const border = { style: BorderStyle.SINGLE, size: 4, color: "999999" };
  const borders = { top: border, bottom: border, left: border, right: border };
  const cell = (text: string, opts: { bold?: boolean; shade?: string; width?: number } = {}) =>
    new TableCell({
      borders,
      width: opts.width ? { size: opts.width, type: WidthType.DXA } : undefined,
      shading: opts.shade
        ? { fill: opts.shade, type: ShadingType.CLEAR, color: "auto" }
        : undefined,
      margins: { top: 60, bottom: 60, left: 100, right: 100 },
      children: [
        new Paragraph({
          children: [new TextRun({ text: text || "", bold: opts.bold, size: 18 })],
        }),
      ],
    });

  const cols = [1600, 2200, 1800, 500, 1200, 500, 1560];
  const headerRow = new TableRow({
    tableHeader: true,
    children: ["Sistema", "Item", "Ação", "P/M", "Código", "Qtd", "Status"].map((h, i) =>
      cell(h, { bold: true, shade: "E5E7EB", width: cols[i] }),
    ),
  });
  const itemRows = params.itens.map(
    (it) =>
      new TableRow({
        children: [
          cell(it.sistema, { width: cols[0] }),
          cell(it.item, { width: cols[1] }),
          cell(it.acao, { width: cols[2] }),
          cell(it.pm, { width: cols[3] }),
          cell(it.codigo ?? "", { width: cols[4] }),
          cell(it.quantidade ?? "", { width: cols[5] }),
          cell(STATUS_LABELS[it.status ?? ""] ?? "", { width: cols[6] }),
        ],
      }),
  );

  const infoRow = (label: string, value: string) =>
    new TableRow({
      children: [
        cell(label, { bold: true, shade: "F3F4F6", width: 2500 }),
        cell(value, { width: 6860 }),
      ],
    });

  const doc = new Document({
    styles: { default: { document: { run: { font: "Arial", size: 20 } } } },
    sections: [
      {
        properties: {
          page: {
            size: { width: 11906, height: 16838 },
            margin: { top: 720, right: 720, bottom: 720, left: 720 },
          },
        },
        children: [
          new Paragraph({
            heading: HeadingLevel.HEADING_1,
            alignment: AlignmentType.CENTER,
            children: [
              new TextRun({ text: "PLANO DE MANUTENÇÃO PREVENTIVA", bold: true, size: 28 }),
            ],
          }),
          new Paragraph({
            alignment: AlignmentType.CENTER,
            children: [new TextRun({ text: "SPH JHM Mafra — Registro de manutenção", size: 20 })],
          }),
          new Paragraph({ children: [new TextRun("")] }),
          new Table({
            width: { size: 9360, type: WidthType.DXA },
            columnWidths: [2500, 6860],
            rows: [
              infoRow("Equipamento", `${params.equipNumero} — ${params.equipIdent}`),
              infoRow("Tipo de revisão", params.tipoRevisao),
              infoRow("Data", params.data),
              infoRow("Horímetro", params.horimetro),
              infoRow("Executante", params.executante),
            ],
          }),
          new Paragraph({ children: [new TextRun("")] }),
          new Paragraph({
            children: [
              new TextRun({ text: "Atividades de Manutenção Preventiva", bold: true, size: 22 }),
            ],
          }),
          new Table({
            width: { size: 9360, type: WidthType.DXA },
            columnWidths: cols,
            rows: [headerRow, ...itemRows],
          }),
          new Paragraph({ children: [new TextRun("")] }),
          new Paragraph({
            children: [new TextRun({ text: "Observações", bold: true, size: 22 })],
          }),
          new Paragraph({ children: [new TextRun(params.observacoes || "—")] }),
          new Paragraph({ children: [new TextRun("")] }),
          new Paragraph({ children: [new TextRun("")] }),
          new Paragraph({
            children: [
              new TextRun("___________________________            ___________________________"),
            ],
          }),
          new Paragraph({
            children: [
              new TextRun("     Mecânico responsável                                 Supervisor"),
            ],
          }),
        ],
      },
    ],
  });

  return await Packer.toBlob(doc);
}

export const Route = createFileRoute("/_authenticated/equipamentos/$id/historico/$histId")({
  component: ManutencaoFormPage,
  validateSearch: (s: Record<string, unknown>) => ({
    print: s.print === 1 || s.print === "1" ? 1 : undefined,
  }),
});

function ManutencaoFormPage() {
  const { id, histId } = Route.useParams();
  const { print: printFlag } = Route.useSearch();
  const qc = useQueryClient();
  const { userId, isAdmin } = useAuth();
  const fileInput = useRef<HTMLInputElement>(null);
  const anyFileInput = useRef<HTMLInputElement>(null);

  const { data: equip } = useQuery({
    queryKey: ["equipamento", id],
    queryFn: async () => {
      const { data, error } = await supabase.from("equipamentos").select("*").eq("id", id).single();
      if (error) throw error;
      return data;
    },
  });

  const { data: registro, isLoading } = useQuery({
    queryKey: ["manutencao_historico_item", histId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("manutencao_historico")
        .select("*")
        .eq("id", histId)
        .single();
      if (error) throw error;
      return data;
    },
  });

  const { data: fotos } = useQuery({
    queryKey: ["hist_fotos", histId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("equipamento_fotos")
        .select("id, storage_path, uploaded_by, caption, created_at")
        .eq("manutencao_historico_id", histId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      const withUrl = await Promise.all(
        (data ?? []).map(async (f) => {
          const { data: signed } = await supabase.storage
            .from("equipamento-fotos")
            .createSignedUrl(f.storage_path, 60 * 60);
          return { ...f, url: signed?.signedUrl ?? "" };
        }),
      );
      return withUrl;
    },
  });

  async function handleUpload(files: FileList | null) {
    if (!files?.length || !userId) return;
    const file = files[0];
    const caption = window.prompt("Observação do anexo (opcional):", "") ?? "";
    const ext = file.name.split(".").pop() || "bin";
    const path = `${id}/hist-${histId}/${crypto.randomUUID()}.${ext}`;
    const { error: upErr } = await supabase.storage
      .from("equipamento-fotos")
      .upload(path, file, { contentType: file.type || "application/octet-stream", upsert: false });
    if (upErr) return toast.error(upErr.message);
    const captionWithName = caption ? `${caption} — ${file.name}` : file.name;
    const { error: insErr } = await supabase.from("equipamento_fotos").insert({
      equipamento_id: id,
      manutencao_historico_id: histId,
      storage_path: path,
      uploaded_by: userId,
      caption: captionWithName,
    });
    if (insErr) return toast.error(insErr.message);
    toast.success("Anexo enviado");
    qc.invalidateQueries({ queryKey: ["hist_fotos", histId] });
  }

  async function deletePhoto(photoId: string, path: string, uploadedBy: string | null) {
    if (!isAdmin && uploadedBy !== userId)
      return toast.error("Você só pode excluir suas próprias fotos");
    await supabase.storage.from("equipamento-fotos").remove([path]);
    const { error } = await supabase.from("equipamento_fotos").delete().eq("id", photoId);
    if (error) return toast.error(error.message);
    toast.success("Foto removida");
    qc.invalidateQueries({ queryKey: ["hist_fotos", histId] });
  }

  const [data, setData] = useState("");
  const [horimetro, setHorimetro] = useState<string>("");
  const [tipoRevisao, setTipoRevisao] = useState("");
  const [executante, setExecutante] = useState("");
  const [observacoes, setObservacoes] = useState("");
  const [itens, setItens] = useState<ManutencaoItem[]>(MANUTENCAO_TEMPLATE);

  useEffect(() => {
    if (!registro) return;
    setData(registro.data ?? "");
    setHorimetro(registro.horimetro != null ? String(registro.horimetro) : "");
    setTipoRevisao(registro.tipo_revisao ?? "");
    setExecutante(registro.executante ?? "");
    setObservacoes(registro.observacoes ?? "");
    const arr = Array.isArray(registro.itens)
      ? (registro.itens as unknown as ManutencaoItem[])
      : [];
    setItens(arr.length ? arr : MANUTENCAO_TEMPLATE);
  }, [registro]);

  useEffect(() => {
    if (printFlag && registro) {
      const t = setTimeout(() => window.print(), 400);
      return () => clearTimeout(t);
    }
  }, [printFlag, registro]);

  const save = useMutation({
    mutationFn: async () => {
      const finalData = data || new Date().toISOString().slice(0, 10);
      const { error } = await supabase
        .from("manutencao_historico")
        .update({
          data: finalData,
          horimetro: horimetro === "" ? null : Number(horimetro),
          tipo_revisao: tipoRevisao || null,
          executante: executante || null,
          observacoes: observacoes || null,
          itens: JSON.parse(JSON.stringify(itens)),
        })
        .eq("id", histId);
      if (error) throw error;

      // Gera relatório Word e salva como anexo (substitui o anterior)
      if (!userId) return;
      const blob = await buildReportDocx({
        equipNumero: equip?.numero ?? "",
        equipIdent: equip?.identificacao ?? "",
        data: finalData,
        horimetro: horimetro,
        tipoRevisao,
        executante,
        observacoes,
        itens,
      });
      // Remove relatórios anteriores deste registro
      const { data: prev } = await supabase
        .from("equipamento_fotos")
        .select("id, storage_path")
        .eq("manutencao_historico_id", histId)
        .like("caption", `${REPORT_TAG}%`);
      if (prev && prev.length) {
        await supabase.storage.from("equipamento-fotos").remove(prev.map((p) => p.storage_path));
        await supabase
          .from("equipamento_fotos")
          .delete()
          .in(
            "id",
            prev.map((p) => p.id),
          );
      }
      const path = `${id}/hist-${histId}/relatorio-${Date.now()}.docx`;
      const { error: upErr } = await supabase.storage.from("equipamento-fotos").upload(path, blob, {
        contentType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        upsert: true,
      });
      if (upErr) throw upErr;
      const { error: insErr } = await supabase.from("equipamento_fotos").insert({
        equipamento_id: id,
        manutencao_historico_id: histId,
        storage_path: path,
        uploaded_by: userId,
        caption: `${REPORT_TAG} Relatório de manutenção ${finalData}.docx`,
      });
      if (insErr) throw insErr;
    },
    onSuccess: () => {
      toast.success("Manutenção salva — relatório Word gerado");
      qc.invalidateQueries({ queryKey: ["manutencao_historico", id] });
      qc.invalidateQueries({ queryKey: ["manutencao_historico_item", histId] });
      qc.invalidateQueries({ queryKey: ["hist_fotos", histId] });
      qc.invalidateQueries({ queryKey: ["manutencao_historico_anexos_count", id] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  function updateItem(idx: number, patch: Partial<ManutencaoItem>) {
    setItens((arr) => arr.map((it, i) => (i === idx ? { ...it, ...patch } : it)));
  }

  function exportExcel() {
    const rows: (string | number | null)[][] = [
      ["PLANO DE MANUTENÇÃO PREVENTIVA — SPH JHM Mafra"],
      [],
      ["Equipamento", `${equip?.numero ?? ""} — ${equip?.identificacao ?? ""}`],
      ["Tipo de revisão", tipoRevisao],
      ["Data", data],
      ["Horímetro", horimetro],
      ["Executante", executante],
      [],
      ["Sistema", "Item", "Ação", "P/M", "Código", "Qtd", "Status"],
      ...itens.map((it) => [
        it.sistema,
        it.item,
        it.acao,
        it.pm,
        it.codigo ?? "",
        it.quantidade ?? "",
        STATUS_LABELS[it.status ?? ""] ?? "",
      ]),
      [],
      ["Observações", observacoes],
    ];
    const ws = XLSX.utils.aoa_to_sheet(rows);
    ws["!cols"] = [
      { wch: 22 },
      { wch: 30 },
      { wch: 18 },
      { wch: 8 },
      { wch: 14 },
      { wch: 8 },
      { wch: 14 },
    ];
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Manutenção");
    XLSX.writeFile(wb, `manutencao-${equip?.numero ?? id}-${data || "sem-data"}.xlsx`);
    toast.success("Excel gerado");
  }

  if (isLoading || !registro) {
    return <div className="p-6 text-center text-muted-foreground">Carregando...</div>;
  }

  return (
    <div className="bg-background min-h-screen">
      <div className="no-print sticky top-0 z-30 bg-background border-b px-3 py-2 flex items-center justify-between">
        <Link to="/equipamentos/$id/historico" params={{ id }}>
          <Button variant="ghost" size="sm">
            <ArrowLeft className="w-4 h-4 mr-1" /> Voltar
          </Button>
        </Link>
        <div className="flex gap-2 flex-wrap">
          <Button size="sm" variant="outline" onClick={() => window.print()}>
            <Printer className="w-4 h-4 mr-1" /> Imprimir
          </Button>
          <Button size="sm" variant="outline" onClick={exportExcel}>
            <FileSpreadsheet className="w-4 h-4 mr-1" /> Excel
          </Button>
          <Button size="sm" onClick={() => save.mutate()} disabled={save.isPending}>
            <Save className="w-4 h-4 mr-1" /> {save.isPending ? "Salvando..." : "Salvar"}
          </Button>
        </div>
      </div>

      <div className="max-w-[210mm] mx-auto p-4 print:p-4 print:text-black print:bg-white">
        <div className="flex items-center gap-4 border-b-2 border-foreground print:border-black pb-3 mb-4">
          <img src="/logo SPX MAFRA JHM.png" alt="" className="w-16 h-16 object-contain" />
          <div className="flex-1">
            <h1 className="text-lg font-bold">PLANO DE MANUTENÇÃO PREVENTIVA</h1>
            <p className="text-[11px] text-muted-foreground print:text-black">
              SPH JHM Mafra — Registro de manutenção
            </p>
          </div>
        </div>

        {/* Cabeçalho editável */}
        <Card className="p-3 mb-3 print:shadow-none print:border-black">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-[11px]">Equipamento</Label>
              <Input value={`${equip?.numero ?? ""} — ${equip?.identificacao ?? ""}`} readOnly />
            </div>
            <div>
              <Label className="text-[11px]">Tipo de revisão (ex: 250h, 500h, 1000h)</Label>
              <Input value={tipoRevisao} onChange={(e) => setTipoRevisao(e.target.value)} />
            </div>
            <div>
              <Label className="text-[11px]">Data</Label>
              <Input type="date" value={data} onChange={(e) => setData(e.target.value)} />
            </div>
            <div>
              <Label className="text-[11px]">Horímetro</Label>
              <Input
                type="number"
                inputMode="decimal"
                value={horimetro}
                onChange={(e) => setHorimetro(e.target.value)}
              />
            </div>
            <div className="col-span-2">
              <Label className="text-[11px]">Executante</Label>
              <Input value={executante} onChange={(e) => setExecutante(e.target.value)} />
            </div>
          </div>
        </Card>

        {/* Checklist */}
        <Card className="p-0 overflow-hidden mb-3 print:shadow-none print:border-black">
          <div className="px-3 py-2 bg-muted print:bg-gray-200 text-[11px] font-semibold flex justify-between">
            <span>Atividades de Manutenção Preventiva</span>
            <span>P = Peças · M = Mão de obra</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-[11px] border-collapse">
              <thead>
                <tr className="bg-muted/50 print:bg-gray-100">
                  <th className="border px-2 py-1 text-left">Sistema</th>
                  <th className="border px-2 py-1 text-left">Item</th>
                  <th className="border px-2 py-1 text-left">Ação</th>
                  <th className="border px-2 py-1 w-8">P/M</th>
                  <th className="border px-2 py-1 w-24">Código</th>
                  <th className="border px-2 py-1 w-14">Qtd</th>
                  <th className="border px-2 py-1 w-28">Status</th>
                </tr>
              </thead>
              <tbody>
                {itens.map((it, i) => (
                  <tr key={i}>
                    <td className="border px-2 py-1">{it.sistema}</td>
                    <td className="border px-2 py-1">{it.item}</td>
                    <td className="border px-2 py-1">{it.acao}</td>
                    <td className="border px-2 py-1 text-center">{it.pm}</td>
                    <td className="border px-1 py-0.5">
                      <input
                        className="w-full bg-transparent outline-none px-1 py-0.5 text-[11px]"
                        value={it.codigo ?? ""}
                        onChange={(e) => updateItem(i, { codigo: e.target.value })}
                      />
                    </td>
                    <td className="border px-1 py-0.5">
                      <input
                        className="w-full bg-transparent outline-none px-1 py-0.5 text-[11px]"
                        value={it.quantidade ?? ""}
                        onChange={(e) => updateItem(i, { quantidade: e.target.value })}
                      />
                    </td>
                    <td className="border px-1 py-0.5">
                      <select
                        className="w-full bg-transparent outline-none text-[11px] py-0.5"
                        value={it.status ?? ""}
                        onChange={(e) =>
                          updateItem(i, { status: e.target.value as ManutencaoItem["status"] })
                        }
                      >
                        {Object.entries(STATUS_LABELS).map(([k, v]) => (
                          <option key={k} value={k}>
                            {v}
                          </option>
                        ))}
                      </select>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>

        <Card className="p-3 print:shadow-none print:border-black">
          <Label className="text-[11px]">Observações</Label>
          <Textarea rows={4} value={observacoes} onChange={(e) => setObservacoes(e.target.value)} />
        </Card>

        <Card className="p-3 mt-3 print:shadow-none print:border-black no-print">
          <div className="flex items-center justify-between mb-2 gap-2 flex-wrap">
            <Label className="text-[11px] font-semibold">
              Anexos deste registro ({fotos?.length ?? 0})
            </Label>
            <div className="flex gap-2">
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={() => fileInput.current?.click()}
              >
                <Camera className="w-4 h-4 mr-1.5" /> Foto
              </Button>
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={() => anyFileInput.current?.click()}
              >
                <Paperclip className="w-4 h-4 mr-1.5" /> Arquivo
              </Button>
            </div>
            <input
              ref={fileInput}
              type="file"
              accept="image/*"
              capture="environment"
              className="hidden"
              onChange={(e) => {
                handleUpload(e.target.files);
                e.target.value = "";
              }}
            />
            <input
              ref={anyFileInput}
              type="file"
              className="hidden"
              onChange={(e) => {
                handleUpload(e.target.files);
                e.target.value = "";
              }}
            />
          </div>
          {!fotos || fotos.length === 0 ? (
            <button
              type="button"
              onClick={() => anyFileInput.current?.click()}
              className="w-full border-2 border-dashed border-border rounded-lg p-4 flex flex-col items-center gap-1 text-muted-foreground hover:bg-muted/50"
            >
              <ImagePlus className="w-6 h-6" />
              <span className="text-xs">Anexar fotos ou arquivos (PDF, docs…)</span>
            </button>
          ) : (
            <div className="grid grid-cols-3 gap-2">
              {fotos.map((f) => {
                const ext = (f.storage_path.split(".").pop() || "").toLowerCase();
                const isImage = ["jpg", "jpeg", "png", "gif", "webp", "heic", "bmp"].includes(ext);
                const canDelete = isAdmin || f.uploaded_by === userId;
                return (
                  <div
                    key={f.id}
                    className="relative rounded-md overflow-hidden bg-muted border border-border"
                  >
                    <div className="aspect-square">
                      {isImage ? (
                        <img
                          src={f.url}
                          alt={f.caption ?? ""}
                          className="w-full h-full object-cover"
                          loading="lazy"
                        />
                      ) : (
                        <a
                          href={f.url}
                          target="_blank"
                          rel="noreferrer"
                          className="w-full h-full flex flex-col items-center justify-center gap-1 p-2 text-center hover:bg-muted/70"
                        >
                          <FileIcon className="w-8 h-8 text-primary" />
                          <span className="text-[10px] uppercase font-semibold">
                            {ext || "arquivo"}
                          </span>
                          <Download className="w-3 h-3 text-muted-foreground" />
                        </a>
                      )}
                    </div>
                    {canDelete && (
                      <button
                        type="button"
                        onClick={() => {
                          if (confirm("Excluir anexo?"))
                            deletePhoto(f.id, f.storage_path, f.uploaded_by);
                        }}
                        className="absolute top-1 right-1 bg-destructive text-destructive-foreground rounded-full p-1 shadow"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    )}
                    {f.caption && (
                      <p className="text-[10px] px-1.5 py-0.5 bg-card border-t border-border line-clamp-2">
                        {f.caption}
                      </p>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </Card>

        <div className="grid grid-cols-2 gap-6 mt-10 print:mt-16 text-[11px]">
          <div className="text-center">
            <div className="border-t border-foreground print:border-black pt-1">
              <b>Mecânico responsável</b>
            </div>
          </div>
          <div className="text-center">
            <div className="border-t border-foreground print:border-black pt-1">
              <b>Supervisor</b>
            </div>
          </div>
        </div>

        <div className="no-print mt-4">
          <Button onClick={() => save.mutate()} disabled={save.isPending} className="w-full h-11">
            <Save className="w-4 h-4 mr-2" /> {save.isPending ? "Salvando..." : "Salvar manutenção"}
          </Button>
        </div>
      </div>

      <style>{`
        @media print {
          .no-print { display: none !important; }
          @page { size: A4; margin: 10mm; }
          body { background: white !important; color: black !important; }
          select { -webkit-appearance: none; appearance: none; }
        }
      `}</style>
    </div>
  );
}
