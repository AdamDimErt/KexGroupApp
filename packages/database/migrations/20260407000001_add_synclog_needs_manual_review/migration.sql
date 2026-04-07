-- AddNeedsManualReview to SyncLog
ALTER TABLE "finance"."SyncLog" ADD COLUMN "needsManualReview" BOOLEAN NOT NULL DEFAULT false;
