import { useState } from "react";
import { Plus, Trash2, Save, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
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
import { prepararItensCotacao, type ItemCotacaoRascunho } from "@/lib/cotacao-itens-lote";

function novoItem(): ItemCotacaoRascunho {
  return { chave: crypto.randomUUID(), codigo: "", descricao: "", quantidade: "1", unidade: "UN" };
}

export function CotacaoItensLoteDialog({
  cotacaoId,
  onSaved,
}: {
  cotacaoId: string;
  onSaved: () => Promise<void>;
}) {
  const [open, setOpen] = useState(false);
  const [itens, setItens] = useState<ItemCotacaoRascunho[]>([]);
  const [saving, setSaving] = useState(false);

  function atualizar(chave: string, campo: keyof ItemCotacaoRascunho, valor: string) {
    setItens((lista) =>
      lista.map((item) => (item.chave === chave ? { ...item, [campo]: valor } : item)),
    );
  }

  async function salvar(event: React.FormEvent) {
    event.preventDefault();
    if (saving) return;
    try {
      const payload = prepararItensCotacao(itens, cotacaoId);
      setSaving(true);
      const { error } = await supabase.from("cotacao_itens").insert(payload);
      if (error) throw error;
      setOpen(false);
      setItens([]);
      toast.success(`${payload.length} item(ns) salvo(s) na cotação!`);
      await onSaved();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Não foi possível salvar os itens.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <Button
        className="gap-2"
        onClick={() => {
          setItens([novoItem()]);
          setOpen(true);
        }}
      >
        <Plus className="size-4" /> Adicionar Item / Peça
      </Button>
      <Dialog
        open={open}
        onOpenChange={(valor) => {
          if (!saving) setOpen(valor);
        }}
      >
        <DialogContent
          className="max-w-3xl max-h-[90dvh] overflow-y-auto"
          onInteractOutside={(event) => event.preventDefault()}
        >
          <DialogHeader>
            <DialogTitle>Adicionar itens à cotação</DialogTitle>
          </DialogHeader>
          <form onSubmit={salvar} className="space-y-4">
            <fieldset disabled={saving} className="space-y-4 min-w-0">
              {itens.map((item, index) => (
                <div key={item.chave} className="border-b border-border pb-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-semibold">Item {index + 1}</h3>
                    <Button
                      type="button"
                      variant="destructive"
                      size="icon"
                      title={`Remover item ${index + 1}`}
                      aria-label={`Remover item ${index + 1}`}
                      onClick={() =>
                        setItens((lista) => lista.filter((atual) => atual.chave !== item.chave))
                      }
                    >
                      <Trash2 className="size-4" />
                    </Button>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-[1fr_2fr] gap-3">
                    <div>
                      <Label htmlFor={`codigo-${item.chave}`}>Código do Produto / Peça</Label>
                      <Input
                        id={`codigo-${item.chave}`}
                        value={item.codigo}
                        onChange={(e) => atualizar(item.chave, "codigo", e.target.value)}
                        className="mt-1 font-mono"
                      />
                    </div>
                    <div>
                      <Label htmlFor={`descricao-${item.chave}`}>Descrição *</Label>
                      <Input
                        id={`descricao-${item.chave}`}
                        value={item.descricao}
                        onChange={(e) => atualizar(item.chave, "descricao", e.target.value)}
                        required
                        className="mt-1"
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label htmlFor={`qtd-${item.chave}`}>Quantidade *</Label>
                      <Input
                        id={`qtd-${item.chave}`}
                        inputMode="decimal"
                        value={item.quantidade}
                        onChange={(e) => atualizar(item.chave, "quantidade", e.target.value)}
                        required
                        className="mt-1"
                      />
                    </div>
                    <div>
                      <Label htmlFor={`un-${item.chave}`}>Unidade *</Label>
                      <Input
                        id={`un-${item.chave}`}
                        value={item.unidade}
                        onChange={(e) => atualizar(item.chave, "unidade", e.target.value)}
                        required
                        className="mt-1 uppercase"
                      />
                    </div>
                  </div>
                </div>
              ))}
              <Button
                type="button"
                variant="outline"
                className="gap-2"
                onClick={() => setItens((lista) => [...lista, novoItem()])}
              >
                <Plus className="size-4" /> Adicionar outro item
              </Button>
            </fieldset>
            <DialogFooter className="gap-2">
              <Button
                type="button"
                variant="outline"
                disabled={saving}
                onClick={() => setOpen(false)}
              >
                Cancelar
              </Button>
              <Button type="submit" disabled={saving || itens.length === 0} className="gap-2">
                {saving ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />}{" "}
                Salvar todos ({itens.length})
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
