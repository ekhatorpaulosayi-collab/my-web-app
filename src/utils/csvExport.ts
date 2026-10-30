/**
 * CSV Export Utilities
 * Handles exporting inventory, sales, and customer data to CSV format
 */

/**
 * Escape CSV field (handle commas, quotes, newlines)
 */
function escapeCsvField(value: any): string {
  if (value === null || value === undefined) return '';

  const str = String(value);

  // If contains comma, quote, or newline, wrap in quotes and escape existing quotes
  if (str.includes(',') || str.includes('"') || str.includes('\n')) {
    return `"${str.replace(/"/g, '""')}"`;
  }

  return str;
}

/**
 * Convert array of objects to CSV string
 */
function arrayToCSV(data: any[], headers: string[]): string {
  if (!data || data.length === 0) {
    return headers.join(',') + '\n';
  }

  // Header row
  const csv = [headers.join(',')];

  // Data rows
  data.forEach(row => {
    const values = headers.map(header => {
      const value = row[header] !== undefined ? row[header] : '';
      return escapeCsvField(value);
    });
    csv.push(values.join(','));
  });

  return csv.join('\n');
}

function downloadBlob(blob: Blob, filename: string) {
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);

  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  link.style.visibility = 'hidden';

  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);

  URL.revokeObjectURL(url);
}

/**
 * Download CSV file
 */
function downloadCSV(content: string, filename: string) {
  downloadBlob(new Blob([content], { type: 'text/csv;charset=utf-8;' }), filename);
}

