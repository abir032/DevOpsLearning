/*
 * Wraps every Markdown table in a scrollable, styled frame, so wide tables
 * scroll sideways on a phone instead of breaking the page.
 * A table headed "Part | What it means" is a command breakdown and gets the
 * "parts" style (first column never wraps). One headed "Field | Enter" is a
 * console form.
 */
import { visit } from "unist-util-visit";
import { toString } from "hast-util-to-string";

export default function rehypeTables() {
  return (tree) => {
    visit(tree, "element", (node, index, parent) => {
      if (node.tagName !== "table" || !parent || parent.properties?.className?.includes("tbl")) return;
      const tr = findFirst(node, "tr");
      const head = tr ? tr.children.filter((c) => c.tagName === "th").map((c) => toString(c).trim()).join(" | ") : "";
      const cls = ["tbl"];
      if (head === "Part | What it means") cls.push("parts");
      if (head === "Field | Enter") cls.push("fields");
      parent.children[index] = { type: "element", tagName: "div", properties: { className: cls }, children: [node] };
    });
  };
}

function findFirst(node, tag) {
  if (node.tagName === tag) return node;
  for (const c of node.children || []) {
    if (c.type !== "element") continue;
    const f = findFirst(c, tag);
    if (f) return f;
  }
  return null;
}
