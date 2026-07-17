import { useState, useEffect } from 'react';
import { z } from 'zod';

interface FrontmatterEditorProps {
  frontmatter: Record<string, any>;
  schema?: z.ZodObject<any>;
  onChange: (frontmatter: Record<string, any>) => void;
  errors?: z.ZodError | null;
}

export function FrontmatterEditor({ frontmatter, schema, onChange, errors }: FrontmatterEditorProps) {
  const [localFrontmatter, setLocalFrontmatter] = useState<Record<string, any>>(frontmatter);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    setLocalFrontmatter(frontmatter);
  }, [frontmatter]);

  useEffect(() => {
    if (errors) {
      const newFieldErrors: Record<string, string> = {};
      errors.errors.forEach((error) => {
        const path = error.path.join('.');
        newFieldErrors[path] = error.message;
      });
      setFieldErrors(newFieldErrors);
    } else {
      setFieldErrors({});
    }
  }, [errors]);

  const handleFieldChange = (key: string, value: any) => {
    const updated = { ...localFrontmatter, [key]: value };
    setLocalFrontmatter(updated);
    onChange(updated);
  };

  const handleArrayAdd = (key: string) => {
    const current = localFrontmatter[key] || [];
    handleFieldChange(key, [...current, '']);
  };

  const handleArrayRemove = (key: string, index: number) => {
    const current = localFrontmatter[key] || [];
    handleFieldChange(key, current.filter((_: any, i: number) => i !== index));
  };

  const handleArrayItemChange = (key: string, index: number, value: any) => {
    const current = localFrontmatter[key] || [];
    const updated = [...current];
    updated[index] = value;
    handleFieldChange(key, updated);
  };

  if (!schema) {
    return (
      <div className="p-4 text-sm text-gray-500">
        No schema selected. Select a schema to edit frontmatter.
      </div>
    );
  }

  const shape = schema.shape;
  const fields = Object.keys(shape);

  const renderField = (fieldKey: string) => {
    const fieldSchema = shape[fieldKey];
    const value = localFrontmatter[fieldKey];
    const error = fieldErrors[fieldKey];
    const isRequired = !fieldSchema.isOptional();

    // Check field type
    if (fieldSchema instanceof z.ZodArray) {
      // Array field
      return (
        <div key={fieldKey}>
          <label className="block text-sm font-medium mb-1" style={{ color: 'var(--theme-text-primary)' }}>
            {fieldKey}
            {isRequired && <span className="ml-1" style={{ color: 'var(--theme-error)' }}>*</span>}
          </label>
          <div className="space-y-2">
            {(value || []).map((item: any, index: number) => (
              <div key={index} className="flex gap-2">
                <input
                  type="text"
                  value={item}
                  onChange={(e) => handleArrayItemChange(fieldKey, index, e.target.value)}
                  className="flex-1 px-3 py-2 border rounded-lg focus:outline-none focus:ring-2"
                  style={{
                    backgroundColor: 'var(--theme-bg-primary)',
                    color: 'var(--theme-text-primary)',
                    borderColor: error ? 'var(--theme-error)' : 'var(--theme-border-primary)',
                  }}
                  onFocus={(e) => {
                    e.target.style.borderColor = error ? 'var(--theme-error)' : 'var(--theme-accent)';
                    e.target.style.boxShadow = `0 0 0 2px color-mix(in srgb, var(--theme-accent) 25%, transparent)`;
                  }}
                  onBlur={(e) => {
                    e.target.style.borderColor = error ? 'var(--theme-error)' : 'var(--theme-border-primary)';
                    e.target.style.boxShadow = 'none';
                  }}
                />
                <button
                  onClick={() => handleArrayRemove(fieldKey, index)}
                  className="px-3 py-2 rounded-lg"
                  style={{
                    color: 'var(--theme-error)',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = `color-mix(in srgb, var(--theme-error) 10%, var(--theme-bg-primary))`;
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = 'transparent';
                  }}
                >
                  Remove
                </button>
              </div>
            ))}
            <button
              onClick={() => handleArrayAdd(fieldKey)}
              className="text-sm"
              style={{ color: 'var(--theme-accent)' }}
              onMouseEnter={(e) => {
                e.currentTarget.style.color = 'var(--theme-accent-hover)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.color = 'var(--theme-accent)';
              }}
            >
              + Add item
            </button>
          </div>
          {error && <p className="mt-1 text-sm" style={{ color: 'var(--theme-error)' }}>{error}</p>}
        </div>
      );
    }

    if (fieldSchema instanceof z.ZodEnum) {
      // Enum/select field
      return (
        <div key={fieldKey}>
          <label className="block text-sm font-medium mb-1" style={{ color: 'var(--theme-text-primary)' }}>
            {fieldKey}
            {isRequired && <span className="ml-1" style={{ color: 'var(--theme-error)' }}>*</span>}
          </label>
          <select
            value={value || ''}
            onChange={(e) => handleFieldChange(fieldKey, e.target.value)}
            className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2"
            style={{
              backgroundColor: 'var(--theme-bg-primary)',
              color: 'var(--theme-text-primary)',
              borderColor: error ? 'var(--theme-error)' : 'var(--theme-border-primary)',
            }}
            onFocus={(e) => {
              e.target.style.borderColor = error ? 'var(--theme-error)' : 'var(--theme-accent)';
              e.target.style.boxShadow = `0 0 0 2px color-mix(in srgb, var(--theme-accent) 25%, transparent)`;
            }}
            onBlur={(e) => {
              e.target.style.borderColor = error ? 'var(--theme-error)' : 'var(--theme-border-primary)';
              e.target.style.boxShadow = 'none';
            }}
          >
            <option value="">Select...</option>
            {fieldSchema.options.map((option: string) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
          {error && <p className="mt-1 text-sm" style={{ color: 'var(--theme-error)' }}>{error}</p>}
        </div>
      );
    }

    // Determine input type based on field name and schema
    let inputType = 'text';
    if (fieldKey.toLowerCase().includes('email')) inputType = 'email';
    else if (fieldKey.toLowerCase().includes('url')) inputType = 'url';
    else if (fieldKey.toLowerCase().includes('date') || fieldKey.toLowerCase().includes('due')) {
      inputType = 'datetime-local';
    }

    return (
      <div key={fieldKey}>
        <label className="block text-sm font-medium mb-1" style={{ color: 'var(--theme-text-primary)' }}>
          {fieldKey}
          {isRequired && <span className="ml-1" style={{ color: 'var(--theme-error)' }}>*</span>}
        </label>
        <input
          type={inputType}
          value={value || ''}
          onChange={(e) => handleFieldChange(fieldKey, e.target.value)}
          className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2"
          style={{
            backgroundColor: 'var(--theme-bg-primary)',
            color: 'var(--theme-text-primary)',
            borderColor: error ? 'var(--theme-error)' : 'var(--theme-border-primary)',
            focusRingColor: 'var(--theme-accent)',
          }}
          onFocus={(e) => {
            e.target.style.borderColor = error ? 'var(--theme-error)' : 'var(--theme-accent)';
            e.target.style.boxShadow = `0 0 0 2px color-mix(in srgb, var(--theme-accent) 25%, transparent)`;
          }}
          onBlur={(e) => {
            e.target.style.borderColor = error ? 'var(--theme-error)' : 'var(--theme-border-primary)';
            e.target.style.boxShadow = 'none';
          }}
        />
        {error && <p className="mt-1 text-sm" style={{ color: 'var(--theme-error)' }}>{error}</p>}
      </div>
    );
  };

  return (
    <div className="p-4 space-y-4">
      {fields.map(renderField)}
    </div>
  );
}
