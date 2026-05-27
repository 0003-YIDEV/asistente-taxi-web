-- CreateTable
CREATE TABLE "Carpeta" (
    "id" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "parentId" TEXT,
    "nombre" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Carpeta_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Documento" (
    "id" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "carpetaId" TEXT,
    "nombre" TEXT NOT NULL,
    "mime" TEXT NOT NULL,
    "tamanoBytes" INTEGER NOT NULL,
    "rutaRelativa" TEXT NOT NULL,
    "hashSha256" TEXT NOT NULL,
    "origen" TEXT NOT NULL DEFAULT 'subido',
    "refModelo" TEXT,
    "estado" TEXT NOT NULL DEFAULT 'definitivo',
    "fechaDocumento" TIMESTAMP(3),
    "descripcion" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Documento_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Carpeta_clientId_parentId_idx" ON "Carpeta"("clientId", "parentId");

-- CreateIndex
CREATE UNIQUE INDEX "Documento_rutaRelativa_key" ON "Documento"("rutaRelativa");

-- CreateIndex
CREATE INDEX "Documento_clientId_carpetaId_idx" ON "Documento"("clientId", "carpetaId");

-- CreateIndex
CREATE INDEX "Documento_clientId_hashSha256_idx" ON "Documento"("clientId", "hashSha256");

-- AddForeignKey
ALTER TABLE "Carpeta" ADD CONSTRAINT "Carpeta_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Carpeta" ADD CONSTRAINT "Carpeta_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "Carpeta"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "Documento" ADD CONSTRAINT "Documento_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Documento" ADD CONSTRAINT "Documento_carpetaId_fkey" FOREIGN KEY ("carpetaId") REFERENCES "Carpeta"("id") ON DELETE SET NULL ON UPDATE CASCADE;
