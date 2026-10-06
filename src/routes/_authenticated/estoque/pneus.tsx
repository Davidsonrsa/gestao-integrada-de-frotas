import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Gauge, LogOut, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { estoqueDb as supabase } from "@/lib/estoque-db";
import { useAuth } from "@/hooks/use-auth";

export const Route = createFileRoute("/_authenticated/estoque/pneus")({
  component: EstoquePneusPage,
});

type Pneu = {
  id: string;
  codigo: string;
  marca?: string | null;
  modelo?: string | null;
  medida?: string | null;
  codigo_serie?: string | null;
  dot?: string | null;
  tipo?: string | null;
  valor?: number | null;
  fornecedor_id?: string | null;
  data_compra?: string | null;
  estado?: string | null;
  status?: string | null;
  equipamento_id?: string | null;
};
type Equipamento = { id: string; numero: string; identificacao?: string | null };

export default function EstoquePneusPage() {
  const { isAdmin } = useAuth();
  const [pneus, setPneus] = useState<Pneu[]>([]);
  const [equipamentos, setEquipamentos] = useState<Equipamento[]>([]);
  const [loading, setLoading] = useState(true);
  const [saidaId, setSaidaId] = useState<string | null>(null);
  const [saida, setSaida] = useState({
    equipamento_id: "",
    destino: "INSTALADO",
    responsavel: "",
    observacao: "",
  });
  const [form, setForm] = useState({
    codigo: "",
    marca: "",
    modelo: "",
    medida: "",
    codigo_serie: "",
    dot: "",
    tipo: "",
    valor: "0",
    fornecedor_id: "",
    data_compra: "",
    estado: "EM ESTOQUE",
    status: "EM ESTOQUE",
  });

  async function loadData() {
    try {
      const [{ data, error }, eqRes] = await Promise.all([
        supabase.from("estoque_pneus").select("*").order("created_at", { ascending: false }),
        supabase
          .from("equipamentos")
          .select("id, numero, identificacao")
          .order("numero", { ascending: true }),
      ]);
      if (error) throw error;
      setPneus((data || []) as Pneu[]);
      setEquipamentos((eqRes.data || []) as Equipamento[]);
    } catch (error) {
      console.error("Erro ao carregar pneus:", error);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadData();
  }, []);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    try {
      const { error } = await supabase.from("estoque_pneus").insert([
        {
          codigo: form.codigo,
          marca: form.marca || null,
          modelo: form.modelo || null,
          medida: form.medida || null,
          codigo_serie: form.codigo_serie || null,
          dot: form.dot || null,
          tipo: form.tipo || null,
          valor: Number(form.valor || 0),
          fornecedor_id: form.fornecedor_id || null,
          data_compra: form.data_compra || null,
          estado: form.estado,
          status: form.status,
        },
      ]);
      if (error) throw error;
      setForm({
        codigo: "",
        marca: "",
        modelo: "",
        medida: "",
        codigo_serie: "",
        dot: "",
        tipo: "",
        valor: "0",
        fornecedor_id: "",
        data_compra: "",
        estado: "EM ESTOQUE",
        status: "EM ESTOQUE",
      });
      await loadData();
    } catch (error) {
      console.error("Erro ao salvar pneu:", error);
      toast.error("Não foi possível salvar o pneu.");
    }
  }

  async function confirmarSaida(pneu: Pneu) {
    try {
      const { error } = await supabase
        .from("estoque_pneus")
        .update({
          status: saida.destino,
          estado: saida.destino,
          equipamento_id: saida.equipamento_id || null,
          observacao: [
            `Saída em ${new Date().toLocaleDateString("pt-BR")}`,
            saida.responsavel && `Resp.: ${saida.responsavel}`,
            saida.observacao,
          ]
            .filter(Boolean)
            .join(" — "),
        })
        .eq("id", pneu.id);
      if (error) throw error;
      await supabase.from("estoque_movimentacoes").insert({
        tipo: "SAÍDA PNEU",
        quantidade: 1,
        equipamento_id: saida.equipamento_id || null,
        responsavel: saida.responsavel || null,
        documento: pneu.codigo,
        observacao: `Pneu ${pneu.codigo} — ${saida.destino}${saida.observacao ? ` — ${saida.observacao}` : ""}`,
        data_movimento: new Date().toISOString().slice(0, 10),
      });
      setSaidaId(null);
      setSaida({ equipamento_id: "", destino: "INSTALADO", responsavel: "", observacao: "" });
      toast.success("Saída do pneu registrada.");
      await loadData();
    } catch (error) {
      console.error(error);
      toast.error("Não foi possível registrar a saída do pneu.");
    }
  }

  async function excluirPneu(pneu: Pneu) {
    if (!confirm(`Excluir o pneu ${pneu.codigo}? Esta ação não pode ser desfeita.`)) return;
    const { data, error } = await supabase
      .from("estoque_pneus")
      .delete()
      .eq("id", pneu.id)
      .select("id");
    if (error || !data?.length) {
      toast.error("Não foi possível excluir. Apenas administradores podem excluir pneus.");
      return;
    }
    toast.success("Pneu excluído.");
    await loadData();
  }

  const nomeEquip = (id?: string | null) => {
    const e = equipamentos.find((x) => x.id === id);
    return e ? e.identificacao || e.numero : "—";
  };

  return (
    <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
      <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <h2 className="mb-4 text-lg font-black text-slate-900">Pneus</h2>

        {loading ? (
          <p className="text-sm text-slate-500">Carregando pneus...</p>
        ) : pneus.length === 0 ? (
          <p className="text-sm text-slate-500">Nenhum pneu cadastrado.</p>
        ) : (
          <div className="space-y-2">
            {pneus.map((pneu) => (
              <div key={pneu.id} className="rounded-lg border border-slate-200 p-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="text-sm">
                    <p className="font-bold text-slate-800">{pneu.codigo}</p>
                    <p className="text-xs text-slate-500">
                      {[pneu.marca, pneu.medida].filter(Boolean).join(" · ") || "—"} · Status:{" "}
                      {pneu.status || "—"} · Equip.: {nomeEquip(pneu.equipamento_id)}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setSaidaId(saidaId === pneu.id ? null : pneu.id)}
                      className="inline-flex items-center gap-1 rounded-md px-3 py-1.5 text-xs"
                    >
                      <LogOut className="h-4 w-4" /> Saída
                    </button>
                    {isAdmin && (
                      <button
                        type="button"
                        aria-label="Excluir pneu"
                        onClick={() => void excluirPneu(pneu)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                </div>
                {saidaId === pneu.id && (
                  <div className="mt-3 grid gap-2 md:grid-cols-2">
                    <select
                      value={saida.destino}
                      onChange={(e) => setSaida({ ...saida, destino: e.target.value })}
                      className="rounded-md border border-slate-300 p-2 text-sm"
                    >
                      <option>INSTALADO</option>
                      <option>RECAPAGEM</option>
                      <option>DANIFICADO</option>
                      <option>DESCARTADO</option>
                    </select>
                    <select
                      value={saida.equipamento_id}
                      onChange={(e) => setSaida({ ...saida, equipamento_id: e.target.value })}
                      className="rounded-md border border-slate-300 p-2 text-sm"
                    >
                      <option value="">Equipamento (opcional)</option>
                      {equipamentos.map((eq) => (
                        <option key={eq.id} value={eq.id}>
                          {eq.identificacao || eq.numero}
                        </option>
                      ))}
                    </select>
                    <input
                      value={saida.responsavel}
                      onChange={(e) => setSaida({ ...saida, responsavel: e.target.value })}
                      placeholder="Responsável"
                      className="rounded-md border border-slate-300 p-2 text-sm"
                    />
                    <input
                      value={saida.observacao}
                      onChange={(e) => setSaida({ ...saida, observacao: e.target.value })}
                      placeholder="Observação"
                      className="rounded-md border border-slate-300 p-2 text-sm"
                    />
                    <button
                      type="button"
                      onClick={() => void confirmarSaida(pneu)}
                      className="rounded-md px-3 py-2 text-sm md:col-span-2"
                    >
                      Confirmar saída
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>


      <form
        onSubmit={handleSubmit}
        className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm"
      >
        <div className="mb-4 flex items-center gap-2">
          <Gauge className="h-5 w-5 text-sky-700" />
          <h2 className="text-lg font-black text-slate-900">Cadastrar pneu</h2>
        </div>

        <div className="grid gap-3">
          <input
            value={form.codigo}
            onChange={(e) => setForm({ ...form, codigo: e.target.value })}
            placeholder="Código"
            required
            className="rounded-md border border-slate-300 p-2 text-sm"
          />
          <div className="grid gap-3 md:grid-cols-2">
            <input
              value={form.marca}
              onChange={(e) => setForm({ ...form, marca: e.target.value })}
              placeholder="Marca"
              className="rounded-md border border-slate-300 p-2 text-sm"
            />
            <input
              value={form.modelo}
              onChange={(e) => setForm({ ...form, modelo: e.target.value })}
              placeholder="Modelo"
              className="rounded-md border border-slate-300 p-2 text-sm"
            />
          </div>
          <div className="grid gap-3 md:grid-cols-2">
            <input
              value={form.medida}
              onChange={(e) => setForm({ ...form, medida: e.target.value })}
              placeholder="Medida"
              className="rounded-md border border-slate-300 p-2 text-sm"
            />
            <input
              value={form.dot}
              onChange={(e) => setForm({ ...form, dot: e.target.value })}
              placeholder="DOT"
              className="rounded-md border border-slate-300 p-2 text-sm"
            />
          </div>
          <div className="grid gap-3 md:grid-cols-2">
            <input
              value={form.codigo_serie}
              onChange={(e) => setForm({ ...form, codigo_serie: e.target.value })}
              placeholder="Número de série"
              className="rounded-md border border-slate-300 p-2 text-sm"
            />
            <input
              value={form.tipo}
              onChange={(e) => setForm({ ...form, tipo: e.target.value })}
              placeholder="Tipo"
              className="rounded-md border border-slate-300 p-2 text-sm"
            />
          </div>
          <div className="grid gap-3 md:grid-cols-2">
            <input
              type="number"
              min="0"
              step="0.01"
              value={form.valor}
              onChange={(e) => setForm({ ...form, valor: e.target.value })}
              placeholder="Valor"
              className="rounded-md border border-slate-300 p-2 text-sm"
            />
            <input
              type="date"
              value={form.data_compra}
              onChange={(e) => setForm({ ...form, data_compra: e.target.value })}
              className="rounded-md border border-slate-300 p-2 text-sm"
            />
          </div>
          <div className="grid gap-3 md:grid-cols-2">
            <select
              value={form.estado}
              onChange={(e) => setForm({ ...form, estado: e.target.value })}
              className="rounded-md border border-slate-300 p-2 text-sm"
            >
              <option>EM ESTOQUE</option>
              <option>INSTALADO</option>
              <option>RECAPADO</option>
              <option>DANIFICADO</option>
              <option>DESCARTADO</option>
            </select>
            <select
              value={form.status}
              onChange={(e) => setForm({ ...form, status: e.target.value })}
              className="rounded-md border border-slate-300 p-2 text-sm"
            >
              <option>EM ESTOQUE</option>
              <option>INSTALADO</option>
              <option>RECAPADO</option>
              <option>DANIFICADO</option>
              <option>DESCARTADO</option>
            </select>
          </div>

          <button
            type="submit"
            className="rounded-md bg-sky-600 px-4 py-2 text-sm font-bold text-white hover:bg-sky-700"
          >
            <Plus className="mr-2 inline h-4 w-4" />
            Salvar pneu
          </button>
        </div>
      </form>
    </div>
  );
}
