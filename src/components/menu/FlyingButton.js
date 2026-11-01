"use client";

export default function FlyingButton({ src, children, onClick, className = "" }) {
  function handleClick(event) {
    onClick?.(event);
    if (!src || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const bounds = event.currentTarget.getBoundingClientRect();
    const image = document.createElement("img");
    image.src = src;
    image.alt = "";
    Object.assign(image.style, {
      position: "fixed", left: bounds.left + "px", top: bounds.top + "px",
      width: "64px", height: "64px", objectFit: "cover", borderRadius: "50%",
      pointerEvents: "none", zIndex: "9999",
    });
    document.body.appendChild(image);
    if (!image.animate) { image.remove(); return; }
    const animation = image.animate([
      { transform: "translate(0,0) scale(1)", opacity: 1 },
      { transform: `translate(${window.innerWidth * 0.95 - bounds.left}px, ${window.innerHeight * 0.05 - bounds.top}px) scale(0.15)`, opacity: 0 },
    ], { duration: 650, easing: "ease-in", fill: "forwards" });
    animation.finished.then(() => image.remove(), () => image.remove());
  }
  return <button type="button" onClick={handleClick} className={"bg-primary text-white rounded-full " + className}>{children}</button>;
}
