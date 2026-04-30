import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useListTestimoni, getListTestimoniQueryKey, useCreateTestimoni } from "@workspace/api-client-react";
import { Star, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useAuth } from "@/lib/auth";

const testimoniSchema = z.object({
  namaTampil: z.string().min(2, "Nama harus diisi"),
  rating: z.coerce.number().min(1).max(5),
  komentar: z.string().min(10, "Komentar minimal 10 karakter"),
});

export default function Testimoni() {
  const { toast } = useToast();
  const { user, profile } = useAuth();
  const [open, setOpen] = useState(false);
  const { data: testimoniList, isLoading, refetch } = useListTestimoni({ query: { queryKey: getListTestimoniQueryKey() } });
  const createTestimoni = useCreateTestimoni();

  const form = useForm<z.infer<typeof testimoniSchema>>({
    resolver: zodResolver(testimoniSchema),
    defaultValues: {
      namaTampil: "",
      rating: 5,
      komentar: "",
    },
  });

  const onSubmit = (values: z.infer<typeof testimoniSchema>) => {
    if (!user) {
      toast({ title: "Login diperlukan", description: "Silakan login untuk menulis testimoni.", variant: "destructive" });
      return;
    }
    createTestimoni.mutate({ data: values }, {
      onSuccess: () => {
        toast({ title: "Terima Kasih!", description: "Ulasan Anda sedang menunggu persetujuan admin." });
        setOpen(false);
        form.reset();
        refetch();
      },
      onError: () => {
        toast({ title: "Gagal", description: "Tidak dapat menyimpan ulasan. Coba lagi.", variant: "destructive" });
      }
    });
  };

  return (
    <div className="min-h-screen container mx-auto px-4 py-16">
      <div className="flex flex-col md:flex-row justify-between items-center mb-16 gap-6 text-center md:text-left">
        <div className="max-w-2xl">
          <h1 className="text-4xl md:text-5xl font-serif font-bold mb-4">Pengalaman <span className="text-primary italic">Mereka</span></h1>
          <p className="text-lg text-muted-foreground">
            Baca pengalaman nyata dari klien kami. Kami bangga dapat menjadi bagian dari momen bersejarah dalam hidup mereka.
          </p>
        </div>
        
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button size="lg" className="rounded-full" onClick={() => {
              if (profile?.nama_lengkap) form.setValue("namaTampil", profile.nama_lengkap);
            }}>Bagikan Pengalaman Anda</Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle className="font-serif">Tulis Ulasan</DialogTitle>
              <DialogDescription>
                Bagaimana pengalaman pemotretan Anda bersama AideaCreative?
              </DialogDescription>
            </DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 pt-4">
                <FormField
                  control={form.control}
                  name="namaTampil"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Nama Anda</FormLabel>
                      <FormControl><Input placeholder="John Doe" {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="rating"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Penilaian (1-5)</FormLabel>
                      <div className="flex gap-2">
                        {[1, 2, 3, 4, 5].map((star) => (
                          <button
                            key={star}
                            type="button"
                            onClick={() => field.onChange(star)}
                            className="focus:outline-none"
                          >
                            <Star 
                              size={28} 
                              fill={star <= field.value ? "hsl(var(--primary))" : "none"} 
                              className={star <= field.value ? "text-primary" : "text-muted-foreground"} 
                            />
                          </button>
                        ))}
                      </div>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="komentar"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Ulasan</FormLabel>
                      <FormControl>
                        <Textarea placeholder="Ceritakan pengalaman Anda..." className="resize-none" rows={4} {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <Button type="submit" className="w-full mt-4" disabled={createTestimoni.isPending}>
                  {createTestimoni.isPending ? <Loader2 className="animate-spin mr-2" /> : null}
                  Kirim Ulasan
                </Button>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="columns-1 md:columns-2 lg:columns-3 gap-6 space-y-6">
        {isLoading ? (
          Array(6).fill(0).map((_, i) => (
            <Card key={i} className="break-inside-avoid shadow-sm border-border">
              <CardContent className="p-6">
                <Skeleton className="h-4 w-24 mb-4" />
                <Skeleton className="h-16 w-full mb-6" />
                <div className="flex items-center gap-3">
                  <Skeleton className="h-10 w-10 rounded-full" />
                  <div>
                    <Skeleton className="h-4 w-24 mb-1" />
                    <Skeleton className="h-3 w-16" />
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        ) : testimoniList && testimoniList.length > 0 ? (
          testimoniList.map((testimoni) => (
            <Card key={testimoni.id} className="break-inside-avoid shadow-sm border-border bg-card hover:shadow-md transition-shadow">
              <CardContent className="p-6">
                <div className="flex gap-1 text-primary mb-4">
                  {Array(5).fill(0).map((_, i) => (
                    <Star key={i} size={14} fill={i < testimoni.rating ? "currentColor" : "none"} className={i < testimoni.rating ? "" : "text-muted"} />
                  ))}
                </div>
                <p className="text-foreground italic mb-6">"{testimoni.komentar}"</p>
                <div className="flex items-center gap-3 border-t border-border pt-4">
                  {testimoni.fotoUrl ? (
                    <img src={testimoni.fotoUrl} alt={testimoni.namaTampil} className="w-10 h-10 rounded-full object-cover" />
                  ) : (
                    <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center font-bold text-primary">
                      {testimoni.namaTampil.charAt(0).toUpperCase()}
                    </div>
                  )}
                  <div>
                    <div className="font-bold text-sm">{testimoni.namaTampil}</div>
                    <div className="text-xs text-muted-foreground">Pelanggan AideaCreative</div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        ) : (
          <div className="col-span-full py-20 text-center text-muted-foreground">Belum ada testimoni.</div>
        )}
      </div>
    </div>
  );
}
