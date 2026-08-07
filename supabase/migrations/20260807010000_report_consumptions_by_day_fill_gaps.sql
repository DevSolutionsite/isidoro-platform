-- ============================================================
-- UX: report_consumptions_by_day devolvía solo días con consumos
-- (group by sin generate_series) — el gráfico de /admin/estadisticas
-- plotea por índice de array, no por fecha real, así que un día sin
-- actividad simplemente desaparecía del array y las barras vecinas
-- quedaban pegadas, sin reflejar cuántos días reales las separan.
--
-- Fix: generate_series sobre el rango completo (en días locales,
-- según settings.timezone — mismo criterio de zona horaria que ya
-- usaba la función) LEFT JOIN contra los consumos agregados, así
-- todo día del rango aparece con total_amount = 0 si no tuvo
-- actividad. El frontend puede entonces plotear con spacing real
-- (1 índice = 1 día calendario) y mostrar el día vacío como barra
-- baja en vez de un hueco ambiguo.
-- ============================================================
create or replace function public.report_consumptions_by_day(
  p_from timestamptz,
  p_to   timestamptz
)
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  v_timezone  text;
  v_from_date date;
  v_to_date   date;
begin
  select timezone into v_timezone from public.settings limit 1;

  v_from_date := (p_from at time zone v_timezone)::date;
  v_to_date   := (p_to   at time zone v_timezone)::date;

  return coalesce(
    (
      select json_agg(row_to_json(r) order by r.date)
      from (
        select
          d.date::date                          as date,
          coalesce(c.count, 0)::int              as count,
          coalesce(c.total_amount, 0)::numeric   as total_amount,
          coalesce(c.points_earned, 0)::int      as points_earned
        from generate_series(v_from_date, v_to_date, interval '1 day') as d(date)
        left join (
          select
            (date_trunc('day', consumed_at at time zone v_timezone))::date as date,
            count(*)::int                                                   as count,
            sum(amount)::numeric                                            as total_amount,
            sum(points_earned)::int                                         as points_earned
          from public.consumptions
          where consumed_at >= p_from
            and consumed_at <  p_to
          group by 1
        ) c on c.date = d.date::date
      ) r
    ),
    '[]'::json
  );
end;
$$;
