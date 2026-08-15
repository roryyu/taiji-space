-- CreateEnum
CREATE TYPE "ScheduleStatus" AS ENUM ('PENDING', 'COMPLETED');

-- AlterTable
ALTER TABLE "CourseSchedule" ADD COLUMN     "status" "ScheduleStatus" NOT NULL DEFAULT 'PENDING';
