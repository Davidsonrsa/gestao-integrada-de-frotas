import { describe, test } from "node:test";
import { strict as assert } from "node:assert";
import { solicitarLocalizacaoHorimetro } from "./horimetro-localizacao";

describe("solicitar localização do operador", () => {
  test("pede uma posição nova a cada lançamento e usa coordenadas se o endereço falhar", async () => {
    const original = Object.getOwnPropertyDescriptor(globalThis, "navigator");
    const fetchOriginal = globalThis.fetch;
    let pedidos = 0;
    Object.defineProperty(globalThis, "navigator", { configurable: true, value: { geolocation: {
      getCurrentPosition: (sucesso: PositionCallback, _erro: PositionErrorCallback, opcoes: PositionOptions) => {
        pedidos++;
        assert.equal(opcoes.maximumAge, 0);
        sucesso({ coords: { latitude: -26.115, longitude: -49.805 } } as GeolocationPosition);
      },
    } } });
    globalThis.fetch = async () => { throw new Error("Sem endereço"); };
    try {
      assert.deepEqual(await solicitarLocalizacaoHorimetro(), { endereco: "-26.11500, -49.80500", indisponivel: false });
      await solicitarLocalizacaoHorimetro();
      assert.equal(pedidos, 2);
    } finally {
      if (original) Object.defineProperty(globalThis, "navigator", original);
      else Reflect.deleteProperty(globalThis, "navigator");
      globalThis.fetch = fetchOriginal;
    }
  });
  test("identifica permissão negada sem inventar endereço", async () => {
    const original = Object.getOwnPropertyDescriptor(globalThis, "navigator");
    Object.defineProperty(globalThis, "navigator", { configurable: true, value: { geolocation: {
      getCurrentPosition: (_sucesso: PositionCallback, erro: PositionErrorCallback) => erro({ code: 1 } as GeolocationPositionError),
    } } });
    try {
      assert.deepEqual(await solicitarLocalizacaoHorimetro(), { endereco: null, indisponivel: true });
    } finally {
      if (original) Object.defineProperty(globalThis, "navigator", original);
      else Reflect.deleteProperty(globalThis, "navigator");
    }
  });
});