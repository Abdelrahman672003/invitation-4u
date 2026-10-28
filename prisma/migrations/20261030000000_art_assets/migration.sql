-- Design Studio artwork library. A new table only, so the slug triggers stay intact.
CREATE TABLE "art_assets" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "file" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE UNIQUE INDEX "art_assets_file_key" ON "art_assets"("file");
