import React from 'react'

interface TextareaProps {
  value: string
  onChange: (value: string) => void
  placeholder?: string
  rows?: number
  minLength?: number
  maxLength?: number
  label?: string
  hint?: string
  error?: string
  required?: boolean
}

export const Textarea: React.FC<TextareaProps> = ({
  value,
  onChange,
  placeholder,
  rows = 4,
  minLength,
  maxLength,
  label,
  hint,
  error,
  required = false,
}) => {
  const charCount = value.length
  const isValid =
    (minLength === undefined || charCount >= minLength) &&
    (maxLength === undefined || charCount <= maxLength)

  return (
    <div className="w-full">
      {label && (
        <label className="mb-2 block text-sm font-medium text-gray-700">
          {label}
          {required && <span className="ml-1 text-red-500">*</span>}
        </label>
      )}

      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        rows={rows}
        minLength={minLength}
        maxLength={maxLength}
        className={`w-full resize-none rounded-lg border px-4 py-3 transition-all focus:outline-none focus:ring-2 ${
          error ? 'border-red-500 focus:ring-red-200' : 'border-gray-300 focus:ring-blue-200'
        }`}
      />

      <div className="mt-2 flex items-center justify-between">
        <div>
          {hint && !error && <p className="text-sm text-gray-500">{hint}</p>}
          {error && <p className="text-sm text-red-500">{error}</p>}
        </div>

        {(minLength !== undefined || maxLength !== undefined) && (
          <p className={`text-sm ${isValid ? 'text-gray-500' : 'text-orange-500'}`}>
            {charCount}
            {minLength !== undefined && ` / 最少${minLength}`}
            {maxLength !== undefined && ` / 最多${maxLength}`}
          </p>
        )}
      </div>
    </div>
  )
}

export default Textarea

