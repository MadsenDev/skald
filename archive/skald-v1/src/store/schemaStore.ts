import { create } from 'zustand';
import { z } from 'zod';
import { parseZodSchemaFromJson } from '../utils/schemaParser';

export interface Schema {
  id: string;
  name: string;
  zodJson: string;
  createdAt: number;
  updatedAt: number;
}

interface SchemaState {
  schemas: Schema[];
  loadSchemas: () => Promise<void>;
  getSchemaById: (id: string) => Schema | undefined;
  parseSchema: (schema: Schema) => z.ZodObject<any> | null;
}

export const useSchemaStore = create<SchemaState>((set, get) => ({
  schemas: [],

  loadSchemas: async () => {
    try {
      const schemas = await window.api.schema.list();
      set({ schemas });
    } catch (error) {
      console.error('Failed to load schemas:', error);
    }
  },

  getSchemaById: (id: string) => {
    return get().schemas.find(s => s.id === id);
  },

  parseSchema: (schema: Schema) => {
    try {
      const schemaDef = JSON.parse(schema.zodJson);
      // Reconstruct Zod schema from definition
      // This is simplified - in production, use a more robust serialization
      if (schemaDef.shape) {
        const shape: Record<string, z.ZodTypeAny> = {};
        for (const [key, def] of Object.entries(schemaDef.shape)) {
          // Simplified parsing - would need more logic for different Zod types
          if (def && typeof def === 'object') {
            if (def._def?.typeName === 'ZodEnum') {
              shape[key] = z.enum(def._def.values);
            } else if (def._def?.typeName === 'ZodArray') {
              shape[key] = z.array(z.string());
            } else if (def._def?.typeName === 'ZodString') {
              shape[key] = z.string();
            } else if (def._def?.typeName === 'ZodOptional') {
              shape[key] = z.string().optional();
            } else {
              shape[key] = z.string();
            }
          } else {
            shape[key] = z.string();
          }
        }
        return z.object(shape);
      }
      return null;
    } catch (error) {
      console.error('Failed to parse schema:', error);
      return null;
    }
  },
}));

