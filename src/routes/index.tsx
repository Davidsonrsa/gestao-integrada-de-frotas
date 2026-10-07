import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/")({
  head: () => ({ meta: [
    { title: "Gestão Integrada de Frotas" },
    { name: "description", content: "Controle de equipamentos, manutenção e cotações da frota." },
    { property: "og:title", content: "Gestão Integrada de Frotas" },
    { property: "og:description", content: "Gestão dos equipamentos e documentos da frota." },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary" },
  ] }),
  beforeLoad: () => {
    throw redirect({ to: "/equipamentos" });
  },
});
