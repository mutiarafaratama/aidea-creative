import { Router } from "express";
import { requireAuth } from "../middlewares/auth";

const router = Router();

router.get("/me", requireAuth, (req, res) => {
  if (!req.authUser || !req.authProfile) {
    return res.status(401).json({ error: "Tidak terautentikasi." });
  }
  res.json({
    id: req.authUser.id,
    email: req.authUser.email ?? null,
    profile: {
      id: req.authProfile.id,
      namaLengkap: req.authProfile.namaLengkap,
      noTelepon: req.authProfile.noTelepon,
      alamat: req.authProfile.alamat,
      fotoProfil: req.authProfile.fotoProfil,
      role: req.authProfile.role,
    },
  });
});

export default router;
