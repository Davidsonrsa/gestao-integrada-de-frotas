import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

import {
  adminCreateUser,
  adminListUsers,
  adminDeleteUser,
  adminUpdateUser,
} from "@/lib/admin.functions";
import { toast } from "sonner";
import { UserPlus, Plus, Trash2, ShieldCheck, User, Pencil, Save, X } from "lucide-react";
import { ImportEquipamentos } from "@/components/ImportEquipamentos";
import { emailToMat } from "@/lib/mat";
import { requireAdmin } from "@/lib/route-guards";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

export const Route = createFileRoute("/_authenticated/admin")({
  beforeLoad: requireAdmin,
  component: AdminPage,
});

function AdminPage() {
  const { isAdmin, session } = useAuth();
  const canManageUsers = session?.user.email?.toLowerCase() === "mat-001@sphjhm.app";
  if (!isAdmin) {
    return (
      <div className="p-6 text-center text-sm text-muted-foreground">
        Acesso restrito a administradores.
      </div>
    );
  }
  return (
    <div className="px-3 py-3 md:px-6 md:py-6 max-w-md md:max-w-5xl mx-auto w-full">
      <Tabs defaultValue="equipamentos">
        <TabsList className={`grid w-full mb-3 ${canManageUsers ? "grid-cols-2" : "grid-cols-1"}`}>
          <TabsTrigger value="equipamentos">Equipamentos</TabsTrigger>
          {canManageUsers && <TabsTrigger value="usuarios">Usuários</TabsTrigger>}
        </TabsList>
        <TabsContent value="equipamentos" className="space-y-3">
          <ImportEquipamentos />
          <NewEquipamento />
        </TabsContent>
        {canManageUsers && (
          <TabsContent value="usuarios">
            <Usuarios />
          </TabsContent>
        )}
      </Tabs>
    </div>
  );
}

