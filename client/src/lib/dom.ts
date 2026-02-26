/**
 * Safe DOM removal - prevents "Failed to execute 'removeChild' on 'Node'" when
 * the node was already removed by React or another party.
 * Use for cleanup in effects that manually append/remove DOM nodes (canvas, etc).
 */
export function safeRemove(node?: Node | null): void {
  if (!node) return;
  const parent = (node as Node & { parentNode?: Node | null }).parentNode;
  if (parent && parent.contains(node)) {
    parent.removeChild(node);
  }
}
