import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Gestão Integrada de Frotas | Controle da Frota" },
      { name: "description", content: "Controle os equipamentos, revisões e cotações da frota." },
      { property: "og:title", content: "Gestão Integrada de Frotas | Controle da Frota" },
      { property: "og:description", content: "Equipamentos, revisões e cotações da frota em um só lugar." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  beforeLoad: () => {
    throw redirect({ to: "/equipamentos" });
  },
});
