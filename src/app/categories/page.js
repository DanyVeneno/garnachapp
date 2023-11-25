"use client";
import DeleteButton from "@/components/DeleteButton";
import UserTabs from "@/components/layout/UserTabs";
import { useEffect, useState } from "react";
import { useProfile } from "@/components/UseProfile";
import toast from "react-hot-toast";

export default function CategoriesPage() {
  const [categoryName, setCategoryName] = useState("");
  const [categories, setCategories] = useState([]);
  const { loading: profileLoading, data: profileData } = useProfile();
  const [editedCategory, setEditedCategory] = useState(null);

  useEffect(() => {
    fetchCategories();
  }, []);

  function fetchCategories() {
    fetch("/api/categories").then((res) => {
      res.json().then((categories) => {
        setCategories(categories);
      });
    });
  }

  async function handleCategorySubmit(ev) {
    ev.preventDefault();
    const creationPromise = new Promise(async (resolve, reject) => {
      const data = { name: categoryName };
      if (editedCategory) {
        data._id = editedCategory._id;
      }
      const response = await fetch("/api/categories", {
        method: editedCategory ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data)
      });
      setCategoryName("");
      fetchCategories();
      setEditedCategory(null);
      if (response.ok) resolve();
      else reject();
    });
    await toast.promise(creationPromise, {
      loading: editedCategory
        ? "Actualizando Categoria..."
        : "Creando Nueva Categoria...",
      success: editedCategory ? "Categoria Actualizada" : "Categoria Creada",
      error: "Error, sorry..."
    });
  }

  async function handleDeleteClick(_id) {
    const promise = new Promise(async (resolve, reject) => {
      const response = await fetch("/api/categories?_id=" + _id, {
        method: "DELETE"
      });
      if (response.ok) {
        resolve();
      } else {
        reject();
      }
    });

    await toast.promise(promise, {
      loading: "Eliminando...",
      success: "Eliminado",
      error: "Error"
    });

    fetchCategories();
  }

  if (profileLoading) {
    return "Cargando Info...";
  }

  if (!profileData.admin) {
    return "No Eres Administrador";
  }

  return (
    <section className='mt-8 max-w-2xl mx-auto'>
      <UserTabs isAdmin={true} />
      <form className='mt-8' onSubmit={handleCategorySubmit}>
        <div className='flex gap-2 items-end'>
          <div className='grow'>
            <label>
              {editedCategory ? "Actualizar Categoria" : "Nueva Categoria"}
              {editedCategory && (
                <>
                  : <b>{editedCategory.name}</b>
                </>
              )}
            </label>
            <input
              type='text'
              className='text-zinc-700'
              value={categoryName}
              onChange={(ev) => setCategoryName(ev.target.value)}
            />
          </div>
          <div className='pb-2 flex gap-2'>
            <button className='border border-primary' type='submit'>
              {editedCategory ? "Editar" : "Crear"}
            </button>
            <button
              type='button'
              onClick={() => {
                setEditedCategory(null);
                setCategoryName("");
              }}
            >
              Cancelar
            </button>
          </div>
        </div>
      </form>
      <div>
        <h2 className='mt-8 text-sm text-zinc-300'>Categorias Actuales</h2>
        {categories?.length > 0 &&
          categories.map((c) => (
            <div
              key={c._id}
              className='bg-zinc-500 rounded-xl p-2 px-4 flex gap-1 mb-1 items-center'
            >
              <div className='grow'>{c.name}</div>
              <div className='flex gap-1'>
                <button
                  type='button'
                  onClick={() => {
                    setEditedCategory(c);
                    setCategoryName(c.name);
                  }}
                >
                  Editar
                </button>
                <DeleteButton
                  label='Delete'
                  onDelete={() => handleDeleteClick(c._id)}
                />
              </div>
            </div>
          ))}
      </div>
    </section>
  );
}
