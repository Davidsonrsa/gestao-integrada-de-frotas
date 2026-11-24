import { test } from "node:test";
import assert from "node:assert";
import { corRecapagem } from "./pneus";
test("novo é preto", () => assert.equal(corRecapagem(0).label, "Novo"));
test("2 recapagens amarelo", () => assert.equal(corRecapagem(2).label, "2 recapagens"));
test("mais de 4 cinza", () => assert.equal(corRecapagem(7).label, "+ de 4"));
import { layoutPneus, POSICOES_CAMINHAO, POSICOES_CARRO, POSICOES_EIXOS } from "./pneus";
test("RE tem 4 pneus", () => assert.equal(layoutPneus("RE-30").total, 4));
test("RE sem estepe", () => assert.equal(layoutPneus("re 21").estepe, false));
test("caminhão tem 3 eixos", () => assert.equal(layoutPneus("CB-01").eixos.length, 3));
test("RE usa desenho da retroescavadeira", () => assert.equal(layoutPneus("RE-21").tipo, "re"));
test("caminhão usa desenho do caminhão", () => assert.equal(layoutPneus("CB-01").tipo, "caminhao"));
test("carro VC usa desenho do carro", () => assert.equal(layoutPneus("VC-01").tipo, "carro"));
test("carro HILUX usa desenho do carro", () => assert.equal(layoutPneus("HILUX 02").tipo, "carro"));
test("CM é caminhão", () => assert.equal(layoutPneus("CM-12").tipo, "caminhao"));
test("carro tem 4 pneus + estepe", () => {
  const l = layoutPneus("VC-01");
  assert.equal(l.total, 5);
  assert.equal(l.estepe, true);
  assert.equal(l.eixos.length, 2);
});
test("desenho do carro tem 4 rodas + estepe", () => {
  assert.deepEqual(
    POSICOES_CARRO.map((r) => r.pos).sort(),
    ["1D", "1E", "2D", "2E", "ESTEPE"].sort(),
  );
});
test("áreas clicáveis do carro ficam dentro do desenho", () => {
  for (const r of POSICOES_CARRO) {
    assert.ok(r.x - r.w / 2 >= 0, `${r.pos} sai pela esquerda`);
    assert.ok(r.x + r.w / 2 <= 100, `${r.pos} sai pela direita`);
    assert.ok(r.y - r.h / 2 >= 0 && r.y + r.h / 2 <= 100, `${r.pos} sai na vertical`);
  }
});
test("desenho do caminhão tem as 10 posições dos eixos", () => {
  const doDesenho = POSICOES_CAMINHAO.map((r) => r.pos).sort();
  const dosEixos = POSICOES_EIXOS.flatMap((e) => [...e.esquerda, ...e.direita]).sort();
  assert.deepEqual(doDesenho, dosEixos);
});
test("áreas clicáveis do caminhão ficam dentro do desenho", () => {
  for (const r of POSICOES_CAMINHAO) {
    assert.ok(r.x - r.w / 2 >= 0, `${r.pos} sai pela esquerda`);
    assert.ok(r.x + r.w / 2 <= 100, `${r.pos} sai pela direita`);
    assert.ok(r.y - r.h / 2 >= 0 && r.y + r.h / 2 <= 100, `${r.pos} sai na vertical`);
  }
});
