-- AlterTable
ALTER TABLE "patients" ADD COLUMN     "restrictions" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "dislikes" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "weekly_budget_usd" DECIMAL(8,2);
