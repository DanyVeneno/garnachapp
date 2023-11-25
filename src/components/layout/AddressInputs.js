export default function AddressInputs({
  addressProps,
  setAddressProp,
  disabled = false
}) {
  const { phone, streetAddress, postalCode, city, country } = addressProps;
  return (
    <>
      <label>Telefono</label>
      <input
        disabled={disabled}
        type='tel'
        placeholder='Numero Telefonico'
        value={phone || ""}
        onChange={(ev) => setAddressProp("phone", ev.target.value)}
      />
      <label>Calle</label>
      <input
        disabled={disabled}
        type='text'
        placeholder='Calle'
        value={streetAddress || ""}
        onChange={(ev) => setAddressProp("streetAddress", ev.target.value)}
      />
      <div className='grid grid-cols-2 gap-2'>
        <div>
          <label>Codigo Postal</label>
          <input
            disabled={disabled}
            type='text'
            placeholder='Codigo Postal'
            value={postalCode || ""}
            onChange={(ev) => setAddressProp("postalCode", ev.target.value)}
          />
        </div>
        <div>
          <label>Ciudad</label>
          <input
            disabled={disabled}
            type='text'
            placeholder='Ciudad'
            value={city || ""}
            onChange={(ev) => setAddressProp("city", ev.target.value)}
          />
        </div>
      </div>
      <label>Pais</label>
      <input
        disabled={disabled}
        type='text'
        placeholder='Pais'
        value={country || ""}
        onChange={(ev) => setAddressProp("country", ev.target.value)}
      />
    </>
  );
}
