/*
  Warnings:

  - The `role` column on the `user` table would be dropped and recreated. This will lead to data loss if there is data in the column.

*/
-- CreateEnum
CREATE TYPE "Role" AS ENUM ('team_leader', 'business_analyst', 'quality_assurance', 'developer');

-- AlterTable
ALTER TABLE "user" DROP COLUMN "role",
ADD COLUMN     "role" "Role" NOT NULL DEFAULT 'team_leader';

-- DropEnum
DROP TYPE "Roles";
