-- 2026-03-25
-- Social media and referral code fields for profile page.

alter table if exists public.users
  add column if not exists social_facebook text,
  add column if not exists social_instagram text,
  add column if not exists social_x text,
  add column if not exists social_tiktok text,
  add column if not exists social_linkedin text,
  add column if not exists social_youtube text,
  add column if not exists social_website text,
  add column if not exists referral_code text;
