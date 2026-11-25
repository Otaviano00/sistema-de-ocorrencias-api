ALTER TABLE "regions"
ADD COLUMN "provider_id" TEXT,
ADD COLUMN "municipality" TEXT,
ADD COLUMN "state" TEXT;

CREATE UNIQUE INDEX "regions_provider_id_key" ON "regions"("provider_id");
