-- 명함 관리 시스템 마이그레이션
-- 생성일: 2025-10-21
-- 설명: Business Card, Contact, Category, Image 등 명함 관리 테이블 생성

create extension if not exists "pgcrypto";

-- ===========================
-- 1. BUSINESS_CARD (명함 메인 테이블)
-- ===========================
create table if not exists public.business_card (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  company text,
  job_title text,
  department text,
  bio text,
  company_logo_url text,
  card_image_url text,
  color_theme varchar(7) default '#2ECC71',
  view_count int default 0,
  is_starred boolean default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.business_card is '명함 기본 정보를 저장하는 메인 테이블';
comment on column public.business_card.id is '명함 고유 ID (UUID)';
comment on column public.business_card.user_id is '명함 소유자의 사용자 ID';
comment on column public.business_card.name is '명함 주인의 이름';
comment on column public.business_card.company is '회사명';
comment on column public.business_card.job_title is '직책/직급 (예: 대표이사, 팀장)';
comment on column public.business_card.department is '부서명';
comment on column public.business_card.bio is '소개 (최대 500자)';
comment on column public.business_card.company_logo_url is '회사 로고 이미지 URL';
comment on column public.business_card.card_image_url is '명함 이미지 URL (썸네일)';
comment on column public.business_card.color_theme is '명함 테마색 (HEX 코드)';
comment on column public.business_card.view_count is '명함 조회 수';
comment on column public.business_card.is_starred is '즐겨찾기 여부';
comment on column public.business_card.created_at is '생성 날짜';
comment on column public.business_card.updated_at is '수정 날짜';

-- 인덱스
create index if not exists idx_business_card_user_id on public.business_card(user_id);
create index if not exists idx_business_card_created_at on public.business_card(created_at desc);
create index if not exists idx_business_card_is_starred on public.business_card(is_starred);

alter table if exists public.business_card disable row level security;

-- ===========================
-- 2. CONTACT (명함 연락처)
-- ===========================
create table if not exists public.contact (
  id uuid primary key default gen_random_uuid(),
  business_card_id uuid not null references public.business_card(id) on delete cascade,
  contact_type varchar(50) not null check (contact_type in ('phone', 'email', 'address', 'sns', 'website')),
  value text not null,
  label varchar(100),
  sort_order int default 0,
  created_at timestamptz not null default now()
);

comment on table public.contact is '명함의 연락처 정보 (전화, 이메일, 주소 등)';
comment on column public.contact.id is '연락처 고유 ID';
comment on column public.contact.business_card_id is '소속 명함 ID';
comment on column public.contact.contact_type is '연락처 타입 (phone, email, address, sns, website)';
comment on column public.contact.value is '연락처 값 (전화번호, 이메일 주소 등)';
comment on column public.contact.label is '라벨 (예: 직장폰, 개인폰, 대표 이메일)';
comment on column public.contact.sort_order is '정렬 순서';

-- 인덱스
create index if not exists idx_contact_business_card_id on public.contact(business_card_id);
create index if not exists idx_contact_type on public.contact(contact_type);

alter table if exists public.contact disable row level security;

-- ===========================
-- 3. BUSINESS_CARD_IMAGE (명함 이미지)
-- ===========================
create table if not exists public.business_card_image (
  id uuid primary key default gen_random_uuid(),
  business_card_id uuid not null references public.business_card(id) on delete cascade,
  image_url text not null,
  image_type varchar(50) default 'original' check (image_type in ('original', 'thumbnail', 'front', 'back')),
  sort_order int default 0,
  created_at timestamptz not null default now()
);

comment on table public.business_card_image is '명함 이미지 저장소';
comment on column public.business_card_image.id is '이미지 고유 ID';
comment on column public.business_card_image.business_card_id is '소속 명함 ID';
comment on column public.business_card_image.image_url is '이미지 URL';
comment on column public.business_card_image.image_type is '이미지 타입 (original: 원본, thumbnail: 썸네일, front: 명함 앞면, back: 명함 뒷면)';
comment on column public.business_card_image.sort_order is '정렬 순서';

-- 인덱스
create index if not exists idx_business_card_image_business_card_id on public.business_card_image(business_card_id);

alter table if exists public.business_card_image disable row level security;

-- ===========================
-- 4. CATEGORY (사용자 정의 카테고리)
-- ===========================
create table if not exists public.category (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name varchar(100) not null,
  description text,
  color varchar(7) default '#4F6D7A',
  sort_order int default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(user_id, name)
);

comment on table public.category is '사용자가 정의한 명함 카테고리';
comment on column public.category.id is '카테고리 고유 ID';
comment on column public.category.user_id is '카테고리 소유자 ID';
comment on column public.category.name is '카테고리 이름 (예: 클라이언트, 공급업체, 경쟁사)';
comment on column public.category.description is '카테고리 설명';
comment on column public.category.color is '카테고리 색상 (HEX 코드)';
comment on column public.category.sort_order is '정렬 순서';

-- 인덱스
create index if not exists idx_category_user_id on public.category(user_id);
create index if not exists idx_category_sort_order on public.category(sort_order);

alter table if exists public.category disable row level security;

-- ===========================
-- 5. BUSINESS_CARD_CATEGORY (명함-카테고리 매핑)
-- ===========================
create table if not exists public.business_card_category (
  id uuid primary key default gen_random_uuid(),
  business_card_id uuid not null references public.business_card(id) on delete cascade,
  category_id uuid not null references public.category(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique(business_card_id, category_id)
);

comment on table public.business_card_category is '명함과 카테고리 간의 매핑 관계 (다대다)';
comment on column public.business_card_category.business_card_id is '명함 ID';
comment on column public.business_card_category.category_id is '카테고리 ID';

-- 인덱스
create index if not exists idx_business_card_category_business_card_id on public.business_card_category(business_card_id);
create index if not exists idx_business_card_category_category_id on public.business_card_category(category_id);

alter table if exists public.business_card_category disable row level security;

-- ===========================
-- 6. STARRED_CARD (즐겨찾기)
-- ===========================
create table if not exists public.starred_card (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  business_card_id uuid not null references public.business_card(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique(user_id, business_card_id)
);

comment on table public.starred_card is '사용자가 즐겨찾기한 명함';
comment on column public.starred_card.user_id is '사용자 ID';
comment on column public.starred_card.business_card_id is '명함 ID';

-- 인덱스
create index if not exists idx_starred_card_user_id on public.starred_card(user_id);
create index if not exists idx_starred_card_created_at on public.starred_card(created_at desc);

alter table if exists public.starred_card disable row level security;

-- ===========================
-- 7. CARD_ACTIVITY (활동 기록)
-- ===========================
create table if not exists public.card_activity (
  id uuid primary key default gen_random_uuid(),
  business_card_id uuid not null references public.business_card(id) on delete cascade,
  activity_type varchar(50) not null check (activity_type in ('viewed', 'shared', 'created', 'updated', 'deleted', 'starred', 'exported')),
  description text,
  metadata jsonb,
  created_at timestamptz not null default now()
);

comment on table public.card_activity is '명함 관련 활동 기록 (감사 로그)';
comment on column public.card_activity.business_card_id is '명함 ID';
comment on column public.card_activity.activity_type is '활동 타입 (viewed: 조회, shared: 공유, created: 생성, updated: 수정, deleted: 삭제, starred: 즐겨찾기, exported: 내보내기)';
comment on column public.card_activity.description is '활동 설명';
comment on column public.card_activity.metadata is '추가 정보 (JSON 형식)';

-- 인덱스
create index if not exists idx_card_activity_business_card_id on public.card_activity(business_card_id);
create index if not exists idx_card_activity_created_at on public.card_activity(created_at desc);
create index if not exists idx_card_activity_type on public.card_activity(activity_type);

alter table if exists public.card_activity disable row level security;

-- ===========================
-- 8. 뷰 (자주 사용되는 쿼리)
-- ===========================

-- 명함 전체 정보 뷰 (명함 + 연락처 + 이미지 + 카테고리 통합)
create or replace view business_card_detail as
select
  bc.id,
  bc.user_id,
  bc.name,
  bc.company,
  bc.job_title,
  bc.department,
  bc.bio,
  bc.company_logo_url,
  bc.card_image_url,
  bc.color_theme,
  bc.view_count,
  bc.is_starred,
  bc.created_at,
  bc.updated_at,
  json_agg(
    distinct jsonb_build_object(
      'id', c.id,
      'type', c.contact_type,
      'value', c.value,
      'label', c.label
    ) order by c.sort_order
  ) filter (where c.id is not null) as contacts,
  json_agg(
    distinct jsonb_build_object(
      'id', bci.id,
      'url', bci.image_url,
      'type', bci.image_type
    ) order by bci.sort_order
  ) filter (where bci.id is not null) as images,
  json_agg(
    distinct jsonb_build_object(
      'id', cat.id,
      'name', cat.name,
      'color', cat.color
    )
  ) filter (where cat.id is not null) as categories
from public.business_card bc
left join public.contact c on bc.id = c.business_card_id
left join public.business_card_image bci on bc.id = bci.business_card_id
left join public.business_card_category bcc on bc.id = bcc.business_card_id
left join public.category cat on bcc.category_id = cat.id
group by bc.id;

comment on view business_card_detail is '명함의 전체 정보를 통합한 뷰';

-- 사용자별 명함 통계 뷰
create or replace view business_card_stats as
select
  bc.user_id,
  count(distinct bc.id) as total_cards,
  count(distinct sc.id) as starred_count,
  count(distinct cat.id) as category_count,
  sum(bc.view_count) as total_views,
  max(bc.created_at) as last_card_created
from public.business_card bc
left join public.starred_card sc on bc.id = sc.business_card_id
left join public.business_card_category bcc on bc.id = bcc.business_card_id
left join public.category cat on bcc.category_id = cat.id
group by bc.user_id;

comment on view business_card_stats is '사용자별 명함 통계';
