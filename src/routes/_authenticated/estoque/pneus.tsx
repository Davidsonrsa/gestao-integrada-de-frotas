import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Gauge, Plus } from "lucide-react";
import { estoqueDb as supabase } from "@/lib/estoque-db";

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
};

export default function EstoquePneusPage() {
  const [pneus, setPneus] = useState<Pneu[]>([]);
  const [loading, setLoading] = useState(true);
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
      const { data, error } = await supabase
        .from("estoque_pneus")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      setPneus((data || []) as Pneu[]);
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
    }
  }

  return (
    <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
      <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <h2 className="mb-4 text-lg font-black text-slate-900">Pneus</h2>

        {loading ? (
          <p className="text-sm text-slate-500">Carregando pneus...</p>
        ) : pneus.length === 0 ? (
          <p className="text-sm text-slate-500">Nenhum pneu cadastrado.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-slate-600">
                  <th className="py-2 pr-4 font-semibold">Código</th>
                  <th className="py-2 pr-4 font-semibold">Medida</th>
                  <th className="py-2 pr-4 font-semibold">Status</th>
                  <th className="py-2 font-semibold">Estado</th>
                </tr>
              </thead>
              <tbody>
                {pneus.map((pneu) => (
                  <tr key={pneu.id} className="border-b border-slate-100">
                    <td className="py-3 pr-4 font-medium text-slate-800">{pneu.codigo}</td>
                    <td className="py-3 pr-4 text-slate-600">{pneu.medida || "—"}</td>
                    <td className="py-3 pr-4 text-slate-600">{pneu.status || "—"}</td>
                    <td className="py-3 text-slate-600">{pneu.estado || "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
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
