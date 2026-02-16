/**
 * Form Validation Utilities
 * Reusable validation functions for forms across the application
 */

export interface ValidationError {
  field: string;
  message: string;
}

export interface ValidationResult {
  isValid: boolean;
  errors: ValidationError[];
}

// Email validation
export const validateEmail = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

// Password validation (min 8 chars, 1 uppercase, 1 number)
export const validatePassword = (password: string): boolean => {
  return password.length >= 8 && /[A-Z]/.test(password) && /[0-9]/.test(password);
};

// Required field validation
export const validateRequired = (value: string): boolean => {
  return value.trim().length > 0;
};

// Login form validation
export const validateLoginForm = (data: {
  email: string;
  password: string;
}): ValidationResult => {
  const errors: ValidationError[] = [];

  if (!validateRequired(data.email)) {
    errors.push({ field: "email", message: "Email is required" });
  } else if (!validateEmail(data.email)) {
    errors.push({ field: "email", message: "Please enter a valid email address" });
  }

  if (!validateRequired(data.password)) {
    errors.push({ field: "password", message: "Password is required" });
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
};

// Signup form validation
export const validateSignupForm = (data: {
  email: string;
  password: string;
  confirmPassword: string;
  company?: string;
}): ValidationResult => {
  const errors: ValidationError[] = [];

  if (!validateRequired(data.email)) {
    errors.push({ field: "email", message: "Email is required" });
  } else if (!validateEmail(data.email)) {
    errors.push({ field: "email", message: "Please enter a valid email address" });
  }

  if (!validateRequired(data.password)) {
    errors.push({ field: "password", message: "Password is required" });
  } else if (!validatePassword(data.password)) {
    errors.push({
      field: "password",
      message: "Password must be at least 8 characters with 1 uppercase letter and 1 number",
    });
  }

  if (!validateRequired(data.confirmPassword)) {
    errors.push({ field: "confirmPassword", message: "Please confirm your password" });
  } else if (data.password !== data.confirmPassword) {
    errors.push({ field: "confirmPassword", message: "Passwords do not match" });
  }

  if (data.company && !validateRequired(data.company)) {
    errors.push({ field: "company", message: "Company name is required" });
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
};

// Project creation validation
export const validateProjectForm = (data: {
  name: string;
  description?: string;
  model?: string;
}): ValidationResult => {
  const errors: ValidationError[] = [];

  if (!validateRequired(data.name)) {
    errors.push({ field: "name", message: "Project name is required" });
  } else if (data.name.length < 3) {
    errors.push({ field: "name", message: "Project name must be at least 3 characters" });
  } else if (data.name.length > 50) {
    errors.push({ field: "name", message: "Project name must not exceed 50 characters" });
  }

  if (data.description && data.description.length > 500) {
    errors.push({ field: "description", message: "Description must not exceed 500 characters" });
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
};

// API Key name validation
export const validateApiKeyForm = (data: {
  name: string;
}): ValidationResult => {
  const errors: ValidationError[] = [];

  if (!validateRequired(data.name)) {
    errors.push({ field: "name", message: "API key name is required" });
  } else if (data.name.length < 3) {
    errors.push({ field: "name", message: "API key name must be at least 3 characters" });
  } else if (data.name.length > 50) {
    errors.push({ field: "name", message: "API key name must not exceed 50 characters" });
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
};

// Get error message for a specific field
export const getFieldError = (errors: ValidationError[], fieldName: string): string | null => {
  const error = errors.find((e) => e.field === fieldName);
  return error ? error.message : null;
};

// Check if field has error
export const hasFieldError = (errors: ValidationError[], fieldName: string): boolean => {
  return errors.some((e) => e.field === fieldName);
};
