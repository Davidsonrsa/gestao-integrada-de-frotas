import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";
import { matToEmail } from "@/lib/mat";

type AdminCheckContext = { userId: string };

async function assertAdmin(context: AdminCheckContext) {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data: roles, error } = await supabaseAdmin
    .from("user_roles")
    .select("role")
    .eq("user_id", context.userId);
  if (error) throw new Error(`Não foi possível validar as permissões: ${error.message}`);
  if (!roles?.some((role) => role.role === "admin")) {
    throw new Error("Acesso negado: somente administradores podem gerenciar usuários.");
  }
}

const createUserSchema = z
  .object({
    matricula: z.string().min(1).max(40),
    password: z.string().min(8),
    fullName: z.string().min(1),
    phone: z.string().optional().nullable(),
    role: z.enum(["colaborador", "operador"]).default("colaborador"),
    equipamentoId: z.string().uuid().nullable().optional(),
  })
  .superRefine((data, ctx) => {
    if (data.role === "operador" && !data.equipamentoId) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Operadores precisam de um equipamento exclusivo.",
        path: ["equipamentoId"],
      });
    }
  });

export const adminCreateUser = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) => createUserSchema.parse(data))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    if (data.role === "operador" && data.equipamentoId) {
      const { data: existingAssignment, error: assignmentError } = await supabaseAdmin
        .from("operador_equipamentos")
        .select("user_id")
        .eq("equipamento_id", data.equipamentoId)
        .maybeSingle();
      if (assignmentError) throw new Error(assignmentError.message);
      if (existingAssignment) {
        throw new Error("Este equipamento já está vinculado a outro operador.");
      }
    }

    const email = matToEmail(data.matricula);
    const { data: created, error } = await supabaseAdmin.auth.admin.createUser({
      email,
      password: data.password,
      email_confirm: true,
      user_metadata: {
        full_name: data.fullName,
        phone: data.phone ?? "",
        matricula: data.matricula.trim().toUpperCase(),
      },
    });
    if (error) throw new Error(error.message);
    const newId = created.user?.id;
    if (!newId) throw new Error("Não foi possível concluir o cadastro do usuário.");

    try {
      if (data.phone) {
        const { error: phoneError } = await supabaseAdmin
          .from("profiles")
          .update({ phone: data.phone })
          .eq("id", newId);
        if (phoneError) throw new Error(phoneError.message);
      }

      if (data.role === "operador" && data.equipamentoId) {
        const { error: removeDefaultRoleError } = await supabaseAdmin
          .from("user_roles")
          .delete()
          .eq("user_id", newId);
        if (removeDefaultRoleError) throw new Error(removeDefaultRoleError.message);

        const { error: roleError } = await supabaseAdmin
          .from("user_roles")
          .insert({ user_id: newId, role: "operador" });
        if (roleError) throw new Error(roleError.message);

        const { error: assignmentError } = await supabaseAdmin
          .from("operador_equipamentos")
          .insert({ user_id: newId, equipamento_id: data.equipamentoId });
        if (assignmentError) {
          if (assignmentError.code === "23505") {
            throw new Error("Este equipamento já está vinculado a outro operador.");
          }
          throw new Error(assignmentError.message);
        }
      }
    } catch (creationError) {
      const { error: rollbackError } = await supabaseAdmin.auth.admin.deleteUser(newId);
      if (rollbackError) {
        console.error("Falha ao reverter cadastro incompleto de usuário:", rollbackError);
        throw new Error(
          `O cadastro não foi concluído e a limpeza da conta também falhou: ${rollbackError.message}`,
        );
      }
      throw creationError;
    }

    return { id: newId };
  });

export const adminListUsers = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context);

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: profiles, error } = await supabaseAdmin
      .from("profiles")
      .select("id, full_name, email, phone, created_at")
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);

    const [
      { data: roles, error: rolesError },
      { data: assignments, error: assignmentsError },
      { data: equipamentos, error: equipamentosError },
    ] = await Promise.all([
      supabaseAdmin.from("user_roles").select("user_id, role"),
      supabaseAdmin.from("operador_equipamentos").select("user_id, equipamento_id"),
      supabaseAdmin.from("equipamentos").select("id, numero"),
    ]);
    if (rolesError) throw new Error(rolesError.message);
    if (assignmentsError) throw new Error(assignmentsError.message);
    if (equipamentosError) throw new Error(equipamentosError.message);

    const equipmentNumbers = new Map(
      (equipamentos ?? []).map((equipment) => [equipment.id, equipment.numero]),
    );

    return (profiles ?? []).map((p) => ({
      ...p,
      isAdmin: roles?.some((r) => r.user_id === p.id && r.role === "admin") ?? false,
      isOperator: roles?.some((r) => r.user_id === p.id && r.role === "operador") ?? false,
      equipmentNumber: (() => {
        const equipmentId = assignments?.find(
          (assignment) => assignment.user_id === p.id,
        )?.equipamento_id;
        return equipmentId ? (equipmentNumbers.get(equipmentId) ?? null) : null;
      })(),
    }));
  });

const updateUserSchema = z.object({
  userId: z.string().uuid(),
  fullName: z.string().min(1),
  phone: z.string().optional().nullable(),
  password: z.string().min(8).optional().nullable(),
});

export const adminUpdateUser = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) => updateUserSchema.parse(data))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { error: profileError } = await supabaseAdmin
      .from("profiles")
      .update({ full_name: data.fullName, phone: data.phone ?? null })
      .eq("id", data.userId);
    if (profileError) throw new Error(profileError.message);

    if (data.password) {
      const { error } = await supabaseAdmin.auth.admin.updateUserById(data.userId, {
        password: data.password,
      });
      if (error) throw new Error(error.message);
    }

    return { ok: true };
  });

export const adminDeleteUser = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) => z.object({ userId: z.string().uuid() }).parse(data))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    if (data.userId === context.userId) throw new Error("Você não pode excluir a si mesmo.");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin.auth.admin.deleteUser(data.userId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
