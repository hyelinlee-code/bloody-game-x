/**
 * The date the shipped bundle was built, as YYYY.MM.DD.
 *
 * Two environments read this module and only one of them is Vite.
 * `npm run build` is `tsc -b && tsx tools/validate-data.mjs && vite build`, and
 * the validator imports `dataset.ts` under plain node — where `define` has
 * never run and the bare identifier is a ReferenceError that kills the build
 * before vite is reached. That is exactly how this shipped: green locally when
 * I only grepped for "built in", red on Vercel.
 *
 * `typeof` on an undeclared identifier is the one safe way to ask. Under Vite
 * the identifier is textually replaced first, so this reads `typeof "2026.08.12"`
 * and takes the stamp; under node it takes today, which is the right answer for
 * a local run anyway.
 */
declare const __BUILD_DATE__: string | undefined;

export const BUILD_DATE: string =
  typeof __BUILD_DATE__ === 'string'
    ? __BUILD_DATE__
    : new Date().toISOString().slice(0, 10).replace(/-/g, '.');
