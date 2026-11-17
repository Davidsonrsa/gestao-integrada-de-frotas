/** Espelha a permissão existente no banco; operadores continuam restritos ao horímetro principal. */
export function podeEditarImplemento(role: string | null): boolean {
  return role === "admin" || role === "colaborador";
}