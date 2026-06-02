-- Workspace invitations
-- Enables invite-only signup: only users with a valid pending invite for their
-- email address can complete onboarding and join an organization.

create table if not exists workspace_invitations (
  id                uuid primary key default gen_random_uuid(),
  organization_id   uuid not null references organizations(id) on delete cascade,
  invited_by        uuid not null references profiles(id) on delete cascade,
  email             text not null,
  role              text not null default 'member' check (role in ('owner', 'member')),
  token             text not null unique default encode(gen_random_bytes(24), 'hex'),
  status            text not null default 'pending'
                      check (status in ('pending', 'accepted', 'revoked')),
  expires_at        timestamptz not null default now() + interval '7 days',
  accepted_at       timestamptz,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);

-- Index for fast lookup by email + status during onboarding guard check
create index if not exists workspace_invitations_email_status_idx
  on workspace_invitations (lower(email), status, expires_at);

-- Index for org-scoped owner management queries
create index if not exists workspace_invitations_org_idx
  on workspace_invitations (organization_id, created_at desc);

-- RLS
alter table workspace_invitations enable row level security;

-- Owners of an org can see and manage their org's invitations
create policy "owners can manage their org invitations"
  on workspace_invitations
  for all
  using (
    organization_id in (
      select organization_id from profiles
      where id = auth.uid() and role = 'owner'
    )
  )
  with check (
    organization_id in (
      select organization_id from profiles
      where id = auth.uid() and role = 'owner'
    )
  );

-- Any authenticated user can read an invitation addressed to their own email
-- (used during the onboarding guard check)
create policy "users can read their own invitations"
  on workspace_invitations
  for select
  using (lower(email) = lower(auth.email()));

comment on table workspace_invitations is
  'Invite-only access tokens. A pending invite matching the signing-up user''s '
  'email is required to complete onboarding and join an organization. '
  'Invites expire after 7 days and are single-use (accepted once per token).';
