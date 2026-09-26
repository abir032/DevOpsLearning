import { getCollection } from "astro:content";

/* Slugs of lessons and projects that have been written. Everything else
   shows as "being written". */
let ready: Set<string> | undefined;
export async function readySlugs(): Promise<Set<string>> {
  ready ??= new Set([
    ...(await getCollection("lessons")).map((e) => e.id),
    ...(await getCollection("projects")).map((e) => e.id),
  ]);
  return ready;
}
