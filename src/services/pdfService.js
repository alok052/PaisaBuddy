import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { buildAuditPdfHtml } from './pdfHtmlBuilder.js';

export { buildAuditPdfHtml };

export async function generateAndShareAuditPdf(reviewData) {
  const htmlContent = buildAuditPdfHtml(reviewData);

  const { uri } = await Print.printToFileAsync({
    html: htmlContent,
    base64: false,
  });

  if (await Sharing.isAvailableAsync()) {
    await Sharing.shareAsync(uri, {
      UTI: '.pdf',
      mimeType: 'application/pdf',
      dialogTitle: 'Share or Save Your CA-Ready Portfolio Audit',
    });
  }

  return uri;
}
