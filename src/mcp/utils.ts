import { z } from 'zod';

export function jsonSchemaToZod(schema: any): z.ZodTypeAny {
  if (!schema || typeof schema !== 'object') {
    return z.any();
  }

  // Preprocess schema to enforce minLength: 1 for optional strings
  const preprocessedSchema = preprocessSchema(JSON.parse(JSON.stringify(schema)));

  // Use native Zod conversion
  return z.fromJSONSchema(preprocessedSchema);
}

function preprocessSchema(schema: any): any {
  if (!schema || typeof schema !== 'object') {
    return schema;
  }

  if (schema.type === 'object' && schema.properties) {
    const required = Array.isArray(schema.required) ? schema.required : [];

    for (const [key, prop] of Object.entries(schema.properties) as [string, any][]) {
      // Recurse first
      schema.properties[key] = preprocessSchema(prop);

      const currentProp = schema.properties[key]; // Refetch in case it changed (though preprocess returns mutated or new object)

      // If optional and string and no explicit minLength, set minLength: 1
      if (!required.includes(key)) {
        if (
          currentProp.type === 'string' &&
          !currentProp.enum &&
          currentProp.const === undefined &&
          currentProp.minLength === undefined
        ) {
          currentProp.minLength = 1;
        }
      }
    }
  } else if (schema.type === 'array' && schema.items) {
    // Handle array items if they are schemas
    schema.items = preprocessSchema(schema.items);
  } else if (schema.oneOf) {
    schema.oneOf = schema.oneOf.map(preprocessSchema);
  } else if (schema.anyOf) {
    schema.anyOf = schema.anyOf.map(preprocessSchema);
  } else if (schema.allOf) {
    schema.allOf = schema.allOf.map(preprocessSchema);
  }

  return schema;
}
