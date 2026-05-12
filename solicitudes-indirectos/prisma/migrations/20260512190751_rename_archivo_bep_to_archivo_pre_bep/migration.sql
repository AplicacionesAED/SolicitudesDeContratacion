/*
  Warnings:

  - You are about to drop the column `archivoBEP` on the `Solicitud` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "Solicitud" DROP COLUMN "archivoBEP",
ADD COLUMN     "archivoPreBEP" TEXT;
