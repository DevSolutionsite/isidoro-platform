-- ============================================================
-- Migración: 20260810120000
-- Sistema de mails promocionales (admin)
--
-- email_opt_out: cliente se dio de baja de mails promocionales.
-- unsubscribe_token: token opaco para el link de baja sin login
-- (misma convención que qr_token: uuid único, no reutilizable
-- entre features — a diferencia de qr_token, este puede circular
-- por mail sin comprometer nada sensible).
-- ============================================================

alter table public.profiles
  add column email_opt_out boolean not null default false,
  add column unsubscribe_token uuid not null default gen_random_uuid() unique;
