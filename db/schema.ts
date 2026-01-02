import {
  pgTable,
  text,
  timestamp,
  integer,
  pgEnum,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";

export const goalStatusEnum = pgEnum("goal_status", [
  "pending",
  "generating",
  "completed",
  "failed",
]);

export const userProfiles = pgTable("user_profiles", {
  id: text("id").primaryKey(),
  visitorId: text("visitor_id"),
  userId: text("user_id"),
  avatarOriginalUrl: text("avatar_original_url"),
  avatarNoBgUrl: text("avatar_no_bg_url"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const visionBoards = pgTable("vision_boards", {
  id: text("id").primaryKey(),
  profileId: text("profile_id")
    .references(() => userProfiles.id, { onDelete: "cascade" })
    .notNull(),
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
  status: goalStatusEnum("status").default("pending").notNull(),
  positionX: integer("position_x").default(0).notNull(),
  positionY: integer("position_y").default(0).notNull(),
  width: integer("width").default(300).notNull(),
  height: integer("height").default(300).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const userCredits = pgTable("user_credits", {
  profileId: text("profile_id")
    .primaryKey()
    .references(() => userProfiles.id, { onDelete: "cascade" }),
  imageCredits: integer("image_credits").default(0).notNull(),
  totalPurchased: integer("total_purchased").default(0).notNull(),
  polarCustomerId: text("polar_customer_id"),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const purchases = pgTable("purchases", {
  id: text("id").primaryKey(),
  profileId: text("profile_id")
    .references(() => userProfiles.id, { onDelete: "cascade" })
    .notNull(),
  polarOrderId: text("polar_order_id").notNull().unique(),
  amount: integer("amount").notNull(),
  creditsAdded: integer("credits_added").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const userProfilesRelations = relations(userProfiles, ({ many, one }) => ({
  boards: many(visionBoards),
  credits: one(userCredits),
  purchases: many(purchases),
}));

export const visionBoardsRelations = relations(visionBoards, ({ one, many }) => ({
  profile: one(userProfiles, {
    fields: [visionBoards.profileId],
    references: [userProfiles.id],
  }),
  goals: many(goals),
}));

export const goalsRelations = relations(goals, ({ one }) => ({
  board: one(visionBoards, {
    fields: [goals.boardId],
    references: [visionBoards.id],
  }),
}));

export const userCreditsRelations = relations(userCredits, ({ one }) => ({
  profile: one(userProfiles, {
    fields: [userCredits.profileId],
    references: [userProfiles.id],
  }),
}));

export const purchasesRelations = relations(purchases, ({ one }) => ({
  profile: one(userProfiles, {
    fields: [purchases.profileId],
    references: [userProfiles.id],
  }),
}));

export type UserProfile = typeof userProfiles.$inferSelect;
export type NewUserProfile = typeof userProfiles.$inferInsert;
export type VisionBoard = typeof visionBoards.$inferSelect;
export type NewVisionBoard = typeof visionBoards.$inferInsert;
export type Goal = typeof goals.$inferSelect;
export type NewGoal = typeof goals.$inferInsert;
export type UserCredits = typeof userCredits.$inferSelect;
export type Purchase = typeof purchases.$inferSelect;
