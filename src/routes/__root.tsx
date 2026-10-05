import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  Outlet,
  Link,
  createRootRouteWithContext,
  useRouter,
  useRouterState,
  HeadContent,
  Scripts,
} from "@tanstack/react-router";
import { useEffect, type ReactNode } from "react";
import { Clock } from "lucide-react";

import appCss from "../styles.css?url";
import { reportLovableError } from "../lib/lovable-error-reporting";
import { Toaster } from "@/components/ui/sonner";
import { supabase } from "@/integrations/supabase/client";

function NotFoundComponent() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-100 px-4 text-slate-900">
      <div className="max-w-md text-center">
        <h1 className="text-7xl font-bold text-foreground">404</h1>

        <h2 className="mt-4 text-xl font-semibold">Página não encontrada</h2>

        <div className="mt-6">
          <Link
            to="/"
            className="inline-flex rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
          >
            Início
          </Link>
        </div>
      </div>
    </div>
  );
}

function ErrorComponent({ error, reset }: { error: Error; reset: () => void }) {
  const router = useRouter();

  useEffect(() => {
    reportLovableError(error, {
      boundary: "tanstack_root_error_component",
    });
  }, [error]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-100 px-4 text-slate-900">
      <div className="max-w-md text-center">
        <h1 className="text-xl font-semibold">Algo deu errado</h1>

        <p className="mt-2 text-sm text-muted-foreground">{error.message}</p>

        <div className="mt-6 flex flex-wrap justify-center gap-2">
          <button
            onClick={() => {
              router.invalidate();
              reset();
            }}
            className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
          >
            Tentar novamente
          </button>

          <Link
            to="/"
            className="rounded-md border border-input bg-background px-4 py-2 text-sm font-medium hover:bg-accent"
          >
            Início
          </Link>
        </div>
      </div>
    </div>
  );
}

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  head: () => ({
    meta: [
      {
        charSet: "utf-8",
      },
      {
        name: "viewport",
        content: "width=device-width, initial-scale=1, viewport-fit=cover",
      },
      {
        name: "theme-color",
        content: "#0f1f3d",
      },
      {
        title: "GIF - Gestão Integrada de Frotas",
      },
      {
        name: "description",
        content:
          "Aplicativo para gestão integrada de frotas, manutenção, locações, seguros e controle de custos.",
      },
      {
        name: "apple-mobile-web-app-capable",
        content: "yes",
      },
      {
        name: "apple-mobile-web-app-status-bar-style",
        content: "black-translucent",
      },
      {
        name: "apple-mobile-web-app-title",
        content: "GIF Frotas",
      },
      {
        name: "mobile-web-app-capable",
        content: "yes",
      },
      {
        property: "og:title",
        content: "GIF - Gestão Integrada de Frotas",
      },
      {
        name: "twitter:title",
        content: "GIF - Gestão Integrada de Frotas",
      },
      {
        property: "og:description",
        content:
          "Aplicativo para gestão integrada de frotas, manutenção, locações, seguros e controle de custos.",
      },
      {
        name: "twitter:description",
        content:
          "Aplicativo para gestão integrada de frotas, manutenção, locações, seguros e controle de custos.",
      },
      {
        property: "og:image",
        content:
          "https://pub-bb2e103a32db4e198524a2e9ed8f35b4.r2.dev/1cef1bbc-4a29-468a-90a0-6daba65889e8/id-preview-c8ce4fea--6949c1d8-ff67-4d89-89a3-5e769ed8174f.lovable.app-1781633744480.png",
      },
      {
        name: "twitter:image",
        content:
          "https://pub-bb2e103a32db4e198524a2e9ed8f35b4.r2.dev/1cef1bbc-4a29-468a-90a0-6daba65889e8/id-preview-c8ce4fea--6949c1d8-ff67-4d89-89a3-5e769ed8174f.lovable.app-1781633744480.png",
      },
      {
        name: "twitter:card",
        content: "summary_large_image",
      },
      {
        property: "og:type",
        content: "website",
      },
    ],

    links: [
      {
        rel: "stylesheet",
        href: appCss,
      },
      {
        rel: "manifest",
        href: "/manifest.webmanifest",
      },
      {
        rel: "icon",
        type: "image/png",
        href: "/icon-512.png",
      },
      {
        rel: "apple-touch-icon",
        href: "/icon-512.png",
      },
    ],
  }),

  shellComponent: RootShell,

  component: RootComponent,

  notFoundComponent: NotFoundComponent,

});

function RootShell({ children }: { children: ReactNode }) {
  return (
    <html lang="pt-BR">
      <head>
        <HeadContent />
      </head>

      <body className="min-h-screen bg-gray-100 text-gray-900 antialiased">
        {children}

        <Scripts />
      </body>
    </html>
  );
}

function RootComponent() {
  const { queryClient } = Route.useRouteContext();

  const router = useRouter();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const hideNav = pathname === "/" || pathname.startsWith("/auth");

  useEffect(() => {
    const { data: sub } = supabase.auth.onAuthStateChange((event) => {
      if (event !== "SIGNED_IN" && event !== "SIGNED_OUT" && event !== "USER_UPDATED") {
        return;
      }

      router.invalidate();

      if (event !== "SIGNED_OUT") {
        queryClient.invalidateQueries();
      }
    });

    return () => {
      sub.subscription.unsubscribe();
    };
  }, [router, queryClient]);

  return (
    <QueryClientProvider client={queryClient}>
      <div className="min-h-screen bg-gray-100 text-gray-900 antialiased">
        {/* Menu principal integrado no estilo do topo */}
        {!hideNav && (
          <nav className="flex items-center gap-2 bg-[#f97316] px-3 py-2 text-white shadow-sm overflow-x-auto">
            <Link
              to="/medicoes"
              className="flex shrink-0 items-center gap-1.5 rounded px-3 py-1.5 text-sm font-medium hover:bg-black/10 transition-colors"
            >
              <Clock size={16} />
              Medições
            </Link>
          </nav>
        )}

        {/* Conteúdo das páginas */}
        <Outlet />
      </div>

      <Toaster richColors position="top-center" />
    </QueryClientProvider>
  );
}
