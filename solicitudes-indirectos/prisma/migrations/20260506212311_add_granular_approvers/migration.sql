-- AlterTable
ALTER TABLE "AprobadorFrente" ADD COLUMN     "contratosMinutaId" TEXT,
ADD COLUMN     "contratosTramiteId" TEXT,
ADD COLUMN     "controlesId" TEXT,
ADD COLUMN     "directorControlesId" TEXT;

-- AlterTable
ALTER TABLE "Solicitud" ADD COLUMN     "coordinadorControlesId" TEXT,
ADD COLUMN     "directorControlesId" TEXT,
ADD COLUMN     "responsableContratosMinutaId" TEXT,
ADD COLUMN     "responsableContratosTramiteId" TEXT;
