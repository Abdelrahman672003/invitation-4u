-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password_hash" TEXT,
    "auth_provider" TEXT,
    "auth_subject" TEXT,
    "role" TEXT NOT NULL DEFAULT 'CUSTOMER',
    "locale" TEXT NOT NULL DEFAULT 'ar',
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "sessions" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "user_id" TEXT NOT NULL,
    "token_hash" TEXT NOT NULL,
    "expires_at" DATETIME NOT NULL,
    "last_seen_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "ip_address" TEXT,
    "user_agent" TEXT,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "sessions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "password_reset_tokens" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "user_id" TEXT NOT NULL,
    "token_hash" TEXT NOT NULL,
    "expires_at" DATETIME NOT NULL,
    "used_at" DATETIME,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "password_reset_tokens_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "event_categories" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "slug" TEXT NOT NULL,
    "name_en" TEXT NOT NULL,
    "name_ar" TEXT NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "event_subtypes" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "category_id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "name_en" TEXT NOT NULL,
    "name_ar" TEXT NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL,
    CONSTRAINT "event_subtypes_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "event_categories" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "templates" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "category_id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "name_en" TEXT NOT NULL,
    "name_ar" TEXT NOT NULL,
    "description_en" TEXT,
    "description_ar" TEXT,
    "thumbnail_url" TEXT,
    "design_config" JSONB NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "is_premium" BOOLEAN NOT NULL DEFAULT false,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL,
    CONSTRAINT "templates_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "event_categories" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "invitations" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "owner_id" TEXT NOT NULL,
    "category_id" TEXT NOT NULL,
    "subtype_id" TEXT,
    "template_id" TEXT NOT NULL,
    "template_version" INTEGER NOT NULL,
    "template_snapshot" JSONB,
    "title" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "content_json" JSONB NOT NULL,
    "content_locale" TEXT NOT NULL DEFAULT 'ar',
    "event_date" DATETIME,
    "event_timezone" TEXT NOT NULL DEFAULT 'Africa/Cairo',
    "rsvp_deadline" DATETIME,
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "revision" INTEGER NOT NULL DEFAULT 0,
    "published_at" DATETIME,
    "unpublished_at" DATETIME,
    "archived_at" DATETIME,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL,
    CONSTRAINT "invitations_owner_id_fkey" FOREIGN KEY ("owner_id") REFERENCES "users" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "invitations_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "event_categories" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "invitations_subtype_id_fkey" FOREIGN KEY ("subtype_id") REFERENCES "event_subtypes" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "invitations_template_id_fkey" FOREIGN KEY ("template_id") REFERENCES "templates" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "guests" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "invitation_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "phone" TEXT,
    "group_name" TEXT,
    "max_attendees" INTEGER NOT NULL DEFAULT 1,
    "notes" TEXT,
    "invite_token" TEXT,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL,
    CONSTRAINT "guests_invitation_id_fkey" FOREIGN KEY ("invitation_id") REFERENCES "invitations" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "rsvps" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "invitation_id" TEXT NOT NULL,
    "guest_id" TEXT,
    "name" TEXT NOT NULL,
    "response" TEXT NOT NULL,
    "attendees_count" INTEGER NOT NULL DEFAULT 1,
    "message" TEXT,
    "dedupe_key" TEXT NOT NULL,
    "responded_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL,
    CONSTRAINT "rsvps_invitation_id_fkey" FOREIGN KEY ("invitation_id") REFERENCES "invitations" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "rsvps_guest_id_fkey" FOREIGN KEY ("guest_id") REFERENCES "guests" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "packages" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "code" TEXT NOT NULL,
    "name_en" TEXT NOT NULL,
    "name_ar" TEXT NOT NULL,
    "price_minor" INTEGER NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'EGP',
    "features" JSONB NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "payments" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "user_id" TEXT NOT NULL,
    "invitation_id" TEXT,
    "package_id" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "provider_reference" TEXT,
    "amount_minor" INTEGER NOT NULL,
    "currency" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "failure_reason" TEXT,
    "paid_at" DATETIME,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL,
    CONSTRAINT "payments_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "payments_invitation_id_fkey" FOREIGN KEY ("invitation_id") REFERENCES "invitations" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "payments_package_id_fkey" FOREIGN KEY ("package_id") REFERENCES "packages" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "webhook_events" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "provider" TEXT NOT NULL,
    "external_event_id" TEXT NOT NULL,
    "event_type" TEXT,
    "payload" JSONB NOT NULL,
    "processing_status" TEXT NOT NULL DEFAULT 'RECEIVED',
    "error" TEXT,
    "received_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "processed_at" DATETIME
);

