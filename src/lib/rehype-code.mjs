/*
 * Turns fenced code blocks into the course's two code components.
 *
 *   ```hcl title="backend.tf"     a highlighted, copyable block with a file name
 *   ```sh                         a highlighted, copyable command
 *   ```output                     "You should see" terminal output
 *   ```output title="It asks, then confirms"
 *   ```sh ph="LOCK_ID"            marks LOCK_ID as a value the learner replaces
 *
 * Highlighting is done here with Shiki rather than by Astro, so the block and
 * its header and copy button are built in one place.
 */
import { createHighlighter } from "shiki";
import { visit } from "unist-util-visit";
import { toString } from "hast-util-to-string";

const LANGS = ["hcl", "shellscript", "yaml", "json", "dockerfile", "groovy", "sql", "python", "ini", "javascript"];
const ALIAS = { sh: "shellscript", bash: "shellscript", shell: "shellscript", zsh: "shellscript", tf: "hcl", terraform: "hcl", yml: "yaml", jenkinsfile: "groovy", js: "javascript" };
const THEME = "github-dark-default";

let highlighter;
function getHighlighter() {
  highlighter ??= createHighlighter({ themes: [THEME], langs: LANGS });
  return highlighter;
}

function readMeta(meta) {
  const out = {};
  if (!meta) return out;
  for (const m of meta.matchAll(/(\w+)="([^"]*)"/g)) out[m[1]] = m[2];
  return out;
}

const h = (tagName, properties, children = []) => ({ type: "element", tagName, properties, children });
const text = (value) => ({ type: "text", value });

/* Wrap each placeholder word in <span class="ph"> so it stands out. */
function markPlaceholders(node, words) {
  const re = new RegExp(`(${words.map((w) => w.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join("|")})`);
  const walk = (n) => {
    if (!n.children) return;
    const out = [];
    for (const c of n.children) {
      if (c.type === "text" && re.test(c.value)) {
        for (const part of c.value.split(re)) {
          if (!part) continue;
          out.push(words.includes(part) ? h("span", { className: ["ph"], title: "Replace this with your own value" }, [text(part)]) : text(part));
        }
      } else {
        walk(c);
        out.push(c);
      }
    }
    n.children = out;
  };
  walk(node);
}

export default function rehypeCode() {
  return async (tree) => {
    const hl = await getHighlighter();
    const jobs = [];
    visit(tree, "element", (node, index, parent) => {
      if (node.tagName !== "pre" || !parent) return;
      const code = node.children.find((c) => c.type === "element" && c.tagName === "code");
      if (!code) return;
      const cls = (code.properties.className || []).find((c) => String(c).startsWith("language-"));
      const lang = cls ? String(cls).slice(9) : "text";
      /* Astro's MDX pipeline keeps the fence's meta in properties.metastring. */
      const meta = readMeta(code.data?.meta ?? code.properties.metastring);
      const src = toString(code).replace(/\n$/, "");
      jobs.push({ node, index, parent, lang, meta, src });
    });

    for (const { index, parent, lang, meta, src } of jobs) {
      let replacement;
      if (lang === "output") {
        replacement = h("div", { className: ["out"] }, [
          h("div", { className: ["out-t"] }, [text(meta.title || "You should see")]),
          h("pre", { tabIndex: 0 }, [h("code", {}, [text(src)])]),
        ]);
      } else {
        const shikiLang = ALIAS[lang] || (LANGS.includes(lang) ? lang : "text");
        const root = hl.codeToHast(src, { lang: shikiLang, theme: THEME });
        const pre = root.children.find((c) => c.tagName === "pre");
        pre.properties = { tabIndex: 0, className: ["code"] };
        if (meta.ph) markPlaceholders(pre, meta.ph.split(",").map((w) => w.trim()).filter(Boolean));
        const head = [];
        head.push(meta.title
          ? h("span", { className: ["file"] }, [text(meta.title)])
          : h("span", { className: ["file", "lang"] }, [text(lang === "sh" || lang === "bash" ? "Terminal" : lang.toUpperCase())]));
        head.push(h("button", { type: "button", className: ["copy"], "aria-label": meta.title ? `Copy ${meta.title}` : "Copy code" }, [text("Copy")]));
        replacement = h("div", { className: ["codewrap"], dataLang: lang }, [h("div", { className: ["code-head"] }, head), pre]);
      }
      parent.children[index] = replacement;
    }
  };
}
