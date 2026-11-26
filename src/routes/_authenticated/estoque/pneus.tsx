import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { ArrowLeftRight, Gauge, ImagePlus, PackageOpen, Plus, RotateCw, Trash2, Wrench } from "lucide-react";
import { toast } from "sonner";
import { estoqueDb as supabase } from "@/lib/estoque-db";
import { getEstoqueFotoUrls, uploadEstoqueFoto } from "@/lib/estoque-fotos";
import { useAuth } from "@/hooks/use-auth";
import { normalizarBusca } from "@/lib/busca";
import { Retroescavadeira3D } from "@/components/pneus/Retroescavadeira3D";
import { CaminhaoPlanta } from "@/components/pneus/CaminhaoPlanta";
import { CarroChassi } from "@/components/pneus/CarroChassi";
import { Button } from "@/components/ui/button";
import { layoutPneus, montagemPneus, podeAplicarPneu, corRecapagem, LEGENDA_RECAPAGEM, MEDIDAS_RE, TIPOS_CHASSI } from "@/lib/pneus";

export const Route = createFileRoute("/_authenticated/estoque/pneus")({
  head: () => ({ meta: [
    { title: "Controle de pneus | Gestão Integrada de Frotas" },
    { name: "description", content: "Montagem, rodízio e histórico dos pneus da frota." },
    { property: "og:title", content: "Controle de pneus | Gestão Integrada de Frotas" },
    { property: "og:description", content: "Montagem, rodízio e histórico dos pneus da frota." },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary" },
  ] }),
  component: EstoquePneusPage,
});

type Pneu = {
  id: string;
  codigo: string;
  marca?: string | null;
  medida?: string | null;
  valor?: number | null;
  status?: string | null;
  equipamento_id?: string | null;
  posicao?: string | null;
  recapagens?: number | null;
  foto_path?: string | null;
};
type Equipamento = { id: string; numero: string; identificacao?: string | null; cl?: string | null; tipo_chassi?: string | null };

const FORM_VAZIO = { codigo: "", marca: "", medida: "", valor: "", recapagens: "0", situacao: "EM ESTOQUE" };

