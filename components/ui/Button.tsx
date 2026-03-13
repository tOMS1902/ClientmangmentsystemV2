import { ButtonHTMLAttributes } from 'react'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'ghost' | 'muted'
  size?: 'sm' | 'md' | 'lg'
}

export function Button({ variant = 'primary', size = 'md', className = '', children, ...props }: ButtonProps) {
  const base = 'font-label font-semibold tracking-widest uppercase cursor-pointer transition-opacity disabled:opacity-50'

  const variants = {
    primary: 'bg-gold text-navy-deep hover:opacity-90',
    ghost: 'bg-transparent border border-gold text-gold hover:bg-gold hover:text-navy-deep',
    muted: 'bg-navy-card text-white hover:opacity-80',
  }

  const sizes = {
    sm: 'px-4 py-2 text-xs',
    md: 'px-6 py-3 text-xs',
    lg: 'px-8 py-4 text-sm',
  }

  return (
    <button
      className={`${base} ${variants[variant]} ${sizes[size]} ${className}`}
      {...props}
    >
      {children}
    </button>
  )
}
