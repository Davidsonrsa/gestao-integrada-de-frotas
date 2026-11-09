import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { BookOpen, ExternalLink, Link2, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";

interface Catalogo {
  id: string;
  titulo: string;
  link: string;
  created_at: string;
}

function normalizarLink(link: string): string {
  const limpo = link.trim();
  if (!limpo) return limpo;
  return /^https?:\/\//i.test(limpo) ? limpo : `https://${limpo}`;
}

export function CatalogosFrotaDialog() {
  const { isAdmin } = useAuth();
  const queryClient = useQueryClient();
  const [aberto, setAberto] = useState(false);
  const [titulo, setTitulo] = useState("");
  const [link, setLink] = useState("");

  const { data: catalogos, isLoading } = useQuery({
    queryKey: ["frota-catalogos"],
    enabled: aberto,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("frota_catalogos")
        .select("id, titulo, link, created_at")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as Catalogo[];
    },
  });

  const adicionar = useMutation({
    mutationFn: async () => {
      const url = normalizarLink(link);
      if (!titulo.trim()) throw new Error("Informe o nome do catálogo");
      if (!url) throw new Error("Informe o link do catálogo");
      const { error } = await supabase
        .from("frota_catalogos")
        .insert({ titulo: titulo.trim(), link: url });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Catálogo adicionado");
      setTitulo("");
      setLink("");
      queryClient.invalidateQueries({ queryKey: ["frota-catalogos"] });
    },
    onError: (e: Error) => toast.error(e.message || "Não foi possível salvar o catálogo"),
  });

  const excluir = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("frota_catalogos").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Catálogo removido");
      queryClient.invalidateQueries({ queryKey: ["frota-catalogos"] });
    },
    onError: () => toast.error("Não foi possível remover o catálogo"),
  });

  return (
    <Dialog open={aberto} onOpenChange={setAberto}>
      <DialogTrigger asChild>
        <Button
          size="sm"
          className="h-9 px-2.5 text-[11px] gap-1"
          title="Catálogos e links da frota"
        >
          <BookOpen className="w-3.5 h-3.5" />
          Catálogos
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Catálogos e links da frota</DialogTitle>
        </DialogHeader>

        {isAdmin && (
          <div className="space-y-2 rounded-lg border border-slate-200 bg-slate-50 p-3">
            <p className="text-[11px] font-semibold text-slate-600">Adicionar catálogo</p>
            <Input
              placeholder="Nome do catálogo (ex.: Catálogo de peças CASE)"
              value={titulo}
              onChange={(e) => setTitulo(e.target.value)}
              className="h-9 text-xs bg-white"
            />
            <div className="flex gap-2">
              <Input
                placeholder="Link (ex.: https://...)"
                value={link}
                onChange={(e) => setLink(e.target.value)}
                className="h-9 text-xs bg-white"
              />
              <Button
                size="sm"
                className="h-9 px-3 gap-1 shrink-0"
                onClick={() => adicionar.mutate()}
                disabled={adicionar.isPending}
              >
                <Plus className="w-3.5 h-3.5" />
                Salvar
              </Button>
            </div>
          </div>
        )}

        <div className="max-h-[50vh] overflow-y-auto divide-y divide-slate-100">
          {isLoading && <p className="py-6 text-center text-xs text-slate-500">Carregando...</p>}
          {!isLoading && (catalogos ?? []).length === 0 && (
            <p className="py-6 text-center text-xs text-slate-500">
              Nenhum catálogo cadastrado.
            </p>
          )}
          {(catalogos ?? []).map((c) => (
            <div key={c.id} className="flex items-center gap-2 py-2">
              <Link2 className="w-4 h-4 shrink-0 text-slate-400" />
              <div className="min-w-0 flex-1">
                <p className="truncate text-xs font-semibold text-slate-800">{c.titulo}</p>
                <a
                  href={c.link}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1 truncate text-[11px] text-sky-700 hover:underline"
                >
                  {c.link}
                  <ExternalLink className="w-3 h-3 shrink-0" />
                </a>
              </div>
              {isAdmin && (
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-8 w-8 shrink-0 text-red-600 hover:bg-red-50"
                  title="Remover catálogo"
                  onClick={() => excluir.mutate(c.id)}
                  disabled={excluir.isPending}
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              )}
            </div>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}
