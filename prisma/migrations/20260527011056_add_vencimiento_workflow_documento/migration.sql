-- AlterTable
ALTER TABLE "Documento" ADD COLUMN     "fechaVencimiento" TIMESTAMP(3),
ADD COLUMN     "workflowId" TEXT;

-- CreateIndex
CREATE INDEX "Documento_clientId_fechaVencimiento_idx" ON "Documento"("clientId", "fechaVencimiento");

-- AddForeignKey
ALTER TABLE "Documento" ADD CONSTRAINT "Documento_workflowId_fkey" FOREIGN KEY ("workflowId") REFERENCES "Workflow"("id") ON DELETE SET NULL ON UPDATE CASCADE;
