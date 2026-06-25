// ---------------------------------------------------------------------------
// Auth config — SAFE TO IMPORT ON THE CLIENT.
// This file must NOT contain secrets, tokens, or server-only imports.
// It defines the shape of a logged-in user and how Discord roles map to
// what a user is allowed to do on the site.
// ---------------------------------------------------------------------------

/**
 * Things a user can be allowed to do on the site. Add your own as needed.
 *  - admin     : access the admin panel (edit site content)
 *  - manageOps : create / edit operations on the Operations board
 *  - members   : view members-only content
 *  - rsvp      : RSVP to operations
 *  - stats     : view past-operation performance stats
 */
export type Capability = "admin" | "manageOps" | "members" | "rsvp" | "stats";

export const ALL_CAPABILITIES: Capability[] = ["admin", "manageOps", "members", "rsvp", "stats"];

/** The logged-in user, as stored in the (encrypted) session cookie. */
export type SessionUser = {
  /** Discord user id (snowflake). */
  id: string;
  /** Display name (Discord global name, server nickname, or username). */
  username: string;
  /** Full avatar URL, or null if the user has no custom avatar. */
  avatarUrl: string | null;
  /** Discord role ids the user has in your server. */
  roleIds: string[];
  /** Human-readable role names the user has in your server. */
  roleNames: string[];
  /** Capabilities derived from those roles (see ROLE_CAPABILITIES). */
  capabilities: Capability[];
  /** Whether the user is actually a member of your Discord server. */
  isMember: boolean;
};

// ---------------------------------------------------------------------------
// ROLE → CAPABILITY MAPPING
//
// EDIT THIS to match the role names in YOUR Discord server.
// `role` is matched case-insensitively against the user's Discord roles.
// A user gets the UNION of capabilities from every matching role.
// ---------------------------------------------------------------------------
export const ROLE_CAPABILITIES: { role: string; grants: Capability[] }[] = [
  { role: "Admin", grants: ["admin", "manageOps", "members", "rsvp", "stats"] },
  { role: "Officer", grants: ["manageOps", "members", "rsvp", "stats"] },
  { role: "SLB", grants: ["members", "rsvp", "stats"] },
  { role: "Member", grants: ["members", "rsvp", "stats"] },
];

/** Compute capabilities from a list of Discord role names. */
export function capabilitiesFromRoleNames(roleNames: string[]): Capability[] {
  const have = new Set(roleNames.map((n) => n.toLowerCase()));
  const caps = new Set<Capability>();
  for (const { role, grants } of ROLE_CAPABILITIES) {
    if (have.has(role.toLowerCase())) {
      for (const g of grants) caps.add(g);
    }
  }
  return [...caps];
}

/** True if the user exists and has the given capability. */
export function userCan(user: SessionUser | null | undefined, cap: Capability): boolean {
  return !!user && user.capabilities.includes(cap);
}
