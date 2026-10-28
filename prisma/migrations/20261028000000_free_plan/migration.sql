-- Free plan: time-limited, watermarked publication. Plain ALTERs keep the slug triggers intact.
ALTER TABLE "invitations" ADD COLUMN "expires_at" DATETIME;
ALTER TABLE "invitations" ADD COLUMN "free_used_at" DATETIME;
