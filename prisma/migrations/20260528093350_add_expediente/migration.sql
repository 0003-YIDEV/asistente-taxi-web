-- CreateTable
CREATE TABLE "Expediente" (
    "id" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "workflowId" TEXT NOT NULL,
    "estado" TEXT NOT NULL DEFAULT 'en_curso',
    "pasoActual" INTEGER NOT NULL DEFAULT 0,
    "iniciadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "cerradoEn" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Expediente_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ExpedientePaso" (
    "id" TEXT NOT NULL,
    "expedienteId" TEXT NOT NULL,
    "workflowPasoId" TEXT,
    "orden" INTEGER NOT NULL,
    "accion" TEXT NOT NULL,
    "nivel" TEXT NOT NULL,
    "gate" TEXT,
    "estado" TEXT NOT NULL DEFAULT 'pendiente',
    "nota" TEXT,
    "completadoEn" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ExpedientePaso_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Expediente_clientId_estado_idx" ON "Expediente"("clientId", "estado");

-- CreateIndex
CREATE INDEX "Expediente_workflowId_idx" ON "Expediente"("workflowId");

-- CreateIndex
CREATE INDEX "ExpedientePaso_expedienteId_orden_idx" ON "ExpedientePaso"("expedienteId", "orden");

-- AddForeignKey
ALTER TABLE "Expediente" ADD CONSTRAINT "Expediente_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Expediente" ADD CONSTRAINT "Expediente_workflowId_fkey" FOREIGN KEY ("workflowId") REFERENCES "Workflow"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExpedientePaso" ADD CONSTRAINT "ExpedientePaso_expedienteId_fkey" FOREIGN KEY ("expedienteId") REFERENCES "Expediente"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExpedientePaso" ADD CONSTRAINT "ExpedientePaso_workflowPasoId_fkey" FOREIGN KEY ("workflowPasoId") REFERENCES "WorkflowPaso"("id") ON DELETE SET NULL ON UPDATE CASCADE;
