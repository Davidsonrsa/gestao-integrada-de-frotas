import { useEffect, useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import {
  Search,
  PlusCircle,
  Pencil,
  Trash2,
  Loader2,
  Building2,
  Phone,
  Mail,
  User,
  ArrowLeft,
  MapPin,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

export const Route = createFileRoute("/_authenticated/fornecedores")({
  component: FornecedoresPage,
});

interface FornecedorItem {
  id: string;
  razao_social: string;
  nome_fantasia: string | null;
  cnpj: string | null;
  email: string | null;
  telefone: string | null;
  celular: string | null;
  endereco: string | null;
  bairro: string | null;
  cidade: string | null;
  estado: string | null;
  cep: string | null;
  observacoes: string | null;
  banco: string | null;
  agencia: string | null;
  conta: string | null;
  pix: string | null;
  ativo: boolean | null;
}

// Funções de Máscara
const maskCnpj = (value: string) => {
  return value
    .replace(/\D/g, "")
    .replace(/^(\d{2})(\d)/, "$1.$2")
    .replace(/^(\d{2})\.(\d{3})(\d)/, "$1.$2.$3")
    .replace(/\.(\d{3})(\d)/, ".$1/$2")
    .replace(/(\d{4})(\d)/, "$1-$2")
    .slice(0, 18);
};

const maskTelefone = (value: string) => {
  return value
    .replace(/\D/g, "")
    .replace(/^(\d{2})(\d)/, "($1) $2")
    .replace(/(\d{5})(\d{4})-(\d)/, "$1-$2")
    .replace(/(\d{5})(\d)/, "$1-$2")
    .slice(0, 15);
};

function FornecedoresPage() {
  const navigate = useNavigate();
  const [fornecedores, setFornecedores] = useState<FornecedorItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [busca, setBusca] = useState("");
  const [openModal, setOpenModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [fornecedorEditando, setFornecedorEditando] = useState<FornecedorItem | null>(null);

  // Form states
  const [razaoSocial, setRazaoSocial] = useState("");
  const [nomeFantasia, setNomeFantasia] = useState("");
  const [cnpj, setCnpj] = useState("");
  const [email, setEmail] = useState("");
  const [telefone, setTelefone] = useState("");
  const [endereco, setEndereco] = useState("");
  const [cidade, setCidade] = useState("");
  const [estado, setEstado] = useState("");
  const [observacoes, setObservacoes] = useState("");
  const [banco, setBanco] = useState("");
  const [agencia, setAgencia] = useState("");
  const [conta, setConta] = useState("");
  const [pix, setPix] = useState("");

  const fetchFornecedores = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("fornecedores")
        .select("*")
        .order("razao_social", { ascending: true });

      if (error) throw error;
      setFornecedores((data as any[]) ?? []);
    } catch (error: any) {
      toast.error("Erro ao carregar fornecedores: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFornecedores();
  }, []);

  const limparForm = () => {
    setRazaoSocial("");
    setNomeFantasia("");
    setCnpj("");
    setEmail("");
    setTelefone("");
    setEndereco("");
    setCidade("");
    setEstado("");
    setObservacoes("");
    setBanco("");
    setAgencia("");
    setConta("");
    setPix("");
    setFornecedorEditando(null);
  };

  const abrirEdicao = (f: FornecedorItem) => {
    setFornecedorEditando(f);
    setRazaoSocial(f.razao_social || "");
    setNomeFantasia(f.nome_fantasia || "");
    setCnpj(f.cnpj ? maskCnpj(f.cnpj) : "");
    setEmail(f.email || "");
    setTelefone(f.telefone ? maskTelefone(f.telefone) : "");
    setEndereco(f.endereco || "");
    setCidade(f.cidade || "");
    setEstado(f.estado || "");
    setObservacoes(f.observacoes || "");
    setBanco(f.banco || "");
    setAgencia(f.agencia || "");
    setConta(f.conta || "");
    setPix(f.pix || "");
    setOpenModal(true);
  };

  const handleSalvar = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const payload: any = {
        razao_social: razaoSocial.trim(),
        nome_fantasia: nomeFantasia.trim() || null,
        cnpj: cnpj.trim() || null,
        email: email.trim() || null,
        telefone: telefone.trim() || null,
        endereco: endereco.trim() || null,
        cidade: cidade.trim() || null,
        estado: estado.trim() || null,
        observacoes: observacoes.trim() || null,
        banco: banco.trim() || null,
        agencia: agencia.trim() || null,
        conta: conta.trim() || null,
        pix: pix.trim() || null,
      };

      if (fornecedorEditando) {
        const { error } = await supabase
          .from("fornecedores")
          .update(payload)
          .eq("id", fornecedorEditando.id);
        if (error) throw error;
        toast.success("Fornecedor atualizado com sucesso!");
      } else {
        const { error } = await supabase.from("fornecedores").insert([payload]);
        if (error) throw error;
        toast.success("Fornecedor cadastrado com sucesso!");
      }

      setOpenModal(false);
      limparForm();
      fetchFornecedores();
    } catch (error: any) {
      toast.error("Erro ao salvar fornecedor: " + error.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeletar = async (id: string, nome: string) => {
    if (!window.confirm(`Deseja realmente excluir o fornecedor "${nome}"?`)) return;
    try {
      const { error } = await supabase.from("fornecedores").delete().eq("id", id);
      if (error) throw error;
      toast.success("Fornecedor excluído com sucesso!");
      fetchFornecedores();
    } catch (error: any) {
      toast.error("Erro ao excluir fornecedor: " + error.message);
    }
  };

  const listaFiltrada = fornecedores.filter(
    (f) =>
      f.razao_social?.toLowerCase().includes(busca.toLowerCase()) ||
      f.nome_fantasia?.toLowerCase().includes(busca.toLowerCase()) ||
      f.cnpj?.toLowerCase().includes(busca.toLowerCase()),
  );

  return (
    <div className="p-4 md:p-6 w-full max-w-7xl mx-auto space-y-4">
      <div className="flex items-center justify-between">
        <Button variant="outline" onClick={() => navigate({ to: "/cotacoes" })} className="gap-2">
          <ArrowLeft className="w-4 h-4" /> Voltar às Cotações
        </Button>
      </div>

      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            Cadastro de Fornecedores
          </h1>
          <p className="text-sm text-slate-500">
            Gerencie sua base de fornecedores parceiros para cotações e compras.
          </p>
        </div>
        <Dialog
          open={openModal}
          onOpenChange={(open) => {
            setOpenModal(open);
            if (!open) limparForm();
          }}
        >
          <DialogTrigger asChild>
            <Button className="rounded-full gap-2">
              <PlusCircle className="w-4 h-4" /> Novo Fornecedor
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                {fornecedorEditando ? "Editar Fornecedor" : "Cadastrar Novo Fornecedor"}
              </DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSalvar} className="space-y-4 pt-2">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <Label>Razão Social *</Label>
                  <Input
                    value={razaoSocial}
                    onChange={(e) => setRazaoSocial(e.target.value)}
                    required
                  />
                </div>
                <div>
                  <Label>Nome Fantasia</Label>
                  <Input value={nomeFantasia} onChange={(e) => setNomeFantasia(e.target.value)} />
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div>
                  <Label>CNPJ</Label>
                  <Input
                    value={cnpj}
                    onChange={(e) => setCnpj(maskCnpj(e.target.value))}
                    placeholder="00.000.000/0000-00"
                  />
                </div>
                <div>
                  <Label>Telefone</Label>
                  <Input
                    value={telefone}
                    onChange={(e) => setTelefone(maskTelefone(e.target.value))}
                    placeholder="(00) 00000-0000"
                  />
                </div>
                <div>
                  <Label>E-mail</Label>
                  <Input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="contato@fornecedor.com"
                  />
                </div>
              </div>

              {/* Endereço, Cidade e Estado */}
              <div>
                <Label>Endereço</Label>
                <Input
                  value={endereco}
                  onChange={(e) => setEndereco(e.target.value)}
                  placeholder="Rua, Número, Bairro..."
                />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <Label>Cidade</Label>
                  <Input value={cidade} onChange={(e) => setCidade(e.target.value)} />
                </div>
                <div>
                  <Label>Estado (UF)</Label>
                  <Input
                    value={estado}
                    onChange={(e) => setEstado(e.target.value)}
                    maxLength={2}
                    placeholder="Ex: SP"
                  />
                </div>
              </div>

              {/* Dados de Pagamento */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <Label>Banco</Label>
                  <Input
                    value={banco}
                    onChange={(e) => setBanco(e.target.value)}
                    placeholder="Nome ou código do banco"
                  />
                </div>
                <div>
                  <Label>Agência</Label>
                  <Input
                    value={agencia}
                    onChange={(e) => setAgencia(e.target.value)}
                    placeholder="0000"
                  />
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <Label>Conta</Label>
                  <Input
                    value={conta}
                    onChange={(e) => setConta(e.target.value)}
                    placeholder="00000-0"
                  />
                </div>
                <div>
                  <Label>Chave PIX</Label>
                  <Input
                    value={pix}
                    onChange={(e) => setPix(e.target.value)}
                    placeholder="CPF, CNPJ, E-mail ou Telefone"
                  />
                </div>
              </div>

              <div>
                <Label>Observações</Label>
                <Textarea
                  value={observacoes}
                  onChange={(e) => setObservacoes(e.target.value)}
                  placeholder="Informações adicionais sobre o fornecedor..."
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setOpenModal(false);
                    limparForm();
                  }}
                >
                  Cancelar
                </Button>
                <Button type="submit" disabled={submitting}>
                  {submitting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                  Salvar Fornecedor
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex items-center gap-2">
        <Search className="w-4 h-4 text-slate-400" />
        <Input
          placeholder="Buscar por Razão Social, Nome Fantasia ou CNPJ..."
          className="border-0 focus-visible:ring-0 text-sm"
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
        />
      </div>

      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-700 font-semibold">
              <tr>
                <th className="p-3.5">Fornecedor</th>
                <th className="p-3.5">CNPJ</th>
                <th className="p-3.5">Contato</th>
                <th className="p-3.5">Localização / Endereço</th>
                <th className="p-3.5 text-center">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {loading ? (
                <tr>
                  <td colSpan={5} className="p-8 text-center text-slate-500">
                    <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2" /> Carregando
                    fornecedores...
                  </td>
                </tr>
              ) : listaFiltrada.length === 0 ? (
                <tr>
                  <td colSpan={5} className="p-8 text-center text-slate-500">
                    Nenhum fornecedor cadastrado.
                  </td>
                </tr>
              ) : (
                listaFiltrada.map((f) => (
                  <tr key={f.id} className="hover:bg-slate-50/50">
                    <td className="p-3.5">
                      <div className="font-medium text-slate-900">{f.razao_social}</div>
                      {f.nome_fantasia && (
                        <div className="text-xs text-slate-500">{f.nome_fantasia}</div>
                      )}
                    </td>
                    <td className="p-3.5 text-slate-600 font-mono text-xs">{f.cnpj || "—"}</td>
                    <td className="p-3.5 text-slate-600">
                      {f.telefone && (
                        <div className="flex items-center gap-1 text-xs">
                          <Phone className="w-3 h-3 text-slate-400" /> {f.telefone}
                        </div>
                      )}
                      {f.email && (
                        <div className="flex items-center gap-1 text-xs">
                          <Mail className="w-3 h-3 text-slate-400" /> {f.email}
                        </div>
                      )}
                      {!f.telefone && !f.email && "—"}
                    </td>
                    <td className="p-3.5 text-slate-600">
                      {f.endereco && <div className="font-medium text-xs">{f.endereco}</div>}
                      <div className="text-xs text-slate-500">
                        {f.cidade && f.estado
                          ? `${f.cidade} - ${f.estado}`
                          : f.cidade || f.estado || (!f.endereco ? "—" : "")}
                      </div>
                    </td>
                    <td className="p-3.5 text-center">
                      <div className="flex items-center justify-center gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-blue-600 hover:bg-blue-50"
                          onClick={() => abrirEdicao(f)}
                        >
                          <Pencil className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-red-600 hover:bg-red-50"
                          onClick={() => handleDeletar(f.id, f.razao_social)}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}