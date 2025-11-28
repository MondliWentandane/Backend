// Currency configuration
export const DEFAULT_CURRENCY = "USD"; // US Dollar
export const CURRENCY_SYMBOL = "$"; // Dollar symbol

// Format price with currency
export const formatPrice = (amount: number, currency: string = DEFAULT_CURRENCY): string => {
  if (currency === "USD") {
    return `$${amount.toFixed(2)}`;
  }
  return `${currency} ${amount.toFixed(2)}`;
};

// Add currency info to price objects
export const addCurrencyInfo = (price: number, currency: string = DEFAULT_CURRENCY) => {
  return {
    amount: price,
    currency: currency,
    formatted: formatPrice(price, currency),
  };
};



