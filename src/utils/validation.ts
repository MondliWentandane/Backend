// Validation utility functions

/**
 * Validates email format and length
 */
export const validateEmail = (email: any): { valid: boolean; error?: string } => {
  if (!email) {
    return { valid: false, error: "Email is required" };
  }

  if (typeof email !== 'string') {
    return { valid: false, error: "Email must be a string" };
  }

  const trimmedEmail = email.trim();

  if (trimmedEmail.length === 0) {
    return { valid: false, error: "Email cannot be empty" };
  }

  if (trimmedEmail.length > 255) {
    return { valid: false, error: "Email must be 255 characters or less" };
  }

  // Robust email regex pattern
  const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;

  if (!emailRegex.test(trimmedEmail)) {
    return { valid: false, error: "Invalid email format. Please provide a valid email address" };
  }

  // Additional checks for common issues
  if (trimmedEmail.includes('..')) {
    return { valid: false, error: "Invalid email format. Email cannot contain consecutive dots" };
  }

  if (trimmedEmail.startsWith('.') || trimmedEmail.startsWith('@')) {
    return { valid: false, error: "Invalid email format. Email cannot start with a dot or @ symbol" };
  }

  return { valid: true };
};

/**
 * Validates password strength, length, and complexity
 */
export const validatePassword = (password: any): { valid: boolean; error?: string } => {
  if (!password) {
    return { valid: false, error: "Password is required" };
  }

  if (typeof password !== 'string') {
    return { valid: false, error: "Password must be a string" };
  }

  // Length validation
  if (password.length < 8) {
    return { valid: false, error: "Password must be at least 8 characters long" };
  }

  if (password.length > 128) {
    return { valid: false, error: "Password must be 128 characters or less" };
  }

  // Complexity requirements
  const hasUpperCase = /[A-Z]/.test(password);
  const hasLowerCase = /[a-z]/.test(password);
  const hasNumber = /\d/.test(password);
  const hasSpecialChar = /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password);

  const missingRequirements: string[] = [];
  if (!hasUpperCase) missingRequirements.push("uppercase letter");
  if (!hasLowerCase) missingRequirements.push("lowercase letter");
  if (!hasNumber) missingRequirements.push("number");
  if (!hasSpecialChar) missingRequirements.push("special character");

  if (missingRequirements.length > 0) {
    return {
      valid: false,
      error: `Password must contain at least one ${missingRequirements.join(', ')}`
    };
  }

  // Check for common weak passwords
  const commonPasswords = ['password', '12345678', 'qwerty', 'abc123', 'password123'];
  const lowerPassword = password.toLowerCase();
  if (commonPasswords.some(common => lowerPassword.includes(common))) {
    return { valid: false, error: "Password is too common. Please choose a stronger password" };
  }

  return { valid: true };
};

/**
 * Validates phone number format (supports international format)
 */
export const validatePhoneNumber = (phone_number: any): { valid: boolean; error?: string } => {
  if (!phone_number) {
    return { valid: false, error: "Phone number is required" };
  }

  if (typeof phone_number !== 'string') {
    return { valid: false, error: "Phone number must be a string" };
  }

  const trimmedPhone = phone_number.trim();

  if (trimmedPhone.length < 10) {
    return { valid: false, error: "Phone number must be at least 10 characters long" };
  }

  if (trimmedPhone.length > 20) {
    return { valid: false, error: "Phone number must be 20 characters or less" };
  }

  // International phone number format (E.164 compatible)
  // Supports formats like: +27123456789, +1234567890, 0123456789, etc.
  const phoneRegex = /^\+?[1-9]\d{1,14}$|^0\d{9,10}$/;

  // Remove spaces, dashes, and parentheses for validation
  const cleanedPhone = trimmedPhone.replace(/[\s\-()]/g, '');

  if (!phoneRegex.test(cleanedPhone)) {
    return {
      valid: false,
      error: "Invalid phone number format. Use international format (e.g., +27123456789) or local format (e.g., 0123456789)"
    };
  }

  return { valid: true };
};

/**
 * Validates that a value is a positive integer
 */
export const validatePositiveInteger = (value: any, fieldName: string = 'Value'): { valid: boolean; error?: string; parsed?: number } => {
  if (value === undefined || value === null) {
    return { valid: false, error: `${fieldName} is required` };
  }

  // Try to parse if it's a string
  let parsed: number;
  if (typeof value === 'string') {
    parsed = parseInt(value, 10);
    if (isNaN(parsed)) {
      return { valid: false, error: `${fieldName} must be a valid number` };
    }
  } else if (typeof value === 'number') {
    parsed = value;
    if (!Number.isInteger(parsed)) {
      return { valid: false, error: `${fieldName} must be an integer` };
    }
  } else {
    return { valid: false, error: `${fieldName} must be a number` };
  }

  if (parsed <= 0) {
    return { valid: false, error: `${fieldName} must be a positive integer` };
  }

  return { valid: true, parsed };
};

