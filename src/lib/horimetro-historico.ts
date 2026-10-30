export type RegistroHorimetro = {
  id: string;
  equipamento_numero: string;
  equipamento_cl: string | null;
  operador_id: string;
  operador_nome: string;
  horimetro_anterior: number | null;
  horimetro_atual: number | null;
  data_horimetro: string | null;
  registrado_em: string;
  endereco: string | null;
};

export type FiltrosHistoricoHorimetro = {
  operador: string;
  equipamento: string;
  inicio: string;
  fim: string;
};

export function filtrarHistoricoHorimetro(
  registros: RegistroHorimetro[],
  filtros: FiltrosHistoricoHorimetro,
) {
  return registros.filter((r) => {
    const dia = new Date(r.registrado_em).toLocaleDateString("en-CA", {
      timeZone: "America/Sao_Paulo",
    });
    return (
      (!filtros.operador || r.operador_id === filtros.operador) &&
      (!filtros.equipamento || r.equipamento_numero === filtros.equipamento) &&
      (!filtros.inicio || dia >= filtros.inicio) &&
      (!filtros.fim || dia <= filtros.fim)
    );
  });
}

export function formatarHoraHistorico(valor: string) {
  return new Date(valor).toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo" });
}

export function formatarDataHistorico(valor: string | null) {
  return valor ? valor.split("-").reverse().join("/") : "—";
}

export function escaparHistorico(valor: unknown) {
  return String(valor ?? "—").replace(
    /[&<>"']/g,
    (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c] ?? c,
  );
}
