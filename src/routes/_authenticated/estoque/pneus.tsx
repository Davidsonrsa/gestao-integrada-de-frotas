import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { ArrowLeftRight, Gauge, ImagePlus, PackageOpen, Plus, RotateCw, Trash2, Wrench } from "lucide-react";
import { toast } from "sonner";
import { estoqueDb as supabase } from "@/lib/estoque-db";
import { getEstoqueFotoUrls, uploadEstoqueFoto } from "@/lib/estoque-fotos";
import { useAuth } from "@/hooks/use-auth";
import { normalizarBusca } from "@/lib/busca";
import { Retroescavadeira3D } from "@/components/pneus/Retroescavadeira3D";
import { layoutPneus, corRecapagem, LEGENDA_RECAPAGEM, MEDIDAS_RE } from "@/lib/pneus";

export const Route = createFileRoute("/_authenticated/estoque/pneus")({
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
type Equipamento = { id: string; numero: string; identificacao?: string | null };

const FORM_VAZIO = { codigo: "", marca: "", medida: "", valor: "", recapagens: "0" };

export default function EstoquePneusPage() {
  const { isAdmin } = useAuth();
  const [pneus, setPneus] = useState<Pneu[]>([]);
  const [fotoUrls, setFotoUrls] = useState<Map<string, string>>(new Map());
  const [equipamentos, setEquipamentos] = useState<Equipamento[]>([]);
  const [equipId, setEquipId] = useState("");
  const [posSel, setPosSel] = useState<string | null>(null);
  const [rodizio, setRodizio] = useState(false);
  const [aplicarId, setAplicarId] = useState("");
  const [form, setForm] = useState(FORM_VAZIO);
  const [fotoFile, setFotoFile] = useState<File | null>(null);
  const [busca, setBusca] = useState("");
  const fotoInputRef = useRef<HTMLInputElement>(null);

  async function loadData() {
    const [{ data, error }, eqRes] = await Promise.all([
      supabase.from("estoque_pneus").select("*").order("codigo"),
      supabase.from("equipamentos").select("id, numero, identificacao").order("numero"),
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

  const montados = useMemo(
    () => new Map(pneus.filter((p) => p.equipamento_id === equipId && p.posicao).map((p) => [p.posicao!, p])),
    [pneus, equipId],
  );
  const emEstoque = pneus.filter((p) => !p.equipamento_id && (p.status ?? "EM ESTOQUE") === "EM ESTOQUE");
  const pneuSel = posSel ? montados.get(posSel) : undefined;
  const equip = equipamentos.find((e) => e.id === equipId);
  const layout = layoutPneus(equip?.numero);

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
    if (rodizio && pneuSel && posSel) {
      const destino = montados.get(pos);
      await mover(pneuSel, { posicao: pos }, "RODÍZIO PNEU", `${pneuSel.codigo}: ${posSel} → ${pos}`);
      if (destino) await mover(destino, { posicao: posSel }, "RODÍZIO PNEU", `${destino.codigo}: ${pos} → ${posSel}`);
      setRodizio(false);
      setPosSel(pos);
      toast.success("Rodízio registrado.");
      return void loadData();
    }
    setRodizio(false);
    setAplicarId("");
    setPosSel(pos);
  }

  async function aplicar() {
    const p = pneus.find((x) => x.id === aplicarId);
    if (!p || !posSel || !equip) return;
    if (await mover(p, { equipamento_id: equipId, posicao: posSel, status: "INSTALADO" }, "APLICAR PNEU", `${p.codigo} aplicado em ${equip.numero} (${posSel})`)) {
      toast.success("Pneu aplicado.");
      void loadData();
    }
  }

  async function retirar(destino: "EM ESTOQUE" | "AG. CONSERTO" | "DESCARTADO") {
    if (!pneuSel) return;
    if (destino === "DESCARTADO" && !confirm(`Descartar o pneu ${pneuSel.codigo}?`)) return;
    if (await mover(pneuSel, { equipamento_id: null, posicao: null, status: destino }, destino === "EM ESTOQUE" ? "PNEU P/ ESTOQUE" : destino === "DESCARTADO" ? "PNEU DESCARTADO" : "PNEU AG. CONSERTO", `${pneuSel.codigo} retirado de ${equip?.numero ?? ""} (${posSel}) — ${destino}`)) {
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
      const { error } = await supabase.from("estoque_pneus").insert({
        codigo: form.codigo.trim().toUpperCase(),
        marca: form.marca || null,
        medida: form.medida || null,
        valor: form.valor ? Number(form.valor) : null,
        recapagens: Number(form.recapagens || 0),
        status: "EM ESTOQUE",
        estado: "EM ESTOQUE",
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
  const lista = pneus.filter((p) => !busca || normalizarBusca(`${p.codigo} ${p.marca ?? ""} ${p.medida ?? ""}`).includes(normalizarBusca(busca)));

  function Caixa({ pos }: { pos: string }) {
    const p = montados.get(pos);
    const c = p ? corRecapagem(p.recapagens ?? 0) : null;
    const sel = posSel === pos;
    return (
      <button
        type="button"
        onClick={() => void clicarPosicao(pos)}
        title={pos}
        className={`flex h-20 w-14 flex-col items-center justify-center rounded border-2 text-[10px] font-bold ${sel ? "ring-4 ring-sky-400" : ""} ${p ? "border-slate-800" : "border-dashed border-slate-400 bg-white text-slate-400"}`}
        style={c ? { background: c.bg, color: c.fg } : undefined}
      >
        <span className="break-all px-0.5 leading-tight">{p ? p.codigo : "vazio"}</span>
        <span className="mt-1 opacity-75">{pos}</span>
      </button>
    );
  }

  return (
    <div className="space-y-6">
      <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="mb-4 flex flex-wrap items-center gap-3">
          <h2 className="text-lg font-black text-slate-900">Montagem por equipamento</h2>
          <select
            value={equipId}
            onChange={(e) => {
              setEquipId(e.target.value);
              setPosSel(null);
            }}
            className="rounded-md border border-slate-300 p-2 text-sm"
          >
            <option value="">Selecione o equipamento</option>
            {equipamentos.map((e) => (
              <option key={e.id} value={e.id}>
                {e.numero} {e.identificacao ? `— ${e.identificacao}` : ""} ({pneus.filter((p) => p.equipamento_id === e.id).length}/{layoutPneus(e.numero).total} pneus)
              </option>
            ))}
          </select>
        </div>

        {equipId ? (
          <div className="grid gap-4 lg:grid-cols-[1fr_320px]">
            <div className="overflow-x-auto rounded-lg bg-slate-100 p-4">
              {!layout.estepe ? (
                <Retroescavadeira3D montados={montados} posSel={posSel} onClick={(pos) => void clicarPosicao(pos)} />
              ) : (
              <div className="mx-auto w-fit space-y-4">
                {layout.eixos.map((eixo) => (
                  <div key={eixo.nome} className="flex items-center gap-1">
                    <span className="w-14 text-[10px] font-bold text-slate-500">{eixo.nome}</span>
                    {eixo.esquerda.map((pos) => <Caixa key={pos} pos={pos} />)}
                    <div className="h-3 w-24 bg-slate-800" />
                    {eixo.direita.map((pos) => <Caixa key={pos} pos={pos} />)}
                  </div>
                ))}
                {layout.estepe && (
                  <div className="flex items-center gap-1">
                    <span className="w-14 text-[10px] font-bold text-slate-500">Estepe</span>
                    <Caixa pos="ESTEPE" />
                  </div>
                )}
              </div>
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
              {!posSel ? (
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
                      <RotateCw className="h-4 w-4" /> Rodízio
                    </button>
                    <button type="button" onClick={() => void retirar("EM ESTOQUE")} className="flex items-center justify-center gap-1 rounded-md border p-2 text-xs font-bold">
                      <PackageOpen className="h-4 w-4" /> P/ estoque
                    </button>
                    <button type="button" onClick={() => void retirar("AG. CONSERTO")} className="flex items-center justify-center gap-1 rounded-md border p-2 text-xs font-bold text-purple-700">
                      <Wrench className="h-4 w-4" /> Ag. conserto
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
                  <button type="button" disabled={!aplicarId} onClick={() => void aplicar()} className="flex w-full items-center justify-center gap-1 rounded-md bg-sky-600 p-2 text-sm font-bold text-white disabled:bg-slate-300">
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
            <h2 className="text-lg font-black text-slate-900">Pneus ({pneus.length})</h2>
            <input value={busca} onChange={(e) => setBusca(e.target.value)} placeholder="Buscar..." className="w-40 rounded-md border border-slate-300 p-2 text-sm" />
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
                  {(p.status === "AG. CONSERTO" || (!p.posicao && (p.equipamento_id || ((p.status ?? "EM ESTOQUE") !== "EM ESTOQUE" && p.status !== "DESCARTADO")))) && (
                    <button type="button" onClick={() => void alterarPneu(p, { status: "EM ESTOQUE", equipamento_id: null, posicao: null })} className="rounded border px-2 py-1 text-xs">Voltou p/ estoque</button>
                  )}
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

        <form onSubmit={handleSubmit} className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="mb-4 flex items-center gap-2">
            <Gauge className="h-5 w-5 text-sky-700" />
            <h2 className="text-lg font-black text-slate-900">Cadastrar pneu</h2>
          </div>
          <div className="grid gap-3">
            <input value={form.codigo} onChange={(e) => setForm({ ...form, codigo: e.target.value })} placeholder="Código (ex.: PNEU48)" required className="rounded-md border border-slate-300 p-2 text-sm" />
            <div className="grid grid-cols-2 gap-3">
              <input value={form.marca} onChange={(e) => setForm({ ...form, marca: e.target.value })} placeholder="Marca" className="rounded-md border border-slate-300 p-2 text-sm" />
              <input value={form.medida} onChange={(e) => setForm({ ...form, medida: e.target.value })} list="medidas-pneu" placeholder="Medida" className="rounded-md border border-slate-300 p-2 text-sm" />
              <datalist id="medidas-pneu">{[...MEDIDAS_RE.dianteiro, ...MEDIDAS_RE.traseiro].map((m) => <option key={m} value={m} />)}</datalist>
              <input type="number" min="0" step="0.01" value={form.valor} onChange={(e) => setForm({ ...form, valor: e.target.value })} placeholder="Valor (R$)" className="rounded-md border border-slate-300 p-2 text-sm" />
              <select value={form.recapagens} onChange={(e) => setForm({ ...form, recapagens: e.target.value })} className="rounded-md border border-slate-300 p-2 text-sm">
                {[0, 1, 2, 3, 4, 5].map((n) => (
                  <option key={n} value={n}>{n === 0 ? "Novo" : `${n} recapagem(ns)`}</option>
                ))}
              </select>
            </div>
            <label className="flex cursor-pointer items-center gap-2 rounded-md border border-dashed border-slate-300 p-2 text-sm text-slate-600">
              <ImagePlus className="h-4 w-4 text-sky-700" />
              {fotoFile ? fotoFile.name : "Foto do pneu (opcional)"}
              <input ref={fotoInputRef} type="file" accept="image/*" className="hidden" onChange={(e) => setFotoFile(e.target.files?.[0] ?? null)} />
            </label>
            <button type="submit" className="rounded-md bg-sky-600 px-4 py-2 text-sm font-bold text-white hover:bg-sky-700">
              <Plus className="mr-2 inline h-4 w-4" /> Salvar pneu
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
