import { Spinner } from "@/components/Spinner";

export function PageLoading() {
  return (
    <div className="mx-auto flex max-w-3xl items-center justify-center px-4 py-24">
      <Spinner className="h-8 w-8" />
    </div>
  );
}
