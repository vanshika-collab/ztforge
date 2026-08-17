/**
 * Shared edge-policy metadata and view helpers.
 * One source of truth for the policy editor (UI) and the canvas (labels/colors).
 */

import type { EdgePolicy } from "./types";

export const CONDITIONS: { key: string; label: string; hint: string; short: string }[] = [
  { key: "require_mfa", label: "Require MFA", hint: "Attacker must have completed multi-factor auth", short: "MFA" },
  { key: "require_valid_credential", label: "Require valid credential", hint: "Must present valid credentials", short: "Creds" },
  { key: "require_compliant_device", label: "Require compliant device", hint: "Device must be managed / compliant", short: "Device" },
  { key: "enforce_microsegmentation", label: "Enforce micro-segmentation", hint: "Block traffic crossing network segments", short: "Segment" },
  { key: "require_valid_certificate", label: "Require valid certificate", hint: "Reject expired or revoked certificates", short: "Cert" },
];

/** Short human-readable summary used as the edge label. */
export function policySummary(policy?: EdgePolicy | null): string {
  if (!policy || policy.action !== "allow") return "Deny";
  const on = CONDITIONS.filter((c) => policy.conditions?.[c.key]).map((c) => c.short);
  return on.length ? `Allow: ${on.join(", ")}` : "Allow (any)";
}

/** Edge stroke color: green = allow, grey = deny. */
export function edgeColor(policy?: EdgePolicy | null): string {
  return policy && policy.action === "allow" ? "#10b981" : "#71717a";
}

export const DEFAULT_POLICY: EdgePolicy = { action: "deny", conditions: {} };
