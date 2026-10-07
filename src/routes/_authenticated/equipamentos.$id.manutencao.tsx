import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { ArrowLeft, Printer, FileText, Save, FileType, Eye } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/hooks/use-auth";
import { MANUTENCAO_TEMPLATE, STATUS_LABELS, type ManutencaoItem } from "@/lib/manutencao-template";
import { buildReportDocx, REPORT_TAG } from "@/lib/manutencao-docx";

export const Route = createFileRoute("/_authenticated/equipamentos/$id/manutencao")({
  component: ManutencaoPage,
  validateSearch: (search: Record<string, unknown>) => ({
    horimetro: typeof search.horimetro === "string" ? search.horimetro : undefined,
    tipoRevisao: typeof search.tipoRevisao === "string" ? search.tipoRevisao : undefined,
  }),
});

function ManutencaoPage() {
  const { id } = Route.useParams();
  const { horimetro: horimetroInicial, tipoRevisao: tipoRevisaoInicial } = Route.useSearch();
  const { userId } = useAuth();
  const qc = useQueryClient();

  const { data: e } = useQuery({
    queryKey: ["equipamento", id],
    queryFn: async () => {
      const { data, error } = await supabase.from("equipamentos").select("*").eq("id", id).single();
      if (error) throw error;
      return data;
    },
  });

  // Rascunho: último registro em aberto do usuário para este equipamento
  const { data: rascunho } = useQuery({
    queryKey: ["manutencao_rascunho", id, userId],
    enabled: !!userId,
    queryFn: async () => {
      const { data } = await supabase
        .from("manutencao_historico")
        .select("*")
        .eq("equipamento_id", id)
        .eq("created_by", userId!)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      return data;
    },
  });

  const [histId, setHistId] = useState<string | null>(null);
  const [data, setData] = useState("");
  const [horimetro, setHorimetro] = useState("");
  const [tipoRevisao, setTipoRevisao] = useState("");
  const [executante, setExecutante] = useState("");
  const [observacoes, setObservacoes] = useState("");
  const [itens, setItens] = useState<ManutencaoItem[]>(MANUTENCAO_TEMPLATE);

  useEffect(() => {
    if (rascunho) {
      setHistId(rascunho.id);
      setData(rascunho.data ?? "");
      setHorimetro(rascunho.horimetro != null ? String(rascunho.horimetro) : "");
      setTipoRevisao(rascunho.tipo_revisao ?? "");
      setExecutante(rascunho.executante ?? "");
      setObservacoes(rascunho.observacoes ?? "");
      const arr = Array.isArray(rascunho.itens)
        ? (rascunho.itens as unknown as ManutencaoItem[])
        : [];
      setItens(arr.length ? arr : MANUTENCAO_TEMPLATE);
    } else if (e) {
      setHorimetro(
        horimetroInicial ?? (e.horimetro_atual != null ? String(e.horimetro_atual) : ""),
      );
      setTipoRevisao(tipoRevisaoInicial ?? `Revisão de ${e.limite_revisao ?? 500}h`);
    }
  }, [rascunho, e, horimetroInicial, tipoRevisaoInicial]);

  const save = useMutation({
    mutationFn: async () => {
      if (!userId) throw new Error("Não autenticado");
      const finalData = data || new Date().toISOString().slice(0, 10);
      const payload = {
        equipamento_id: id,
        created_by: userId,
        data: finalData,
        horimetro: horimetro === "" ? null : Number(horimetro),
        tipo_revisao: tipoRevisao || null,
        executante: executante || null,
        observacoes: observacoes || null,
        itens: JSON.parse(JSON.stringify(itens)),
      };
      let currentHistId = histId;
      if (currentHistId) {
        const { error } = await supabase
          .from("manutencao_historico")
          .update(payload)
          .eq("id", currentHistId);
        if (error) throw error;
      } else {
        const { data: ins, error } = await supabase
          .from("manutencao_historico")
          .insert(payload)
          .select("id")
          .single();
        if (error) throw error;
        currentHistId = ins.id as string;
        setHistId(currentHistId);
      }

      // Gera relatório Word e salva como anexo (substitui o anterior)
      const blob = await buildReportDocx({
        equipNumero: e?.numero ?? "",
        equipIdent: e?.identificacao ?? "",
        data: finalData,
        horimetro,
        tipoRevisao,
        executante,
        observacoes,
        itens,
      });
      const { data: prev } = await supabase
        .from("equipamento_fotos")
        .select("id, storage_path")
        .eq("manutencao_historico_id", currentHistId)
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
      const path = `${id}/hist-${currentHistId}/relatorio-${Date.now()}.docx`;
      const { error: upErr } = await supabase.storage.from("equipamento-fotos").upload(path, blob, {
        contentType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        upsert: true,
      });
      if (upErr) throw upErr;
      const { error: insErr } = await supabase.from("equipamento_fotos").insert({
        equipamento_id: id,
        manutencao_historico_id: currentHistId,
        storage_path: path,
        uploaded_by: userId,
        caption: `${REPORT_TAG} Relatório de manutenção ${finalData}.docx`,
      });
      if (insErr) throw insErr;
      return currentHistId;
    },
    onSuccess: () => {
      toast.success("Manutenção salva — relatório Word gerado");
      qc.invalidateQueries({ queryKey: ["manutencao_historico", id] });
      qc.invalidateQueries({ queryKey: ["manutencao_rascunho", id, userId] });
      qc.invalidateQueries({ queryKey: ["manutencao_historico_anexos_count", id] });
    },
    onError: (err: Error) => toast.error(err.message),
  });

  function updateItem(idx: number, patch: Partial<ManutencaoItem>) {
    setItens((arr) => arr.map((it, i) => (i === idx ? { ...it, ...patch } : it)));
  }

  async function exportWord() {
    if (!e) return;
    const blob = await buildReportDocx({
      equipNumero: e.numero ?? "",
      equipIdent: e.identificacao ?? "",
      data,
      horimetro,
      tipoRevisao,
      executante,
      observacoes,
      itens,
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `manutencao-${e.numero ?? id}-${data || "sem-data"}.docx`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
    toast.success("Word gerado");
  }

  async function visualizarRelatorio() {
    if (!histId) {
      toast.info("Salve o formulário primeiro para gerar o relatório.");
      return;
    }
    const { data: rel, error } = await supabase
      .from("equipamento_fotos")
      .select("storage_path")
      .eq("manutencao_historico_id", histId)
      .like("caption", `${REPORT_TAG}%`)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (error) return toast.error(error.message);
    if (!rel) {
      toast.info("Nenhum relatório salvo ainda. Clique em Salvar.");
      return;
    }
    const { data: signed, error: sErr } = await supabase.storage
      .from("equipamento-fotos")
      .createSignedUrl(rel.storage_path, 60 * 60);
    if (sErr || !signed?.signedUrl) return toast.error("Falha ao gerar link do relatório");
    const viewerUrl = `https://view.officeapps.live.com/op/view.aspx?src=${encodeURIComponent(signed.signedUrl)}`;
    const w = window.open(viewerUrl, "_blank", "noopener,noreferrer");
    if (!w) window.location.href = viewerUrl;
  }

  if (!e) return <div className="p-6 text-center text-muted-foreground">Carregando...</div>;

  return (
    <div className="bg-background min-h-screen">
      <div className="no-print sticky top-0 z-30 bg-background border-b px-3 py-2 flex items-center justify-between gap-2">
        <Link to="/equipamentos/$id" params={{ id }}>
          <Button variant="ghost" size="sm">
            <ArrowLeft className="w-4 h-4 mr-1" /> Voltar
          </Button>
        </Link>
        <div className="flex gap-2 flex-wrap">
          <Link to="/equipamentos/$id/historico" params={{ id }}>
            <Button size="sm" variant="outline">
              <FileText className="w-4 h-4 mr-1" /> Histórico
            </Button>
          </Link>
          <Button size="sm" variant="outline" onClick={visualizarRelatorio}>
            <Eye className="w-4 h-4 mr-1" /> Visualizar
          </Button>
          <Button size="sm" variant="outline" onClick={exportWord}>
            <FileType className="w-4 h-4 mr-1" /> Word
          </Button>
          <Button size="sm" variant="outline" onClick={() => window.print()}>
            <Printer className="w-4 h-4 mr-1" /> Imprimir
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
              SPH JHM Mafra — Preencha e clique em Salvar
            </p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3 mb-3">
          <div>
            <Label className="text-[11px]">Equipamento</Label>
            <Input value={`${e.numero ?? ""} — ${e.identificacao ?? ""}`} readOnly />
          </div>
          <div>
            <Label className="text-[11px]">Tipo de revisão (250h / 500h / 1000h)</Label>
            <Input value={tipoRevisao} onChange={(ev) => setTipoRevisao(ev.target.value)} />
          </div>
          <div>
            <Label className="text-[11px]">Data</Label>
            <Input type="date" value={data} onChange={(ev) => setData(ev.target.value)} />
          </div>
          <div>
            <Label className="text-[11px]">Horímetro</Label>
            <Input
              type="number"
              inputMode="decimal"
              value={horimetro}
              onChange={(ev) => setHorimetro(ev.target.value)}
            />
          </div>
          <div className="col-span-2">
            <Label className="text-[11px]">Executante</Label>
            <Input value={executante} onChange={(ev) => setExecutante(ev.target.value)} />
          </div>
        </div>

        <div className="border rounded-md overflow-hidden mb-3 print:border-black">
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
                        onChange={(ev) => updateItem(i, { codigo: ev.target.value })}
                      />
                    </td>
                    <td className="border px-1 py-0.5">
                      <input
                        className="w-full bg-transparent outline-none px-1 py-0.5 text-[11px]"
                        value={it.quantidade ?? ""}
                        onChange={(ev) => updateItem(i, { quantidade: ev.target.value })}
                      />
                    </td>
                    <td className="border px-1 py-0.5">
                      <select
                        className="w-full bg-transparent outline-none text-[11px] py-0.5"
                        value={it.status ?? ""}
                        onChange={(ev) =>
                          updateItem(i, { status: ev.target.value as ManutencaoItem["status"] })
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
        </div>

        <div className="mb-3">
          <Label className="text-[11px]">Observações</Label>
          <Textarea
            rows={4}
            value={observacoes}
            onChange={(ev) => setObservacoes(ev.target.value)}
          />
        </div>

        <div className="no-print">
          <Button onClick={() => save.mutate()} disabled={save.isPending} className="w-full h-11">
            <Save className="w-4 h-4 mr-2" /> {save.isPending ? "Salvando..." : "Salvar manutenção"}
          </Button>
        </div>

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
      </div>

      <style>{`
        @media print {
          header, nav, .no-print { display: none !important; }
          @page { size: A4; margin: 10mm; }
          body { background: white !important; color: black !important; }
          select { -webkit-appearance: none; appearance: none; }
        }
      `}</style>
    </div>
  );
}