export default function EstoquePneusPage() {
  const { isAdmin } = useAuth();
  const [pneus, setPneus] = useState<Pneu[]>([]);
  const [fotoUrls, setFotoUrls] = useState<Map<string, string>>(new Map());
  const [equipamentos, setEquipamentos] = useState<Equipamento[]>([]);
  const [equipId, setEquipId] = useState("");
  const [posSel, setPosSel] = useState<string | null>(null);
  const [pendenteId, setPendenteId] = useState<string | null>(null);
  const [rodizio, setRodizio] = useState(false);
  const [aplicarId, setAplicarId] = useState("");
  const [form, setForm] = useState(FORM_VAZIO);
  const [fotoFile, setFotoFile] = useState<File | null>(null);
  const [busca, setBusca] = useState("");
  const [clSel, setClSel] = useState("");
  const [editId, setEditId] = useState<string | null>(null);
  const [mostrarSemPneus, setMostrarSemPneus] = useState(false);
  const [abaLista, setAbaLista] = useState<"todos" | "almox" | "reforma">("todos");
  const fotoInputRef = useRef<HTMLInputElement>(null);

  async function loadData() {
    const [{ data, error }, eqRes] = await Promise.all([
      supabase.from("estoque_pneus").select("*").order("codigo"),
      supabase.from("equipamentos").select("id, numero, identificacao, cl, tipo_chassi").order("numero"),
    ]);
    if (error) return toast.error("Não foi possível carregar os pneus.");
    const lista = (data || []) as Pneu[];
    setPneus(lista);
    setEquipamentos((eqRes.data || []) as Equipamento[]);
    setFotoUrls(await getEstoqueFotoUrls(lista.map((p) => p.foto_path)));
  }
  useEffect(() => {
    void loadData();
  }, []);

  const equip = equipamentos.find((e) => e.id === equipId);
  const vinculados = useMemo(() => pneus.filter((p) => p.equipamento_id === equipId), [pneus, equipId]);
  const montagem = useMemo(() => montagemPneus(equip?.numero, vinculados, equip?.tipo_chassi), [equip?.numero, equip?.tipo_chassi, vinculados]);
  const { montados, pendentes } = montagem;
  const emEstoque = pneus.filter((p) => !p.equipamento_id && (p.status ?? "EM ESTOQUE") === "EM ESTOQUE");
  const pneuSel = pendenteId ? pendentes.find((p) => p.id === pendenteId) : posSel ? montados.get(posSel) : undefined;
  const layout = layoutPneus(equip?.numero, equip?.tipo_chassi);

  async function salvarChassi(tipo: string) {
    if (!equip) return;
    const { error } = await supabase.from("equipamentos").update({ tipo_chassi: tipo || null }).eq("id", equip.id);
    if (error) return toast.error("Não foi possível salvar o tipo de chassi.");
    setEquipamentos((l) => l.map((e) => (e.id === equip.id ? { ...e, tipo_chassi: tipo || null } : e)));
    setPosSel(null); setPendenteId(null);
    toast.success("Tipo de chassi salvo.");
  }

  function editarPneu(p: Pneu) {
    setEditId(p.id);
    setForm({ codigo: p.codigo, marca: p.marca ?? "", medida: p.medida ?? "", valor: p.valor != null ? String(p.valor) : "", recapagens: String(p.recapagens ?? 0), situacao: p.status === "EM REFORMA" ? "EM REFORMA" : "EM ESTOQUE" });
    setFotoFile(null);
    if (fotoInputRef.current) fotoInputRef.current.value = "";
    document.getElementById("form-pneu")?.scrollIntoView({ behavior: "smooth" });
  }
  function cancelarEdicao() {
    setEditId(null); setForm(FORM_VAZIO); setFotoFile(null);
    if (fotoInputRef.current) fotoInputRef.current.value = "";
  }

  async function mover(p: Pneu, patch: Partial<Pneu>, tipo: string, obs: string) {
    const { error } = await supabase.from("estoque_pneus").update(patch).eq("id", p.id);
    if (error) return toast.error(error.message), false;
    await supabase.from("estoque_movimentacoes").insert({
      tipo,
      quantidade: 1,
      equipamento_id: patch.equipamento_id ?? p.equipamento_id ?? null,
      documento: p.codigo,
      observacao: obs,
      data_movimento: new Date().toISOString().slice(0, 10),
    });
    return true;
  }

  async function clicarPosicao(pos: string) {
    if (rodizio && pneuSel) {
      const destino = montados.get(pos);
      if (pendenteId && destino) return toast.error("Escolha uma posição vazia para o pneu sem posição no desenho.");
      if (!await mover(pneuSel, { posicao: pos }, "RODÍZIO PNEU", `${pneuSel.codigo}: ${pneuSel.posicao ?? "sem posição"} → ${pos}`)) return;
      if (destino && !await mover(destino, { posicao: posSel }, "RODÍZIO PNEU", `${destino.codigo}: ${pos} → ${posSel}`)) return void loadData();
      setPendenteId(null);
      setRodizio(false);
      setPosSel(pos);
      toast.success("Rodízio registrado.");
      return void loadData();
    }
    setRodizio(false);
    setPendenteId(null);
    setAplicarId("");
    setPosSel(pos);
  }

  async function aplicar() {
    const p = pneus.find((x) => x.id === aplicarId);
    if (!p || !posSel || !equip) return;
    if (!emEstoque.some((item) => item.id === p.id) || !podeAplicarPneu(equip.numero, vinculados, posSel)) {
      return toast.error("Posição ocupada ou limite de pneus atingido. Reposicione ou retire os pneus vinculados antes de aplicar outro.");
    }
    if (await mover(p, { equipamento_id: equipId, posicao: posSel, status: "INSTALADO" }, "APLICAR PNEU", `${p.codigo} aplicado em ${equip.numero} (${posSel})`)) {
      toast.success("Pneu aplicado.");
      void loadData();
    }
  }

  async function retirar(destino: "EM ESTOQUE" | "AG. CONSERTO" | "EM REFORMA" | "DESCARTADO") {
    if (!pneuSel) return;
    if (destino === "DESCARTADO" && !confirm(`Descartar o pneu ${pneuSel.codigo}?`)) return;
    if (await mover(pneuSel, { equipamento_id: null, posicao: null, status: destino }, destino === "EM ESTOQUE" ? "PNEU P/ ESTOQUE" : destino === "DESCARTADO" ? "PNEU DESCARTADO" : destino === "EM REFORMA" ? "PNEU P/ REFORMA" : "PNEU AG. CONSERTO", `${pneuSel.codigo} retirado de ${equip?.numero ?? ""} (${posSel}) — ${destino}`)) {
      toast.success("Pneu atualizado.");
      void loadData();
    }
  }

  async function alterarPneu(p: Pneu, patch: Partial<Pneu>) {
    const { error } = await supabase.from("estoque_pneus").update(patch).eq("id", p.id);
    if (error) return toast.error(error.message);
    void loadData();
  }

  async function excluirPneu(p: Pneu) {
    if (!confirm(`Excluir o pneu ${p.codigo}?`)) return;
    const { data, error } = await supabase.from("estoque_pneus").delete().eq("id", p.id).select("id");
    if (error || !data?.length) return toast.error("Apenas administradores podem excluir pneus.");
    void loadData();
  }

  async function handleSubmit(ev: React.FormEvent) {
    ev.preventDefault();
    try {
      const foto_path = fotoFile ? await uploadEstoqueFoto("pneus", fotoFile) : null;
      if (editId) {
        const atual = pneus.find((x) => x.id === editId);
        const patch: Record<string, unknown> = {
          codigo: form.codigo.trim().toUpperCase(),
          marca: form.marca || null,
          medida: form.medida || null,
          valor: form.valor ? Number(form.valor) : null,
          recapagens: Number(form.recapagens || 0),
        };
        if (foto_path) patch.foto_path = foto_path;
        if (atual && !atual.equipamento_id && (atual.status ?? "EM ESTOQUE") !== "DESCARTADO" && atual.status !== "AG. CONSERTO") {
          patch.status = form.situacao; patch.estado = form.situacao;
        }
        const { error } = await supabase.from("estoque_pneus").update(patch).eq("id", editId);
        if (error) throw error;
        cancelarEdicao();
        toast.success("Pneu atualizado.");
        void loadData();
        return;
      }
      const { error } = await supabase.from("estoque_pneus").insert({
        codigo: form.codigo.trim().toUpperCase(),
        marca: form.marca || null,
        medida: form.medida || null,
        valor: form.valor ? Number(form.valor) : null,
        recapagens: Number(form.recapagens || 0),
        status: form.situacao,
        estado: form.situacao,
        foto_path,
      });
      if (error) throw error;
      setForm(FORM_VAZIO);
      setFotoFile(null);
      if (fotoInputRef.current) fotoInputRef.current.value = "";
      toast.success("Pneu cadastrado.");
      void loadData();
    } catch {
      toast.error("Não foi possível salvar o pneu.");
    }
  }

  const nomeEquip = (id?: string | null) => equipamentos.find((x) => x.id === id)?.numero ?? "—";
  const emReforma = (p: Pneu) => p.status === "EM REFORMA";
  const noAlmox = (p: Pneu) => !p.equipamento_id && (p.status ?? "EM ESTOQUE") === "EM ESTOQUE";
  const cls = [...new Set(equipamentos.map((e) => e.cl?.trim()).filter((c): c is string => !!c))].sort((a, b) => a.localeCompare(b, "pt-BR", { numeric: true }));
  const equipsFiltrados = (clSel ? equipamentos.filter((e) => e.cl?.trim() === clSel) : equipamentos).filter((e) => mostrarSemPneus || e.tipo_chassi !== "sem_pneus" || e.id === equipId);
  const lista = pneus.filter((p) => (abaLista === "todos" || (abaLista === "almox" ? noAlmox(p) : emReforma(p)))).filter((p) => !busca || normalizarBusca(`${p.codigo} ${p.marca ?? ""} ${p.medida ?? ""}`).includes(normalizarBusca(busca)));
  const medidasCadastradas = useMemo(() => {
    const todas = new Set<string>([...MEDIDAS_RE.dianteiro, ...MEDIDAS_RE.traseiro]);
    for (const p of pneus) {
      const m = p.medida?.trim();
      if (m) todas.add(m);
    }
    return [...todas].sort((a, b) => a.localeCompare(b, "pt-BR", { numeric: true }));
  }, [pneus]);

  return (
    <div className="space-y-6">
      <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="mb-4 flex flex-wrap items-center gap-3">
          <h2 className="text-lg font-black text-slate-900">Montagem por equipamento</h2>
          <select value={clSel} onChange={(e) => { setClSel(e.target.value); setEquipId(""); setPosSel(null); setPendenteId(null); }} className="rounded-md border border-slate-300 p-2 text-sm">
            <option value="">Todas as CL</option>
            {cls.map((c) => <option key={c} value={c}>CL {c}</option>)}
          </select>
          <select
            value={equipId}
            onChange={(e) => {
              setEquipId(e.target.value);
              setPosSel(null);
              setPendenteId(null);
              setRodizio(false);
              setAplicarId("");
            }}
            className="rounded-md border border-slate-300 p-2 text-sm"
          >
            <option value="">Selecione o equipamento</option>
            {equipsFiltrados.map((e) => {
              const resumo = montagemPneus(e.numero, pneus.filter((p) => p.equipamento_id === e.id), e.tipo_chassi);
              return (
              <option key={e.id} value={e.id}>
                {e.numero} {e.identificacao ? `— ${e.identificacao}` : ""} ({resumo.montados.size}/{resumo.total} pneus{resumo.pendentes.length > 0 ? ` · ${resumo.pendentes.length} sem posição no desenho` : ""})
              </option>
              );
            })}
          </select>
          {equip && (
            <select value={equip.tipo_chassi ?? ""} onChange={(e) => void salvarChassi(e.target.value)} aria-label="Tipo de chassi" className="rounded-md border border-slate-300 p-2 text-sm">
              <option value="">Chassi: automático pela sigla</option>
              {TIPOS_CHASSI.map((t) => <option key={t.value} value={t.value}>Chassi: {t.label}</option>)}
            </select>
          )}
          <label className="flex items-center gap-1 text-xs text-slate-600">
            <input type="checkbox" checked={mostrarSemPneus} onChange={(e) => setMostrarSemPneus(e.target.checked)} />
            Mostrar equipamentos sem pneus
          </label>
        </div>

        {equipId && equip?.tipo_chassi === "sem_pneus" ? (
          <p className="rounded-lg bg-slate-100 p-4 text-sm text-slate-600">Este equipamento está marcado como <b>sem pneus</b>. Troque o tipo de chassi acima para montar pneus.</p>
        ) : equipId ? (
          <div className="grid gap-4 lg:grid-cols-[1fr_320px]">
            <div className="overflow-x-auto rounded-lg bg-slate-100 p-4">
              {layout.tipo === "re" ? (
                <Retroescavadeira3D montados={montados} posSel={posSel} onClick={(pos) => void clicarPosicao(pos)} />
              ) : layout.tipo === "carro" ? (
                <CarroChassi montados={montados} posSel={posSel} onClick={(pos) => void clicarPosicao(pos)} />
              ) : (
                <CaminhaoPlanta
                  montados={montados}
                  posSel={posSel}
                  estepe={layout.estepe}
                  onClick={(pos) => void clicarPosicao(pos)}
                />
              )}
              {pendentes.length > 0 && (
                <section className="mt-4 border-t border-border pt-3">
                  <h3 className="mb-2 text-sm font-semibold text-foreground">Pneus vinculados sem posição no desenho ({pendentes.length})</h3>
                  <div className="flex flex-wrap gap-2">
                    {pendentes.map((p) => (
                      <Button key={p.id} variant={pendenteId === p.id ? "secondary" : "outline"} size="sm" onClick={() => {
                        setPendenteId(p.id);
                        setPosSel(p.posicao ?? null);
                        setRodizio(false);
                        setAplicarId("");
                      }}>{p.codigo} · {p.posicao ?? "Sem posição"}</Button>
                    ))}
                  </div>
                </section>
              )}
              <div className="mt-4 flex flex-wrap justify-center gap-2 text-[10px]">
                {LEGENDA_RECAPAGEM.map((l) => (
                  <span key={l.label} className="flex items-center gap-1">
                    <span className="h-3 w-5 rounded border" style={{ background: l.bg }} /> {l.label}
                  </span>
                ))}
              </div>
            </div>

            <div className="rounded-lg border border-slate-200 p-3 text-sm">
              {!posSel && !pneuSel ? (
                <p className="text-slate-500">Clique em uma posição do desenho.</p>
              ) : pneuSel ? (
                <div className="space-y-2">
                  <p className="font-black">{pneuSel.codigo} <span className="font-normal text-slate-500">— {posSel}</span></p>
                  <p className="text-xs text-slate-500">{[pneuSel.marca, pneuSel.medida].filter(Boolean).join(" · ") || "—"}</p>
                  <div className="flex items-center gap-2 text-xs">
                    Recapagens:
                    <button type="button" className="rounded border px-2" onClick={() => void alterarPneu(pneuSel, { recapagens: Math.max(0, (pneuSel.recapagens ?? 0) - 1) })}>−</button>
                    <b>{pneuSel.recapagens ?? 0}</b>
                    <button type="button" className="rounded border px-2" onClick={() => void alterarPneu(pneuSel, { recapagens: (pneuSel.recapagens ?? 0) + 1 })}>+</button>
                  </div>
                  <div className="grid grid-cols-2 gap-2 pt-2">
                    <button type="button" onClick={() => setRodizio(!rodizio)} className={`flex items-center justify-center gap-1 rounded-md border p-2 text-xs font-bold ${rodizio ? "bg-sky-100" : ""}`}>
                      <RotateCw className="h-4 w-4" /> {pendenteId ? "Reposicionar" : "Rodízio"}
                    </button>
                    <button type="button" onClick={() => void retirar("EM ESTOQUE")} className="flex items-center justify-center gap-1 rounded-md border p-2 text-xs font-bold">
                      <PackageOpen className="h-4 w-4" /> P/ estoque
                    </button>
                    <button type="button" onClick={() => void retirar("AG. CONSERTO")} className="flex items-center justify-center gap-1 rounded-md border p-2 text-xs font-bold text-purple-700">
                      <Wrench className="h-4 w-4" /> Ag. conserto
                    </button>
                    <button type="button" onClick={() => void retirar("EM REFORMA")} className="flex items-center justify-center gap-1 rounded-md border p-2 text-xs font-bold text-amber-700">
                      <Wrench className="h-4 w-4" /> P/ reforma
                    </button>
                    <button type="button" onClick={() => void retirar("DESCARTADO")} className="flex items-center justify-center gap-1 rounded-md border p-2 text-xs font-bold text-red-600">
                      <Trash2 className="h-4 w-4" /> Descartar
                    </button>
                  </div>
                  {rodizio && <p className="text-xs text-sky-700">Clique na posição de destino (troca se estiver ocupada).</p>}
                </div>
              ) : (
                <div className="space-y-2">
                  <p className="font-black">Posição {posSel} vazia</p>
                  <select value={aplicarId} onChange={(e) => setAplicarId(e.target.value)} className="w-full rounded-md border border-slate-300 p-2 text-sm">
                    <option value="">Pneu em estoque...</option>
                    {emEstoque.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.codigo} {p.medida ? `— ${p.medida}` : ""} ({p.recapagens ?? 0} recap.)
                      </option>
                    ))}
                  </select>
                  {vinculados.length >= layout.total && <p className="text-sm text-destructive">Limite de pneus atingido; reposicione ou retire os pneus vinculados.</p>}
                  <button type="button" disabled={!aplicarId || !podeAplicarPneu(equip?.numero, vinculados, posSel ?? "")} onClick={() => void aplicar()} className="flex w-full items-center justify-center gap-1 rounded-md bg-sky-600 p-2 text-sm font-bold text-white disabled:bg-slate-300">
                    <ArrowLeftRight className="h-4 w-4" /> Aplicar pneu
                  </button>
                </div>
              )}
            </div>
          </div>
        ) : (
          <p className="text-sm text-slate-500">Selecione um equipamento para ver e montar os pneus.</p>
        )}
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="mb-3 flex items-center justify-between gap-2">
            <h2 className="text-lg font-black text-slate-900">Pneus ({lista.length})</h2>
            <input value={busca} onChange={(e) => setBusca(e.target.value)} placeholder="Buscar..." className="w-40 rounded-md border border-slate-300 p-2 text-sm" />
          </div>
          <div className="mb-3 flex flex-wrap gap-2">
            {([["todos", `Todos (${pneus.length})`], ["almox", `Almoxarifado (${pneus.filter(noAlmox).length})`], ["reforma", `Em reforma (${pneus.filter(emReforma).length})`]] as const).map(([k, label]) => (
              <Button key={k} type="button" size="sm" variant={abaLista === k ? "secondary" : "outline"} onClick={() => setAbaLista(k)}>{label}</Button>
            ))}
          </div>
          <div className="space-y-2">
            {lista.map((p) => {
              const c = corRecapagem(p.recapagens ?? 0);
              const foto = p.foto_path ? fotoUrls.get(p.foto_path) : undefined;
              return (
                <div key={p.id} className="flex items-center gap-3 rounded-lg border border-slate-200 p-2 text-sm">
                  <span className="h-8 w-3 rounded" style={{ background: c.bg }} />
                  {foto && <img src={foto} alt={p.codigo} className="h-10 w-10 rounded object-cover" />}
                  <div className="flex-1">
                    <p className="font-bold">{p.codigo}</p>
                    <p className="text-xs text-slate-500">
                      {[p.marca, p.medida].filter(Boolean).join(" · ") || "—"} · {p.recapagens ?? 0} recap. · {p.status || "EM ESTOQUE"}
                      {p.equipamento_id && ` · ${nomeEquip(p.equipamento_id)} (${p.posicao ?? "—"})`}
                    </p>
                  </div>
                  {emReforma(p) && (
                    <button type="button" onClick={() => void alterarPneu(p, { status: "EM ESTOQUE", equipamento_id: null, posicao: null, recapagens: (p.recapagens ?? 0) + 1 })} className="rounded border px-2 py-1 text-xs">Voltou da reforma</button>
                  )}
                  {(p.status === "AG. CONSERTO" || (!p.posicao && (p.equipamento_id || ((p.status ?? "EM ESTOQUE") !== "EM ESTOQUE" && p.status !== "DESCARTADO")))) && (
                    <button type="button" onClick={() => void alterarPneu(p, { status: "EM ESTOQUE", equipamento_id: null, posicao: null })} className="rounded border px-2 py-1 text-xs">Voltou p/ estoque</button>
                  )}
                  <button type="button" onClick={() => editarPneu(p)} className="rounded border px-2 py-1 text-xs">Editar</button>
                  {isAdmin && (
                    <button type="button" aria-label="Excluir pneu" onClick={() => void excluirPneu(p)} className="text-red-600">
                      <Trash2 className="h-4 w-4" />
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        <form id="form-pneu" onSubmit={handleSubmit} className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="mb-4 flex items-center gap-2">
            <Gauge className="h-5 w-5 text-sky-700" />
            <h2 className="text-lg font-black text-slate-900">{editId ? "Editar pneu" : "Cadastrar pneu"}</h2>
          </div>
          <div className="grid gap-3">
            <input value={form.codigo} onChange={(e) => setForm({ ...form, codigo: e.target.value })} placeholder="Código (ex.: PNEU48)" required className="rounded-md border border-slate-300 p-2 text-sm" />
            <div className="grid grid-cols-2 gap-3">
              <input value={form.marca} onChange={(e) => setForm({ ...form, marca: e.target.value })} placeholder="Marca" className="rounded-md border border-slate-300 p-2 text-sm" />
              <input value={form.medida} onChange={(e) => setForm({ ...form, medida: e.target.value })} list="medidas-pneu" placeholder="Medida" className="rounded-md border border-slate-300 p-2 text-sm" />
              <datalist id="medidas-pneu">{medidasCadastradas.map((m) => <option key={m} value={m} />)}</datalist>
              <input type="number" min="0" step="0.01" value={form.valor} onChange={(e) => setForm({ ...form, valor: e.target.value })} placeholder="Valor (R$)" className="rounded-md border border-slate-300 p-2 text-sm" />
              <select value={form.recapagens} onChange={(e) => setForm({ ...form, recapagens: e.target.value })} className="rounded-md border border-slate-300 p-2 text-sm">
                {[0, 1, 2, 3, 4, 5].map((n) => (
                  <option key={n} value={n}>{n === 0 ? "Novo" : `${n} recapagem(ns)`}</option>
                ))}
              </select>
              <select value={form.situacao} onChange={(e) => setForm({ ...form, situacao: e.target.value })} className="col-span-2 rounded-md border border-slate-300 p-2 text-sm">
                <option value="EM ESTOQUE">No almoxarifado (não usado)</option>
                <option value="EM REFORMA">Em reforma</option>
              </select>
            </div>
            <label className="flex cursor-pointer items-center gap-2 rounded-md border border-dashed border-slate-300 p-2 text-sm text-slate-600">
              <ImagePlus className="h-4 w-4 text-sky-700" />
              {fotoFile ? fotoFile.name : "Foto do pneu (opcional)"}
              <input ref={fotoInputRef} type="file" accept="image/*" className="hidden" onChange={(e) => setFotoFile(e.target.files?.[0] ?? null)} />
            </label>
            <button type="submit" className="rounded-md bg-sky-600 px-4 py-2 text-sm font-bold text-white hover:bg-sky-700">
              <Plus className="mr-2 inline h-4 w-4" /> {editId ? "Salvar alterações" : "Salvar pneu"}
            </button>
            {editId && <button type="button" onClick={cancelarEdicao} className="rounded-md border px-4 py-2 text-sm">Cancelar edição</button>}
          </div>
        </form>
      </div>
    </div>
  );
}
