import { z } from 'zod';
import { getDatabase } from './index.js';
import { saveDatabase } from './index.js';

export interface Schema {
  id: string;
  name: string;
  zodJson: string; // JSON stringified Zod schema
  createdAt: number;
  updatedAt: number;
}

export async function insertSchema(schema: Omit<Schema, 'id' | 'createdAt' | 'updatedAt'> & { id?: string }): Promise<string> {
  const database = getDatabase();
  const id = schema.id || crypto.randomUUID();
  const now = Date.now();
  
  const schemaRecord: Schema = {
    id,
    name: schema.name,
    zodJson: schema.zodJson,
    updatedAt: now,
    createdAt: now,
  };
  
  database.schemas.set(id, schemaRecord);
  saveDatabase();
  return id;
}

export async function getSchema(id: string): Promise<Schema | null> {
  const database = getDatabase();
  return database.schemas.get(id) || null;
}

export async function getAllSchemas(): Promise<Schema[]> {
  const database = getDatabase();
  return Array.from(database.schemas.values()).sort((a, b) => a.name.localeCompare(b.name));
}

export async function updateSchema(id: string, updates: Partial<Pick<Schema, 'name' | 'zodJson'>>): Promise<void> {
  const database = getDatabase();
  const schema = database.schemas.get(id);
  
  if (!schema) {
    throw new Error(`Schema ${id} not found`);
  }
  
  const updated: Schema = {
    ...schema,
    ...updates,
    updatedAt: Date.now(),
  };
  
  database.schemas.set(id, updated);
  saveDatabase();
}

export async function deleteSchema(id: string): Promise<void> {
  const database = getDatabase();
  database.schemas.delete(id);
  saveDatabase();
}

// Helper to parse and validate a Zod schema from JSON
// Note: This is kept for backward compatibility, but the frontend uses parseZodSchemaFromJson
export function parseZodSchema(zodJson: string): z.ZodTypeAny {
  try {
    const schemaDef = JSON.parse(zodJson);
    // Reconstruct Zod schema from definition
    // This is a simplified version - in production, you'd want a more robust schema serialization
    return z.object(schemaDef.shape || {});
  } catch (error) {
    throw new Error(`Failed to parse Zod schema: ${error}`);
  }
}

// Helper to serialize a Zod schema to JSON
// This stores enough information to reconstruct the schema
export function serializeZodSchema(schema: z.ZodObject<any>): string {
  const shape: Record<string, any> = {};
  
  for (const [key, fieldSchema] of Object.entries(schema.shape)) {
    const def = (fieldSchema as any)._def;
    if (!def) {
      shape[key] = { type: 'string' };
      continue;
    }
    
    const typeName = def.typeName;
    const isOptional = def.typeName === 'ZodOptional';
    const innerType = isOptional ? def.innerType._def.typeName : typeName;
    
    if (innerType === 'ZodEnum') {
      const enumDef = isOptional ? def.innerType._def : def;
      shape[key] = {
        type: 'enum',
        values: enumDef.values || [],
        optional: isOptional,
      };
    } else if (innerType === 'ZodArray') {
      shape[key] = {
        type: 'array',
        elementType: 'string', // Simplified
        optional: isOptional,
      };
    } else if (innerType === 'ZodString') {
      const stringDef = isOptional ? def.innerType._def : def;
      shape[key] = {
        type: 'string',
        optional: isOptional,
        // Check for email/url/datetime validations
        format: stringDef.checks?.find((c: any) => c.kind === 'email') ? 'email' :
                stringDef.checks?.find((c: any) => c.kind === 'url') ? 'url' :
                stringDef.checks?.find((c: any) => c.kind === 'datetime') ? 'datetime' : undefined,
      };
    } else if (innerType === 'ZodLiteral') {
      shape[key] = {
        type: 'literal',
        value: def.value,
        optional: isOptional,
      };
    } else {
      shape[key] = {
        type: 'string',
        optional: isOptional,
      };
    }
  }
  
  return JSON.stringify({ shape });
}

