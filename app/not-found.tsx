import Link from "next/link";

export default function NotFound() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-16 text-center">
      <h1 className="text-2xl font-semibold text-gray-900">Not found</h1>
      <p className="mt-2 text-sm text-gray-500">
        The page or record you&rsquo;re looking for doesn&rsquo;t exist.
      </p>
      <Link
        href="/groups"
        className="mt-6 inline-block text-sm font-medium text-gray-900 underline"
      >
        Back to groups
      </Link>
    </div>
  );
}
