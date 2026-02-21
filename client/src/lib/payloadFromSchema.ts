/**
 * Generate a sample JSON payload from inputSchema for Test/Playground.
 * inputSchema describes the request body (e.g. { input: string } or { input: { text: string } }).
 */

function sampleFromProp(prop: Record<string, unknown>): unknown {
  const type = String(prop.type ?? "string");
  if (type === "string") return prop.example ?? "Hello";
  if (type === "number" || type === "integer") return typeof prop.example === "number" ? prop.example : 0;
  if (type === "boolean") return prop.example === true || prop.example === false ? prop.example : false;
  if (type === "array") return Array.isArray(prop.example) ? prop.example : [];
  if (type === "object") {
    const innerProps = prop.properties as Record<string, unknown> | undefined;
    if (innerProps && typeof innerProps === "object") {
      const inner: Record<string, unknown> = {};
      for (const [ik, ip] of Object.entries(innerProps)) {
        const innerP = ip as Record<string, unknown> | undefined;
        inner[ik] = innerP ? sampleFromProp(innerP as Record<string, unknown>) : "";
      }
      return inner;
    }
    return {};
  }
  return prop.example ?? "";
}

export function generateSamplePayload(inputSchema: Record<string, unknown> | null | undefined): string {
  if (!inputSchema || typeof inputSchema !== "object") {
    return '{"input": {"text": "Hello"}}';
  }

  const props = inputSchema.properties as Record<string, unknown> | undefined;
  if (!props || typeof props !== "object") {
    return '{"input": {"text": "Hello"}}';
  }

  const body: Record<string, unknown> = {};
  for (const [key, prop] of Object.entries(props)) {
    const p = prop as Record<string, unknown> | undefined;
    if (!p || typeof p !== "object") continue;
    body[key] = sampleFromProp(p);
  }

  if (Object.keys(body).length === 0) {
    return '{"input": {"text": "Hello"}}';
  }

  return JSON.stringify(body, null, 2);
}

/** Lightweight client-side validation: valid JSON, has "input" key (string or object) */
export function validatePayloadLight(
  jsonStr: string
): { valid: true; payload: Record<string, unknown> } | { valid: false; error: string } {
  let parsed: unknown;
  try {
    parsed = JSON.parse(jsonStr);
  } catch {
    return { valid: false, error: "Invalid JSON" };
  }
  if (!parsed || typeof parsed !== "object") {
    return { valid: false, error: "Payload must be an object" };
  }
  const obj = parsed as Record<string, unknown>;
  if (!("input" in obj)) {
    return { valid: false, error: 'Body must have "input" field. Use { "input": "..." } or { "input": { "text": "..." } }' };
  }
  if (obj.input !== null && typeof obj.input !== "object" && typeof obj.input !== "string") {
    return { valid: false, error: '"input" must be a string or object' };
  }
  return { valid: true, payload: obj };
}
