import { Router } from "express";
import { db, profilesTable, usersAuthTable } from "@workspace/db";
import { eq, and } from "drizzle-orm";
import { signToken, ensureProfile } from "../middlewares/auth";

const router = Router();

const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID ?? "";
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET ?? "";

function getRedirectUri(req: import("express").Request): string {
  const custom = process.env.GOOGLE_REDIRECT_URI;
  if (custom) return custom;
  const domain = process.env.REPLIT_DEV_DOMAIN ?? req.hostname;
  return `https://${domain}/api/auth/google/callback`;
}

function getFrontendBase(req: import("express").Request): string {
  const domain = process.env.REPLIT_DEV_DOMAIN ?? req.hostname;
  return `https://${domain}`;
}

router.get("/auth/google", (req, res) => {
  if (!GOOGLE_CLIENT_ID) {
    res.status(503).json({ error: "Google OAuth belum dikonfigurasi." });
    return;
  }

  const redirectUri = getRedirectUri(req);
  const state = (req.query.redirect as string) ?? "/";

  const params = new URLSearchParams({
    client_id: GOOGLE_CLIENT_ID,
    redirect_uri: redirectUri,
    response_type: "code",
    scope: "openid email profile",
    access_type: "offline",
    prompt: "select_account",
    state,
  });

  res.redirect(`https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`);
});

router.get("/auth/google/callback", async (req, res) => {
  try {
    const code = req.query.code as string | undefined;
    const state = (req.query.state as string | undefined) ?? "/";

    if (!code) {
      res.redirect(`${getFrontendBase(req)}/login?error=google_cancelled`);
      return;
    }

    if (!GOOGLE_CLIENT_ID || !GOOGLE_CLIENT_SECRET) {
      res.redirect(`${getFrontendBase(req)}/login?error=oauth_not_configured`);
      return;
    }

    const redirectUri = getRedirectUri(req);

    const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        code,
        client_id: GOOGLE_CLIENT_ID,
        client_secret: GOOGLE_CLIENT_SECRET,
        redirect_uri: redirectUri,
        grant_type: "authorization_code",
      }),
    });

    if (!tokenRes.ok) {
      req.log?.error?.({ status: tokenRes.status }, "Google token exchange failed");
      res.redirect(`${getFrontendBase(req)}/login?error=google_token_failed`);
      return;
    }

    const tokenData = (await tokenRes.json()) as { access_token?: string; error?: string };

    if (!tokenData.access_token) {
      res.redirect(`${getFrontendBase(req)}/login?error=google_no_token`);
      return;
    }

    const userInfoRes = await fetch("https://www.googleapis.com/oauth2/v2/userinfo", {
      headers: { Authorization: `Bearer ${tokenData.access_token}` },
    });

    if (!userInfoRes.ok) {
      res.redirect(`${getFrontendBase(req)}/login?error=google_userinfo_failed`);
      return;
    }

    const googleUser = (await userInfoRes.json()) as {
      id: string;
      email: string;
      name?: string;
      picture?: string;
      verified_email?: boolean;
    };

    if (!googleUser.email) {
      res.redirect(`${getFrontendBase(req)}/login?error=google_no_email`);
      return;
    }

    const normalizedEmail = googleUser.email.trim().toLowerCase();

    const [existingAuth] = await db
      .select()
      .from(usersAuthTable)
      .where(eq(usersAuthTable.email, normalizedEmail));

    let profileId: string;

    if (existingAuth) {
      profileId = existingAuth.profileId;

      if (existingAuth.provider === "email") {
        await db
          .update(usersAuthTable)
          .set({
            provider: "google",
            providerId: googleUser.id,
            emailVerified: googleUser.verified_email ?? true,
            updatedAt: new Date(),
          })
          .where(eq(usersAuthTable.id, existingAuth.id));
      }
    } else {
      const [newProfile] = await db
        .insert(profilesTable)
        .values({
          namaLengkap: googleUser.name ?? normalizedEmail.split("@")[0],
          fotoProfil: googleUser.picture ?? null,
          role: "pelanggan",
        })
        .returning();

      profileId = newProfile.id;

      await db.insert(usersAuthTable).values({
        profileId,
        email: normalizedEmail,
        passwordHash: null,
        provider: "google",
        providerId: googleUser.id,
        emailVerified: googleUser.verified_email ?? true,
      });
    }

    const profile = await ensureProfile(profileId, normalizedEmail);
    const token = signToken({ id: profileId, email: normalizedEmail });

    const safeRedirect =
      state && state.startsWith("/") && !state.startsWith("/dashboard/login")
        ? state
        : "/";

    const frontendBase = getFrontendBase(req);
    res.redirect(
      `${frontendBase}/auth/callback?token=${encodeURIComponent(token)}&redirect=${encodeURIComponent(safeRedirect)}`
    );
  } catch (err) {
    req.log?.error?.({ err }, "Google OAuth callback error");
    res.redirect(`${getFrontendBase(req)}/login?error=server_error`);
  }
});

export default router;
