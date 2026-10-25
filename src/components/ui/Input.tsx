import type { InputHTMLAttributes, ReactNode, SelectHTMLAttributes, TextareaHTMLAttributes } from 'react';

type FieldProps = {
  label: string;
  hint?: string;
  error?: string;
  prefix?: ReactNode;
  id: string;
};

export function Input({ label, hint, error, prefix, id, ...rest }: FieldProps & InputHTMLAttributes<HTMLInputElement>) {
  return (
    <div className={`ds-field${error ? ' is-error' : ''}`}>
      <label htmlFor={id}>{label}</label>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        {prefix && <span className="ds-money" style={{ color: '#475569' }}>{prefix}</span>}
        <input id={id} aria-invalid={error ? true : undefined} aria-describedby={error ? `${id}-err` : undefined} {...rest} />
      </div>
      {error ? <span className="ds-error" id={`${id}-err`}>{error}</span> : hint ? <span className="ds-hint">{hint}</span> : null}
    </div>
  );
}

export function Select({ label, hint, error, id, children, ...rest }: FieldProps & SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <div className={`ds-field${error ? ' is-error' : ''}`}>
      <label htmlFor={id}>{label}</label>
      <select id={id} aria-invalid={error ? true : undefined} {...rest}>{children}</select>
      {error ? <span className="ds-error">{error}</span> : hint ? <span className="ds-hint">{hint}</span> : null}
    </div>
  );
}

export function Textarea({ label, hint, error, id, ...rest }: FieldProps & TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <div className={`ds-field${error ? ' is-error' : ''}`}>
      <label htmlFor={id}>{label}</label>
      <textarea id={id} aria-invalid={error ? true : undefined} {...rest} />
      {error ? <span className="ds-error">{error}</span> : hint ? <span className="ds-hint">{hint}</span> : null}
    </div>
  );
}
