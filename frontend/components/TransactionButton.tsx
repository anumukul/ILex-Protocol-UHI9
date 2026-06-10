"use client";

interface Props {
  label: string;
  onClick: () => void;
  disabled?: boolean;
  isPending?: boolean;
  variant?: "emerald" | "amber" | "red" | "indigo";
}

const variants = {
  emerald: "bg-emerald-600 hover:bg-emerald-500 text-white",
  amber: "bg-amber-600 hover:bg-amber-500 text-white",
  red: "bg-red-600 hover:bg-red-500 text-white",
  indigo: "bg-indigo-600 hover:bg-indigo-500 text-white",
};

export default function TransactionButton({ label, onClick, disabled, isPending, variant = "emerald" }: Props) {
  return (
    <button
      type="button"
      disabled={disabled || isPending}
      onClick={onClick}
      className={`w-full rounded-md px-4 py-2 text-sm font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${variants[variant]}`}
    >
      {isPending ? "Confirming..." : label}
    </button>
  );
}
