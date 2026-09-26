/*
 * ECR: what the tag v1 points to over time, in a mutable and an immutable
 * repository. Shared by the server render and the browser script.
 */
export type Mode = "mutable" | "immutable";

interface Build { name: string; digest: string }
const A: Build = { name: "build A", digest: "sha256:7c4e9a1f" };
const B: Build = { name: "build B", digest: "sha256:e21b08d3" };

interface Row { tag: string; build: Build }
interface Snap {
  label: string;          // what this step does, shown as "Step n"
  rows: Row[];            // the repository's tags
  untagged?: Build[];     // images that lost their tag
  tasks: { tag: string; build: Build }[];
  error?: string;         // a refused push
  say: string;
  tone?: "" | "good" | "bad";
}

const step0: Snap = {
  label: "Ready", rows: [], tasks: [],
  say: "An empty repository called <b>quickcart-orders</b>. Choose <b>Next step</b> to push the first build.",
};
const step1: Snap = {
  label: "Step 1 of 5: push build A as v1", rows: [{ tag: "v1", build: A }], tasks: [],
  say: "Maya pushes <b>build A</b> with the tag <b>v1</b>. ECR stores the image under its digest, <code>sha256:7c4e9a1f</code>, and points the tag <code>v1</code> at it.",
};
const step2: Snap = {
  label: "Step 2 of 5: deploy v1", rows: [{ tag: "v1", build: A }],
  tasks: [{ tag: "v1", build: A }, { tag: "v1", build: A }],
  say: "ECS starts two tasks from <code>quickcart-orders:v1</code>. Each one asks ECR what <code>v1</code> means today, and gets <b>build A</b>.",
};

const MUT: Snap[] = [step0, step1, step2,
  {
    label: "Step 3 of 5: push build B as v1", rows: [{ tag: "v1", build: B }], untagged: [A],
    tasks: [{ tag: "v1", build: A }, { tag: "v1", build: A }],
    say: "Leo pushes a quick fix, <b>build B</b>, and tags it <code>v1</code> too. The repository is mutable, so ECR simply <b>moves the tag</b>. Build A is still stored, but now has no tag. Nothing warned anyone.",
    tone: "bad",
  },
  {
    label: "Step 4 of 5: a task is replaced", rows: [{ tag: "v1", build: B }], untagged: [A],
    tasks: [{ tag: "v1", build: A }, { tag: "v1", build: B }],
    say: "One task crashes and ECS starts a replacement from <code>v1</code>. It pulls <b>build B</b>. Now two different programs are running, and both say they are <code>v1</code>.",
    tone: "bad",
  },
  {
    label: "Step 5 of 5: build B has a bug. Roll back to v1", rows: [{ tag: "v1", build: B }], untagged: [A],
    tasks: [{ tag: "v1", build: B }, { tag: "v1", build: B }],
    say: "<b>The rollback deployed the bug.</b> Going back to <code>v1</code> fetched build B, because that is what <code>v1</code> means now. The good build A is still in the repository, but only by its digest, and nobody wrote that down.",
    tone: "bad",
  },
];

const IMM: Snap[] = [step0, step1, step2,
  {
    label: "Step 3 of 5: push build B as v1", rows: [{ tag: "v1", build: A }],
    tasks: [{ tag: "v1", build: A }, { tag: "v1", build: A }],
    error: "tag invalid: The image tag 'v1' already exists in the 'quickcart-orders' repository and cannot be overwritten because the repository is immutable.",
    say: "Leo pushes build B as <code>v1</code>. The repository is immutable, so <b>ECR refuses</b>. Leo has to give the fix a new tag, and pushes it again as <code>v2</code>.",
  },
  {
    label: "Step 4 of 5: deploy v2", rows: [{ tag: "v1", build: A }, { tag: "v2", build: B }],
    tasks: [{ tag: "v2", build: B }, { tag: "v2", build: B }],
    say: "ECS moves both tasks to <code>v2</code>, build B. Anyone can see which version is running, because every tag means exactly one build, forever.",
  },
  {
    label: "Step 5 of 5: build B has a bug. Roll back to v1", rows: [{ tag: "v1", build: A }, { tag: "v2", build: B }],
    tasks: [{ tag: "v1", build: A }, { tag: "v1", build: A }],
    say: "<b>The rollback is exact.</b> <code>v1</code> can only ever mean build A, so going back to it brings back exactly the code that worked before.",
    tone: "good",
  },
];

export const tagSteps = (m: Mode) => (m === "mutable" ? MUT : IMM);

const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;");

export function tagHtml(s: Snap, m: Mode): string {
  const rows = s.rows.map((r) =>
    `<li class="et-row"><span class="et-tag">${r.tag}</span><span class="et-arrow" aria-hidden="true">→</span><span class="et-b ${r.build === A ? "a" : "b"}">${r.build.name}</span><code>${r.build.digest}</code></li>`).join("");
  const loose = (s.untagged || []).map((b) =>
    `<li class="et-row loose"><span class="et-tag none">untagged</span><span class="et-arrow" aria-hidden="true">→</span><span class="et-b ${b === A ? "a" : "b"}">${b.name}</span><code>${b.digest}</code></li>`).join("");
  const empty = !rows && !loose ? `<li class="et-empty">No images yet</li>` : "";
  const tasks = s.tasks.length
    ? s.tasks.map((t, i) => `<li class="et-task"><span>Task ${i + 1}</span><span>asked for <b>${t.tag}</b></span><span class="et-b ${t.build === A ? "a" : "b"}">runs ${t.build.name}</span></li>`).join("")
    : `<li class="et-empty">Nothing deployed yet</li>`;
  const err = s.error ? `<p class="et-err" role="note"><b>docker push refused</b><code>${esc(s.error)}</code></p>` : "";
  return `<div class="et-col"><p class="et-h">Repository quickcart-orders<span class="et-mode">${m === "mutable" ? "Tags: mutable" : "Tags: immutable"}</span></p><ul class="et-list">${rows}${loose}${empty}</ul>${err}</div>`
    + `<div class="et-col"><p class="et-h">Running on ECS</p><ul class="et-list">${tasks}</ul></div>`;
}
