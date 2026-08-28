-- AlterTable: 会员增加首次开卡时间
ALTER TABLE "Member" ADD COLUMN "firstCardDate" TIMESTAMP(3);
