import { UtensilsCrossed } from "lucide-react";

export function Logo({ size = 28 }: { size?: number }) {
  return (
    <div className="flex items-center gap-2 font-extrabold tracking-tight">
      <div
        className="rounded-xl bg-gradient-to-br from-primary to-secondary flex items-center justify-center text-primary-foreground"
        style={{ width: size + 8, height: size + 8 }}
      >
        <UtensilsCrossed size={size - 6} />
      </div>
      <span className="text-xl">
        Menu<span className="text-primary">Flow</span>
      </span>
    </div>
  );
}
