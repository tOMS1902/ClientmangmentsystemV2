import { InputHTMLAttributes } from 'react'

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string
}

export function Input({ label, className = '', id, ...props }: InputProps) {
  const inputId = id || label?.toLowerCase().replace(/\s+/g, '-')

  return (
    <div className="flex flex-col gap-1">
      {label && (
        <label htmlFor={inputId} className="text-sm text-white/85 font-body">
          {label}
        </label>
      )}
      <input
        id={inputId}
        className={`bg-navy-mid border border-white/20 text-white/85 px-3 py-2.5 text-sm focus:outline-none focus:border-gold transition-colors ${className}`}
        {...props}
      />
    </div>
  )
}
