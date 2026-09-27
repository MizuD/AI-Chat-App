// Static export under a sub-path (GitHub Pages /<repo>/) does not prefix public files automatically.
export const asset = (path: string) => `${process.env.NEXT_PUBLIC_BASE_PATH ?? ""}${path}`;
