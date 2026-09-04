-- CreateTable
CREATE TABLE "MemberFeedback" (
    "id" SERIAL NOT NULL,
    "memberId" INTEGER NOT NULL,
    "storeId" INTEGER NOT NULL DEFAULT 1,
    "courseId" INTEGER NOT NULL DEFAULT 1,
    "coachId" INTEGER NOT NULL DEFAULT 1,
    "content" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MemberFeedback_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "MemberFeedback_memberId_idx" ON "MemberFeedback"("memberId");

-- CreateIndex
CREATE INDEX "MemberFeedback_storeId_idx" ON "MemberFeedback"("storeId");

-- CreateIndex
CREATE INDEX "MemberFeedback_courseId_idx" ON "MemberFeedback"("courseId");

-- CreateIndex
CREATE INDEX "MemberFeedback_coachId_idx" ON "MemberFeedback"("coachId");

-- AddForeignKey
ALTER TABLE "MemberFeedback" ADD CONSTRAINT "MemberFeedback_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "Member"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MemberFeedback" ADD CONSTRAINT "MemberFeedback_storeId_fkey" FOREIGN KEY ("storeId") REFERENCES "Store"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MemberFeedback" ADD CONSTRAINT "MemberFeedback_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "Course"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MemberFeedback" ADD CONSTRAINT "MemberFeedback_coachId_fkey" FOREIGN KEY ("coachId") REFERENCES "Staff"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
