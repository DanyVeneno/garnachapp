import AddToCartButton from "@/components/menu/AddToCartButton";
import Image from "next/image";

export default function MenuItemTile({ onAddToCart, ...item }) {
  const { image, description, name, basePrice, sizes, extraIngredientPrices } =
    item;
  const hasSizesOrExtras =
    sizes?.length > 0 || extraIngredientPrices?.length > 0;
  return (
    <div
      className='bg-zinc-700 p-4 rounded-lg text-center
      group hover:bg-zinc-500 hover:shadow-md  hover:shadow-black/25 transition-all'
    >
      <div className='text-center'>
        <Image
          src={image}
          className='max-h-auto max-h-54 block mx-auto '
          alt='burrito'
          width={200}
          height={200}
        />
      </div>
      <h4 className='font-semibold text-xl my-3 text-zinc-300'>{name}</h4>
      <p className='text-gray-300 text-sm line-clamp-3'>{description}</p>
      <AddToCartButton
        image={image}
        hasSizesOrExtras={hasSizesOrExtras}
        onClick={onAddToCart}
        basePrice={basePrice}
      />
    </div>
  );
}
