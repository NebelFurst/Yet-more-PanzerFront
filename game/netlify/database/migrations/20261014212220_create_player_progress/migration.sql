CREATE TABLE "player_progress" (
	"id" text PRIMARY KEY,
	"credits" integer DEFAULT 500 NOT NULL,
	"unlocked_tank_ids" jsonb NOT NULL,
	"current_tank_id" text NOT NULL,
	"upgrades" jsonb DEFAULT '{}' NOT NULL,
	"blueprint_ids" jsonb DEFAULT '[]' NOT NULL,
	"revision" integer DEFAULT 0 NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
