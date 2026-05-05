import { Router } from "express";
import bcrypt from "bcryptjs";
import { db, profilesTable, usersAuthTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { signToken, ensureProfile } from "../middlewares/auth";

const router = Router();

router.post("/auth/register", async (req, res) => {
  try {
    const { email, password, namaLengkap, noTelepon } = req.body as {
      email?: string;
      password?: string;
      namaLengkap?: string;
      noTelepon?: string;
    };

    if (!email || !password || !namaLengkap) {
      res.status(400).json({ error: "Email, password, dan nama lengkap wajib diisi." });
      return;
    }

    const normalizedEmail = email.trim().toLowerCase();

    const [existing] = await db
      .select()
      .from(usersAuthTable)
      .where(eq(usersAuthTable.email, normalizedEmail));

    if (existing) {
      res.status(400).json({ error: "Email sudah terdaftar." });
      return;
    }

    const passwordHash = await bcrypt.hash(password, 12);

    const [profile] = await db
      .insert(profilesTable)
      .values({
        namaLengkap: namaLengkap.trim(),
        noTelepon: noTelepon?.trim() || null,
        role: "pelanggan",
      })
      .returning();

    await db.insert(usersAuthTable).values({
      profileId: profile.id,
      email: normalizedEmail,
      passwordHash,
    });

    const token = signToken({ id: profile.id, email: normalizedEmail });

    res.cookie("auth_token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 30 * 24 * 60 * 60 * 1000,
      path: "/",
    });

    res.status(201).json({
      token,
      user: { id: profile.id, email: normalizedEmail },
      profile: {
        id: profile.id,
        namaLengkap: profile.namaLengkap,
        noTelepon: profile.noTelepon,
        alamat: profile.alamat,
        fotoProfil: profile.fotoProfil,
        role: profile.role,
      },
    });
  } catch (err) {
    req.log?.error?.({ err }, "Register error");
    res.status(500).json({ error: "Gagal mendaftar." });
  }
});

router.post("/auth/login", async (req, res) => {
  try {
    const { email, password } = req.body as { email?: string; password?: string };

    if (!email || !password) {
      res.status(400).json({ error: "Email dan password wajib diisi." });
      return;
    }

    const normalizedEmail = email.trim().toLowerCase();

    const [userAuth] = await db
      .select()
      .from(usersAuthTable)
      .where(eq(usersAuthTable.email, normalizedEmail));

    if (!userAuth) {
      res.status(401).json({ error: "Email atau password salah." });
      return;
    }

    const valid = await bcrypt.compare(password, userAuth.passwordHash);
    if (!valid) {
      res.status(401).json({ error: "Email atau password salah." });
      return;
    }

    const profile = await ensureProfile(userAuth.profileId, normalizedEmail);

    const token = signToken({ id: userAuth.profileId, email: normalizedEmail });

    res.cookie("auth_token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 30 * 24 * 60 * 60 * 1000,
      path: "/",
    });

    res.json({
      token,
      user: { id: userAuth.profileId, email: normalizedEmail },
      profile: {
        id: profile.id,
        namaLengkap: profile.namaLengkap,
        noTelepon: profile.noTelepon,
        alamat: profile.alamat,
        fotoProfil: profile.fotoProfil,
        role: profile.role,
      },
    });
  } catch (err) {
    req.log?.error?.({ err }, "Login error");
    res.status(500).json({ error: "Gagal login." });
  }
});

