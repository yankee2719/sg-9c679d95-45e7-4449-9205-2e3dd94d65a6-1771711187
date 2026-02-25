import QRCode from "qrcode";

export async function generateDocumentQR(documentId: string) {
  const url = `https://machina.app/documents/${documentId}`;
  return await QRCode.toDataURL(url);
}