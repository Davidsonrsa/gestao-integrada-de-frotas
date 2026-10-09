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
import { STATUS_LABELS, type ManutencaoItem } from "@/lib/manutencao-template";

export const REPORT_TAG = "[RELATORIO]";

export async function buildReportDocx(params: {
  equipNumero: string;
  equipIdent: string;
  data: string;
  horimetro: string;
  tipoRevisao: string;
  executante: string;
  observacoes: string;
  observacaoTecnico?: string;
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
              new TextRun({
                text: "PLANO DE MANUTENÇÃO PREVENTIVA",
                bold: true,
                size: 28,
              }),
            ],
          }),
          new Paragraph({
            alignment: AlignmentType.CENTER,
            children: [
              new TextRun({
                text: "SPH JHM Mafra — Registro de manutenção",
                size: 20,
              }),
            ],
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
              new TextRun({
                text: "Atividades de Manutenção Preventiva",
                bold: true,
                size: 22,
              }),
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
          new Paragraph({ spacing: { before: 240 }, children: [new TextRun("___________________________")] }),
          new Paragraph({ children: [new TextRun("Mecânico responsável")] }),
          new Paragraph({ keepNext: true, children: [new TextRun({ text: "Observações do supervisor / técnico", bold: true, size: 20 })] }),
          new Paragraph({ keepNext: true, children: [new TextRun(params.observacaoTecnico || "—")] }),
          new Paragraph({ keepNext: true, alignment: AlignmentType.RIGHT, spacing: { before: 240 }, children: [new TextRun("___________________________")] }),
          new Paragraph({ alignment: AlignmentType.RIGHT, children: [new TextRun("Supervisor")] }),
        ],
      },
    ],
  });

  return await Packer.toBlob(doc);
}
