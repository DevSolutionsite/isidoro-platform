-- ============================================================
-- HALLAZGO E — expiración de código de canje: 15 -> 5 minutos
-- (DEC-032, supersede el valor original de DEC-011)
--
-- El valor autoritativo es el que setea initiate-redemption al
-- insertar la fila (siempre lo manda explícito); este DEFAULT de
-- columna nunca se usa en la práctica, pero lo actualizamos para
-- que el schema no mienta sobre el comportamiento real.
-- ============================================================

alter table public.redemptions
  alter column expires_at set default now() + interval '5 minutes';
