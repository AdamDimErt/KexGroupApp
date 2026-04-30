-- AlterTable
ALTER TABLE "finance"."Restaurant" ADD COLUMN     "legalEntityId" TEXT;

-- CreateTable
CREATE TABLE "finance"."LegalEntity" (
    "id" TEXT NOT NULL,
    "brandId" TEXT NOT NULL,
    "iikoId" TEXT,
    "name" TEXT NOT NULL,
    "taxpayerIdNumber" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LegalEntity_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "LegalEntity_iikoId_key" ON "finance"."LegalEntity"("iikoId");

-- CreateIndex
CREATE INDEX "LegalEntity_brandId_idx" ON "finance"."LegalEntity"("brandId");

-- CreateIndex
CREATE INDEX "Restaurant_legalEntityId_idx" ON "finance"."Restaurant"("legalEntityId");

-- AddForeignKey
ALTER TABLE "finance"."LegalEntity" ADD CONSTRAINT "LegalEntity_brandId_fkey" FOREIGN KEY ("brandId") REFERENCES "finance"."Brand"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "finance"."Restaurant" ADD CONSTRAINT "Restaurant_legalEntityId_fkey" FOREIGN KEY ("legalEntityId") REFERENCES "finance"."LegalEntity"("id") ON DELETE SET NULL ON UPDATE CASCADE;
