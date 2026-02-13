import { z } from 'zod';

export function jsonSchemaToZod(schema: any): z.ZodTypeAny {
  if (!schema || schema.type !== 'object' || !schema.properties) {
    return z.object({});
  }

  const shape: Record<string, z.ZodTypeAny> = {};

  for (const [key, prop] of Object.entries(schema.properties)) {
    let field: z.ZodTypeAny = z.any();

    if ((prop as any).type === 'string') field = z.string();
    else if ((prop as any).type === 'number') field = z.number();
    else if ((prop as any).type === 'boolean') field = z.boolean();
    else if ((prop as any).type === 'array') field = z.array(z.any());
    else if ((prop as any).type === 'object') field = z.object({});

    if (!schema.required?.includes(key)) {
      field = field.optional();
    }

    shape[key] = field;
  }

  return z.object(shape);
}
