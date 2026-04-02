const webpush = require('web-push');

// Generate VAPID keys
const vapidKeys = webpush.generateVAPIDKeys();

console.log('\n=== VAPID Keys Generated ===\n');
console.log('Copy these to your environment variables:\n');
console.log('VITE_VAPID_PUBLIC_KEY=' + vapidKeys.publicKey);
console.log('');
console.log('# Private key (NEVER commit this!)');
console.log('VAPID_PRIVATE_KEY=' + vapidKeys.privateKey);
console.log('');
console.log('# Subject (your contact email)');
console.log('VAPID_SUBJECT=mailto:paul@storehouse.ng');
console.log('\n=== End of Keys ===\n');
console.log('See docs/VAPID_SETUP.md for setup instructions');