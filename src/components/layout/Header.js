"use client";
import { CartContext } from "@/components/AppContext";
import Bars2 from "@/components/icons/Bars2";
import ShoppingCart from "@/components/icons/ShoppingCart";
import { signOut, useSession } from "next-auth/react";
import Link from "next/link";
import { useContext, useState } from "react";
import Image from "next/image";

function AuthLinks({ status, userName }) {
  if (status === "authenticated") {
    return (
      <>
        <Link href={"/profile"} className='whitespace-nowrap'>
          Hola, {userName}
        </Link>
        <button
          onClick={() => signOut()}
          className='bg-primary rounded-full text-white px-8 py-2'
        >
          Cerrar Sesión
        </button>
      </>
    );
  }
  if (status === "unauthenticated") {
    return (
      <>
        <Link href={"/login"}>Iniciar Sesión</Link>
        <Link
          href={"/register"}
          className='bg-primary rounded-full text-white px-8 py-2'
        >
          Registrarse
        </Link>
      </>
    );
  }
}

export default function Header() {
  const session = useSession();
  const status = session?.status;
  const userData = session.data?.user;
  let userName = userData?.name || userData?.email;
  const { cartProducts } = useContext(CartContext);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  if (userName && userName.includes(" ")) {
    userName = userName.split(" ")[0];
  }
  return (
    <header>
      <div className='flex items-center md:hidden justify-between'>
        <Link className='text-primary font-semibold text-2xl' href={"/"}>
          <Image src='/log.png' width={100} height={50} />
        </Link>
        <div className='flex gap-8 items-center'>
          <Link href={"/cart"} className='relative'>
            <ShoppingCart />
            {cartProducts?.length > 0 && (
              <span className='absolute -top-2 -right-4 bg-primary text-white text-xs py-1 px-1 rounded-full leading-3'>
                {cartProducts.length}
              </span>
            )}
          </Link>
          <button
            className='p-1 border'
            onClick={() => setMobileNavOpen((prev) => !prev)}
          >
            <Bars2 />
          </button>
        </div>
      </div>
      {mobileNavOpen && (
        <div
          onClick={() => setMobileNavOpen(false)}
          className="md:hidden p-4 bg-zinc-600 rounded-lg mt-2 flex flex-col gap-2 text-zinc-200 text-center  before:absolute before:h-[100px] before:w-[380px] before:-translate-x-1/2 before:rounded-full before:bg-gradient-radial before:from-lime before:to-transparent before:blur-2xl before:content-[''] after:absolute after:-z-20 after:h-[180px] after:w-[140px] after:translate-x-1/3 after:bg-gradient-conic after:from-orange-200 after:via-orange-200 after:blur-2xl after:content-[''] before:dark:bg-gradient-to-br before:dark:from-transparent before:dark:to-orange-700 before:dark:opacity-10 after:dark:from-orange-900 after:dark:via-[#ea580c] after:dark:opacity-40 before:lg:h-[260px] z-[-1] opacity-75"
        >
          <Link href={"/"}>Inicio</Link>
          <Link href={"/menu"}>Menu</Link>
          <Link href={"/#about"}>Nosotros</Link>
          <Link href={"/#contact"}>Contacto</Link>
          <AuthLinks status={status} userName={userName} />
        </div>
      )}
      <div className='hidden md:flex items-center justify-between'>
        <nav className='flex items-center gap-8 text-gray-400 font-semibold'>
          <Link className='text-primary font-semibold text-2xl' href={"/"}>
            <Image src='/log.png' width={100} height={50} />
          </Link>
          <Link href={"/"}>Inicio</Link>
          <Link href={"/menu"}>Menu</Link>
          <Link href={"/#about"}>Nosotros</Link>
          <Link href={"/#contact"}>Contacto</Link>
        </nav>
        <nav className='flex items-center gap-4 text-gray-500 font-semibold'>
          <AuthLinks status={status} userName={userName} />
          <Link href={"/cart"} className='relative'>
            <ShoppingCart />
            {cartProducts?.length > 0 && (
              <span className='absolute -top-2 -right-4 bg-primary text-white text-xs py-1 px-1 rounded-full leading-3'>
                {cartProducts.length}
              </span>
            )}
          </Link>
        </nav>
      </div>
    </header>
  );
}
