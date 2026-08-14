-- AlterTable
ALTER TABLE "MembershipCard" ADD COLUMN     "staffId" INTEGER;

-- AlterTable
ALTER TABLE "Store" ADD COLUMN     "staffId" INTEGER;

-- CreateIndex
CREATE INDEX "MembershipCard_staffId_idx" ON "MembershipCard"("staffId");

-- CreateIndex
CREATE INDEX "Store_staffId_idx" ON "Store"("staffId");

-- AddForeignKey
ALTER TABLE "Store" ADD CONSTRAINT "Store_staffId_fkey" FOREIGN KEY ("staffId") REFERENCES "Staff"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MembershipCard" ADD CONSTRAINT "MembershipCard_staffId_fkey" FOREIGN KEY ("staffId") REFERENCES "Staff"("id") ON DELETE SET NULL ON UPDATE CASCADE;
