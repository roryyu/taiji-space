-- CreateEnum
CREATE TYPE "Gender" AS ENUM ('MALE', 'FEMALE', 'OTHER');

-- AlterTable: 会员增加生日、性别、健康相关字段
ALTER TABLE "Member" ADD COLUMN "gender" "Gender",
ADD COLUMN "birthday" TIMESTAMP(3),
ADD COLUMN "physicalDisease" TEXT,
ADD COLUMN "mentalDisease" TEXT,
ADD COLUMN "isSportsInjuryRecovery" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN "isHypertension" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN "isHyperlipidemia" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN "isHyperglycemia" BOOLEAN NOT NULL DEFAULT false;
