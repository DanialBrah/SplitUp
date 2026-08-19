"use client";

import { useFormStatus } from "react-dom";
import { Spinner } from "@/components/Spinner";

type SubmitButtonProps = {
  children: string;
  pendingLabel: string;
  className?: string;
  spinnerClassName?: string;
};

export function SubmitButton({
  children,
  pendingLabel,
  className,
  spinnerClassName = "h-4 w-4 border-white/40 border-t-white",
}: SubmitButtonProps) {
  const { pending } = useFormStatus();

  return (
    <button
      type="submit"
      disabled={pending}
      className={
        className ??
        "flex w-full items-center justify-center gap-2 rounded-md bg-gray-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
      }
    >
      {pending && <Spinner className={spinnerClassName} />}
      {pending ? pendingLabel : children}
    </button>
  );
}
