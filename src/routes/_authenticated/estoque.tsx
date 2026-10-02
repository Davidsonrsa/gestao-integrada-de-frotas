import { createFileRoute, Link, Outlet } from "@tanstack/react-router";
import {
  AlertTriangle,
  Archive,
  ArrowDownToLine,
  ArrowLeftRight,
  ArrowUpFromLine,
  BarChart3,
  Boxes,
  ClipboardList,
  Gauge,
  Package,
  Tag,
  Truck,
  Warehouse,
} from "lucide-react";

export const Route = createFileRoute("/_authenticated/estoque")({
  component: EstoqueLayout,
});

const navItems = [
  { to: "/estoque", label: "Dashboard", icon: Warehouse },
  { to: "/estoque/produtos", label: "Produtos", icon: Package },
  { to: "/estoque/entradas", label: "Entradas", icon: ArrowDownToLine },
  { to: "/estoque/saidas", label: "Saídas", icon: ArrowUpFromLine },
  { to: "/estoque/transferencias", label: "Transferências", icon: ArrowLeftRight },
  { to: "/estoque/movimentacoes", label: "Movimentações", icon: ClipboardList },
  { to: "/estoque/inventario", label: "Inventário", icon: Archive },
  { to: "/estoque/alertas", label: "Alertas", icon: AlertTriangle },
  { to: "/estoque/relatorios", label: "Relatórios", icon: BarChart3 },
  { to: "/estoque/pneus", label: "Pneus", icon: Gauge },
  { to: "/estoque/fornecedores", label: "Fornecedores", icon: Truck },
  { to: "/estoque/categorias", label: "Categorias", icon: Tag },
];

function EstoqueLayout() {
  return (
    <div className="mx-auto max-w-7xl px-4 pb-10 pt-6">
      <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="flex flex-col gap-4 border-b border-slate-200 px-5 py-4 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-slate-500">Módulo</p>
            <h1 className="mt-1 text-2xl font-black text-slate-900">Estoque</h1>
          </div>
          <div className="flex items-center gap-2 rounded-lg bg-emerald-50 px-3 py-2 text-sm font-semibold text-emerald-700">
            <Boxes className="h-4 w-4" />
            Controle integrado
          </div>
        </div>

        <nav className="flex flex-wrap gap-2 px-4 py-4">
          {navItems.map(({ to, label, icon: Icon }) => (
            <Link
              key={to}
              to={to}
              className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-medium text-slate-700 transition hover:border-sky-300 hover:bg-sky-50 hover:text-sky-700 [&.active]:border-sky-500 [&.active]:bg-sky-600 [&.active]:text-white"
            >
              <Icon className="h-4 w-4" />
              {label}
            </Link>
          ))}
        </nav>
      </div>

      <div className="mt-6">
        <Outlet />
      </div>
    </div>
  );
}
