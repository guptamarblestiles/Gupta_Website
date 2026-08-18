/**
 * Renders a product's price only when the admin has actually set one.
 * Returns null (no empty container, no ₹0, no "undefined") whenever price
 * is absent — the product presentation is meant to look identical to
 * before pricing existed until an admin opts a product in.
 */
type PriceDisplayProps = {
  price?: number;
  priceUnit?: string;
  priceNote?: string;
  className?: string;
};

export function PriceDisplay({ price, priceUnit, priceNote, className }: PriceDisplayProps) {
  if (price === undefined || price === null || Number.isNaN(price)) return null;

  const formatted = new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: price % 1 === 0 ? 0 : 2,
  }).format(price);

  return (
    <p className={className ?? "font-body text-body text-on-surface"}>
      <span className="font-medium">{formatted}</span>
      {priceUnit && <span className="text-on-surface-variant"> {priceUnit}</span>}
      {priceNote && (
        <span className="block text-sm italic text-on-surface-variant">{priceNote}</span>
      )}
    </p>
  );
}
