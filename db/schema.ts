import {
  pgTable,
  text,
  timestamp,
  integer,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";

export const visionBoards = pgTable("vision_boards", {
  id: text("id").primaryKey(),
  visitorId: text("visitor_id").notNull(),
  userPhotoUrl: text("user_photo_url").notNull(),
  userPhotoNoBgUrl: text("user_photo_no_bg_url").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const goals = pgTable("goals", {
  id: text("id").primaryKey(),
  boardId: text("board_id")
    .references(() => visionBoards.id, { onDelete: "cascade" })
    .notNull(),
  title: text("title").notNull(),
  generatedImageUrl: text("generated_image_url"),
  phrase: text("phrase"),
  positionX: integer("position_x").default(0).notNull(),
  positionY: integer("position_y").default(0).notNull(),
  width: integer("width").default(300).notNull(),
  height: integer("height").default(300).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const visionBoardsRelations = relations(visionBoards, ({ many }) => ({
  goals: many(goals),
}));

export const goalsRelations = relations(goals, ({ one }) => ({
  board: one(visionBoards, {
    fields: [goals.boardId],
    references: [visionBoards.id],
  }),
}));

export type VisionBoard = typeof visionBoards.$inferSelect;
export type NewVisionBoard = typeof visionBoards.$inferInsert;
export type Goal = typeof goals.$inferSelect;
export type NewGoal = typeof goals.$inferInsert;