router.post("/auth/supabase-exchange", async (req, res) => {
  try {
    const { access_token } = req.body as { access_token?: string };

    if (!access_token) {
      res.status(400).json({ error: "access_token diperlukan." });
      return;
    }

    const supabaseUrl = process.env.VITE_SUPABASE_URL;
    if (!supabaseUrl) {
      res.status(503).json({ error: "Supabase belum dikonfigurasi." });
      return;
    }

    const userRes = await fetch(`${supabaseUrl}/auth/v1/user`, {
      headers: {
        Authorization: `Bearer ${access_token}`,
        apikey: process.env.SUPABASE_SERVICE_ROLE_KEY ?? "",
      },
    });

    if (!userRes.ok) {
      res.status(401).json({ error: "Token Supabase tidak valid." });
      return;
    }

    const supabaseUser = (await userRes.json()) as {
      id: string;
      email?: string;
      user_metadata?: { full_name?: string; avatar_url?: string; name?: string };
      email_confirmed_at?: string;
    };

    if (!supabaseUser.email) {
      res.status(400).json({ error: "Email tidak ditemukan dari akun Google." });
      return;
    }

    const normalizedEmail = supabaseUser.email.trim().toLowerCase();
    const displayName =
      supabaseUser.user_metadata?.full_name ??
      supabaseUser.user_metadata?.name ??
      normalizedEmail.split("@")[0];
    const avatarUrl = supabaseUser.user_metadata?.avatar_url ?? null;

    const [existingAuth] = await db
      .select()
      .from(usersAuthTable)
      .where(eq(usersAuthTable.email, normalizedEmail));

    let profileId: string;

    if (existingAuth) {
      profileId = existingAuth.profileId;
      await db
        .update(usersAuthTable)
        .set({
          provider: "google",
          providerId: supabaseUser.id,
          emailVerified: Boolean(supabaseUser.email_confirmed_at),
          updatedAt: new Date(),
        })
        .where(eq(usersAuthTable.id, existingAuth.id));
    } else {
      const [newProfile] = await db
        .insert(profilesTable)
        .values({
          namaLengkap: displayName,
          fotoProfil: avatarUrl,
          role: "pelanggan",
        })
        .returning();

      profileId = newProfile.id;

      await db.insert(usersAuthTable).values({
        profileId,
        email: normalizedEmail,
        passwordHash: null,
        provider: "google",
        providerId: supabaseUser.id,
        emailVerified: Boolean(supabaseUser.email_confirmed_at),
      });
    }

    const profile = await ensureProfile(profileId, normalizedEmail);
    const token = signToken({ id: profileId, email: normalizedEmail });

    res.cookie("auth_token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 30 * 24 * 60 * 60 * 1000,
      path: "/",
    });

    res.json({
      token,
      user: { id: profileId, email: normalizedEmail },
      profile: {
        id: profile.id,
        namaLengkap: profile.namaLengkap,
        noTelepon: profile.noTelepon,
        alamat: profile.alamat,
        fotoProfil: profile.fotoProfil,
        role: profile.role,
      },
    });
  } catch (err) {
    req.log?.error?.({ err }, "Supabase exchange error");
    res.status(500).json({ error: "Gagal memproses login Google." });
  }
});

router.post("/auth/logout", (req, res) => {
  res.clearCookie("auth_token", { path: "/" });
  res.json({ ok: true });
});

router.get("/auth/me", async (req, res) => {
  try {
    const token =
      req.headers.authorization?.startsWith("Bearer ")
        ? req.headers.authorization.slice(7)
        : (req.cookies?.["auth_token"] as string | undefined);

    if (!token) {
      res.status(401).json({ error: "Tidak terautentikasi." });
      return;
    }

    const { verifyToken } = await import("../middlewares/auth");
    const payload = verifyToken(token);
    if (!payload) {
      res.status(401).json({ error: "Session tidak valid." });
      return;
    }

    const profile = await ensureProfile(payload.id, payload.email);

    res.json({
      user: { id: payload.id, email: payload.email },
      profile: {
        id: profile.id,
        namaLengkap: profile.namaLengkap,
        noTelepon: profile.noTelepon,
        alamat: profile.alamat,
        fotoProfil: profile.fotoProfil,
        role: profile.role,
      },
    });
  } catch (err) {
    req.log?.error?.({ err }, "Auth me error");
    res.status(500).json({ error: "Gagal memuat profil." });
  }
});

export default router;
