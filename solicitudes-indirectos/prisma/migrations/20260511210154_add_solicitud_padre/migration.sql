-- AlterTable
ALTER TABLE "Solicitud" ADD COLUMN     "solicitudPadreId" INTEGER;

-- AddForeignKey
ALTER TABLE "Solicitud" ADD CONSTRAINT "Solicitud_solicitudPadreId_fkey" FOREIGN KEY ("solicitudPadreId") REFERENCES "Solicitud"("id") ON DELETE SET NULL ON UPDATE CASCADE;