/**
 * Validates that a value is a positive number (can be decimal)
 */
export const validatePositiveNumber = (value: any, fieldName: string = 'Value', min?: number, max?: number): { valid: boolean; error?: string; parsed?: number } => {
  if (value === undefined || value === null) {
    return { valid: false, error: `${fieldName} is required` };
  }

  // Try to parse if it's a string
  let parsed: number;
  if (typeof value === 'string') {
    parsed = parseFloat(value);
    if (isNaN(parsed)) {
      return { valid: false, error: `${fieldName} must be a valid number` };
    }
  } else if (typeof value === 'number') {
    parsed = value;
    if (isNaN(parsed)) {
      return { valid: false, error: `${fieldName} must be a valid number` };
    }
  } else {
    return { valid: false, error: `${fieldName} must be a number` };
  }

  if (parsed < 0) {
    return { valid: false, error: `${fieldName} must be a positive number` };
  }

  if (min !== undefined && parsed < min) {
    return { valid: false, error: `${fieldName} must be at least ${min}` };
  }

  if (max !== undefined && parsed > max) {
    return { valid: false, error: `${fieldName} must be at most ${max}` };
  }

  return { valid: true, parsed };
};

/**
 * Validates name field (supports first name, last name, and full names)
 * Examples: "John", "John Doe", "Mary Jane Watson", "O'Brien", "Smith-Jones"
 */
