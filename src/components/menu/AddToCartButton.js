import FlyingButton from "@/components/menu/FlyingButton";

export default function AddToCartButton({
  hasSizesOrExtras,
  onClick,
  basePrice,
  image
}) {
  if (!hasSizesOrExtras) {
    return (
      <div className='flying-button-parent mt-4'>
        <FlyingButton src={image} onClick={onClick}>
          <span>Agregar al Carrito ${basePrice}</span>
        </FlyingButton>
      </div>
    );
  }
  return (
    <button
      type='button'
      onClick={onClick}
      className='mt-4 bg-primary text-white rounded-full px-8 py-2'
    >
      <span>Agregar al Carrito (desde ${basePrice})</span>
    </button>
  );
}
