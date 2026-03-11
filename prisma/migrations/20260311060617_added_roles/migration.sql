-- CreateEnum
CREATE TYPE "Roles" AS ENUM ('team_leader', 'business_analyst', 'quality_assurance', 'developer');

-- AlterTable
ALTER TABLE "user" ADD COLUMN     "role" "Roles" NOT NULL DEFAULT 'team_leader';
