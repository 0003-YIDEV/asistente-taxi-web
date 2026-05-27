-- AlterTable
ALTER TABLE "Carpeta" ADD COLUMN     "eliminadoEn" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "Documento" ADD COLUMN     "eliminadoEn" TIMESTAMP(3);

-- CreateIndex
CREATE INDEX "Carpeta_clientId_eliminadoEn_idx" ON "Carpeta"("clientId", "eliminadoEn");

-- CreateIndex
CREATE INDEX "Documento_clientId_eliminadoEn_idx" ON "Documento"("clientId", "eliminadoEn");
