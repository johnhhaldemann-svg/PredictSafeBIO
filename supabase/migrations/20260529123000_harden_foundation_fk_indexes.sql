do $$
declare
  fk_record record;
  index_name text;
begin
  for fk_record in
    with fk as (
      select
        con.oid,
        n.nspname as schema_name,
        rel.oid as table_oid,
        rel.relname as table_name,
        con.conname as constraint_name,
        con.conkey::smallint[] as key_attnums,
        string_agg(format('%I', att.attname), ', ' order by ord.ordinality) as column_list,
        array_agg(att.attname order by ord.ordinality) as columns
      from pg_constraint con
      join pg_class rel on rel.oid = con.conrelid
      join pg_namespace n on n.oid = rel.relnamespace
      join unnest(con.conkey) with ordinality as ord(attnum, ordinality) on true
      join pg_attribute att on att.attrelid = rel.oid and att.attnum = ord.attnum
      where con.contype = 'f'
        and n.nspname = 'public'
      group by con.oid, n.nspname, rel.oid, rel.relname, con.conname, con.conkey
    ),
    idx as (
      select
        i.indrelid as table_oid,
        array_agg(k.attnum::smallint order by k.ord) as index_attnums
      from pg_index i
      cross join unnest(i.indkey) with ordinality as k(attnum, ord)
      where i.indisvalid
      group by i.indrelid, i.indexrelid
    ),
    covered as (
      select distinct fk.oid
      from fk
      join idx on idx.table_oid = fk.table_oid
      where fk.key_attnums = idx.index_attnums[1:array_length(fk.key_attnums, 1)]
    )
    select fk.*
    from fk
    where fk.oid not in (select oid from covered)
  loop
    index_name := left(
      fk_record.table_name || '_' || array_to_string(fk_record.columns, '_') || '_fk_idx',
      63
    );

    execute format(
      'create index if not exists %I on %I.%I (%s)',
      index_name,
      fk_record.schema_name,
      fk_record.table_name,
      fk_record.column_list
    );
  end loop;
end $$;