function NewEquipamento() {
  const qc = useQueryClient();
  const [f, setF] = useState({
    numero: "",
    identificacao: "",
    placa: "",
    ano: "",
    localizacao: "",
    cl: "",
  });

  const create = useMutation({
    mutationFn: async () => {
      if (!f.numero.trim()) throw new Error("Nº é obrigatório");
      const { error } = await supabase.from("equipamentos").insert({
        numero: f.numero.trim(),
        identificacao: f.identificacao || null,
        placa: f.placa || null,
        ano: f.ano || null,
        localizacao: f.localizacao || null,
        cl: f.cl || null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Equipamento criado");
      setF({ numero: "", identificacao: "", placa: "", ano: "", localizacao: "", cl: "" });
      qc.invalidateQueries({ queryKey: ["equipamentos"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <Card className="p-4 space-y-3">
      <h3 className="font-semibold text-sm flex items-center gap-2">
        <Plus className="w-4 h-4 text-blue-600" /> Novo equipamento
      </h3>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label className="text-xs">Nº *</Label>
          <Input
            value={f.numero}
            onChange={(e) => setF({ ...f, numero: e.target.value })}
            placeholder="RE-14"
          />
        </div>
        <div>
          <Label className="text-xs">Classe</Label>
          <Input value={f.cl} onChange={(e) => setF({ ...f, cl: e.target.value })} />
        </div>
      </div>
      <div>
        <Label className="text-xs">Identificação</Label>
        <Input
          value={f.identificacao}
          onChange={(e) => setF({ ...f, identificacao: e.target.value })}
        />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label className="text-xs">Placa</Label>
          <Input value={f.placa} onChange={(e) => setF({ ...f, placa: e.target.value })} />
        </div>
        <div>
          <Label className="text-xs">Ano</Label>
          <Input value={f.ano} onChange={(e) => setF({ ...f, ano: e.target.value })} />
        </div>
      </div>
      <div>
        <Label className="text-xs">Localização</Label>
        <Input
          value={f.localizacao}
          onChange={(e) => setF({ ...f, localizacao: e.target.value })}
        />
      </div>

      <div className="pt-2">
        <Button
          type="button"
          onClick={() => create.mutate()}
          disabled={create.isPending}
          className="w-full font-semibold bg-blue-700 text-black hover:bg-blue-600"
        >
          {create.isPending ? "Criando..." : "Criar equipamento"}
        </Button>
      </div>
      <p className="text-[11px] text-muted-foreground">
        Os demais campos podem ser preenchidos depois na tela do equipamento.
      </p>
    </Card>
  );
}

function Usuarios() {
  const list = useServerFn(adminListUsers);
  const create = useServerFn(adminCreateUser);
  const del = useServerFn(adminDeleteUser);
  const update = useServerFn(adminUpdateUser);
  const qc = useQueryClient();

  const {
    data: users,
    isLoading,
    error: listError,
  } = useQuery({ queryKey: ["admin-users"], queryFn: () => list() });
  const { userId } = useAuth();

  const [editId, setEditId] = useState<string | null>(null);
  const [edit, setEdit] = useState({
    fullName: "",
    phone: "",
    password: "",
  });

  const u = useMutation({
    mutationFn: () => {
      if (!editId) throw new Error("Selecione um usuário para editar.");
      return update({
        data: {
          userId: editId,
          fullName: edit.fullName,
          phone: edit.phone || null,
          password: edit.password ? edit.password : null,
        },
      });
    },
    onSuccess: () => {
      toast.success("Usuário atualizado");
      setEditId(null);
      qc.invalidateQueries({ queryKey: ["admin-users"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });


  const [f, setF] = useState({
    matricula: "",
    password: "",
    fullName: "",
    phone: "",
  });

  const m = useMutation({
    mutationFn: () =>
      create({
        data: {
          matricula: f.matricula,
          password: f.password,
          fullName: f.fullName,
          phone: f.phone || null,
        },
      }),
    onSuccess: () => {
      toast.success("Colaborador criado com sucesso");

      setF({
        matricula: "",
        password: "",
        fullName: "",
        phone: "",
      });

      qc.invalidateQueries({ queryKey: ["admin-users"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const d = useMutation({
    mutationFn: (userId: string) => del({ data: { userId } }),
    onSuccess: () => {
      toast.success("Usuário removido");
      qc.invalidateQueries({ queryKey: ["admin-users"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="space-y-3">
      <Card className="p-4 space-y-3">
        <h3 className="font-semibold text-sm flex items-center gap-2">
          <UserPlus className="w-4 h-4 text-blue-600" /> Cadastrar usuário
        </h3>
        <div>
          <Label className="text-xs">Nome completo *</Label>
          <Input value={f.fullName} onChange={(e) => setF({ ...f, fullName: e.target.value })} />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label className="text-xs">Matrícula *</Label>
            <Input
              value={f.matricula}
              onChange={(e) => setF({ ...f, matricula: e.target.value })}
              placeholder="Ex: 12345"
              className="uppercase"
            />
          </div>
          <div>
            <Label className="text-xs">Telefone</Label>
            <Input value={f.phone} onChange={(e) => setF({ ...f, phone: e.target.value })} />
          </div>
        </div>
        <div>
          <Label className="text-xs">Senha inicial *</Label>
          <Input
            type="text"
            value={f.password}
            onChange={(e) => setF({ ...f, password: e.target.value })}
            placeholder="mín. 8 caracteres"
          />
        </div>
        <div className="pt-2">
          <Button
            type="button"
            onClick={() => m.mutate()}
            disabled={m.isPending}
            className="w-full font-semibold"
          >
            {m.isPending ? "Criando..." : "Criar colaborador"}
          </Button>
        </div>

        <p className="text-[11px] text-muted-foreground">
          O colaborador fará login com a <b>matrícula</b> e a senha definida aqui.
        </p>
      </Card>

      <Card className="p-4">
        <h3 className="font-semibold text-sm mb-3">Usuários cadastrados</h3>
        {isLoading && <p className="text-xs text-muted-foreground">Carregando...</p>}
        {listError && (
          <p className="text-xs text-destructive">
            {listError instanceof Error ? listError.message : "Não foi possível carregar a lista."}
          </p>
        )}
        {!isLoading && !listError && (users?.length ?? 0) === 0 && (
          <p className="text-xs text-muted-foreground">Nenhum usuário cadastrado ainda.</p>
        )}
        <ul className="divide-y divide-border">
          {users?.map((usr) => (
            <li key={usr.id} className="py-2.5">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center">
                  {usr.isAdmin ? (
                    <ShieldCheck className="w-4 h-4 text-accent" />
                  ) : (
                    <User className="w-4 h-4 text-muted-foreground" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">
                    {usr.full_name || emailToMat(usr.email)}
                  </p>
                  <p className="text-[11px] text-muted-foreground truncate">
                    MAT {emailToMat(usr.email)}
                    {usr.phone ? ` • ${usr.phone}` : ""}
                  </p>
                </div>
                <Badge variant={usr.isAdmin ? "default" : "secondary"} className="text-[10px]">
                  {usr.isAdmin ? "Admin" : "Colab"}
                </Badge>
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-8 w-8"
                  onClick={() => {
                    if (editId === usr.id) {
                      setEditId(null);
                      return;
                    }
                    setEditId(usr.id);
                    setEdit({
                      fullName: usr.full_name || "",
                      phone: usr.phone || "",
                      password: "",
                    });
                  }}
                >
                  <Pencil className="w-4 h-4 text-sky-600" />
                </Button>
                {usr.id !== userId && emailToMat(usr.email) !== "0001" && (
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button size="icon" variant="ghost" className="h-8 w-8">
                        <Trash2 className="w-4 h-4 text-destructive" />
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>
                          Remover {usr.full_name || emailToMat(usr.email)}?
                        </AlertDialogTitle>
                        <AlertDialogDescription>
                          O usuário perderá acesso ao aplicativo.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancelar</AlertDialogCancel>
                        <AlertDialogAction onClick={() => d.mutate(usr.id)}>
                          Remover
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                )}
              </div>

              {editId === usr.id && (
                <div className="mt-3 space-y-3 rounded-md border border-border bg-muted/40 p-3">
                  <div>
                    <Label className="text-xs">Nome completo</Label>
                    <Input
                      value={edit.fullName}
                      onChange={(e) => setEdit({ ...edit, fullName: e.target.value })}
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label className="text-xs">Telefone</Label>
                      <Input
                        value={edit.phone}
                        onChange={(e) => setEdit({ ...edit, phone: e.target.value })}
                      />
                    </div>
                    <div>
                      <Label className="text-xs">Nova senha (opcional)</Label>
                      <Input
                        type="text"
                        value={edit.password}
                        onChange={(e) => setEdit({ ...edit, password: e.target.value })}
                        placeholder="mín. 8 caracteres"
                      />
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      type="button"
                      onClick={() => u.mutate()}
                      disabled={u.isPending || !edit.fullName.trim()}
                      className="gap-2"
                    >
                      <Save className="w-4 h-4" />
                      {u.isPending ? "Salvando..." : "Salvar"}
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setEditId(null)}
                      disabled={u.isPending}
                      className="gap-2"
                    >
                      <X className="w-4 h-4" />
                      Cancelar
                    </Button>
                  </div>
                </div>
              )}
            </li>
          ))}
        </ul>
      </Card>
    </div>
  );
}
