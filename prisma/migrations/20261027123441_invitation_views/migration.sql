-- Aggregate view counter for published invitations (no visitor identifiers).
-- Plain ALTERs keep the slug-format triggers on "invitations" intact.
ALTER TABLE "invitations" ADD COLUMN "view_count" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "invitations" ADD COLUMN "last_viewed_at" DATETIME;
