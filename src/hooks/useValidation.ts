import { useState, useCallback } from 'react';
import { useAlert } from '../context/AlertContext';

export function useValidation<T extends string>() {
  const [errors, setErrors] = useState<Partial<Record<T, string>>>({});
  const alert = useAlert();

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
      alert.warning('Please complete the highlighted fields.');
      setTimeout(() => {
        const el = document.getElementById(`field-${firstInvalidField}`);
        if (el) {
          el.scrollIntoView({ behavior: 'smooth', block: 'center' });
          
          // Check if it's a Tiptap editor by looking for .tiptap child
          const tiptapContent = el.querySelector('.tiptap');
          if (tiptapContent) {
            (tiptapContent as HTMLElement).focus({ preventScroll: true });
          } else {
            el.focus({ preventScroll: true });
          }
        }
      }, 50);
      return false;
    }

    return true;
  }, [alert]);

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
