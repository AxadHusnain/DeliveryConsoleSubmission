export function generateIdempotencyKey(): string {
  const randomPart = () => Math.random().toString(16).slice(2);
  return `cdid-${Date.now().toString(16)}-${randomPart()}-${randomPart()}`;
}
