import { env } from "cloudflare:workers";
import { createRemoteJWKSet, jwtVerify, type JWTPayload } from "jose";
import { headers } from "next/headers";
import { redirect } from "next/navigation";

export type AppUser = {
  userId: string;
  displayName: string;
  email: string;
  fullName: string | null;
  isDemo: boolean;
};

type AccessClaims = JWTPayload & { email?: string };

const demoUser: AppUser = {
  userId: "local-demo-user",
  displayName: "An Nguyễn",
  email: "demo@spendly.local",
  fullName: "An Nguyễn",
  isDemo: true,
};

const jwksByIssuer = new Map<string, ReturnType<typeof createRemoteJWKSet>>();

export async function getAppUser(): Promise<AppUser | null> {
  const requestHeaders = await headers();
  const host = requestHeaders.get("host")?.split(":")[0] ?? "";
  if (host === "localhost" || host === "127.0.0.1" || host === "[::1]") {
    return demoUser;
  }

  const token = requestHeaders.get("cf-access-jwt-assertion");
  if (!token) return null;

  const issuer = normalizeTeamDomain(env.CF_ACCESS_TEAM_DOMAIN);
  const audience = env.CF_ACCESS_AUD?.trim();
  if (!issuer || !audience || audience === "REPLACE_WITH_ACCESS_AUD") return null;

  try {
    const jwks = getJwks(issuer);
    const { payload } = await jwtVerify<AccessClaims>(token, jwks, {
      issuer,
      audience,
    });
    if (!payload.sub || !payload.email) return null;

    const email = payload.email.toLowerCase();
    const displayName = nameFromEmail(email);
    return {
      userId: payload.sub,
      displayName,
      email,
      fullName: displayName,
      isDemo: false,
    };
  } catch {
    return null;
  }
}

export async function requireAppUser(): Promise<AppUser> {
  const user = await getAppUser();
  if (user) return user;
  redirect("/login");
}

function normalizeTeamDomain(value: string | undefined): string | null {
  const trimmed = value?.trim().replace(/\/$/, "");
  if (!trimmed || trimmed === "REPLACE_WITH_TEAM_DOMAIN") return null;
  return trimmed.startsWith("https://") ? trimmed : `https://${trimmed}`;
}

function getJwks(issuer: string) {
  const existing = jwksByIssuer.get(issuer);
  if (existing) return existing;
  const jwks = createRemoteJWKSet(new URL(`${issuer}/cdn-cgi/access/certs`));
  jwksByIssuer.set(issuer, jwks);
  return jwks;
}

function nameFromEmail(email: string): string {
  return email
    .split("@")[0]
    .split(/[._-]+/)
    .filter(Boolean)
    .map((part) => `${part.charAt(0).toUpperCase()}${part.slice(1)}`)
    .join(" ");
}
