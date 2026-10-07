import { getTableColumns, sql, type SQL } from "drizzle-orm";
import { type AnySQLiteTable, SQLiteSyncDialect } from "drizzle-orm/sqlite-core";

// user_settings is the initialization marker. All guarded inserts and the final
// marker must run in the same D1 batch (which commits or rolls back as a unit).
export function workspaceSeedInsert(table: AnySQLiteTable, rows: Record<string, unknown>[], userId: string): SQL {
  const columns = getTableColumns(table);
  const keys = Object.keys(rows[0]);
  const values = rows.map(row => sql`(${sql.join(keys.map(key => sql`${row[key]}`), sql`, `)})`);
  return sql`insert into ${table} (${sql.join(keys.map(key => sql.identifier(columns[key].name)), sql`, `)})
    select * from (values ${sql.join(values, sql`, `)})
    where not exists (select 1 from user_settings where user_id = ${userId}) on conflict do nothing`;
}

export function workspaceSeedQuery(query: SQL) {
  return new SQLiteSyncDialect().sqlToQuery(query);
}
