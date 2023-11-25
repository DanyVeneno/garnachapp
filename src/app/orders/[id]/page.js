"use client";
import { CartContext, cartProductPrice } from "@/components/AppContext";
import AddressInputs from "@/components/layout/AddressInputs";
import SectionHeaders from "@/components/layout/SectionHeaders";
import CartProduct from "@/components/menu/CartProduct";
import { useParams } from "next/navigation";
import { useContext, useEffect, useState } from "react";

export default function OrderPage() {
  const { clearCart } = useContext(CartContext);
  const [order, setOrder] = useState();
  const [loadingOrder, setLoadingOrder] = useState(true);
  const { id } = useParams();
  useEffect(() => {
    if (typeof window.console !== "undefined") {
      if (window.location.href.includes("clear-cart=1")) {
        clearCart();
      }
    }
    if (id) {
      setLoadingOrder(true);
      fetch("/api/orders?_id=" + id).then((res) => {
        res.json().then((orderData) => {
          setOrder(orderData);
          setLoadingOrder(false);
        });
      });
    }
  }, []);

  let subtotal = 0;
  if (order?.cartProducts) {
    for (const product of order?.cartProducts) {
      subtotal += cartProductPrice(product);
    }
  }

  return (
    <section className='max-w-2xl mx-auto mt-8 text-primary'>
      <div className='text-center'>
        <SectionHeaders mainHeader='Tu Pedido' />
        <div className='mt-4 mb-8'>
          <p>Gracias por tu Pedido.</p>
          <p>Te llamaremos cuando tu pedido este listo y vaya en camino.</p>
        </div>
      </div>
      {loadingOrder && <div>Cargando Pedido...</div>}
      {order && (
        <div className='grid md:grid-cols-2 md:gap-16 text-primary'>
          <div>
            {order.cartProducts.map((product) => (
              <CartProduct key={product._id} product={product} />
            ))}
            <div className='text-right py-2 text-zinc-300'>
              Subtotal:
              <span className='text-primary font-bold inline-block w-8'>
                ${subtotal}
              </span>
              <br />
              Envio:
              <span className='text-primary font-bold inline-block w-8'>
                $5
              </span>
              <br />
              Total:
              <span className='text-primary font-bold inline-block w-8'>
                ${subtotal + 5}
              </span>
            </div>
          </div>
          <div>
            <div className='bg-gray-300 p-4 rounded-lg'>
              <AddressInputs disabled={true} addressProps={order} />
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
