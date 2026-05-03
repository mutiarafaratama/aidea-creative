import { createContext, useContext, useState, useEffect, type ReactNode } from "react";

export type CartItem = {
  produkId: string;
  namaProduk: string;
  harga: number;
  stok: number;
  gambarUrl: string | null;
  qty: number;
};

type CartContextValue = {
  items: CartItem[];
  addToCart: (item: Omit<CartItem, "qty">, qty?: number) => void;
  removeFromCart: (produkId: string) => void;
  updateQty: (produkId: string, qty: number) => void;
  clearCart: () => void;
  totalItems: number;
  totalHarga: number;
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
};

const CartContext = createContext<CartContextValue | undefined>(undefined);

const CART_KEY = "aidea_cart_v1";

export function CartProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<CartItem[]>(() => {
    try {
      const s = localStorage.getItem(CART_KEY);
      return s ? JSON.parse(s) : [];
    } catch {
      return [];
    }
  });
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    localStorage.setItem(CART_KEY, JSON.stringify(items));
  }, [items]);

  const addToCart = (item: Omit<CartItem, "qty">, qty = 1) => {
    setItems((prev) => {
      const existing = prev.find((i) => i.produkId === item.produkId);
      if (existing) {
        return prev.map((i) =>
          i.produkId === item.produkId
            ? { ...i, qty: Math.min(i.qty + qty, item.stok) }
            : i
        );
      }
      return [...prev, { ...item, qty: Math.min(qty, item.stok) }];
    });
    setIsOpen(true);
  };

  const removeFromCart = (produkId: string) => {
    setItems((prev) => prev.filter((i) => i.produkId !== produkId));
  };

  const updateQty = (produkId: string, qty: number) => {
    setItems((prev) =>
      qty <= 0
        ? prev.filter((i) => i.produkId !== produkId)
        : prev.map((i) => (i.produkId === produkId ? { ...i, qty } : i))
    );
  };

  const clearCart = () => setItems([]);

  const totalItems = items.reduce((sum, i) => sum + i.qty, 0);
  const totalHarga = items.reduce((sum, i) => sum + i.harga * i.qty, 0);

  return (
    <CartContext.Provider
      value={{ items, addToCart, removeFromCart, updateQty, clearCart, totalItems, totalHarga, isOpen, setIsOpen }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart must be used within CartProvider");
  return ctx;
}
