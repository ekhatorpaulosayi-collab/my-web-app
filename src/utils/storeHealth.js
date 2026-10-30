/**
 * Warnings shown before a merchant publishes. They do not block saving.
 */
export function storeHealthFlags(store) {
  const flags = [];
  const name = String(store?.businessName || '').trim();
  const about = String(store?.aboutUs || '').trim();
  const phone = String(store?.whatsappNumber || '').replace(/[\s-]/g, '');
  const logo = store?.logoUrl;

  if (!logo) flags.push('Add a logo, or add a photo to your first product.');
  if (about.length < 20) flags.push('Add a description of what you sell.');
  if (!name || name.includes('@') || /^(test|user|shop|store|pending|asdf|xxx)$/i.test(name)) {
    flags.push('The store name looks like a placeholder.');
  }
  if (/bussiness|recieve|seperate|adress/.test(`${name} ${about}`.toLowerCase())) {
    flags.push('Check the store name and About text for typos.');
  }
  if (phone && phone !== 'pending' && !/^(\+234|234)\d{10}$/.test(phone) && !/^0\d{10}$/.test(phone)) {
    flags.push('The WhatsApp number does not look like a Nigerian number.');
  }
  const aboutLower = about.toLowerCase();
  const cardOn = store?.paystackEnabled === true
    || (store?.acceptedPaymentMethods || []).some((method) => /card|paystack|transfer/i.test(String(method)));
  if (/cash only|no card|no transfer/.test(aboutLower) && cardOn) {
    flags.push('About says you only take cash, but card or transfer is turned on.');
  }
  if ((store?.samplePrices || []).some((price) => price === 100 || price >= 100000000)) {
    flags.push('A product price looks like a test amount. Prices are in naira.');
  }
  return flags;
}
