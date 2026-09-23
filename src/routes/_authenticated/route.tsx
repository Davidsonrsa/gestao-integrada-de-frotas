import { createFileRoute, redirect, Link, Outlet, useNavigate } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Truck, DollarSign, FileText, Settings, LogOut, ClipboardList, Clock } from "lucide-react";

export const Route = createFileRoute("/_authenticated")({
  ssr: false,
  beforeLoad: async () => {
    // getSession lê a sessão local (sem round-trip de rede a cada troca de aba)
    const { data } = await supabase.auth.getSession();
    if (!data.session?.user) throw redirect({ to: "/auth" });
    return { user: data.session.user };
  },
  component: AuthenticatedLayout,
});

function AuthenticatedLayout() {
  const { isAdmin, fullName } = useAuth();
  const navigate = useNavigate();

  async function handleLogout() {
    await supabase.auth.signOut();
    navigate({ to: "/auth" });
  }

  const navItems = [
    { to: "/equipamentos", label: "Frota", icon: Truck },
    { to: "/medicoes", label: "Medições", icon: Clock },
    { to: "/custos", label: "Custos", icon: DollarSign },
    { to: "/cotacoes", label: "Cotações", icon: ClipboardList },
    { to: "/notas-fiscais", label: "Notas Fiscais", icon: FileText },
    { to: "/admin", label: "Admin", icon: Settings },
  ];

  const visibleNavItems = navItems.filter(
    ({ to }) =>
      isAdmin || !["/medicoes", "/custos", "/cotacoes", "/notas-fiscais", "/admin"].includes(to),
  );

  return (
    <div className="min-h-screen bg-slate-50">
      <header
        className="fixed top-0 left-0 right-0 z-50 shadow-md w-full"
        style={{ backgroundColor: "#33859c" }}
      >
        <div
          className="max-w-7xl mx-auto px-3 py-2 md:px-4 md:py-2.5 w-full"
          style={{ backgroundColor: "#33859c" }}
        >
          <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-2 md:flex md:gap-4">
            <div className="flex min-w-0 items-center gap-2.5 md:gap-3.5 md:shrink-0">
              <img
                src="/logo%20SPX%20MAFRA%20JHM.png"
                alt="SPH JHM Mafra"
                className="h-10 w-10 md:h-12 md:w-12 rounded-lg object-contain shadow-sm shrink-0 bg-white opacity-100 !opacity-100"
              />
              <div className="flex min-w-0 flex-col justify-center">
                <h1 className="truncate text-xs md:text-base font-extrabold tracking-tight text-black leading-tight">
                  GIF - Gestão Integrada de Frotas
                </h1>
                <div className="text-[10px] md:text-[11px] text-black/90 flex min-w-0 items-center gap-1.5 mt-0.5">
                  <span className="truncate font-bold text-black">{fullName || "Usuário"}</span>
                  <Badge
                    variant="outline"
                    className="shrink-0 text-[9px] border-black/40 text-black bg-white/40 px-1 py-0 font-bold"
                  >
                    {isAdmin ? "Admin" : "Colaborador"}
                  </Badge>
                </div>
              </div>
            </div>

            <nav className="hidden md:flex flex-1 items-center justify-end gap-1.5 overflow-x-auto py-1 bg-transparent">
              {visibleNavItems.map(({ to, label, icon: Icon }) => (
                <Link
                  key={to}
                  to={to}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-bold whitespace-nowrap text-black bg-transparent hover:bg-black/10 transition-colors [&.active]:bg-black/25 [&.active]:text-black [&.active]:shadow-none"
                >
                  <Icon className="w-4 h-4 text-black" />
                  <span>{label}</span>
                </Link>
              ))}
            </nav>

            <Button
              size="sm"
              variant="ghost"
              onClick={handleLogout}
              className="text-white hover:bg-white/20 gap-1.5 text-xs h-8 px-2.5 font-bold"
            >
              <LogOut className="w-4 h-4 text-white" />
              <span className="hidden sm:inline">Sair</span>
            </Button>
          </div>

          <nav className="mt-2 grid grid-cols-3 gap-1 md:hidden" aria-label="Navegação principal">
            {visibleNavItems.map(({ to, label, icon: Icon }) => (
              <Link
                key={to}
                to={to}
                className="flex h-9 min-w-0 items-center justify-center gap-1 rounded-md px-1 text-[10px] font-bold leading-tight text-black transition-colors hover:bg-black/10 [&.active]:bg-black/25"
              >
                <Icon className="h-3.5 w-3.5 shrink-0 text-black" />
                <span className="min-w-0 text-center">{label}</span>
              </Link>
            ))}
          </nav>
        </div>
      </header>

      <main className={isAdmin ? "pt-36 md:pt-20" : "pt-24 md:pt-20"}>
        <Outlet />
      </main>
    </div>
  );
}
