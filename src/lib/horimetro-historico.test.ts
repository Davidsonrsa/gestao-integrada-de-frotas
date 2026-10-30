import { describe, test } from "node:test";
import { strict as assert } from "node:assert";
import { filtrarHistoricoHorimetro, type RegistroHorimetro } from "./horimetro-historico";

const registros: RegistroHorimetro[] = [
  { id: "1", equipamento_numero: "RE-30", equipamento_cl: "05", operador_id: "op-1", operador_nome: "João", horimetro_anterior: 100, horimetro_atual: 101, data_horimetro: "2026-10-29", registrado_em: "2026-10-30T01:30:00Z", endereco: "Mafra" },
  { id: "2", equipamento_numero: "RE-40", equipamento_cl: "05", operador_id: "op-2", operador_nome: "Pedro", horimetro_anterior: 200, horimetro_atual: 201, data_horimetro: "2026-10-30", registrado_em: "2026-10-30T10:27:00Z", endereco: null },
];
const vazio = { operador: "", equipamento: "", inicio: "", fim: "" };
describe("histórico dos horímetros", () => {
  test("consulta somente o operador selecionado", () => {
    assert.deepEqual(filtrarHistoricoHorimetro(registros, { ...vazio, operador: "op-1" }).map((r) => r.id), ["1"]);
  });
  test("consulta somente o equipamento selecionado", () => {
    assert.deepEqual(filtrarHistoricoHorimetro(registros, { ...vazio, equipamento: "RE-40" }).map((r) => r.id), ["2"]);
  });
  test("aplica período inclusivo no horário de Brasília", () => {
    assert.deepEqual(filtrarHistoricoHorimetro(registros, { ...vazio, inicio: "2026-10-29", fim: "2026-10-29" }).map((r) => r.id), ["1"]);
    assert.deepEqual(filtrarHistoricoHorimetro(registros, { ...vazio, inicio: "2026-10-30", fim: "2026-10-30" }).map((r) => r.id), ["2"]);
  });
});