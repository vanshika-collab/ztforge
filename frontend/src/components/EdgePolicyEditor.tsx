/**
 * EdgePolicyEditor — click an edge to allow/deny traffic and toggle the
 * Zero Trust conditions an attacker must satisfy to traverse it.
 */

import {
  X,
  ShieldCheck,
  ShieldX,
  Check,
  Fingerprint,
  KeyRound,
  Laptop,
  Network,
  BadgeCheck,
} from "lucide-react";
import { CONDITIONS } from "../lib/policy";
import type { EdgePolicy } from "../lib/types";

interface Props {
  policy: EdgePolicy;
  onChange: (policy: EdgePolicy) => void;
  onClose: () => void;
}

const ICONS: Record<string, typeof ShieldCheck> = {
  require_mfa: Fingerprint,
  require_valid_credential: KeyRound,
  require_compliant_device: Laptop,
  enforce_microsegmentation: Network,
  require_valid_certificate: BadgeCheck,
};

export function EdgePolicyEditor({ policy, onChange, onClose }: Props) {
  const isAllow = policy.action === "allow";

  const setAction = (action: "allow" | "deny") => onChange({ ...policy, action });
  const toggle = (key: string) =>
    onChange({
      ...policy,
      conditions: { ...policy.conditions, [key]: !policy.conditions?.[key] },
    });

  return (
    <div className="w-[280px] bg-zinc-900/95 backdrop-blur-sm border border-zinc-800 rounded-xl shadow-2xl overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-zinc-800/70">
        <div className="flex items-center gap-2">
          <ShieldCheck className="w-4 h-4 text-blue-400" />
          <h3 className="text-sm font-semibold text-zinc-200">Edge Policy</h3>
        </div>
        <button onClick={onClose} className="text-zinc-500 hover:text-zinc-200 transition-colors">
          <X className="w-4 h-4" />
        </button>
      </div>

      <div className="p-4">
        {/* Allow / Deny segmented toggle */}
        <div className="flex gap-1 p-1 bg-zinc-800/70 rounded-lg mb-4">
          <button
            onClick={() => setAction("allow")}
            className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-md text-xs font-medium transition-colors ${
              isAllow ? "bg-emerald-500/20 text-emerald-300" : "text-zinc-400 hover:text-zinc-200"
            }`}
          >
            <ShieldCheck className="w-3.5 h-3.5" /> Allow
          </button>
          <button
            onClick={() => setAction("deny")}
            className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-md text-xs font-medium transition-colors ${
              !isAllow ? "bg-rose-500/20 text-rose-300" : "text-zinc-400 hover:text-zinc-200"
            }`}
          >
            <ShieldX className="w-3.5 h-3.5" /> Deny
          </button>
        </div>

        <p className="text-[10px] uppercase tracking-wider text-zinc-500 font-medium mb-2">
          {isAllow ? "Conditions to traverse" : "All traffic blocked"}
        </p>

        {/* Condition toggles */}
        <div className={`flex flex-col gap-1.5 ${isAllow ? "" : "opacity-40 pointer-events-none"}`}>
          {CONDITIONS.map((c) => {
            const Icon = ICONS[c.key] || ShieldCheck;
            const active = !!policy.conditions?.[c.key];
            return (
              <button
                key={c.key}
                onClick={() => toggle(c.key)}
                title={c.hint}
                className={`w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg border text-left transition-colors ${
                  active
                    ? "bg-emerald-500/10 border-emerald-500/30"
                    : "bg-zinc-800/40 border-transparent hover:bg-zinc-800"
                }`}
              >
                <Icon className={`w-4 h-4 shrink-0 ${active ? "text-emerald-400" : "text-zinc-500"}`} />
                <span className="flex flex-col min-w-0 flex-1">
                  <span className={`text-xs font-medium ${active ? "text-zinc-100" : "text-zinc-300"}`}>
                    {c.label}
                  </span>
                  <span className="text-[10px] text-zinc-500 truncate">{c.hint}</span>
                </span>
                <span
                  className={`w-4 h-4 rounded-full flex items-center justify-center shrink-0 ${
                    active ? "bg-emerald-500" : "border border-zinc-600"
                  }`}
                >
                  {active && <Check className="w-3 h-3 text-zinc-950" strokeWidth={3} />}
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