-- CreateTable
CREATE TABLE "audit_logs" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "actor_id" TEXT,
    "action" TEXT NOT NULL,
    "entity_type" TEXT NOT NULL,
    "entity_id" TEXT,
    "metadata" JSONB,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "audit_logs_actor_id_fkey" FOREIGN KEY ("actor_id") REFERENCES "users" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "users_auth_provider_auth_subject_key" ON "users"("auth_provider", "auth_subject");

-- CreateIndex
CREATE UNIQUE INDEX "sessions_token_hash_key" ON "sessions"("token_hash");

-- CreateIndex
CREATE INDEX "sessions_user_id_idx" ON "sessions"("user_id");

-- CreateIndex
CREATE INDEX "sessions_expires_at_idx" ON "sessions"("expires_at");

-- CreateIndex
CREATE UNIQUE INDEX "password_reset_tokens_token_hash_key" ON "password_reset_tokens"("token_hash");

-- CreateIndex
CREATE INDEX "password_reset_tokens_user_id_idx" ON "password_reset_tokens"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "event_categories_slug_key" ON "event_categories"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "event_subtypes_category_id_slug_key" ON "event_subtypes"("category_id", "slug");

-- CreateIndex
CREATE UNIQUE INDEX "templates_slug_key" ON "templates"("slug");

-- CreateIndex
CREATE INDEX "templates_category_id_status_idx" ON "templates"("category_id", "status");

-- CreateIndex
CREATE UNIQUE INDEX "invitations_slug_key" ON "invitations"("slug");

-- CreateIndex
CREATE INDEX "invitations_owner_id_status_idx" ON "invitations"("owner_id", "status");

-- CreateIndex
CREATE INDEX "invitations_owner_id_updated_at_idx" ON "invitations"("owner_id", "updated_at");

-- CreateIndex
CREATE INDEX "invitations_status_idx" ON "invitations"("status");

-- CreateIndex
CREATE INDEX "invitations_template_id_idx" ON "invitations"("template_id");

-- CreateIndex
CREATE UNIQUE INDEX "guests_invite_token_key" ON "guests"("invite_token");

-- CreateIndex
CREATE INDEX "guests_invitation_id_name_idx" ON "guests"("invitation_id", "name");

-- CreateIndex
CREATE INDEX "guests_invitation_id_group_name_idx" ON "guests"("invitation_id", "group_name");

-- CreateIndex
CREATE INDEX "rsvps_invitation_id_response_idx" ON "rsvps"("invitation_id", "response");

-- CreateIndex
CREATE INDEX "rsvps_guest_id_idx" ON "rsvps"("guest_id");

-- CreateIndex
CREATE UNIQUE INDEX "rsvps_invitation_id_dedupe_key_key" ON "rsvps"("invitation_id", "dedupe_key");

-- CreateIndex
CREATE UNIQUE INDEX "packages_code_key" ON "packages"("code");

-- CreateIndex
CREATE INDEX "payments_user_id_created_at_idx" ON "payments"("user_id", "created_at");

-- CreateIndex
CREATE INDEX "payments_invitation_id_idx" ON "payments"("invitation_id");

-- CreateIndex
CREATE INDEX "payments_status_idx" ON "payments"("status");

-- CreateIndex
CREATE UNIQUE INDEX "payments_provider_provider_reference_key" ON "payments"("provider", "provider_reference");

-- CreateIndex
CREATE INDEX "webhook_events_processing_status_idx" ON "webhook_events"("processing_status");

-- CreateIndex
CREATE UNIQUE INDEX "webhook_events_provider_external_event_id_key" ON "webhook_events"("provider", "external_event_id");

