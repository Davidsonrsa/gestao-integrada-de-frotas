import { useRef, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { FilePlus2, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";

export function CotacaoFiltrosDialog({
  itens,
}: {
  itens: { codigo: string; quantidade: number }[];
}) {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const criando = useRef(false);

  async function criarCotacao() {
    if (criando.current || !itens.length) return;
    criando.current = true;
    setSaving(true);
    let cotacaoId: string | null = null;
    try {
      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser();
      if (authError) throw authError;
      if (!user) throw new Error("Entre novamente para criar a cotação.");
      const { data: existentes, error: numerosError } = await supabase
        .from("cotacoes")
        .select("numero");
      if (numerosError) throw numerosError;
      const maiorNumero = (existentes ?? []).reduce((maior, item) => {
        const numero = Number.parseInt(String(item.numero).match(/\d+/)?.[0] || "0", 10);
        return Number.isNaN(numero) ? maior : Math.max(maior, numero);
      }, 0);
      const { data: cotacao, error: criarError } = await supabase
        .from("cotacoes")
        .insert({
          numero: String(maiorNumero + 1).padStart(4, "0"),
          data_cotacao: new Date().toLocaleDateString("en-CA"),
          status: "aberto",
          valor_total: 0,
          solicitante_id: user.id,
        })
        .select("id")
        .single();
      if (criarError) throw criarError;
      cotacaoId = cotacao.id;
      const { error: itensError } = await supabase.from("cotacao_itens").insert(
        itens.map((item, index) => ({
          cotacao_id: cotacao.id,
          ordem: index + 1,
          codigo: item.codigo,
          descricao: item.codigo,
          quantidade: item.quantidade,
          unidade: "UN",
        })),
      );
      if (itensError) throw itensError;
      cotacaoId = null;
      setOpen(false);
      toast.success("Cotação criada com os filtros selecionados!");
      await navigate({ to: "/cotacoes/$id", params: { id: cotacao.id } });
    } catch (error: unknown) {
      // A failed bulk insert must not leave an empty quotation behind.
      if (cotacaoId) {
        const { error: excluirError } = await supabase
          .from("cotacoes")
          .delete()
          .eq("id", cotacaoId);
        if (excluirError) {
          setOpen(false);
          toast.error(
            "A cotação foi aberta, mas os filtros não foram salvos. Confira os itens antes de enviar.",
          );
          await navigate({ to: "/cotacoes/$id", params: { id: cotacaoId } });
          return;
        }
      }
      toast.error(
        "Não foi possível criar a cotação: " +
          (error instanceof Error ? error.message : "Tente novamente."),
      );
    } finally {
      criando.current = false;
      setSaving(false);
    }
  }

  return (
    <>
      <Button
        type="button"
        size="icon"
        variant="outline"
        className="h-9 w-9 shrink-0"
        title="Criar cotação dos filtros selecionados"
        aria-label="Criar cotação dos filtros selecionados"
        disabled={!itens.length}
        onClick={() => setOpen(true)}
      >
        <FilePlus2 className="h-4 w-4" />
      </Button>
      <Dialog
        open={open}
        onOpenChange={(value) => {
          if (!saving) setOpen(value);
        }}
      >
        <DialogContent aria-describedby={undefined} className="max-w-md">
          <DialogHeader>
            <DialogTitle>Nova cotação de filtros</DialogTitle>
          </DialogHeader>
          <div className="max-h-80 overflow-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted">
                <tr>
                  <th className="p-2 text-left">Código</th>
                  <th className="p-2 text-right">Quantidade (un.)</th>
                </tr>
              </thead>
              <tbody>
                {itens.map((item) => (
                  <tr key={item.codigo} className="border-b border-border">
                    <td className="p-2 font-mono break-all">{item.codigo}</td>
                    <td className="p-2 text-right tabular-nums">{item.quantidade}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <DialogFooter className="gap-2">
            <Button
              type="button"
              variant="outline"
              disabled={saving}
              onClick={() => setOpen(false)}
            >
              Cancelar
            </Button>
            <Button
              type="button"
              disabled={saving || !itens.length}
              onClick={() => void criarCotacao()}
            >
              {saving ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <FilePlus2 className="mr-2 h-4 w-4" />
              )}
              Criar cotação
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
