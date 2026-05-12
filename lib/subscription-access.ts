/** Ultra в API = план ULTIMATE; пробный или активный период. */
export function hasUltimateWorkspaceAccess(sub?: {
  plan?: string;
  status?: string;
} | null): boolean {
  if (!sub?.plan || sub.plan !== "ULTIMATE") return false;
  return sub.status === "ACTIVE" || sub.status === "TRIAL";
}
