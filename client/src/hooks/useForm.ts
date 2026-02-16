import { useState, useCallback } from "react";
import { ValidationError, ValidationResult } from "@/lib/validation";

interface UseFormOptions<T> {
  initialValues: T;
  onSubmit: (values: T) => Promise<void> | void;
  validate: (values: T) => ValidationResult;
}

interface UseFormReturn<T> {
  values: T;
  errors: ValidationError[];
  isSubmitting: boolean;
  isValid: boolean;
  setFieldValue: (field: keyof T, value: any) => void;
  setFieldError: (field: string, message: string) => void;
  clearFieldError: (field: string) => void;
  clearErrors: () => void;
  handleChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => void;
  handleSubmit: (e: React.FormEvent<HTMLFormElement>) => Promise<void>;
  reset: () => void;
}

export function useForm<T extends Record<string, any>>(
  options: UseFormOptions<T>
): UseFormReturn<T> {
  const [values, setValues] = useState<T>(options.initialValues);
  const [errors, setErrors] = useState<ValidationError[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const setFieldValue = useCallback((field: keyof T, value: any) => {
    setValues((prev) => ({
      ...prev,
      [field]: value,
    }));
    // Clear error for this field when user starts typing
    setErrors((prev) => prev.filter((e) => e.field !== String(field)));
  }, []);

  const setFieldError = useCallback((field: string, message: string) => {
    setErrors((prev) => {
      const filtered = prev.filter((e) => e.field !== field);
      return [...filtered, { field, message }];
    });
  }, []);

  const clearFieldError = useCallback((field: string) => {
    setErrors((prev) => prev.filter((e) => e.field !== field));
  }, []);

  const clearErrors = useCallback(() => {
    setErrors([]);
  }, []);

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
      const { name, value, type } = e.target;
      const fieldValue = type === "checkbox" ? (e.target as HTMLInputElement).checked : value;
      setFieldValue(name as keyof T, fieldValue);
    },
    [setFieldValue]
  );

  const handleSubmit = useCallback(
    async (e: React.FormEvent<HTMLFormElement>) => {
      e.preventDefault();

      // Validate
      const validationResult = options.validate(values);
      if (!validationResult.isValid) {
        setErrors(validationResult.errors);
        return;
      }

      // Clear errors and submit
      setErrors([]);
      setIsSubmitting(true);

      try {
        await options.onSubmit(values);
      } catch (error) {
        console.error("Form submission error:", error);
      } finally {
        setIsSubmitting(false);
      }
    },
    [values, options]
  );

  const reset = useCallback(() => {
    setValues(options.initialValues);
    setErrors([]);
    setIsSubmitting(false);
  }, [options.initialValues]);

  const isValid = errors.length === 0;

  return {
    values,
    errors,
    isSubmitting,
    isValid,
    setFieldValue,
    setFieldError,
    clearFieldError,
    clearErrors,
    handleChange,
    handleSubmit,
    reset,
  };
}
