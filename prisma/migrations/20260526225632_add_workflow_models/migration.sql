-- CreateTable
CREATE TABLE "Workflow" (
    "id" TEXT NOT NULL,
    "servicioId" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "refManual" TEXT NOT NULL,
    "esOrquestador" BOOLEAN NOT NULL DEFAULT false,
    "orden" INTEGER NOT NULL DEFAULT 0,
    "metaPortal" TEXT,
    "metaIdentificacion" TEXT,
    "metaPlazo" TEXT,
    "metaBaseNormativa" TEXT,
    "metaResultado" TEXT,
    "gateEntrada" TEXT[],
    "inputs" TEXT[],
    "post" TEXT[],
    "excepciones" TEXT[],
    "autoPuede" TEXT[],
    "autoAsistido" TEXT[],
    "autoNoPuede" TEXT[],
    "outputs" JSONB NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Workflow_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WorkflowPaso" (
    "id" TEXT NOT NULL,
    "workflowId" TEXT NOT NULL,
    "orden" INTEGER NOT NULL,
    "accion" TEXT NOT NULL,
    "validacion" TEXT,
    "nivel" TEXT NOT NULL,
    "gate" TEXT,
    "refWorkflow" TEXT,

    CONSTRAINT "WorkflowPaso_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Workflow_servicioId_idx" ON "Workflow"("servicioId");

-- CreateIndex
CREATE INDEX "WorkflowPaso_workflowId_idx" ON "WorkflowPaso"("workflowId");

-- AddForeignKey
ALTER TABLE "WorkflowPaso" ADD CONSTRAINT "WorkflowPaso_workflowId_fkey" FOREIGN KEY ("workflowId") REFERENCES "Workflow"("id") ON DELETE CASCADE ON UPDATE CASCADE;
