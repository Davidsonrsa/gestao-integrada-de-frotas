import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";
import { matToEmail } from "@/lib/mat";

type AdminCheckContext = {
  supabase: {
    from: (table: string) => any;
  };
  userId: string;
};

const PRIMARY_ADMIN_EMAIL = "mat-001@sphjhm.app";

async function assertPrimaryAdmin(context: AdminCheckContext) {
  const { data: profile, error } = await context.supabase
    .from("profiles")
    .select("email")
    .eq("id", context.userId)
    .maybeSingle();
  if (error || profile?.email?.toLowerCase() !== PRIMARY_ADMIN_EMAIL) {
    throw new Error("Acesso negado: somente o administrador MAT 0001.");
  }
}

const createUserSchema = z.object({
  matricula: z.string().min(1).max(40),
  password: z.string().min(8),
  fullName: z.string().min(1),
  phone: z.string().optional().nullable(),
});

export const adminCreateUser = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) => createUserSchema.parse(data))
  .handler(async ({ data, context }) => {
    await assertPrimaryAdmin(context);

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

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
    if (data.phone) {
      await supabaseAdmin.from("profiles").update({ phone: data.phone }).eq("id", newId);
    }
    return { id: newId };
  });

export const adminListUsers = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertPrimaryAdmin(context);

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: profiles, error } = await supabaseAdmin
      .from("profiles")
      .select("id, full_name, email, phone, created_at")
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);

    const { data: roles } = await supabaseAdmin.from("user_roles").select("user_id, role");

    return (profiles ?? []).map((p) => ({
      ...p,
      isAdmin: roles?.some((r) => r.user_id === p.id && r.role === "admin") ?? false,
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
    await assertPrimaryAdmin(context);

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
    await assertPrimaryAdmin(context);
    if (data.userId === context.userId) throw new Error("Você não pode excluir a si mesmo.");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin.auth.admin.deleteUser(data.userId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
