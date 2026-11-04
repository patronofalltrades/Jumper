// The night background behind the logged-in pages and the landing page (Emerald Sun, issue #152): near-black in both
// themes, so the white text of the page headers stays readable, with two soft glows in the brand colors.
export function Backdrop() {
  return (
    <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden bg-night" aria-hidden="true">
      <div className="absolute -top-40 -left-40 size-[32rem] rounded-full bg-[#22d66b] opacity-25 blur-[110px]" />
      <div className="absolute top-1/3 -right-40 size-[28rem] rounded-full bg-[#f5c518] opacity-15 blur-[110px]" />
    </div>
  );
}
