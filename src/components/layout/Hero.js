import Image from "next/image";
import Right from "@/components/icons/Right";

export default function Hero() {
  return (
    <section className="hero place-items-center text-center before:absolute before:h-[100px] before:w-[380px] before:-translate-x-1/2 before:rounded-full before:bg-gradient-radial before:from-lime before:to-transparent before:blur-2xl before:content-[''] after:absolute after:-z-20 after:h-[180px] after:w-[140px] after:translate-x-1/3 after:bg-gradient-conic after:from-lime-200 after:via-lime-200 after:blur-2xl after:content-[''] before:dark:bg-gradient-to-br before:dark:from-transparent before:dark:to-lime-700 before:dark:opacity-10 after:dark:from-lime-900 after:dark:via-[#84cc16] after:dark:opacity-40 before:lg:h-[260px] z-[-1]">
      <div className='py-16'>
        <h1 className='text-4xl font-semibold'>
          Los Autenticos del norte ahora en linea,
          <br /> en un click.
          <br />
          <span className='text-primary uppercase'>Roll Burrito Hub</span>
        </h1>
        <p className='my-4 text-zinc-400'>
          Desde clásicos hasta creaciones innovadoras, cada roll está
          cuidadosamente elaborado para brindar una explosión de autenticidad en
          cada bocado.
        </p>

        <div className='flex gap-4 text-sm'>
          <button className='bg-primary flex gap-2 uppercase items-center text-zinc-300 px-4 py-2 rounded-full'>
            Pedir
            <Right />
          </button>
          <button className='flex gap-2 items-center'>
            Ver Menu <Right />
          </button>
        </div>
      </div>
      <div className='relative hidden md:block'>
        <Image src={"/logo2.png"} alt={"burro"} width={300} height={400} />
      </div>
    </section>
  );
}
//pt-16 pl-48 cambioswidth={300} height={400}layout={"fill"}objectFit={"contain"}
