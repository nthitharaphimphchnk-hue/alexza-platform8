/**
 * Release version for Sentry - shared strategy.
 * Prefer SENTRY_RELEASE, else RENDER_GIT_COMMIT/GIT_SHA/COMMIT_SHA, else "dev-local".
 */

export function getSentryRelease(): string {
  const explicit = (process.env.SENTRY_RELEASE ?? "").trim();
  if (explicit) return explicit;

  const sha =
    (process.env.RENDER_GIT_COMMIT ?? process.env.GIT_SHA ?? process.env.COMMIT_SHA ?? "").trim();
  if (sha) return sha;

  return "dev-local";
}
