/*
 * Extracts every fenced code block from the lessons and validates it.
 *
 *   hcl         terraform fmt -check, then terraform validate (blocks in one
 *               lesson are validated together as one folder, keyed by file
 *               name; a later block with the same name replaces the earlier;
 *               a title with a path, like modules/vpc/main.tf, is written
 *               there, so local child modules validate with the root)
 *   sh / bash   shellcheck
 *   yaml        yamllint
 *   dockerfile  hadolint
 *   json        JSON.parse
 *   python      python3 -m py_compile
 *   javascript  node --check
 *   groovy      Jenkinsfiles: brackets and quotes balance, and a declarative
 *               Jenkinsfile starts with pipeline { (no Jenkins to lint against)
 *   sql, ini    not parsed (no dialect-neutral validator); only the "..." rule
 *   output      not validated — it's what a tool prints
 *
 * Any code block containing "..." or "…" fails: every block must be complete.
 * A missing validator fails the check too, unless ALLOW_MISSING_TOOLS=1.
 */
import { readFileSync, readdirSync, mkdirSync, writeFileSync, rmSync, existsSync } from "node:fs";
import { join, resolve, dirname, basename } from "node:path";
import { spawnSync } from "node:child_process";

const ROOT = resolve(import.meta.dirname, "..");
const DIRS = ["src/content/lessons", "src/content/projects"].map((d) => join(ROOT, d)).filter(existsSync);
const WORK = join(ROOT, `.cache/code-check-${process.pid}`);
/* Optional: only check these files, e.g. node scripts/check-code.mjs src/content/lessons/vpc.mdx */
const ONLY = process.argv.slice(2).map((f) => resolve(f));
const PLUGINS = join(ROOT, ".cache/terraform-plugins");
const LANG = { sh: "sh", bash: "sh", shell: "sh", zsh: "sh", hcl: "hcl", tf: "hcl", terraform: "hcl", yaml: "yaml", yml: "yaml", dockerfile: "dockerfile", json: "json",
  python: "python", py: "python", javascript: "js", js: "js", groovy: "groovy", jenkinsfile: "groovy",
  sql: "plain", ini: "plain", conf: "plain", nginx: "plain", toml: "plain" };

/* Brackets and quotes must balance in a Groovy file. Comments and strings are skipped. */
function groovyProblems(code) {
  const stack = [];
  const pairs = { ")": "(", "]": "[", "}": "{" };
  for (let i = 0; i < code.length; i++) {
    const c = code[i], two = code.slice(i, i + 2), three = code.slice(i, i + 3);
    if (two === "//") { i = code.indexOf("\n", i); if (i < 0) break; continue; }
    if (two === "/*") { i = code.indexOf("*/", i + 2) + 1; if (i <= 0) return "unclosed /* comment"; continue; }
    if (three === "'''" || three === '"""') {
      const end = code.indexOf(three, i + 3);
      if (end < 0) return `unclosed ${three} string`;
      i = end + 2; continue;
    }
    if (c === "'" || c === '"') {
      let j = i + 1;
      while (j < code.length && code[j] !== c) {
        if (code[j] === "\\") j++;
        else if (code[j] === "\n") return `unclosed ${c} string near: ${code.slice(i, i + 40)}`;
        j++;
      }
      i = j; continue;
    }
    if ("([{".includes(c)) stack.push(c);
    else if (")]}".includes(c) && stack.pop() !== pairs[c]) return `unbalanced "${c}" near: ${code.slice(Math.max(0, i - 40), i + 1)}`;
  }
  return stack.length ? `unclosed "${stack.pop()}"` : null;
}

const failures = [];
const fail = (where, msg) => failures.push(`${where}\n    ${msg.trim().split("\n").join("\n    ")}`);

function blocks(file) {
  const src = readFileSync(file, "utf8");
  const out = [];
  const re = /^([ \t]*)```(\S*)([^\n]*)\n([\s\S]*?)^\1```[ \t]*$/gm;
  let m;
  while ((m = re.exec(src))) {
    const line = src.slice(0, m.index).split("\n").length;
    const title = /title="([^"]*)"/.exec(m[3])?.[1];
    out.push({ lang: m[2] || "text", title, code: m[4], line });
  }
  return out;
}

function has(tool) {
  return spawnSync("which", [tool]).status === 0;
}
const missing = new Set();
function need(tool) {
  if (has(tool)) return true;
  missing.add(tool);
  return false;
}

rmSync(WORK, { recursive: true, force: true });
mkdirSync(WORK, { recursive: true });
mkdirSync(PLUGINS, { recursive: true });

