/**
 * Pre-built example architectures. Loading one creates a populated canvas
 * so new users can run a breach simulation immediately and see how policies
 * block (or fail to block) an attacker.
 */

interface ExNode {
  id: string;
  type: string;
  position: { x: number; y: number };
  data: {
    label: string;
    node_type: string;
    properties: Record<string, unknown>;
    classification?: string;
    compliance_status?: string;
  };
}

interface ExEdge {
  id: string;
  source: string;
  target: string;
  label?: string;
  animated?: boolean;
  policy: { action: "allow" | "deny"; conditions: Record<string, unknown> };
}

export interface Example {
  id: string;
  name: string;
  description: string;
  nodes: ExNode[];
  edges: ExEdge[];
}

const n = (
  id: string,
  node_type: string,
  label: string,
  x: number,
  y: number,
  properties: Record<string, unknown> = {},
  extra: Partial<ExNode["data"]> = {},
): ExNode => ({ id, type: node_type, position: { x, y }, data: { label, node_type, properties, ...extra } });

export const EXAMPLES: Example[] = [
  {
    id: "hardened",
    name: "Corporate Zero Trust (Hardened)",
    description:
      "MFA, device compliance and micro-segmentation. Run 'Stolen Credential' — the attacker is blocked at MFA.",
    nodes: [
      n("emp", "identity", "Employee", 60, 140, { segment: "corp" }),
      n("laptop", "device", "Corp Laptop", 60, 320, { segment: "corp" }, { compliance_status: "compliant" }),
      n("api", "application", "Internal API", 340, 140, { segment: "corp" }),
      n("db", "data", "Customer Database", 620, 140, { segment: "restricted" }, { classification: "PII" }),
    ],
    edges: [
      { id: "e1", source: "emp", target: "api", label: "MFA + creds", policy: { action: "allow", conditions: { require_mfa: true, require_valid_credential: true } } },
      { id: "e2", source: "api", target: "db", label: "compliant + segmented", policy: { action: "allow", conditions: { require_compliant_device: true, enforce_microsegmentation: true, require_valid_credential: true } } },
      { id: "e3", source: "laptop", target: "api", label: "device check", policy: { action: "allow", conditions: { require_compliant_device: true } } },
    ],
  },
  {
    id: "flat",
    name: "Flat Network (Insecure Baseline)",
    description:
      "Allow-all policies, no segmentation. Run any scenario — the attacker walks straight to the data.",
    nodes: [
      n("user", "identity", "User", 60, 140, { segment: "corp" }),
      n("web", "application", "Web App", 340, 140, { segment: "corp" }),
      n("db", "data", "App Database", 620, 140, { segment: "corp" }, { classification: "sensitive" }),
    ],
    edges: [
      { id: "e1", source: "user", target: "web", policy: { action: "allow", conditions: {} } },
      { id: "e2", source: "web", target: "db", policy: { action: "allow", conditions: {} } },
    ],
  },
  {
    id: "dmz",
    name: "DMZ Web Service",
    description:
      "Public DMZ in front of internal services. Run 'Lateral from DMZ' to see segmentation stop the spread.",
    nodes: [
      n("dmz", "network_segment", "DMZ", 60, 160, { segment: "dmz" }),
      n("web", "application", "Public Web Server", 300, 160, { segment: "dmz" }),
      n("app", "application", "App Server", 540, 80, { segment: "internal" }),
      n("db", "data", "Records DB", 780, 160, { segment: "restricted" }, { classification: "confidential" }),
    ],
    edges: [
      { id: "e1", source: "dmz", target: "web", policy: { action: "allow", conditions: {} } },
      { id: "e2", source: "web", target: "app", label: "segmented", policy: { action: "allow", conditions: { enforce_microsegmentation: true, require_valid_credential: true } } },
      { id: "e3", source: "app", target: "db", label: "segmented + device", policy: { action: "allow", conditions: { enforce_microsegmentation: true, require_compliant_device: true } } },
    ],
  },
];
