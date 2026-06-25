// Single source of truth: re-export the website's role -> capability mapping so
// the bot and the site never disagree about what a Discord role unlocks.
// (auth-config.ts is pure TypeScript with no server/browser dependencies.)
export {
  ROLE_CAPABILITIES,
  ALL_CAPABILITIES,
  capabilitiesFromRoleNames,
  userCan,
} from "../../../src/lib/auth-config";
export type { Capability, SessionUser } from "../../../src/lib/auth-config";

import type { Capability } from "../../../src/lib/auth-config";

// Friendly labels for each capability, used in bot replies.
export const CAPABILITY_LABELS: Record<Capability, string> = {
  admin: "Admin panel",
  manageOps: "Manage operations",
  members: "Members area",
  rsvp: "Operation RSVP",
  stats: "Performance stats",
};

/** Role names a member has, excluding the implicit @everyone role. */
export function meaningfulRoleNames(names: string[]): string[] {
  return names.filter((n) => n !== "@everyone");
}
