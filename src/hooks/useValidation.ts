import { useState, useCallback } from 'react';

export function useValidation<T extends string>() {
  const [errors, setErrors] = useState<Partial<Record<T, string>>>({});

  const validate = useCallback((rules: Partial<Record<T, () => string | null | undefined>>) => {
    const newErrors: Partial<Record<T, string>> = {};
    let firstInvalidField: string | null = null;

    for (const key in rules) {
      const validator = rules[key];
      if (validator) {
        const errorMsg = validator();
        if (errorMsg) {
          newErrors[key] = errorMsg;
          if (!firstInvalidField) firstInvalidField = key;
        }
      }
    }

    setErrors(newErrors);

    if (firstInvalidField) {
      setTimeout(() => {
        const el = document.getElementById(`field-${firstInvalidField}`);
        if (el) {
          el.focus();
        }
      }, 50);
      return false;
    }

    return true;
  }, []);

  const clearError = useCallback((field: T) => {
    setErrors(prev => {
      if (!prev[field]) return prev;
      const next = { ...prev };
      delete next[field];
      return next;
    });
  }, []);

  const clearAll = useCallback(() => setErrors({}), []);

  return { errors, validate, clearError, clearAll, setErrors };
}