export const validateName = (name: any): { valid: boolean; error?: string; trimmed?: string } => {
  if (!name) {
    return { valid: false, error: "Name is required" };
  }

  if (typeof name !== 'string') {
    return { valid: false, error: "Name must be a string" };
  }

  const trimmed = name.trim();

  if (trimmed.length < 2) {
    return { valid: false, error: "Name must be at least 2 characters long" };
  }

  if (trimmed.length > 100) {
    return { valid: false, error: "Name must be 100 characters or less" };
  }

  // Normalize multiple spaces to single space
  const normalized = trimmed.replace(/\s+/g, ' ');

  // Allow letters, spaces, hyphens, apostrophes for names
  // Supports: "John Doe", "Mary Jane Watson", "O'Brien", "Smith-Jones", etc.
  const nameRegex = /^[a-zA-Z]+(?:[\s'-][a-zA-Z]+)*$/;

  if (!nameRegex.test(normalized)) {
    return {
      valid: false,
      error: "Name can only contain letters, spaces, hyphens, and apostrophes. Each name part must start with a letter."
    };
  }

  // Ensure name doesn't start or end with special characters (after normalization)
  if (normalized.startsWith('-') || normalized.startsWith("'") || 
      normalized.endsWith('-') || normalized.endsWith("'")) {
    return {
      valid: false,
      error: "Name cannot start or end with a hyphen or apostrophe"
    };
  }

  // Ensure no consecutive special characters
  if (/--|''|'-|-'/.test(normalized)) {
    return {
      valid: false,
      error: "Name cannot contain consecutive hyphens or apostrophes"
    };
  }

  return { valid: true, trimmed: normalized };
};

/**
 * Validates string length
 */
export const validateStringLength = (
  value: any,
  fieldName: string,
  minLength: number,
  maxLength: number
): { valid: boolean; error?: string; trimmed?: string } => {
  if (value === undefined || value === null) {
    return { valid: false, error: `${fieldName} is required` };
  }

  if (typeof value !== 'string') {
    return { valid: false, error: `${fieldName} must be a string` };
  }

  const trimmed = value.trim();

  if (trimmed.length < minLength) {
    return { valid: false, error: `${fieldName} must be at least ${minLength} characters long` };
  }

  if (trimmed.length > maxLength) {
    return { valid: false, error: `${fieldName} must be ${maxLength} characters or less` };
  }

  return { valid: true, trimmed };
};

/**
 * Validates date format and business rules
 */
export const validateDate = (
  date: any,
  fieldName: string = 'Date',
  allowPast: boolean = false,
  maxAdvanceDays?: number
): { valid: boolean; error?: string; parsed?: Date } => {
  if (!date) {
    return { valid: false, error: `${fieldName} is required` };
  }

  if (typeof date !== 'string') {
    return { valid: false, error: `${fieldName} must be a string` };
  }

  // Validate ISO date format (YYYY-MM-DD)
  const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
  if (!dateRegex.test(date)) {
    return { valid: false, error: `${fieldName} must be in YYYY-MM-DD format` };
  }

  const parsedDate = new Date(date);
  parsedDate.setHours(0, 0, 0, 0);

  if (isNaN(parsedDate.getTime())) {
    return { valid: false, error: `${fieldName} is not a valid date` };
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  if (!allowPast && parsedDate < today) {
    return { valid: false, error: `${fieldName} cannot be in the past` };
  }

  if (maxAdvanceDays !== undefined) {
    const maxDate = new Date();
    maxDate.setDate(maxDate.getDate() + maxAdvanceDays);
    if (parsedDate > maxDate) {
      return { valid: false, error: `${fieldName} cannot be more than ${maxAdvanceDays} days in advance` };
    }
  }

  return { valid: true, parsed: parsedDate };
};

/**
 * Validates date range (check-in and check-out dates)
 */
export const validateDateRange = (
  checkIn: any,
  checkOut: any,
  allowPast: boolean = false,
  maxAdvanceDays?: number
): { valid: boolean; error?: string; checkInDate?: Date; checkOutDate?: Date } => {
  const checkInValidation = validateDate(checkIn, 'Check-in date', allowPast, maxAdvanceDays);
  if (!checkInValidation.valid) {
    return { valid: false, error: checkInValidation.error };
  }

  const checkOutValidation = validateDate(checkOut, 'Check-out date', allowPast, maxAdvanceDays);
  if (!checkOutValidation.valid) {
    return { valid: false, error: checkOutValidation.error };
  }

  const checkInDate = checkInValidation.parsed!;
  const checkOutDate = checkOutValidation.parsed!;

  if (checkOutDate <= checkInDate) {
    return { valid: false, error: 'Check-out date must be after check-in date' };
  }

  return { valid: true, checkInDate, checkOutDate };
};

/**
 * Validates price with decimal precision
 */
export const validatePrice = (
  price: any,
  fieldName: string = 'Price',
  min: number = 0,
  max: number = 1000000,
  allowZero: boolean = false
): { valid: boolean; error?: string; parsed?: number } => {
  const priceValidation = validatePositiveNumber(price, fieldName, min, max);
  if (!priceValidation.valid) {
    return priceValidation;
  }

  const parsed = priceValidation.parsed!;

  if (!allowZero && parsed === 0) {
    return { valid: false, error: `${fieldName} must be greater than 0` };
  }

  // Check decimal precision (max 2 decimal places)
  if (parsed % 0.01 !== 0) {
    return { valid: false, error: `${fieldName} can only have up to 2 decimal places` };
  }

  return { valid: true, parsed };
};

/**
 * Validates query parameters (limit, offset)
 */
export const validatePaginationParams = (
  limit: any,
  offset: any,
  maxLimit: number = 100
): { valid: boolean; error?: string; limitValue?: number; offsetValue?: number } => {
  let limitValue = 20; // default
  let offsetValue = 0; // default

  if (limit !== undefined) {
    const limitValidation = validatePositiveInteger(limit, 'Limit');
    if (!limitValidation.valid) {
      return { valid: false, error: limitValidation.error };
    }
    limitValue = limitValidation.parsed!;
    if (limitValue > maxLimit) {
      return { valid: false, error: `Limit cannot exceed ${maxLimit}` };
    }
  }

  if (offset !== undefined) {
    if (typeof offset === 'string') {
      offsetValue = parseInt(offset, 10);
      if (isNaN(offsetValue)) {
        return { valid: false, error: 'Offset must be a valid number' };
      }
    } else if (typeof offset === 'number') {
      offsetValue = offset;
    } else {
      return { valid: false, error: 'Offset must be a number' };
    }

    if (offsetValue < 0) {
      return { valid: false, error: 'Offset must be 0 or greater' };
    }
  }

  return { valid: true, limitValue, offsetValue };
};

/**
 * Validates enum/status value
 */
export const validateEnum = (
  value: any,
  validValues: string[],
  fieldName: string = 'Value'
): { valid: boolean; error?: string } => {
  if (value === undefined || value === null) {
    return { valid: false, error: `${fieldName} is required` };
  }

  if (typeof value !== 'string') {
    return { valid: false, error: `${fieldName} must be a string` };
  }

  if (!validValues.includes(value)) {
    return {
      valid: false,
      error: `Invalid ${fieldName}. Must be one of: ${validValues.join(', ')}`
    };
  }

  return { valid: true };
};

