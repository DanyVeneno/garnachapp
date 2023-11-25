export default function SectionHeaders({ subHeader, mainHeader }) {
  return (
    <>
      <h3 className='uppercase text-zinc-400 font-semibold leading-4'>
        {subHeader}
      </h3>
      <h2 className='text-primary font-bold text-4xl '>{mainHeader}</h2>
    </>
  );
}
