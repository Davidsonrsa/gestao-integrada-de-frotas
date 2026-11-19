import { test } from "node:test";
import assert from "node:assert";
import { corRecapagem } from "./pneus";
test("novo é preto", () => assert.equal(corRecapagem(0).label, "Novo"));
test("2 recapagens amarelo", () => assert.equal(corRecapagem(2).label, "2 recapagens"));
test("mais de 4 cinza", () => assert.equal(corRecapagem(7).label, "+ de 4"));
