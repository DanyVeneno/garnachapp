// import Image from "next/image";

import Header from "@/components/layout/Header";
import Hero from "@/components/layout/Hero";
import HomeMenu from "@/components/layout/HomeMenu";
import SectionHeaders from "@/components/layout/SectionHeaders";

export default function Home() {
  return (
    <>
      <Hero />
      <HomeMenu />
      <section className='text-center my-16' id='about'>
        <SectionHeaders
          subHeader={"Venimos de Aqui"}
          mainHeader={"Acerca de Nosotros"}
        />
        <div className='text-gray-500 max-w-md mx-auto mt-4 flex flex-col gap-4'>
          <p>
            En Rolls Burrito Hub, nos dedicamos a ofrecer una experiencia
            culinaria única, llevando los sabores auténticos del norte
            directamente a tu puerta.
          </p>
          <p>
            Nuestros rolls, inspirados en la tradición norteña, combinan
            ingredientes frescos y deliciosos en cada envoltura, ofreciendo una
            fusión perfecta de sabores y texturas.
          </p>
          <p>
            Desde clásicos hasta creaciones innovadoras, cada roll está
            cuidadosamente elaborado para brindar una explosión de autenticidad
            en cada bocado, conectando a nuestros clientes con el corazón mismo
            de la cocina norteña.
          </p>
        </div>
      </section>
      <section className='text-center my-8' id='contact'>
        <SectionHeaders
          subHeader={"No Lo Pienses"}
          mainHeader={"Llamanos ¡Dale Click!"}
        />
        <div className='mt-8'>
          <a className='text-4xl underline text-gray-200' href='tel:5610731990'>
            56 1073-1990
          </a>
        </div>
      </section>
    </>
  );
}
