import Link from "next/link";

export default function NotFound() {
  return (
    <div className="px-4 py-8">
      <h1 className="text-xl font-semibold">That page is not on this map</h1>
      <p className="mt-2 text-sm leading-6 text-[#546e7a]">
        This view only covers Allegheny County.
      </p>
      <Link href="/" className="mt-4 inline-block text-sm text-[#1565c0] hover:underline">
        Back to all facilities
      </Link>
    </div>
  );
}
