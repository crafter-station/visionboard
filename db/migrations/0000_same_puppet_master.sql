CREATE TABLE "goals" (
	"id" text PRIMARY KEY NOT NULL,
	"board_id" text NOT NULL,
	"title" text NOT NULL,
	"generated_image_url" text,
	"phrase" text,
	"position_x" integer DEFAULT 0 NOT NULL,
	"position_y" integer DEFAULT 0 NOT NULL,
	"width" integer DEFAULT 300 NOT NULL,
	"height" integer DEFAULT 300 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "purchases" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"polar_order_id" text NOT NULL,
	"amount" integer NOT NULL,
	"credits_added" integer NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "purchases_polar_order_id_unique" UNIQUE("polar_order_id")
);
--> statement-breakpoint
CREATE TABLE "user_credits" (
	"user_id" text PRIMARY KEY NOT NULL,
	"image_credits" integer DEFAULT 0 NOT NULL,
	"total_purchased" integer DEFAULT 0 NOT NULL,
	"polar_customer_id" text,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "vision_boards" (
	"id" text PRIMARY KEY NOT NULL,
	"visitor_id" text,
	"user_id" text,
	"user_photo_url" text NOT NULL,
	"user_photo_no_bg_url" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "goals" ADD CONSTRAINT "goals_board_id_vision_boards_id_fk" FOREIGN KEY ("board_id") REFERENCES "public"."vision_boards"("id") ON DELETE cascade ON UPDATE no action;