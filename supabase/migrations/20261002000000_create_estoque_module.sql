create extension if not exists pgcrypto;

create table if not exists public.estoque_categorias (
  id uuid primary key default gen_random_uuid(),
  nome text not null unique,
  descricao text,
  ativo boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.estoque_fornecedores (
  id uuid primary key default gen_random_uuid(),
  razao_social text not null,
  nome_fantasia text,
  cnpj text,
  telefone text,
  celular text,
  email text,
  endereco text,
  cidade text,
  estado text,
  observacoes text,
  ativo boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.estoque_localizacoes (
  id uuid primary key default gen_random_uuid(),
  nome text not null unique,
  ativo boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.estoque_produtos (
  id uuid primary key default gen_random_uuid(),
  codigo_interno text,
  codigo_fabricante text,
  nome text not null,
  descricao text,
  categoria_id uuid references public.estoque_categorias(id),
  marca text,
  modelo text,
  unidade text not null default 'UN',
  estoque_atual numeric(18,3) not null default 0,
  estoque_minimo numeric(18,3) default 0,
  estoque_maximo numeric(18,3) default 0,
  custo_medio numeric(18,2) default 0,
  ultima_compra date,
  localizacao_id uuid references public.estoque_localizacoes(id),
  fornecedor_principal_id uuid references public.estoque_fornecedores(id),
  ativo boolean not null default true,
  observacao text,
  status text not null default 'ESTOQUE NORMAL',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.estoque_entradas (
  id uuid primary key default gen_random_uuid(),
  data date not null,
  fornecedor_id uuid references public.estoque_fornecedores(id),
  numero_nf text,
  serie text,
  responsavel text,
  observacao text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.estoque_entrada_itens (
  id uuid primary key default gen_random_uuid(),
  entrada_id uuid not null references public.estoque_entradas(id) on delete cascade,
  produto_id uuid not null references public.estoque_produtos(id),
  quantidade numeric(18,3) not null default 0,
  unidade text not null default 'UN',
  valor_unitario numeric(18,2) not null default 0,
  desconto numeric(18,2) not null default 0,
  valor_total numeric(18,2) not null default 0,
  localizacao_id uuid references public.estoque_localizacoes(id)
);

create table if not exists public.estoque_saidas (
  id uuid primary key default gen_random_uuid(),
  data date not null,
  produto_id uuid not null references public.estoque_produtos(id),
  quantidade numeric(18,3) not null default 0,
  motivo text not null,
  responsavel text,
  equipamento_id uuid,
  horimetro text,
  manutencao_relacionada text,
  observacao text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.estoque_saida_itens (
  id uuid primary key default gen_random_uuid(),
  saida_id uuid not null references public.estoque_saidas(id) on delete cascade,
  produto_id uuid not null references public.estoque_produtos(id),
  quantidade numeric(18,3) not null default 0,
  unidade text not null default 'UN',
  valor_unitario numeric(18,2) not null default 0
);

create table if not exists public.estoque_movimentacoes (
  id uuid primary key default gen_random_uuid(),
  produto_id uuid not null references public.estoque_produtos(id),
  tipo text not null,
  quantidade numeric(18,3) not null default 0,
  estoque_anterior numeric(18,3) default 0,
  estoque_posterior numeric(18,3) default 0,
  valor_total numeric(18,2) default 0,
  equipamento_id uuid,
  responsavel text,
  documento text,
  observacao text,
  data_movimento date default current_date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.estoque_transferencias (
  id uuid primary key default gen_random_uuid(),
  produto_id uuid not null references public.estoque_produtos(id),
  quantidade numeric(18,3) not null default 0,
  origem_id uuid references public.estoque_localizacoes(id),
  destino_id uuid references public.estoque_localizacoes(id),
  responsavel text,
  data date not null,
  observacao text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.estoque_inventarios (
  id uuid primary key default gen_random_uuid(),
  produto_id uuid not null references public.estoque_produtos(id),
  data date not null,
  quantidade_anterior numeric(18,3) not null default 0,
  quantidade_nova numeric(18,3) not null default 0,
  diferenca numeric(18,3) not null default 0,
  motivo text,
  responsavel text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.estoque_inventario_itens (
  id uuid primary key default gen_random_uuid(),
  inventario_id uuid not null references public.estoque_inventarios(id) on delete cascade,
  produto_id uuid not null references public.estoque_produtos(id),
  sistema numeric(18,3) not null default 0,
  contagem_fisica numeric(18,3) not null default 0
);

create table if not exists public.estoque_pneus (
  id uuid primary key default gen_random_uuid(),
  codigo text not null unique,
  marca text,
  modelo text,
  medida text,
  codigo_serie text,
  dot text,
  tipo text,
  valor numeric(18,2) default 0,
  fornecedor_id uuid references public.estoque_fornecedores(id),
  data_compra date,
  estado text default 'EM ESTOQUE',
  status text default 'EM ESTOQUE',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.estoque_pneu_instalacoes (
  id uuid primary key default gen_random_uuid(),
  pneu_id uuid references public.estoque_pneus(id),
  equipamento_id uuid,
  posicao text,
  data_instalacao date,
  horimetro numeric(18,2),
  quilometragem numeric(18,2),
  responsavel text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.estoque_pneu_historico (
  id uuid primary key default gen_random_uuid(),
  pneu_id uuid references public.estoque_pneus(id),
  data_instalacao date,
  horimetro_inicial numeric(18,2),
  horimetro_atual numeric(18,2),
  kilometragem_inicial numeric(18,2),
  kilometragem_atual numeric(18,2),
  quantidade_recapagens integer default 0,
  custo numeric(18,2) default 0,
  vida_util integer default 0
);

create index if not exists estoque_produtos_categoria_idx on public.estoque_produtos (categoria_id);
create index if not exists estoque_produtos_localizacao_idx on public.estoque_produtos (localizacao_id);
create index if not exists estoque_produtos_fornecedor_idx on public.estoque_produtos (fornecedor_principal_id);
create index if not exists estoque_movimentacoes_produto_idx on public.estoque_movimentacoes (produto_id);
create index if not exists estoque_movimentacoes_data_idx on public.estoque_movimentacoes (data_movimento);
create index if not exists estoque_pneus_status_idx on public.estoque_pneus (status);
create index if not exists estoque_pneu_instalacoes_equipamento_idx on public.estoque_pneu_instalacoes (equipamento_id);

alter table public.estoque_categorias enable row level security;
alter table public.estoque_fornecedores enable row level security;
alter table public.estoque_localizacoes enable row level security;
alter table public.estoque_produtos enable row level security;
alter table public.estoque_entradas enable row level security;
alter table public.estoque_entrada_itens enable row level security;
alter table public.estoque_saidas enable row level security;
alter table public.estoque_saida_itens enable row level security;
alter table public.estoque_movimentacoes enable row level security;
alter table public.estoque_transferencias enable row level security;
alter table public.estoque_inventarios enable row level security;
alter table public.estoque_inventario_itens enable row level security;
alter table public.estoque_pneus enable row level security;
alter table public.estoque_pneu_instalacoes enable row level security;
alter table public.estoque_pneu_historico enable row level security;

create policy "estoque_authenticated_read" on public.estoque_categorias for select using (auth.uid() is not null);
create policy "estoque_authenticated_write" on public.estoque_categorias for all using (auth.uid() is not null) with check (auth.uid() is not null);
create policy "estoque_authenticated_read" on public.estoque_fornecedores for select using (auth.uid() is not null);
create policy "estoque_authenticated_write" on public.estoque_fornecedores for all using (auth.uid() is not null) with check (auth.uid() is not null);
create policy "estoque_authenticated_read" on public.estoque_localizacoes for select using (auth.uid() is not null);
create policy "estoque_authenticated_write" on public.estoque_localizacoes for all using (auth.uid() is not null) with check (auth.uid() is not null);
create policy "estoque_authenticated_read" on public.estoque_produtos for select using (auth.uid() is not null);
create policy "estoque_authenticated_write" on public.estoque_produtos for all using (auth.uid() is not null) with check (auth.uid() is not null);
create policy "estoque_authenticated_read" on public.estoque_entradas for select using (auth.uid() is not null);
create policy "estoque_authenticated_write" on public.estoque_entradas for all using (auth.uid() is not null) with check (auth.uid() is not null);
create policy "estoque_authenticated_read" on public.estoque_entrada_itens for select using (auth.uid() is not null);
create policy "estoque_authenticated_write" on public.estoque_entrada_itens for all using (auth.uid() is not null) with check (auth.uid() is not null);
create policy "estoque_authenticated_read" on public.estoque_saidas for select using (auth.uid() is not null);
create policy "estoque_authenticated_write" on public.estoque_saidas for all using (auth.uid() is not null) with check (auth.uid() is not null);
create policy "estoque_authenticated_read" on public.estoque_saida_itens for select using (auth.uid() is not null);
create policy "estoque_authenticated_write" on public.estoque_saida_itens for all using (auth.uid() is not null) with check (auth.uid() is not null);
create policy "estoque_authenticated_read" on public.estoque_movimentacoes for select using (auth.uid() is not null);
create policy "estoque_authenticated_write" on public.estoque_movimentacoes for all using (auth.uid() is not null) with check (auth.uid() is not null);
create policy "estoque_authenticated_read" on public.estoque_transferencias for select using (auth.uid() is not null);
create policy "estoque_authenticated_write" on public.estoque_transferencias for all using (auth.uid() is not null) with check (auth.uid() is not null);
create policy "estoque_authenticated_read" on public.estoque_inventarios for select using (auth.uid() is not null);
create policy "estoque_authenticated_write" on public.estoque_inventarios for all using (auth.uid() is not null) with check (auth.uid() is not null);
create policy "estoque_authenticated_read" on public.estoque_inventario_itens for select using (auth.uid() is not null);
create policy "estoque_authenticated_write" on public.estoque_inventario_itens for all using (auth.uid() is not null) with check (auth.uid() is not null);
create policy "estoque_authenticated_read" on public.estoque_pneus for select using (auth.uid() is not null);
create policy "estoque_authenticated_write" on public.estoque_pneus for all using (auth.uid() is not null) with check (auth.uid() is not null);
create policy "estoque_authenticated_read" on public.estoque_pneu_instalacoes for select using (auth.uid() is not null);
create policy "estoque_authenticated_write" on public.estoque_pneu_instalacoes for all using (auth.uid() is not null) with check (auth.uid() is not null);
create policy "estoque_authenticated_read" on public.estoque_pneu_historico for select using (auth.uid() is not null);
create policy "estoque_authenticated_write" on public.estoque_pneu_historico for all using (auth.uid() is not null) with check (auth.uid() is not null);
