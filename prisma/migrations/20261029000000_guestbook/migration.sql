-- Guestbook: congratulations left by guests. A new table only, so the slug triggers stay intact.
CREATE TABLE "blessings" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "invitation_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "blessings_invitation_id_fkey" FOREIGN KEY ("invitation_id") REFERENCES "invitations" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX "blessings_invitation_id_created_at_idx" ON "blessings"("invitation_id", "created_at");
