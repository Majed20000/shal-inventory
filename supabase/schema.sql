-- نظام مخزون الشال العربي — يطابق الجداول الحالية (camelCase)
-- استخدم هذا فقط إذا أنشأت مشروع Supabase جديدًا من الصفر

create table if not exists products (
  id text primary key,
  name text not null,
  "normalizedName" text not null,
  category text not null,
  quantity bigint not null default 0,
  cost numeric default 0,
  notes text default '',
  "createdAt" timestamptz not null default now(),
  "updatedAt" timestamptz not null default now(),
  "deletedAt" timestamptz
);

create table if not exists transactions (
  id text primary key,
  "productId" text not null references products(id),
  "productName" text not null,
  category text not null,
  "operationType" text not null,
  "quantityBefore" bigint not null,
  "quantityChange" bigint not null,
  "quantityAfter" bigint not null,
  notes text default '',
  "createdAt" timestamptz not null default now()
);

alter table products enable row level security;
alter table transactions enable row level security;

create policy "products_select" on products for select using (true);
create policy "products_insert" on products for insert with check (true);
create policy "products_update" on products for update using (true);
create policy "products_delete" on products for delete using (true);

create policy "transactions_select" on transactions for select using (true);
create policy "transactions_insert" on transactions for insert with check (true);
create policy "transactions_update" on transactions for update using (true);
create policy "transactions_delete" on transactions for delete using (true);

create table if not exists payments (
  id text primary key,
  amount numeric not null,
  note text default '',
  "createdAt" timestamptz not null default now(),
  "updatedAt" timestamptz not null default now(),
  "deletedAt" timestamptz
);

alter table payments enable row level security;

create policy "payments_select" on payments for select using (true);
create policy "payments_insert" on payments for insert with check (true);
create policy "payments_update" on payments for update using (true);
create policy "payments_delete" on payments for delete using (true);

-- Sales tables
create table if not exists sales (
  id text primary key,
  type text not null,
  description text default '',
  "totalAmount" numeric not null,
  "createdAt" timestamptz not null default now(),
  "updatedAt" timestamptz not null default now(),
  "deletedAt" timestamptz
);

create table if not exists sale_items (
  id text primary key,
  "saleId" text not null references sales(id),
  "productId" text references products(id),
  "productName" text not null,
  quantity bigint not null,
  price numeric not null,
  total numeric not null,
  "createdAt" timestamptz not null default now(),
  "deletedAt" timestamptz
);

alter table sales enable row level security;
alter table sale_items enable row level security;

create policy "sales_select" on sales for select using (true);
create policy "sales_insert" on sales for insert with check (true);
create policy "sales_update" on sales for update using (true);
create policy "sales_delete" on sales for delete using (true);

create policy "sale_items_select" on sale_items for select using (true);
create policy "sale_items_insert" on sale_items for insert with check (true);
create policy "sale_items_update" on sale_items for update using (true);
create policy "sale_items_delete" on sale_items for delete using (true);
