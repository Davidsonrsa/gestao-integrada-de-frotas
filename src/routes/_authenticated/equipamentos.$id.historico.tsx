import { createFileRoute, Link, Outlet, useNavigate, useRouterState } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  ArrowLeft,
  Plus,
  FileText,
  Trash2,
  Printer,
  Paperclip,
  FileIcon,
  Download,
  Eye,
} from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { toast } from "sonner";
import { criarItensManutencao } from "@/lib/manutencao-filtros";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

export const Route = createFileRoute("/_authenticated/equipamentos/$id/historico")({
  component: HistoricoLayout,
  head: () => ({
    meta: [
      { title: "Histórico de Manutenção | Gestão Integrada de Frotas" },
      {
        name: "description",
        content: "Histórico, formulários e anexos das manutenções do equipamento.",
      },
      { property: "og:title", content: "Histórico de Manutenção | Gestão Integrada de Frotas" },
      {
        property: "og:description",
        content: "Consulte os registros e imprima os planos de manutenção.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
});

function HistoricoLayout() {
  const { id } = Route.useParams();
  const pathname = useRouterState({ select: (state) => state.location.pathname });
  const isList = pathname.replace(/\/$/, "") === `/equipamentos/${id}/historico`;
  return (
    <>
      {isList && <HistoricoPage />}
      <Outlet />
    </>
  );
}

type Anexo = {
  id: string;
  storage_path: string;
  caption: string | null;
  url: string;
};

function HistoricoPage() {
  const { id } = Route.useParams();
  const { userId } = useAuth();
  const qc = useQueryClient();
  const navigate = useNavigate();
  const [anexosDialog, setAnexosDialog] = useState<{
    histId: string;
    files: Anexo[];
  } | null>(null);

  const { data: equip } = useQuery({
    queryKey: ["equipamento", id],
    queryFn: async () => {
      const { data, error } = await supabase.from("equipamentos").select("*").eq("id", id).single();
      if (error) throw error;
      return data;
    },
  });

  const { data: registros, isLoading } = useQuery({
    queryKey: ["manutencao_historico", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("manutencao_historico")
        .select("id, data, horimetro, tipo_revisao, executante, observacoes, created_by")
        .eq("equipamento_id", id)
        .order("data", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const { data: anexosCount } = useQuery({
    queryKey: ["manutencao_historico_anexos_count", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("equipamento_fotos")
        .select("manutencao_historico_id")
        .eq("equipamento_id", id)
        .not("manutencao_historico_id", "is", null);
      if (error) throw error;
      const map: Record<string, number> = {};
      (data ?? []).forEach((r) => {
        const k = r.manutencao_historico_id as string;
        map[k] = (map[k] ?? 0) + 1;
      });
      return map;
    },
  });

  async function openAnexos(histId: string) {
    const { data, error } = await supabase
      .from("equipamento_fotos")
      .select("id, storage_path, caption")
      .eq("manutencao_historico_id", histId)
      .order("created_at", { ascending: false });
    if (error) return toast.error(error.message);
    const withUrl = await Promise.all(
      (data ?? []).map(async (f) => {
        const { data: signed } = await supabase.storage
          .from("equipamento-fotos")
          .createSignedUrl(f.storage_path, 60 * 60);
        return { ...f, url: signed?.signedUrl ?? "" };
      }),
    );
    setAnexosDialog({ histId, files: withUrl });
  }

  async function openRelatorio(histId: string) {
    const { data, error } = await supabase
      .from("equipamento_fotos")
      .select("storage_path")
      .eq("manutencao_historico_id", histId)
      .like("caption", "[RELATORIO]%")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (error) return toast.error(error.message);
    if (!data) {
      toast.info("Nenhum relatório salvo. Abra o formulário e clique em Salvar para gerar o Word.");
      navigate({
        to: "/equipamentos/$id/historico/$histId",
        params: { id, histId },
        search: { print: undefined },
      });
      return;
    }
    const { data: signed, error: sErr } = await supabase.storage
      .from("equipamento-fotos")
      .createSignedUrl(data.storage_path, 60 * 60);
    if (sErr || !signed?.signedUrl) return toast.error("Falha ao gerar link do relatório");
    const viewerUrl = `https://view.officeapps.live.com/op/view.aspx?src=${encodeURIComponent(signed.signedUrl)}`;
    const w = window.open(viewerUrl, "_blank", "noopener,noreferrer");
    if (!w) window.location.href = viewerUrl;
  }

  const createNew = useMutation({
    mutationFn: async () => {
      if (!userId) throw new Error("Não autenticado");
      const { data: equipamento, error: equipError } = await supabase
        .from("equipamentos")
        .select("*")
        .eq("id", id)
        .single();
      if (equipError) throw equipError;
      const { data, error } = await supabase
        .from("manutencao_historico")
        .insert({
          equipamento_id: id,
          created_by: userId,
          horimetro: equipamento.horimetro_atual ?? null,
          itens: JSON.parse(JSON.stringify(criarItensManutencao(equipamento))),
        })
        .select("id")
        .single();
      if (error) throw error;
      return data.id as string;
    },
    onSuccess: (histId) => {
      qc.invalidateQueries({ queryKey: ["manutencao_historico", id] });
      navigate({
        to: "/equipamentos/$id/historico/$histId",
        params: { id, histId },
        search: { print: undefined },
      });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const remove = useMutation({
    mutationFn: async (histId: string) => {
      const { error } = await supabase.from("manutencao_historico").delete().eq("id", histId);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Registro excluído");
      qc.invalidateQueries({ queryKey: ["manutencao_historico", id] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="px-3 py-3 md:px-6 md:py-6 max-w-md md:max-w-5xl mx-auto w-full space-y-3">
      <div className="flex items-center justify-between">
        <Link
          to="/equipamentos/$id"
          params={{ id }}
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="w-4 h-4" /> Voltar
        </Link>
        <Button size="sm" onClick={() => createNew.mutate()} disabled={createNew.isPending}>
          <Plus className="w-4 h-4 mr-1" /> Nova manutenção
        </Button>
      </div>

      <Card className="p-4">
        <h2 className="text-lg font-bold">Histórico de Manutenção</h2>
        {equip && (
          <p className="text-xs text-muted-foreground">
            {equip.numero} — {equip.identificacao ?? ""}
          </p>
        )}
      </Card>

      {isLoading ? (
        <p className="text-center text-sm text-muted-foreground py-4">Carregando...</p>
      ) : !registros?.length ? (
        <Card className="p-6 text-center text-sm text-muted-foreground">
          Nenhuma manutenção registrada. Clique em <b>Nova manutenção</b> para começar.
        </Card>
      ) : (
        registros.map((r) => {
          const nAnexos = anexosCount?.[r.id] ?? 0;
          return (
            <Card key={r.id} className="p-3 space-y-2">
              <div className="flex items-center gap-2">
                <Link
                  to="/equipamentos/$id/historico/$histId"
                  params={{ id, histId: r.id }}
                  search={{ print: undefined }}
                  className="flex-1 min-w-0"
                >
                  <div className="flex items-center gap-2">
                    <FileText className="w-4 h-4 text-primary shrink-0" />
                    <div className="min-w-0">
                      <p className="font-medium text-sm">
                        {new Date(r.data + "T00:00:00").toLocaleDateString("pt-BR")}
                        {r.tipo_revisao && (
                          <span className="ml-2 text-xs text-muted-foreground">
                            {r.tipo_revisao}
                          </span>
                        )}
                      </p>
                      <p className="text-xs text-muted-foreground truncate">
                        {r.horimetro ? `${r.horimetro}h` : "—"} · {r.executante || "sem executante"}
                      </p>
                    </div>
                  </div>
                </Link>
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button size="icon" variant="ghost" className="text-destructive shrink-0">
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Excluir manutenção?</AlertDialogTitle>
                      <AlertDialogDescription>
                        Esta ação não pode ser desfeita.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancelar</AlertDialogCancel>
                      <AlertDialogAction onClick={() => remove.mutate(r.id)}>
                        Excluir
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
              <div className="flex gap-2 flex-wrap pt-1 border-t">
                <Button
                  size="sm"
                  variant="default"
                  className="h-8 text-xs"
                  onClick={() => openRelatorio(r.id)}
                >
                  <Eye className="w-3.5 h-3.5 mr-1" /> Visualizar
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="h-8 text-xs"
                  onClick={() => openAnexos(r.id)}
                >
                  <Paperclip className="w-3.5 h-3.5 mr-1" />
                  Anexos {nAnexos > 0 && <span className="ml-1 font-semibold">({nAnexos})</span>}
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="h-8 text-xs"
                  onClick={() =>
                    navigate({
                      to: "/equipamentos/$id/historico/$histId",
                      params: { id, histId: r.id },
                      search: { print: 1 },
                    })
                  }
                >
                  <Printer className="w-3.5 h-3.5 mr-1" /> Imprimir
                </Button>
              </div>
            </Card>
          );
        })
      )}

      <Dialog
        open={!!anexosDialog}
        onOpenChange={(o) => {
          if (!o) setAnexosDialog(null);
        }}
      >
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Anexos salvos</DialogTitle>
          </DialogHeader>
          {!anexosDialog?.files.length ? (
            <p className="text-sm text-muted-foreground text-center py-6">
              Nenhum arquivo anexado neste registro.
            </p>
          ) : (
            <div className="grid grid-cols-2 gap-2 max-h-[60vh] overflow-auto">
              {anexosDialog.files.map((f) => {
                const ext = (f.storage_path.split(".").pop() || "").toLowerCase();
                const isImage = ["jpg", "jpeg", "png", "gif", "webp", "heic", "bmp"].includes(ext);
                const openFile = () => {
                  if (!f.url) {
                    toast.error("Não foi possível gerar o link do arquivo");
                    return;
                  }
                  const w = window.open(f.url, "_blank", "noopener,noreferrer");
                  if (!w) window.location.href = f.url;
                };
                return (
                  <button
                    key={f.id}
                    type="button"
                    onClick={openFile}
                    className="border rounded-md overflow-hidden bg-muted hover:bg-muted/70 text-left"
                  >
                    <div className="aspect-square flex items-center justify-center">
                      {isImage ? (
                        <img
                          src={f.url}
                          alt={f.caption ?? ""}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="flex flex-col items-center gap-1 p-2 text-center">
                          <FileIcon className="w-8 h-8 text-primary" />
                          <span className="text-[10px] uppercase font-semibold">
                            {ext || "arquivo"}
                          </span>
                          <Download className="w-3 h-3 text-muted-foreground" />
                        </div>
                      )}
                    </div>
                    {f.caption && (
                      <p className="text-[10px] px-1.5 py-0.5 border-t line-clamp-2">{f.caption}</p>
                    )}
                  </button>
                );
              })}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