let count = 0;
for (const dir of DIRS) {
  for (const f of readdirSync(dir).filter((x) => x.endsWith(".mdx")).sort()) {
    const file = join(dir, f);
    if (ONLY.length && !ONLY.includes(file)) continue;
    const rel = file.slice(ROOT.length + 1);
    const hcl = new Map();
    for (const b of blocks(file)) {
      const where = `${rel}:${b.line} (${b.lang}${b.title ? ` ${b.title}` : ""})`;
      const kind = LANG[b.lang.toLowerCase()];
      if (b.lang === "output" || b.lang === "text") continue;
      count++;
      if (/\.\.\.|…/.test(b.code)) fail(where, 'contains "..." — every code block must be complete');
      if (!kind) { fail(where, `unknown language "${b.lang}" — add a validator or use output`); continue; }
      const tmp = join(WORK, `${f}-${b.line}`);
      if (kind === "plain") {
        /* no validator; the "..." rule above still applies */
      } else if (kind === "groovy") {
        const prob = groovyProblems(b.code);
        if (prob) fail(where, prob);
        if (/jenkinsfile/i.test(b.title || "") && !/^(\s|\/\/[^\n]*\n|@Library[^\n]*\n)*pipeline\s*\{/.test(b.code)) {
          fail(where, "a declarative Jenkinsfile must start with pipeline {");
        }
      } else if (kind === "python") {
        writeFileSync(tmp + ".py", b.code);
        const r = spawnSync("python3", ["-m", "py_compile", tmp + ".py"], { encoding: "utf8" });
        if (r.status !== 0) fail(where, r.stderr);
      } else if (kind === "js") {
        writeFileSync(tmp + ".mjs", b.code);
        const r = spawnSync(process.execPath, ["--check", tmp + ".mjs"], { encoding: "utf8" });
        if (r.status !== 0) fail(where, r.stderr);
      } else if (kind === "json") {
        try { JSON.parse(b.code); } catch (e) { fail(where, e.message); }
      } else if (kind === "sh" && need("shellcheck")) {
        writeFileSync(tmp + ".sh", "#!/usr/bin/env bash\n" + b.code);
        /* SC2164 ("cd || exit") is advice for scripts. Lesson commands are typed
           one at a time, and the learner sees a failed cd straight away.
           SC2016 flags $VAR inside single quotes; lessons do that on purpose to
           write a line like export PATH="…:$PATH" into a settings file as-is. */
        const r = spawnSync("shellcheck", ["-s", "bash", "-e", "SC2164,SC2016", tmp + ".sh"], { encoding: "utf8" });
        if (r.status !== 0) fail(where, r.stdout || r.stderr);
      } else if (kind === "yaml" && need("yamllint")) {
        writeFileSync(tmp + ".yaml", b.code);
        const r = spawnSync("yamllint", ["-d", "{extends: default, rules: {document-start: disable, line-length: {max: 160}}}", tmp + ".yaml"], { encoding: "utf8" });
        if (r.status !== 0) fail(where, r.stdout || r.stderr);
      } else if (kind === "dockerfile" && need("hadolint")) {
        writeFileSync(tmp + ".Dockerfile", b.code);
        const r = spawnSync("hadolint", [tmp + ".Dockerfile"], { encoding: "utf8" });
        if (r.status !== 0) fail(where, r.stdout || r.stderr);
      } else if (kind === "hcl") {
        if (!b.title) { fail(where, "Terraform blocks need a file name: ```hcl title=\"main.tf\""); continue; }
        hcl.set(b.title.split(/\s/)[0], { ...b, where });
      }
    }

    if (hcl.size && need("terraform")) {
      /* A title may be a path, like modules/network/main.tf. The whole tree is
         written first, then each folder holding .tf files is validated as its
         own module, so a root that calls ../../modules/x finds it. */
      const tf = join(WORK, f.replace(/\.mdx$/, "") + "-tf");
      mkdirSync(tf, { recursive: true });
      const dirs = new Set();
      for (const [name, b] of hcl) {
        const file = join(tf, name);
        mkdirSync(dirname(file), { recursive: true });
        writeFileSync(file, b.code);
        if (name.endsWith(".tf")) dirs.add(dirname(file));
        const r = spawnSync("terraform", ["fmt", "-check", "-diff", basename(file)], { cwd: dirname(file), encoding: "utf8" });
        if (r.status !== 0) fail(b.where, "terraform fmt -check failed:\n" + r.stdout + r.stderr);
      }
      const env = { ...process.env, TF_PLUGIN_CACHE_DIR: PLUGINS, TF_IN_AUTOMATION: "1" };
      for (const dir of [...dirs].sort()) {
        /* A child module that needs an aliased provider (configuration_aliases)
           can't be validated on its own; the root that calls it validates it. */
        const needsAlias = readdirSync(dir).some((x) => x.endsWith(".tf") && readFileSync(join(dir, x), "utf8").includes("configuration_aliases"));
        if (needsAlias) continue;
        const label = dir === tf ? "" : ` in ${dir.slice(tf.length + 1)}`;
        const init = spawnSync("terraform", ["init", "-backend=false", "-input=false", "-no-color"], { cwd: dir, encoding: "utf8", env });
        if (init.status !== 0) { fail(`${rel} (terraform init${label})`, init.stdout + init.stderr); continue; }
        const v = spawnSync("terraform", ["validate", "-no-color"], { cwd: dir, encoding: "utf8", env });
        if (v.status !== 0) fail(`${rel} (terraform validate${label}: ${[...hcl.keys()].join(", ")})`, v.stdout + v.stderr);
      }
    }
  }
}

rmSync(WORK, { recursive: true, force: true });

if (missing.size && process.env.ALLOW_MISSING_TOOLS !== "1") {
  fail("tools", `missing validators: ${[...missing].join(", ")}. Install them, or set ALLOW_MISSING_TOOLS=1 to skip.`);
}

if (failures.length) {
  console.error(`\n✗ Code check: ${failures.length} problem(s) in ${count} blocks\n`);
  for (const f of failures) console.error("  • " + f + "\n");
  process.exit(1);
}
console.log(`✓ Code check: ${count} code blocks valid${missing.size ? ` (skipped: ${[...missing].join(", ")})` : ""}`);
