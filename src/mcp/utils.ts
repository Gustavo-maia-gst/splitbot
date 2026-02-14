import { z } from 'zod';

export function jsonSchemaToZod(schema: any): z.ZodTypeAny {
  if (!schema || typeof schema !== 'object') {
    return z.any();
  }

  // Clone defensivo pra não mutar o schema original
  const clonedSchema = JSON.parse(JSON.stringify(schema));

  return z.fromJSONSchema(clonedSchema);
}
