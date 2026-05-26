"use server";

import { PDFDocument, rgb, StandardFonts } from "pdf-lib";
import fs from "fs";
import path from "path";
import { db } from "@/lib/db";
import { auth } from "@/auth";
import { decryptField } from "@/lib/crypto/fieldEncryption";

export async function generatePdfAction(clientId: string, pdfId: string, manualInputs: Record<string, string>) {
  const session = await auth();
  if (!session) throw new Error("No autorizado");

  const client = await db.client.findUnique({
    where: { id: clientId },
  });

  if (!client) throw new Error("Cliente no encontrado");

  // Descifrar datos sensibles
  const nif = decryptField(client.nifEnc);

  const pdfPath = path.join(process.cwd(), `private/pdf/${pdfId}.pdf`);
  if (!fs.existsSync(pdfPath)) {
    throw new Error(`Template PDF no encontrado: ${pdfId}`);
  }

  const existingPdfBytes = fs.readFileSync(pdfPath);
  const pdfDoc = await PDFDocument.load(existingPdfBytes);
  const pages = pdfDoc.getPages();
  const firstPage = pages[0];
  const { width, height } = firstPage.getSize();

  const font = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

  // Intentamos rellenar datos básicos en coordenadas estimadas (ya que el PDF no tiene campos)
  // NOTA: Esto es una aproximación. Lo ideal es un PDF con campos AcroForm.
  
  // Dibujar NIF (Top left-ish)
  firstPage.drawText(nif, {
    x: 100,
    y: height - 100,
    size: 10,
    font: font,
    color: rgb(0, 0, 0),
  });

  // Dibujar Nombre (Next to NIF)
  firstPage.drawText(client.nombre, {
    x: 250,
    y: height - 100,
    size: 10,
    font: font,
    color: rgb(0, 0, 0),
  });

  // Dibujar Referencia Catastral (if provided)
  if (manualInputs.ReferenciaCatastral) {
    firstPage.drawText(`Ref. Catastral: ${manualInputs.ReferenciaCatastral}`, {
      x: 100,
      y: height - 130,
      size: 9,
      font: font,
      color: rgb(0, 0.2, 0.6),
    });
  }

  const pdfBytes = await pdfDoc.save();
  
  // Convertir a base64 para enviarlo al cliente (o podríamos guardarlo y enviar una URL)
  return Buffer.from(pdfBytes).toString('base64');
}
