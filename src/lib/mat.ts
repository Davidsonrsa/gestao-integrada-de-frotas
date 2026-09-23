const DOMAIN = "sphjhm.app";

export function normalizeMat(mat: string): string {
  return mat.trim().toLowerCase().replace(/\s+/g, "");
}

export function matToEmail(mat: string): string {
  const m = normalizeMat(mat);

  // O administrador principal usa MAT 0001 na interface, mantendo o cadastro legado MAT 001.
  if (m === "0001") {
    return "mat-001@" + DOMAIN;
  }

  if (m.startsWith("mat-")) {
    return m + "@" + DOMAIN;
  }

  return "mat-" + m + "@" + DOMAIN;
}

export function emailToMat(email: string | null | undefined): string {
  if (!email) return "";

  const m = email.match(/^mat-([a-z0-9]+)@/i);

  if (!m) return email;
  return m[1] === "001" ? "0001" : m[1].toUpperCase();
}
