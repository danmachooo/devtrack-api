ALTER TABLE "Ticket"
ADD COLUMN "isMissingFromSource" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN "missingFromSourceAt" TIMESTAMP(3);
