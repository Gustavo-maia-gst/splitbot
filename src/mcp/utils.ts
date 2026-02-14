import { z } from 'zod';

export function jsonSchemaToZod(schema: any): z.ZodTypeAny {
  if (!schema || typeof schema !== 'object') {
    return z.any();
  }

  const clonedSchema = JSON.parse(JSON.stringify(schema));
  const normalizedSchema = allowNullIfDefault(clonedSchema);

  return z.fromJSONSchema(normalizedSchema);
}

function allowNullIfDefault(schema: any): any {
  if (!schema || typeof schema !== 'object') return schema;

  // Se tem default, permite null
  if (schema.default !== undefined) {
    if (schema.type) {
      if (Array.isArray(schema.type)) {
        if (!schema.type.includes('null')) {
          schema.type.push('null');
        }
      } else if (schema.type !== 'null') {
        schema.type = [schema.type, 'null'];
      }
    } else if (schema.anyOf || schema.oneOf) {
      // deixa pros ramos abaixo
    } else {
      // sem type explícito, adiciona anyOf
      schema.anyOf = [{}, { type: 'null' }];
    }
  }

  if (schema.type === 'object' && schema.properties) {
    for (const key of Object.keys(schema.properties)) {
      schema.properties[key] = allowNullIfDefault(schema.properties[key]);
    }
  }

  if (schema.items) {
    schema.items = allowNullIfDefault(schema.items);
  }

  if (schema.anyOf) {
    schema.anyOf = schema.anyOf.map(allowNullIfDefault);
  }

  if (schema.oneOf) {
    schema.oneOf = schema.oneOf.map(allowNullIfDefault);
  }

  if (schema.allOf) {
    schema.allOf = schema.allOf.map(allowNullIfDefault);
  }

  return schema;
}

export function cleanArgs(obj: any): any {
  if (obj === null || obj === undefined) return undefined;

  if (Array.isArray(obj)) {
    const arr = obj.map(cleanArgs).filter((v) => v !== undefined);
    return arr.length > 0 ? arr : undefined;
  }

  if (typeof obj === 'object') {
    const entries = Object.entries(obj)
      .map(([k, v]) => [k, cleanArgs(v)] as const)
      .filter(([_, v]) => v !== undefined);

    return entries.length > 0 ? Object.fromEntries(entries) : undefined;
  }

  // mantém falsy válidos tipo 0, false, ""
  return obj;
}
kj;
