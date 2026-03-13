import {
  pgTable,
  uuid,
  text,
  timestamp,
  boolean,
  integer,
} from "drizzle-orm/pg-core";

export const reviews = pgTable("reviews", {
  id: uuid("id").primaryKey(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull(),
  deletedAt: timestamp("deleted_at", { withTimezone: true }),
  resourceId: text("resource_id").notNull(),
  occurrenceId: text("occurrence_id"),
  authorId: text("author_id").notNull(),
  attended: boolean("attended").notNull(),
  didNotAttendReason: text("did_not_attend_reason"),
  rating: integer("rating").notNull(),
  text: text("text"),
  waitTimeMinutes: integer("wait_time_minutes"),
  informationAccurate: boolean("information_accurate").notNull(),
  photoUrl: text("photo_url"),
  photoPublic: boolean("photo_public"),
  shareTextWithResource: boolean("share_text_with_resource").notNull(),
  userId: text("user_id"),
  reviewedByUserId: text("reviewed_by_user_id"),
});
