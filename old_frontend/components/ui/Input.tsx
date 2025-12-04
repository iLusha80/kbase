import React from 'react';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
}

export const Input: React.FC<InputProps> = ({ label, error, className = '', id, ...props }) => {
  const inputId = id || props.name;

  return (
    <div className="w-full">
      {label && (
        <label htmlFor={inputId} className="block text-sm font-medium text-slate-700 mb-1">
          {label}
        </label>
      )}
      <input
        id={inputId}
        className={`
          w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 placeholder-slate-400
          focus:border-primary-600 focus:outline-none focus:ring-1 focus:ring-primary-600
          disabled:cursor-not-allowed disabled:opacity-50
          ${error ? 'border-red-500 focus:border-red-500 focus:ring-red-500' : ''}
          ${className}
        `}
        {...props}
      />
      {error && <p className="mt-1 text-sm text-red-600">{error}</p>}
    </div>
  );
};

interface TextAreaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
}

export const TextArea: React.FC<TextAreaProps> = ({ label, className = '', id, ...props }) => {
  const areaId = id || props.name;
  return (
    <div className="w-full">
      {label && (
        <label htmlFor={areaId} className="block text-sm font-medium text-slate-700 mb-1">
          {label}
        </label>
      )}
      <textarea
        id={areaId}
        className={`
          w-full min-h-[80px] rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 placeholder-slate-400
          focus:border-primary-600 focus:outline-none focus:ring-1 focus:ring-primary-600
          disabled:cursor-not-allowed disabled:opacity-50
          ${className}
        `}
        {...props}
      />
    </div>
  );
};