"use client";
import { CartContext, cartProductPrice } from "@/components/AppContext";
import Trash from "@/components/icons/Trash";
import AddressInputs from "@/components/layout/AddressInputs";
import SectionHeaders from "@/components/layout/SectionHeaders";
import CartProduct from "@/components/menu/CartProduct";
import { useProfile } from "@/components/UseProfile";
import Image from "next/image";
import { useContext, useEffect, useState } from "react";
import toast from "react-hot-toast";

export default function CartPage() {
  const { cartProducts, removeCartProduct } = useContext(CartContext);
  const [addressOverrides, setAddressOverrides] = useState({});
  const { data: profileData } = useProfile();

  useEffect(() => {
    if (typeof window !== "undefined") {
      if (window.location.href.includes("canceled=1")) {
        toast.error("El pago fue cancelado. No se realizó el cobro.");
      }
    }
  }, []);

  const address = Object.fromEntries(["phone", "streetAddress", "postalCode", "city", "country"].map(key => [key, addressOverrides[key] ?? profileData?.[key] ?? ""]));

  let subtotal = 0;
  for (const p of cartProducts) {
    subtotal += cartProductPrice(p);
  }
  function handleAddressChange(propName, value) {
    setAddressOverrides((prevAddress) => ({ ...prevAddress, [propName]: value }));
  }
  async function proceedToCheckout(ev) {
    ev.preventDefault();
    // address and shopping cart products

    const promise = new Promise((resolve, reject) => {
      fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          address,
          cartProducts,
        }),
      }).then(async (response) => {
        if (response.ok) {
          const checkoutUrl = await response.json();
          window.location = checkoutUrl;
          resolve();
        } else {
          const error = await response.json();
          reject(new Error(error.error || "No se pudo preparar el pago"));
        }
      }).catch(reject);
    });

    await toast.promise(promise, {
      loading: "Preparando tu Pedido...",
      success: "Ir A Pagar...",
      error: "Algo Esta Mal... Por Favor Revisa Tus Datos",
    });
  }

  if (cartProducts?.length === 0) {
    return (
      <section className='mt-8 text-center'>
        <SectionHeaders mainHeader='Carrito' />
        <p className='mt-4'>Tu Carrito De Compra Esta Vacio 😔</p>
      </section>
    );
  }

  return (
    <section className='mt-8 text-zinc-700'>
      <div className='text-center'>
        <SectionHeaders mainHeader='Carrito' />
      </div>
      <div className='mt-8 grid gap-8 grid-cols-1 md:grid-cols-2'>
        <div>
          {cartProducts?.length === 0 && (
            <div>No hay productos en tu carrito de compras</div>
          )}
          {cartProducts?.length > 0 &&
            cartProducts.map((product, index) => (
              <CartProduct
                key={index}
                product={product}
                onRemove={() => removeCartProduct(index)}
              />
            ))}
          <div className='py-2 pr-16 flex justify-end items-center'>
            <div className='text-zinc-700'>
              Subtotal:
              <br />
              Entrega:
              <br />
              Total:
            </div>
            <div className='font-semibold pl-2 text-right text-primary'>
              ${subtotal}
              <br />
              $5
              <br />${subtotal + 5}
            </div>
          </div>
        </div>
        <div className='bg-orange-50 p-4 rounded-lg'>
          <h2>Finalizar Compra</h2>
          <form onSubmit={proceedToCheckout}>
            <AddressInputs
              addressProps={address}
              setAddressProp={handleAddressChange}
            />
            <button type='submit'>Pagar ${subtotal + 5}</button>
          </form>
        </div>
      </div>
    </section>
  );
}
