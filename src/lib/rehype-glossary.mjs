/*
 * Links the first use of each glossary term in a lesson to its glossary entry.
 * Only running prose is linked: never headings, code, existing links, tables
 * of commands, or visuals.
 */
import { visitParents } from "unist-util-visit-parents";

const SKIP = new Set(["a", "code", "pre", "h1", "h2", "h3", "h4", "h5", "h6", "button", "svg", "script", "style", "th"]);
const PROSE = new Set(["p", "li", "td"]);

const escapeRe = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

export default function rehypeGlossary(options) {
  const { terms, base = "" } = options;
  // Longest phrases first, so "private subnet" wins over "subnet".
  const entries = terms
    .flatMap((t) => t.match.map((m) => ({ m, t })))
    .sort((a, b) => b.m.length - a.m.length);

  return (tree, file) => {
    // Only lessons and projects get auto-links.
    const path = file.path || file.history?.[0] || "";
    if (!/content[\\/](lessons|projects)[\\/]/.test(path)) return;

    const linked = new Set();
    const targets = [];
    visitParents(tree, "text", (node, ancestors) => {
      if (ancestors.some((a) => a.type === "element" && SKIP.has(a.tagName))) return;
      if (ancestors.some((a) => a.type === "element" && a.properties?.className?.some?.((c) => ["viz", "tbl-parts", "parts", "cheat"].includes(c)))) return;
      if (!ancestors.some((a) => a.type === "element" && PROSE.has(a.tagName))) return;
      targets.push({ node, parent: ancestors[ancestors.length - 1] });
    });

    for (const { node, parent } of targets) {
      const pending = entries.filter((e) => !linked.has(e.t.term));
      if (!pending.length) break;
      let best = null;
      for (const e of pending) {
        const caseSensitive = /[A-Z]/.test(e.m);
        const re = new RegExp(`(?<![\\w-])${escapeRe(e.m)}(?![\\w-])`, caseSensitive ? "" : "i");
        const hit = re.exec(node.value);
        if (hit && (!best || hit.index < best.index || (hit.index === best.index && hit[0].length > best.len))) {
          best = { index: hit.index, len: hit[0].length, e };
        }
      }
      if (!best) continue;
      linked.add(best.e.t.term);
      const id = "g-" + best.e.t.term.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
      const before = node.value.slice(0, best.index);
      const word = node.value.slice(best.index, best.index + best.len);
      const after = node.value.slice(best.index + best.len);
      const link = {
        type: "element", tagName: "a",
        properties: { href: `${base}/glossary/#${id}`, className: ["gl"], title: best.e.t.def },
        children: [{ type: "text", value: word }],
      };
      const i = parent.children.indexOf(node);
      const repl = [];
      if (before) repl.push({ type: "text", value: before });
      repl.push(link);
      const rest = { type: "text", value: after };
      if (after) repl.push(rest);
      parent.children.splice(i, 1, ...repl);
      // The remainder may hold another term; queue it right after.
      if (after) targets.splice(targets.findIndex((t) => t.node === node) + 1, 0, { node: rest, parent });
    }
  };
}
