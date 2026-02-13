import { z } from 'zod';

export function jsonSchemaToZod(schema: any): z.ZodTypeAny {
  if (!schema || typeof schema !== 'object') {
    return z.any();
  }

  // enum
  if (schema.enum) {
    return z.enum([...schema.enum] as [string, ...string[]]);
  }

  // const
  if (schema.const !== undefined) {
    return z.literal(schema.const);
  }

  // oneOf / anyOf
  if (schema.oneOf || schema.anyOf) {
    const variants = (schema.oneOf || schema.anyOf).map((s: any) => jsonSchemaToZod(s));
    return z.union(variants as [z.ZodTypeAny, z.ZodTypeAny, ...z.ZodTypeAny[]]);
  }

  // array
  if (schema.type === 'array') {
    const itemSchema = schema.items ? jsonSchemaToZod(schema.items) : z.any();
    return z.array(itemSchema);
  }

  // object
  if (schema.type === 'object') {
    const shape: Record<string, z.ZodTypeAny> = {};
    const required: string[] = schema.required ?? [];

    if (schema.properties) {
      for (const [key, propSchema] of Object.entries(schema.properties)) {
        let fieldSchema = jsonSchemaToZod(propSchema);
        if (!required.includes(key)) {
          fieldSchema = fieldSchema.optional();
        }
        shape[key] = fieldSchema;
      }
    }

    let obj = z.object(shape);

    if (schema.additionalProperties === false) {
      obj = obj.strict();
    }

    return obj;
  }

  // primitives
  if (schema.type === 'string') return z.string();
  if (schema.type === 'number') return z.number();
  if (schema.type === 'integer') return z.number().int();
  if (schema.type === 'boolean') return z.boolean();
  if (schema.type === 'null') return z.null();

  return z.any();
}
