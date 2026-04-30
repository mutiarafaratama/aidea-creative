import { Link } from "wouter";
import { motion } from "framer-motion";
import {
  Camera,
  Sparkles,
  Aperture,
  Heart,
  PartyPopper,
  Check,
  ArrowRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { layananList } from "@/lib/layanan-data";

const fadeIn = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.5 } },
};

const iconMap = {
  Aperture,
  Camera,
  Heart,
  PartyPopper,
};

export default function Layanan() {
  return (
    <div className="min-h-screen">
      {/* Hero */}
      <section className="bg-card py-20 border-b border-border">
        <div className="container mx-auto px-4 text-center max-w-3xl">
          <Badge className="mb-5 bg-primary/10 text-primary hover:bg-primary/15 border-0">
            <Sparkles className="mr-1 h-3 w-3" /> Pilih Layanan Anda
          </Badge>
          <h1 className="text-4xl md:text-5xl font-bold mb-6">
            Layanan <span className="text-primary italic">AideaCreative</span>
          </h1>
          <p className="text-lg text-muted-foreground">
            Dari foto seru bareng teman di photobox sampai dokumentasi acara penting — semua kami siapkan
            dengan standar profesional.
          </p>
        </div>
      </section>

      {/* Layanan Utama */}
      <section className="container mx-auto px-4 py-16">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {layananList.map((layanan) => {
            const Icon = iconMap[layanan.iconName];
            return (
              <motion.div
                key={layanan.slug}
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true }}
                variants={fadeIn}
              >
                <Card className="overflow-hidden border-border hover:border-primary/40 transition-all h-full group">
                  <div className={`h-32 bg-gradient-to-br ${layanan.warna} relative flex items-center justify-end p-6`}>
                    <Icon className="absolute -bottom-2 -left-2 text-foreground/5" size={140} />
                    <div className="relative z-10 h-14 w-14 rounded-2xl bg-background border border-border shadow-sm flex items-center justify-center text-primary group-hover:scale-110 transition-transform">
                      <Icon size={26} />
                    </div>
                  </div>
                  <CardContent className="p-6">
                    <p className="text-xs uppercase tracking-wider text-primary font-semibold mb-2">
                      {layanan.tagline}
                    </p>
                    <h3 className="text-2xl font-bold mb-3">{layanan.nama}</h3>
                    <p className="text-sm text-muted-foreground leading-relaxed mb-5">{layanan.deskripsi}</p>
                    <div className="grid grid-cols-2 gap-2 mb-6">
                      {layanan.highlight.map((h) => (
                        <div key={h} className="flex items-center gap-1.5 text-xs text-foreground">
                          <Check size={14} className="text-primary shrink-0" />
                          {h}
                        </div>
                      ))}
                    </div>
                    <div className="flex items-center gap-3">
                      <Link href={`/layanan/${layanan.slug}`} className="flex-1">
                        <Button variant="outline" className="w-full rounded-full">
                          Detail Layanan
                        </Button>
                      </Link>
                      <Link href={`/paket?kategori=${encodeURIComponent(layanan.filter)}`}>
                        <Button className="rounded-full">
                          Lihat Paket <ArrowRight size={16} className="ml-1" />
                        </Button>
                      </Link>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            );
          })}
        </div>
      </section>
    </div>
  );
}
