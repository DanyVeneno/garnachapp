"use client";
import { SessionProvider } from "next-auth/react";
import { createContext, useCallback, useMemo, useSyncExternalStore } from "react";
import toast from "react-hot-toast";

export const CartContext = createContext({});
const cartEvent = "garnachapp:cart";
let memoryCart = "[]";
function readCart() {
  try { return window.localStorage.getItem("cart") || "[]"; } catch { return memoryCart; }
}
function parseCart(raw) {
  try { const value = JSON.parse(raw); return Array.isArray(value) ? value.filter(item => item && typeof item === "object" && Number.isFinite(item.basePrice)) : []; }
  catch { return []; }
}
function subscribe(callback) {
  window.addEventListener("storage", callback);
  window.addEventListener(cartEvent, callback);
  return () => { window.removeEventListener("storage", callback); window.removeEventListener(cartEvent, callback); };
}
function updateCart(value) {
  const current = parseCart(readCart());
  memoryCart = JSON.stringify(typeof value === "function" ? value(current) : value);
  try { window.localStorage.setItem("cart", memoryCart); } catch { /* Keep a working cart when storage is unavailable. */ }
  window.dispatchEvent(new Event(cartEvent));
}
export function cartProductPrice(cartProduct) {
  let price = cartProduct.basePrice;
  if (cartProduct.size) price += cartProduct.size.price;
  for (const extra of cartProduct.extras || []) price += extra.price;
  return price;
}
export function AppProvider({ children }) {
  const snapshot = useSyncExternalStore(subscribe, readCart, () => "[]");
  const cartProducts = useMemo(() => parseCart(snapshot), [snapshot]);
  const clearCart = useCallback(() => updateCart([]), []);
  const removeCartProduct = useCallback(index => {
    updateCart(items => items.filter((_, currentIndex) => currentIndex !== index));
    toast.success("Producto eliminado");
  }, []);
  const addToCart = useCallback((product, size = null, extras = []) => {
    updateCart(items => [...items, { ...product, size, extras }]);
  }, []);
  return (
    <SessionProvider>
      <CartContext.Provider value={{ cartProducts, setCartProducts: updateCart, clearCart, removeCartProduct, addToCart }}>
        {children}
      </CartContext.Provider>
    </SessionProvider>
  );
}
