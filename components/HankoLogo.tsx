export default function HankoLogo({
  text = "合格",
  size = "md",
  className = "",
}: {
  text?: string;
  size?: "sm" | "md" | "lg";
  className?: string;
}) {
  const dims = {
    sm: "h-8 w-8 text-[10px]",
    md: "h-10 w-10 text-xs",
    lg: "h-14 w-14 text-base",
  }[size];
  return (
    <span
      className={`hanko ${dims} ${className}`}
      aria-hidden="true"
      style={{ borderRadius: "0.625rem" }}
    >
      {text}
    </span>
  );
}