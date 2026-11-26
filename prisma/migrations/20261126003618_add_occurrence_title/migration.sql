/*
  Warnings:

  - Added the required column `title` to the `occurrences` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "occurrences" ADD COLUMN     "title" TEXT NOT NULL;