function crc32(bytes: Uint8Array): number {
  let crc = 0xffffffff;
  for (let i = 0; i < bytes.length; i += 1) {
    crc ^= bytes[i];
    for (let bit = 0; bit < 8; bit += 1) {
      crc = (crc >>> 1) ^ ((crc & 1) ? 0xedb88320 : 0);
    }
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function zipStore(files: { name: string; content: string }[]): Blob {
  const encoder = new TextEncoder();
  const now = new Date();
  const dosTime = (now.getHours() << 11) | (now.getMinutes() << 5) | Math.floor(now.getSeconds() / 2);
  const dosDate = ((Math.max(now.getFullYear(), 1980) - 1980) << 9) | ((now.getMonth() + 1) << 5) | now.getDate();
  const locals: Uint8Array[] = [];
  const central: Uint8Array[] = [];
  let offset = 0;

  for (const file of files) {
    const name = encoder.encode(file.name);
    const data = encoder.encode(file.content);
    const crc = crc32(data);
    const local = new Uint8Array(30 + name.length);
    const view = new DataView(local.buffer);
    view.setUint32(0, 0x04034b50, true);
    view.setUint16(4, 20, true);
    view.setUint16(8, 0, true);
    view.setUint16(10, dosTime, true);
    view.setUint16(12, dosDate, true);
    view.setUint32(14, crc, true);
    view.setUint32(18, data.length, true);
    view.setUint32(22, data.length, true);
    view.setUint16(26, name.length, true);
    local.set(name, 30);
    locals.push(local, data);

    const cen = new Uint8Array(46 + name.length);
    const cenView = new DataView(cen.buffer);
    cenView.setUint32(0, 0x02014b50, true);
    cenView.setUint16(4, 20, true);
    cenView.setUint16(6, 20, true);
    cenView.setUint16(12, dosTime, true);
    cenView.setUint16(14, dosDate, true);
    cenView.setUint32(16, crc, true);
    cenView.setUint32(20, data.length, true);
    cenView.setUint32(24, data.length, true);
    cenView.setUint16(28, name.length, true);
    cenView.setUint32(42, offset, true);
    cen.set(name, 46);
    central.push(cen);
    offset += local.length + data.length;
  }

  const centralSize = central.reduce((sum, part) => sum + part.length, 0);
  const end = new Uint8Array(22);
  const endView = new DataView(end.buffer);
  endView.setUint32(0, 0x06054b50, true);
  endView.setUint16(8, files.length, true);
  endView.setUint16(10, files.length, true);
  endView.setUint32(12, centralSize, true);
  endView.setUint32(16, offset, true);
  return new Blob(
    [...(locals as unknown as BlobPart[]), ...(central as unknown as BlobPart[]), end as unknown as BlobPart],
    { type: 'application/zip' },
  );
}

/**
 * Export inventory (products) to CSV
 */
export function exportInventoryCSV(items: any[], bucket?: { name: string; content: string }[]) {
  const headers = [
    'id',
    'name',
    'category',
    'price',
    'cost',
    'quantity',
    'reorder_level',
    'sku',
    'barcode',
    'description',
    'image_url',
    'created_at',
    'updated_at'
  ];

  const processedItems = items.map(item => ({
    id: item.id || '',
    name: item.name || '',
    category: item.category || '',
    // H8: Supabase products store prices in KOBO as selling_price / cost_price
    price: ((item.selling_price ?? item.sellKobo ?? 0) / 100) || item.price || 0,
    cost: ((item.cost_price ?? item.purchaseKobo ?? 0) / 100) || item.cost || 0,
    quantity: item.quantity ?? item.qty ?? 0,
    reorder_level: item.low_stock_threshold ?? item.reorderLevel ?? item.reorder_level ?? 0,
    sku: item.sku || '',
    barcode: item.barcode || '',
    description: item.description || '',
    image_url: item.image_url || '',
    created_at: item.created_at || '',
    updated_at: item.updated_at || ''
  }));

  // Add helpful comment at the top of the CSV
  const helpText = '# INVENTORY DATA - This file contains all your products with prices, quantities, and details. Open in Excel or Google Sheets.\n';
  const csv = helpText + arrayToCSV(processedItems, headers);
  const timestamp = new Date().toLocaleDateString('en-CA');
  const name = `inventory_${timestamp}.csv`;
  if (bucket) bucket.push({ name, content: csv });
  else downloadCSV(csv, name);
}

/**
 * Export sales to CSV
 */
export function exportSalesCSV(sales: any[], bucket?: { name: string; content: string }[]) {
  const headers = [
    'id',
    'timestamp',
    'customer_name',
    'customer_phone',
    'total_amount',
    'payment_method',
    'items_sold',
    'notes'
  ];

  const processedSales = sales.map(sale => ({
    id: sale.id || '',
    // H8: map the fields App.jsx actually puts on sale objects
    timestamp: sale.createdAt ? new Date(sale.createdAt).toLocaleString('en-NG') : (sale.timestamp || sale.date || ''),
    customer_name: sale.customerName || sale.customer_name || '',
    customer_phone: sale.customerPhone || sale.phone || sale.customer_phone || '',
    total_amount: sale.sellKobo != null ? ((sale.sellKobo || 0) * (sale.qty || 1)) / 100 : (sale.totalAmount || sale.total || 0),
    payment_method: sale.paymentMethod || sale.payment || sale.payment_method || '',
    items_sold: sale.items ? JSON.stringify(sale.items) : (sale.itemName ? `${sale.qty || 1} x ${sale.itemName}` : ''),
    notes: sale.notes || sale.note || ''
  }));

  // Add helpful comment at the top of the CSV
  const helpText = '# SALES RECORDS - This file contains all your sales transactions with customer info and payment details. Use for accounting and analysis.\n';
  const csv = helpText + arrayToCSV(processedSales, headers);
  const timestamp = new Date().toLocaleDateString('en-CA');
  const name = `sales_${timestamp}.csv`;
  if (bucket) bucket.push({ name, content: csv });
  else downloadCSV(csv, name);
}

/**
 * Export customers to CSV
 */
export function exportCustomersCSV(customers: any[], bucket?: { name: string; content: string }[]) {
  const headers = [
    'id',
    'name',
    'phone',
    'email',
    'address',
    'total_purchases',
    'total_spent',
    'created_at',
    'last_purchase'
  ];

  const processedCustomers = customers.map(customer => ({
    id: customer.id || '',
    name: customer.name || '',
    phone: customer.phone || '',
    email: customer.email || '',
    address: customer.address || '',
    total_purchases: customer.totalPurchases || customer.total_purchases || 0,
    total_spent: customer.totalSpent || customer.total_spent || 0,
    created_at: customer.created_at || '',
    last_purchase: customer.lastPurchase || customer.last_purchase || ''
  }));

  // Add helpful comment at the top of the CSV
  const helpText = '# CUSTOMER LIST - This file contains your customers with contact info and purchase history. Great for marketing and customer analysis.\n';
  const csv = helpText + arrayToCSV(processedCustomers, headers);
  const timestamp = new Date().toLocaleDateString('en-CA');
  const name = `customers_${timestamp}.csv`;
  if (bucket) bucket.push({ name, content: csv });
  else downloadCSV(csv, name);
}

/** One zip with inventory, sales, and customers, including empty files. */
export function exportDataZip(items: any[], sales: any[], customers: any[]) {
  const files: { name: string; content: string }[] = [];
  exportInventoryCSV(items || [], files);
  exportSalesCSV(sales || [], files);
  exportCustomersCSV(customers || [], files);
  const stamp = new Date().toLocaleDateString('en-CA');
  downloadBlob(zipStore(files), `storehouse_${stamp}.zip`);
}

/**
 * Export all data (inventory, sales, customers) as separate CSV files
 */
export function exportAllDataCSV(items: any[], sales: any[], customers: any[]) {
  console.log('[CSVExport] Exporting all data:', {
    itemsCount: items.length,
    salesCount: sales.length,
    customersCount: customers.length
  });

  // Export each dataset
  if (items.length > 0) {
    exportInventoryCSV(items);
  }

  if (sales.length > 0) {
    // Small delay to prevent browser blocking multiple downloads
    setTimeout(() => {
      exportSalesCSV(sales);
    }, 500);
  }

  if (customers.length > 0) {
    // Small delay to prevent browser blocking multiple downloads
    setTimeout(() => {
      exportCustomersCSV(customers);
    }, 1000);
  }

  return {
    inventory: items.length,
    sales: sales.length,
    customers: customers.length
  };
}
