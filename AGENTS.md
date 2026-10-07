# Gear Sync Mobile

## Projeto

- Aplicação React 19 com Vite, TanStack Start/Router, TypeScript strict e Tailwind CSS v4.
- O frontend usa o alias `@/*` para `src/*`; preserve esse padrão nos imports.
- O backend e a persistência usam Supabase. Regras de acesso devem ser aplicadas no banco com RLS, não apenas ocultadas na interface.

## Comandos

```bash
bun install
bun run dev
bun run build
bun run build:dev
bun run lint
bun run format
```

Não há script de testes automatizados no `package.json`; para mudanças de comportamento, valide também os fluxos afetados manualmente e as policies no Supabase.

## Rotas

- Cada arquivo `.tsx` em `src/routes/` é uma rota TanStack file-based. Consulte [src/routes/README.md](src/routes/README.md) antes de criar ou mover rotas.
- Use `src/routes/__root.tsx` como shell raiz e preserve o `<Outlet />`.
- `src/routeTree.gen.ts` é gerado automaticamente; nunca edite esse arquivo manualmente.

## Supabase e segurança

- O cliente do navegador usa `VITE_SUPABASE_URL` e `VITE_SUPABASE_PUBLISHABLE_KEY`.
- Middleware e código server-side usam `SUPABASE_URL` e `SUPABASE_PUBLISHABLE_KEY`; nunca exponha chaves secretas em código cliente.
- Mantenha tipos do banco e arquivos marcados como gerados sincronizados com o schema; prefira migrations em `supabase/migrations/` para alterações de banco.
- Ao alterar autenticação, permissões ou dados sensíveis, verifique as policies RLS e os cenários documentados em [src/lib/security-checklist.ts](src/lib/security-checklist.ts).

## Convenções de implementação

- Reutilize componentes existentes em `src/components/ui/` e ícones de `lucide-react` antes de criar equivalentes.
- Preserve a separação entre componentes de UI, hooks, integrações Supabase e funções server-side em seus diretórios atuais.
- Mantenha textos voltados ao usuário em português do Brasil e preserve o comportamento responsivo do aplicativo móvel.
- Após mudanças TypeScript/React, rode `bun run lint` e `bun run build`; após mudanças de formatação, rode `bun run format` apenas quando necessário.

## Arquivos de referência

- [package.json](package.json): scripts e dependências.
- [src/router.tsx](src/router.tsx): criação do router e configuração do QueryClient.
- [src/routes/README.md](src/routes/README.md): convenções detalhadas de rotas.
- [src/integrations/supabase/client.ts](src/integrations/supabase/client.ts): cliente Supabase no browser/SSR.
- [vite.config.ts](vite.config.ts): configuração integrada do Vite/TanStack Start.
