/*
  Warnings:

  - You are about to drop the column `stage` on the `CourseSchedule` table. All the data in the column will be lost.
  - You are about to drop the column `status` on the `CourseSchedule` table. All the data in the column will be lost.
  - You are about to drop the `Booking` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "Booking" DROP CONSTRAINT "Booking_memberId_fkey";

-- DropForeignKey
ALTER TABLE "Booking" DROP CONSTRAINT "Booking_scheduleId_fkey";

-- 先添加可空字段
ALTER TABLE "CourseSchedule" ADD COLUMN "cardId" INTEGER;
ALTER TABLE "CourseSchedule" ADD COLUMN "memberId" INTEGER;

-- 删除现有数据（因为结构变化太大，无法自动迁移）
DELETE FROM "CourseSchedule";

-- 设置为非空
ALTER TABLE "CourseSchedule" ALTER COLUMN "cardId" SET NOT NULL;
ALTER TABLE "CourseSchedule" ALTER COLUMN "memberId" SET NOT NULL;

-- 删除旧字段
ALTER TABLE "CourseSchedule" DROP COLUMN "stage",
DROP COLUMN "status";

-- DropTable
DROP TABLE "Booking";

-- DropEnum
DROP TYPE "BookingStatus";

-- DropEnum
DROP TYPE "CourseStage";

-- DropEnum
DROP TYPE "ScheduleStatus";

-- CreateIndex
CREATE INDEX "CourseSchedule_cardId_idx" ON "CourseSchedule"("cardId");

-- CreateIndex
CREATE INDEX "CourseSchedule_memberId_idx" ON "CourseSchedule"("memberId");

-- AddForeignKey
ALTER TABLE "CourseSchedule" ADD CONSTRAINT "CourseSchedule_cardId_fkey" FOREIGN KEY ("cardId") REFERENCES "MembershipCard"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CourseSchedule" ADD CONSTRAINT "CourseSchedule_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "Member"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
