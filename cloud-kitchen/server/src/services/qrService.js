import QRCode from 'qrcode';

export const qrService = {
  /**
   * Generate a QR code as a data URL (base64 PNG).
   * The QR encodes only the secure token, not customer info.
   */
  async generateQrDataUrl(qrToken) {
    return QRCode.toDataURL(qrToken, {
      errorCorrectionLevel: 'M',
      width: 300,
      margin: 2,
    });
  },

  /**
   * Generate QR code as a Buffer for email embedding.
   */
  async generateQrBuffer(qrToken) {
    return QRCode.toBuffer(qrToken, {
      errorCorrectionLevel: 'M',
      width: 300,
      margin: 2,
    });
  },
};
