/* Prefix root-relative links in lessons with the site's base path, so the
   site still works when deployed under a sub-path. */
import { visit } from "unist-util-visit";

export default function rehypeBase({ base = "" } = {}) {
  return (tree) => {
    if (!base) return;
    visit(tree, "element", (node) => {
      const h = node.properties?.href;
      if (typeof h === "string" && h.startsWith("/") && !h.startsWith("//") && !h.startsWith(base + "/")) node.properties.href = base + h;
    });
  };
}
