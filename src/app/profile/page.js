"use client";
import EditableImage from "@/components/layout/EditableImage";
import InfoBox from "@/components/layout/InfoBox";
import SuccessBox from "@/components/layout/SuccessBox";
import UserForm from "@/components/layout/UserForm";
import UserTabs from "@/components/layout/UserTabs";
import { useSession } from "next-auth/react";
import Image from "next/image";
import Link from "next/link";
import { redirect } from "next/navigation";
import { useEffect, useState } from "react";
import toast from "react-hot-toast";

export default function ProfilePage() {
  const session = useSession();

  const [user, setUser] = useState(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [profileFetched, setProfileFetched] = useState(false);
  const [profileError, setProfileError] = useState("");
  const { status } = session;

  useEffect(() => {
    if (status === "authenticated") {
      fetch("/api/profile")
        .then(async response => {
          if (!response.ok) throw new Error("No se pudo cargar tu perfil.");
          return response.json();
        })
        .then(data => { setUser(data); setIsAdmin(data.admin); })
        .catch(error => setProfileError(error.message))
        .finally(() => setProfileFetched(true));
    }
  }, [status]);

  async function handleProfileInfoUpdate(ev, data) {
    ev.preventDefault();

    const savingPromise = new Promise(async (resolve, reject) => {
      const response = await fetch("/api/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data)
      });
      if (response.ok) resolve();
      else reject();
    });

    await toast.promise(savingPromise, {
      loading: "Guardando...",
      success: "Perfil Guardado!",
      error: "Error"
    });
  }

  if (status === "unauthenticated") {
    return redirect("/login");
  }

  if (status === "loading" || !profileFetched) {
    return "Cargando...";
  }

  if (profileError) return <p role="alert">{profileError}</p>;

  return (
    <section className='mt-8 text-zinc-700'>
      <UserTabs isAdmin={isAdmin} />
      <div className="max-w-2xl mx-auto mt-8 hero place-items-center  before:absolute before:h-[100px] before:w-[380px] before:-translate-x-1/2 before:rounded-full before:bg-gradient-radial before:from-lime before:to-transparent before:blur-2xl before:content-[''] after:absolute after:-z-20 after:h-[180px] after:w-[140px] after:translate-x-1/3 after:bg-gradient-conic after:from-orange-200 after:via-orange-200 after:blur-2xl after:content-[''] before:dark:bg-linear-to-br before:dark:from-transparent before:dark:to-orange-700 before:dark:opacity-10 after:dark:from-orange-900 after:dark:via-[#ea580c] after:dark:opacity-40 before:lg:h-[260px] z-[-1]">
        <UserForm user={user} onSave={handleProfileInfoUpdate} />
      </div>
    </section>
  );
}
