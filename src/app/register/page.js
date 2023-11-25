"use client";
import { signIn } from "next-auth/react";
import Image from "next/image";
import Link from "next/link";
import { useState } from "react";

export default function RegisterPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [creatingUser, setCreatingUser] = useState(false);
  const [userCreated, setUserCreated] = useState(false);
  const [error, setError] = useState(false);
  async function handleFormSubmit(ev) {
    ev.preventDefault();
    setCreatingUser(true);
    setError(false);
    setUserCreated(false);
    const response = await fetch("/api/register", {
      method: "POST",
      body: JSON.stringify({ email, password }),
      headers: { "Content-Type": "application/json" }
    });
    if (response.ok) {
      setUserCreated(true);
    } else {
      setError(true);
    }
    setCreatingUser(false);
  }
  return (
    <section className='mt-8'>
      <h1 className='text-center text-primary text-4xl mb-4'>Registro</h1>
      {userCreated && (
        <div className='my-4 text-center'>
          Usuario Creado.
          <br />
          Ahora puedes{" "}
          <Link className='underline' href={"/login"}>
            Iniciar Sesión &raquo;
          </Link>
        </div>
      )}
      {error && (
        <div className='my-4 text-center'>
          A ocurrido un error.
          <br />
          Asegurate de que los datos sean correctos
        </div>
      )}
      <form className='block max-w-xs mx-auto' onSubmit={handleFormSubmit}>
        <input
          type='email'
          placeholder='email'
          value={email}
          disabled={creatingUser}
          onChange={(ev) => setEmail(ev.target.value)}
        />
        <input
          type='password'
          placeholder='password'
          value={password}
          disabled={creatingUser}
          onChange={(ev) => setPassword(ev.target.value)}
        />
        <button type='submit' disabled={creatingUser}>
          Registrame
        </button>
        <div className='my-4 text-center text-gray-500'>
          ó puedes iniciar sesión con
        </div>
        <button
          onClick={() => signIn("google", { callbackUrl: "/" })}
          className='flex gap-4 justify-center'
        >
          <Image src={"/google.png"} alt={""} width={24} height={24} />
          Registrarme con google
        </button>
        <div className='text-center my-4 text-gray-500 border-t pt-4'>
          ¿Si ya tienes cuenta?{" "}
          <Link className='underline' href={"/login"}>
            Inicia Sesión Aqui &raquo;
          </Link>
        </div>
      </form>
    </section>
  );
}
