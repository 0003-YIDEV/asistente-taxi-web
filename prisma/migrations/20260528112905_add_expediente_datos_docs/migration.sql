-- AlterTable
ALTER TABLE "Expediente" ADD COLUMN     "datos" JSONB;

-- CreateTable
CREATE TABLE "ExpedienteDocumento" (
    "id" TEXT NOT NULL,
    "expedienteId" TEXT NOT NULL,
    "documentoId" TEXT,
    "rol" TEXT NOT NULL,
    "etiqueta" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ExpedienteDocumento_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ExpedienteDocumento_expedienteId_idx" ON "ExpedienteDocumento"("expedienteId");

-- AddForeignKey
ALTER TABLE "ExpedienteDocumento" ADD CONSTRAINT "ExpedienteDocumento_expedienteId_fkey" FOREIGN KEY ("expedienteId") REFERENCES "Expediente"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExpedienteDocumento" ADD CONSTRAINT "ExpedienteDocumento_documentoId_fkey" FOREIGN KEY ("documentoId") REFERENCES "Documento"("id") ON DELETE SET NULL ON UPDATE CASCADE;
