import { AdminLayout } from "@/components/admin-layout";
import { AdminPromoManager } from "@/components/admin-promo-manager";

export default function AdminPromo() {
  return (
    <AdminLayout
      title="Kelola Banner Promo"
      subtitle="Atur banner promo (marquee atas + kartu di homepage). Hanya promo aktif & dalam periode yang ditampilkan ke pengunjung."
    >
      <AdminPromoManager />
    </AdminLayout>
  );
}
