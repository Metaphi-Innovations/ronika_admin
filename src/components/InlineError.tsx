import React from 'react';

export const InlineError: React.FC<{ error?: string; id?: string }> = ({ error, id }) => {
  if (!error) return null;
  return (
    <div id={id} className="admin-field-error" role="alert" aria-live="polite">
      {error}
    </div>
  );
};
