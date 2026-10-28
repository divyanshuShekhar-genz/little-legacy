-- CreateEnum
CREATE TYPE "ChildGender" AS ENUM ('GIRL', 'BOY');

-- AlterTable
ALTER TABLE "children" ADD COLUMN     "gender" "ChildGender";
