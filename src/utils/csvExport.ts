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

/**
 * Download CSV file
 */
function downloadCSV(content: string, filename: string) {
  const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
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
 * Export inventory (products) to CSV
 */
export function exportInventoryCSV(items: any[]) {
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
    price: item.price || 0,
    cost: item.cost || 0,
    quantity: item.quantity || 0,
    reorder_level: item.reorder_level || 0,
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
  const timestamp = new Date().toISOString().split('T')[0];
  downloadCSV(csv, `inventory_${timestamp}.csv`);
}

/**
 * Export sales to CSV
 */
export function exportSalesCSV(sales: any[]) {
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
    timestamp: sale.timestamp || '',
    customer_name: sale.customerName || sale.customer_name || '',
    customer_phone: sale.customerPhone || sale.customer_phone || '',
    total_amount: sale.totalAmount || sale.total || 0,
    payment_method: sale.paymentMethod || sale.payment_method || '',
    items_sold: JSON.stringify(sale.items || []),
    notes: sale.notes || ''
  }));

  // Add helpful comment at the top of the CSV
  const helpText = '# SALES RECORDS - This file contains all your sales transactions with customer info and payment details. Use for accounting and analysis.\n';
  const csv = helpText + arrayToCSV(processedSales, headers);
  const timestamp = new Date().toISOString().split('T')[0];
  downloadCSV(csv, `sales_${timestamp}.csv`);
}

/**
 * Export customers to CSV
 */
export function exportCustomersCSV(customers: any[]) {
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
  const timestamp = new Date().toISOString().split('T')[0];
  downloadCSV(csv, `customers_${timestamp}.csv`);
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