-- CreateIndex
CREATE INDEX "audit_logs_entity_type_entity_id_idx" ON "audit_logs"("entity_type", "entity_id");

-- CreateIndex
CREATE INDEX "audit_logs_actor_id_created_at_idx" ON "audit_logs"("actor_id", "created_at");

-- CreateIndex
CREATE INDEX "audit_logs_created_at_idx" ON "audit_logs"("created_at");


-- Constraints Prisma cannot express (SQLite: constraints cannot be added later, so
-- they are enforced with triggers).
CREATE TRIGGER users_email_normalized_ins BEFORE INSERT ON "users"
WHEN NEW."email" <> lower(trim(NEW."email"))
BEGIN SELECT RAISE(ABORT, 'users_email_normalized_chk'); END;
CREATE TRIGGER users_email_normalized_upd BEFORE UPDATE OF "email" ON "users"
WHEN NEW."email" <> lower(trim(NEW."email"))
BEGIN SELECT RAISE(ABORT, 'users_email_normalized_chk'); END;

CREATE TRIGGER packages_checks_ins BEFORE INSERT ON "packages"
WHEN NEW."price_minor" < 0 OR length(NEW."currency") <> 3 OR NEW."currency" GLOB '*[^A-Z]*'
BEGIN SELECT RAISE(ABORT, 'packages_check'); END;
CREATE TRIGGER packages_checks_upd BEFORE UPDATE ON "packages"
WHEN NEW."price_minor" < 0 OR length(NEW."currency") <> 3 OR NEW."currency" GLOB '*[^A-Z]*'
BEGIN SELECT RAISE(ABORT, 'packages_check'); END;

CREATE TRIGGER payments_checks_ins BEFORE INSERT ON "payments"
WHEN NEW."amount_minor" < 0 OR length(NEW."currency") <> 3 OR NEW."currency" GLOB '*[^A-Z]*'
BEGIN SELECT RAISE(ABORT, 'payments_check'); END;
CREATE TRIGGER payments_checks_upd BEFORE UPDATE ON "payments"
WHEN NEW."amount_minor" < 0 OR length(NEW."currency") <> 3 OR NEW."currency" GLOB '*[^A-Z]*'
BEGIN SELECT RAISE(ABORT, 'payments_check'); END;

CREATE TRIGGER rsvps_attendees_ins BEFORE INSERT ON "rsvps"
WHEN NEW."attendees_count" < 0
BEGIN SELECT RAISE(ABORT, 'rsvps_attendees_count_chk'); END;
CREATE TRIGGER rsvps_attendees_upd BEFORE UPDATE ON "rsvps"
WHEN NEW."attendees_count" < 0
BEGIN SELECT RAISE(ABORT, 'rsvps_attendees_count_chk'); END;

CREATE TRIGGER guests_max_attendees_ins BEFORE INSERT ON "guests"
WHEN NEW."max_attendees" < 1
BEGIN SELECT RAISE(ABORT, 'guests_max_attendees_chk'); END;
CREATE TRIGGER guests_max_attendees_upd BEFORE UPDATE ON "guests"
WHEN NEW."max_attendees" < 1
BEGIN SELECT RAISE(ABORT, 'guests_max_attendees_chk'); END;

CREATE TRIGGER invitations_slug_ins BEFORE INSERT ON "invitations"
WHEN NEW."slug" = '' OR NEW."slug" GLOB '*[^a-z0-9-]*' OR NEW."slug" GLOB '-*' OR NEW."slug" GLOB '*-' OR NEW."slug" LIKE '%--%'
BEGIN SELECT RAISE(ABORT, 'invitations_slug_format_chk'); END;
CREATE TRIGGER invitations_slug_upd BEFORE UPDATE OF "slug" ON "invitations"
WHEN NEW."slug" = '' OR NEW."slug" GLOB '*[^a-z0-9-]*' OR NEW."slug" GLOB '-*' OR NEW."slug" GLOB '*-' OR NEW."slug" LIKE '%--%'
BEGIN SELECT RAISE(ABORT, 'invitations_slug_format_chk'); END;
