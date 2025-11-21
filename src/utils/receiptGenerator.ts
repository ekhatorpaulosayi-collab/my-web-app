/**
 * Receipt Generator
 * Creates PDF and image receipts for Nigerian retail businesses
 */

import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

interface ReceiptData {
  businessName: string;
  businessPhone?: string;
  businessAddress?: string;
  date: string;
  receiptNumber?: string;
  items: Array<{
    name: string;
    quantity: number;
    price: number;
    total: number;
  }>;
  subtotal: number;
  discount?: number;
  total: number;
  paymentMethod?: string;
  customerName?: string;
  customerPhone?: string;
  staffName?: string;
}

/**
 * Format currency in Nigerian Naira
 */
function formatNaira(amount: number): string {
  return `₦${amount.toLocaleString('en-NG', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

/**
 * Generate PDF receipt
 */
export async function generatePDFReceipt(data: ReceiptData): Promise<Blob> {
  const pdf = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: [80, 200] // Thermal receipt size (80mm width)
  });

  const pageWidth = 80;
  let yPos = 10;
  const lineHeight = 5;
  const margin = 5;

  // Helper to add centered text
  const addCenteredText = (text: string, fontSize: number = 10, isBold: boolean = false) => {
    pdf.setFontSize(fontSize);
    if (isBold) {
      pdf.setFont('helvetica', 'bold');
    } else {
      pdf.setFont('helvetica', 'normal');
    }
    const textWidth = pdf.getTextWidth(text);
    const x = (pageWidth - textWidth) / 2;
    pdf.text(text, x, yPos);
    yPos += lineHeight;
  };

  // Helper to add left-aligned text
  const addText = (text: string, fontSize: number = 9) => {
    pdf.setFontSize(fontSize);
    pdf.setFont('helvetica', 'normal');
    pdf.text(text, margin, yPos);
    yPos += lineHeight;
  };

  // Helper to add line separator
  const addLine = () => {
    pdf.line(margin, yPos, pageWidth - margin, yPos);
    yPos += lineHeight;
  };

  // Business header
  addCenteredText(data.businessName, 12, true);

  if (data.businessPhone) {
    addCenteredText(data.businessPhone, 9);
  }

  if (data.businessAddress) {
    addCenteredText(data.businessAddress, 8);
  }

  yPos += 2;
  addLine();

  // Receipt details
  addCenteredText('SALES RECEIPT', 11, true);
  yPos += 1;

  if (data.receiptNumber) {
    addCenteredText(`#${data.receiptNumber}`, 9);
  }

  addCenteredText(data.date, 8);
  yPos += 2;
  addLine();

  // Items header
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(9);
  pdf.text('Item', margin, yPos);
  pdf.text('Qty', pageWidth - 30, yPos);
  pdf.text('Amount', pageWidth - 20, yPos, { align: 'right' });
  yPos += lineHeight;
  addLine();

  // Items
  pdf.setFont('helvetica', 'normal');
  for (const item of data.items) {
    // Item name (with wrapping if needed)
    const itemName = item.name.length > 25 ? item.name.substring(0, 22) + '...' : item.name;
    pdf.text(itemName, margin, yPos);
    yPos += lineHeight;

    // Quantity and price on next line
    pdf.setFontSize(8);
    pdf.text(`${item.quantity} x ${formatNaira(item.price)}`, margin + 2, yPos);
    pdf.setFontSize(9);
    pdf.text(formatNaira(item.total), pageWidth - margin, yPos, { align: 'right' });
    yPos += lineHeight + 1;
  }

  addLine();

  // Totals
  pdf.setFont('helvetica', 'normal');
  pdf.text('Subtotal:', margin, yPos);
  pdf.text(formatNaira(data.subtotal), pageWidth - margin, yPos, { align: 'right' });
  yPos += lineHeight;

  if (data.discount && data.discount > 0) {
    pdf.text('Discount:', margin, yPos);
    pdf.text(`-${formatNaira(data.discount)}`, pageWidth - margin, yPos, { align: 'right' });
    yPos += lineHeight;
  }

  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(11);
  pdf.text('TOTAL:', margin, yPos);
  pdf.text(formatNaira(data.total), pageWidth - margin, yPos, { align: 'right' });
  yPos += lineHeight + 2;

  addLine();

  // Payment details
  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(9);

  if (data.paymentMethod) {
    pdf.text(`Payment: ${data.paymentMethod}`, margin, yPos);
    yPos += lineHeight;
  }

  if (data.customerName) {
    pdf.text(`Customer: ${data.customerName}`, margin, yPos);
    yPos += lineHeight;
  }

  if (data.staffName) {
    pdf.text(`Served by: ${data.staffName}`, margin, yPos);
    yPos += lineHeight;
  }

  yPos += 3;
  addLine();

  // Footer
  addCenteredText('Thank you for your business!', 10, true);
  addCenteredText('Please come again', 8);

  yPos += 5;
  addCenteredText('Powered by SmartStock', 7);

  // Return as blob
  return pdf.output('blob');
}

/**
 * Download PDF receipt
 */
export async function downloadPDFReceipt(data: ReceiptData, filename?: string): Promise<void> {
  const blob = await generatePDFReceipt(data);
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename || `receipt-${Date.now()}.pdf`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Generate receipt as image (PNG)
 */
export async function generateReceiptImage(elementId: string): Promise<Blob> {
  const element = document.getElementById(elementId);
  if (!element) {
    throw new Error(`Element with id "${elementId}" not found`);
  }

  const canvas = await html2canvas(element, {
    backgroundColor: '#ffffff',
    scale: 2, // Higher quality
    logging: false
  });

  return new Promise((resolve) => {
    canvas.toBlob((blob) => {
      if (blob) {
        resolve(blob);
      }
    }, 'image/png');
  });
}

/**
 * Download receipt as image
 */
export async function downloadReceiptImage(elementId: string, filename?: string): Promise<void> {
  const blob = await generateReceiptImage(elementId);
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename || `receipt-${Date.now()}.png`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Share receipt image via WhatsApp
 */
export async function shareReceiptViaWhatsApp(elementId: string, phoneNumber?: string): Promise<void> {
  try {
    const blob = await generateReceiptImage(elementId);

    // Create a file from blob
    const file = new File([blob], 'receipt.png', { type: 'image/png' });

    // Use Web Share API if available
    if (navigator.share && navigator.canShare && navigator.canShare({ files: [file] })) {
      await navigator.share({
        files: [file],
        title: 'Receipt',
        text: 'Thank you for your purchase!'
      });
    } else {
      // Fallback: Download image and guide user
      await downloadReceiptImage(elementId);
      alert('Receipt downloaded! Please share it manually via WhatsApp.');
    }
  } catch (error) {
    console.error('Error sharing receipt:', error);
    throw error;
  }
}
