import { z } from 'zod';

/**
 * Reconstruct a Zod schema from a serialized definition
 */
export function parseZodSchemaFromJson(zodJson: string): z.ZodObject<any> | null {
  try {
    const schemaDef = JSON.parse(zodJson);
    if (!schemaDef.shape) return null;
    
    const shape: Record<string, z.ZodTypeAny> = {};
    
    for (const [key, def] of Object.entries(schemaDef.shape)) {
      const fieldDef = def as any;
      
      if (fieldDef.type === 'enum') {
        const enumSchema = z.enum(fieldDef.values);
        shape[key] = fieldDef.optional ? enumSchema.optional() : enumSchema;
      } else if (fieldDef.type === 'array') {
        const arraySchema = z.array(z.string());
        shape[key] = fieldDef.optional ? arraySchema.optional() : arraySchema;
      } else if (fieldDef.type === 'string') {
        let stringSchema: z.ZodString = z.string();
        
        // Apply format validations
        if (fieldDef.format === 'email') {
          stringSchema = stringSchema.email();
        } else if (fieldDef.format === 'url') {
          stringSchema = stringSchema.url();
        } else if (fieldDef.format === 'datetime') {
          stringSchema = stringSchema.datetime();
        }
        
        // Apply min length if specified
        if (fieldDef.minLength) {
          stringSchema = stringSchema.min(fieldDef.minLength);
        }
        
        shape[key] = fieldDef.optional ? stringSchema.optional() : stringSchema;
      } else if (fieldDef.type === 'literal') {
        const literalSchema = z.literal(fieldDef.value);
        shape[key] = fieldDef.optional ? literalSchema.optional() : literalSchema;
      } else {
        // Default to string
        const stringSchema = z.string();
        shape[key] = fieldDef.optional ? stringSchema.optional() : stringSchema;
      }
    }
    
    return z.object(shape);
  } catch (error) {
    console.error('Failed to parse Zod schema:', error);
    return null;
  }
}

