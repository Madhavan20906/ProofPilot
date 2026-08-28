import { jsonb, text, timestamp, varchar } from "drizzle-orm/pg-core";
import { pgTable } from "drizzle-orm/pg-core";

export const decisionsTable = pgTable("decisions", {
  id: varchar("id", { length: 80 }).primaryKey(),
  title: text("title").notNull(),
  description: text("description").notNull(),
  state: jsonb("state").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export type DecisionRow = typeof decisionsTable.$inferSelect;