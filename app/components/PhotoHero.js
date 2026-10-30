import Image from "next/image";

// Full-width photo banner at the top of a page. The photo lives only in
// this banner (instead of a fixed full-page background), so the content
// below sits on a clean solid background and stays easy to read.
export default function PhotoHero({ children, tall = false }) {
  return (
    <section
      className={`relative isolate overflow-hidden bg-black text-white ${
        tall ? "min-h-[70vh] lg:min-h-[78vh]" : "min-h-[38vh]"
      } flex items-center`}
    >
      <Image
        src="/glacier-national-park-river-falls-nature-landscapes-2627b2.jpg"
        alt=""
        fill
        priority
        sizes="100vw"
        className="-z-10 object-cover"
      />
      {/* Darken the photo for text contrast, and blend the bottom edge into the page. */}
      <div className="absolute inset-0 -z-10 bg-black/45" />
      <div className="absolute inset-x-0 bottom-0 -z-10 h-32 bg-gradient-to-b from-transparent to-neutral-950" />

      <div className="mx-auto w-full max-w-6xl px-4 sm:px-6 py-16">{children}</div>

      <p className="absolute bottom-2 right-3 text-[10px] text-white/50">
        Photo: Glacier National Park, via{" "}
        <a
          href="https://picryl.com/media/glacier-national-park-river-falls-nature-landscapes-2627b2"
          target="_blank"
          rel="noopener noreferrer"
          className="underline hover:text-white/80"
        >
          Picryl
        </a>
      </p>
    </section>
  );
}
