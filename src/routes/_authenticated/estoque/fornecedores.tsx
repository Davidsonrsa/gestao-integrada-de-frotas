import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Building2, Plus } from "lucide-react";
import { estoqueDb as supabase } from "@/lib/estoque-db";

export const Route = createFileRoute("/_authenticated/estoque/fornecedores")({
  component: EstoqueFornecedoresPage,
});

type Fornecedor = {
  id: string;
  razao_social: string;
  nome_fantasia?: string | null;
  cnpj?: string | null;
  telefone?: string | null;
  celular?: string | null;
  email?: string | null;
  endereco?: string | null;
  cidade?: string | null;
  estado?: string | null;
  observacoes?: string | null;
  ativo?: boolean | null;
};

export default function EstoqueFornecedoresPage() {
  const [fornecedores, setFornecedores] = useState<Fornecedor[]>([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({
    razao_social: "",
    nome_fantasia: "",
    cnpj: "",
    telefone: "",
    celular: "",
    email: "",
    endereco: "",
    cidade: "",
    estado: "",
    observacoes: "",
    ativo: true,
  });

  async function loadData() {
    try {
      const { data, error } = await supabase
        .from("estoque_fornecedores")
        .select("*")
        .order("razao_social", { ascending: true });
      if (error) throw error;
      setFornecedores((data || []) as Fornecedor[]);
    } catch (error) {
      console.error("Erro ao carregar fornecedores:", error);
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
      const { error } = await supabase.from("estoque_fornecedores").insert([
        {
          razao_social: form.razao_social.trim(),
          nome_fantasia: form.nome_fantasia || null,
          cnpj: form.cnpj || null,
          telefone: form.telefone || null,
          celular: form.celular || null,
          email: form.email || null,
          endereco: form.endereco || null,
          cidade: form.cidade || null,
          estado: form.estado || null,
          observacoes: form.observacoes || null,
          ativo: form.ativo,
        },
      ]);
      if (error) throw error;
      setForm({
        razao_social: "",
        nome_fantasia: "",
        cnpj: "",
        telefone: "",
        celular: "",
        email: "",
        endereco: "",
        cidade: "",
        estado: "",
        observacoes: "",
        ativo: true,
      });
      await loadData();
    } catch (error) {
      console.error("Erro ao salvar fornecedor:", error);
    }
  }

  return (
    <div className="grid gap-6 xl:grid-cols-[1fr_0.9fr]">
      <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <h2 className="mb-4 text-lg font-black text-slate-900">Fornecedores</h2>

        {loading ? (
          <p className="text-sm text-slate-500">Carregando...</p>
        ) : fornecedores.length === 0 ? (
          <p className="text-sm text-slate-500">Nenhum fornecedor cadastrado.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-slate-600">
                  <th className="py-2 pr-4 font-semibold">Razão social</th>
                  <th className="py-2 pr-4 font-semibold">Cidade</th>
                  <th className="py-2 pr-4 font-semibold">Telefone</th>
                  <th className="py-2 font-semibold">Status</th>
                </tr>
              </thead>
              <tbody>
                {fornecedores.map((fornecedor) => (
                  <tr key={fornecedor.id} className="border-b border-slate-100">
                    <td className="py-3 pr-4 font-medium text-slate-800">
                      {fornecedor.razao_social}
                    </td>
                    <td className="py-3 pr-4 text-slate-600">{fornecedor.cidade || "—"}</td>
                    <td className="py-3 pr-4 text-slate-600">
                      {fornecedor.telefone || fornecedor.celular || "—"}
                    </td>
                    <td className="py-3">
                      <span
                        className={`rounded-full px-2 py-1 text-[10px] font-bold uppercase ${fornecedor.ativo === false ? "bg-slate-100 text-slate-600" : "bg-emerald-100 text-emerald-700"}`}
                      >
                        {fornecedor.ativo === false ? "Inativo" : "Ativo"}
                      </span>
                    </td>
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
          <Building2 className="h-5 w-5 text-sky-700" />
          <h2 className="text-lg font-black text-slate-900">Novo fornecedor</h2>
        </div>

        <div className="grid gap-3">
          <input
            value={form.razao_social}
            onChange={(e) => setForm({ ...form, razao_social: e.target.value })}
            placeholder="Razão social"
            required
            className="rounded-md border border-slate-300 p-2 text-sm"
          />
          <input
            value={form.nome_fantasia}
            onChange={(e) => setForm({ ...form, nome_fantasia: e.target.value })}
            placeholder="Nome fantasia"
            className="rounded-md border border-slate-300 p-2 text-sm"
          />
          <input
            value={form.cnpj}
            onChange={(e) => setForm({ ...form, cnpj: e.target.value })}
            placeholder="CNPJ"
            className="rounded-md border border-slate-300 p-2 text-sm"
          />
          <div className="grid gap-3 md:grid-cols-2">
            <input
              value={form.telefone}
              onChange={(e) => setForm({ ...form, telefone: e.target.value })}
              placeholder="Telefone"
              className="rounded-md border border-slate-300 p-2 text-sm"
            />
            <input
              value={form.celular}
              onChange={(e) => setForm({ ...form, celular: e.target.value })}
              placeholder="Celular"
              className="rounded-md border border-slate-300 p-2 text-sm"
            />
          </div>
          <input
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
            placeholder="E-mail"
            className="rounded-md border border-slate-300 p-2 text-sm"
          />
          <input
            value={form.endereco}
            onChange={(e) => setForm({ ...form, endereco: e.target.value })}
            placeholder="Endereço"
            className="rounded-md border border-slate-300 p-2 text-sm"
          />
          <div className="grid gap-3 md:grid-cols-2">
            <input
              value={form.cidade}
              onChange={(e) => setForm({ ...form, cidade: e.target.value })}
              placeholder="Cidade"
              className="rounded-md border border-slate-300 p-2 text-sm"
            />
            <input
              value={form.estado}
              onChange={(e) => setForm({ ...form, estado: e.target.value })}
              placeholder="Estado"
              className="rounded-md border border-slate-300 p-2 text-sm"
            />
          </div>
          <textarea
            value={form.observacoes}
            onChange={(e) => setForm({ ...form, observacoes: e.target.value })}
            placeholder="Observações"
            className="min-h-20 rounded-md border border-slate-300 p-2 text-sm"
          />

          <label className="flex items-center gap-2 text-sm font-medium text-slate-700">
            <input
              type="checkbox"
              checked={form.ativo}
              onChange={(e) => setForm({ ...form, ativo: e.target.checked })}
            />
            Fornecedor ativo
          </label>

          <button
            type="submit"
            className="rounded-md bg-sky-600 px-4 py-2 text-sm font-bold text-white hover:bg-sky-700"
          >
            <Plus className="mr-2 inline h-4 w-4" />
            Salvar fornecedor
          </button>
        </div>
      </form>
    </div>
  );
}
