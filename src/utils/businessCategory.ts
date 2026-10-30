/** Product category that matches the business type chosen at setup. */
export function categoryForBusiness(businessType: string | null | undefined): string {
  switch (businessType) {
    case 'fashion':
      return 'Fashion';
    case 'electronics':
      return 'Electronics';
    case 'food':
      return 'Food & Beverages';
    case 'pharmacy':
      return 'Other';
    case 'general':
    default:
      return 'General';
  }
}
