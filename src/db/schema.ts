import { sqliteTable, text, real, integer, uniqueIndex } from 'drizzle-orm/sqlite-core';

export const stations = sqliteTable('stations', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  basin: text('basin').notNull(),
  lat: real('lat').notNull(),
  lng: real('lng').notNull(),
  alert_level: real('alert_level').notNull(),
  minor_flood_level: real('minor_flood_level').notNull(),
  major_flood_level: real('major_flood_level').notNull(),
});

export const readings = sqliteTable('readings', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  station_id: text('station_id').notNull().references(() => stations.id),
  water_level: real('water_level'),
  rate_of_change: real('rate_of_change').notNull().default(0),
  status: text('status').$type<'NORMAL' | 'ALERT' | 'MINOR_FLOOD' | 'MAJOR_FLOOD' | 'STALE'>().notNull().default('NORMAL'),
  observed_at: text('observed_at').notNull(),
}, (table) => {
  return {
    stationObservedIdx: uniqueIndex('station_observed_idx').on(table.station_id, table.observed_at),
  };
});
