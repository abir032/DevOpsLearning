/*
 * Data and rendering for the plan reader visual (Your first resource).
 * The plan text is real Terraform 1.16 output for an aws_ecr_repository,
 * trimmed of the lines that don't matter here. Used at build time and in
 * the browser.
 */

export type Sym = "create" | "update" | "replace" | "destroy";

export interface PlanCase {
  label: string;
  sym: Sym;
  code: string; // HTML: main.tf with the change marked
  plan: string; // HTML: the plan output
  say: string;
  tone: "" | "good" | "bad";
}

const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
const P = (s: string) => `<span class="p">${esc(s)}</span>`; // added / create
const C = (s: string) => `<span class="c">${esc(s)}</span>`; // changed
const M = (s: string) => `<span class="m">${esc(s)}</span>`; // destroy
const D = (s: string) => `<span class="d">${esc(s)}</span>`; // dim

const lines = (...l: string[]) => l.join("\n");

/* main.tf's resource block, with one line swapped for a marked one */
function repo(opts: { name?: string; mut?: string; team?: boolean; gone?: boolean; mark?: "name" | "mut" | "team" }) {
  const mk = (key: string, s: string) => (opts.mark === key ? C(s) : opts.gone ? M(s) : esc(s));
  const plain = (s: string) => (opts.gone ? M(s) : esc(s));
  return lines(
    plain('resource "aws_ecr_repository" "orders" {'),
    mk("name", `  name                 = "${opts.name ?? "quickcart-orders"}"`),
    mk("mut", `  image_tag_mutability = "${opts.mut ?? "IMMUTABLE"}"`),
    plain("  force_delete         = true"),
    "",
    plain("  tags = {"),
    plain('    Project = "quickcart"'),
    ...(opts.team ? [P('    Team    = "platform"')] : []),
    plain("  }"),
    plain("}"),
  );
}

const payments = lines(
  P('resource "aws_ecr_repository" "payments" {'),
  P('  name                 = "quickcart-payments"'),
  P('  image_tag_mutability = "IMMUTABLE"'),
  P("  force_delete         = true"),
  "",
  P("  tags = {"),
  P('    Project = "quickcart"'),
  P("  }"),
  P("}"),
);

export const CASES: Record<string, PlanCase> = {
  tag: {
    label: "Add a tag",
    sym: "update",
    code: repo({ team: true }),
    plan: lines(
      D("  # aws_ecr_repository.orders will be updated in-place"),
      C('  ~ resource "aws_ecr_repository" "orders" {'),
      '        id                   = "quickcart-orders"',
      '        name                 = "quickcart-orders"',
      C("      ~ tags                 = {"),
      '            "Project" = "quickcart"',
      P('          + "Team"    = "platform"'),
      "        }",
      D("        # (6 unchanged attributes hidden)"),
      "    }",
      "",
      "Plan: 0 to add, " + C("1 to change") + ", 0 to destroy.",
    ),
    say: "<b>~ update in-place.</b> The same repository stays; only its tags change. The images inside are untouched. Read which fields change, then carry on.",
    tone: "good",
  },
  mut: {
    label: "Make tags mutable",
    sym: "update",
    code: repo({ mut: "MUTABLE", mark: "mut" }),
    plan: lines(
      D("  # aws_ecr_repository.orders will be updated in-place"),
      C('  ~ resource "aws_ecr_repository" "orders" {'),
      '        id                   = "quickcart-orders"',
      C('      ~ image_tag_mutability = "IMMUTABLE" -> "MUTABLE"'),
      '        name                 = "quickcart-orders"',
      D("        # (6 unchanged attributes hidden)"),
      "    }",
      "",
      "Plan: 0 to add, " + C("1 to change") + ", 0 to destroy.",
    ),
    say: "<b>~ update in-place</b> again. AWS can change this setting on the existing repository, so nothing is rebuilt. The arrow reads <i>old value → new value</i>.",
    tone: "good",
  },
  name: {
    label: "Rename the repository",
    sym: "replace",
    code: repo({ name: "quickcart-orders-v2", mark: "name" }),
    plan: lines(
      D("  # aws_ecr_repository.orders must be replaced"),
      M('-/+ resource "aws_ecr_repository" "orders" {'),
      '      ~ arn                  = "arn:aws:ecr:us-east-1:111122223333:repository/quickcart-orders" -> (known after apply)',
      '      ~ id                   = "quickcart-orders" -> (known after apply)',
      '      ~ name                 = "quickcart-orders" -> "quickcart-orders-v2" ' + M("# forces replacement"),
      D("        # (4 unchanged attributes hidden)"),
      "    }",
      "",
      "Plan: " + P("1 to add") + ", 0 to change, " + M("1 to destroy") + ".",
    ),
    say: "<b>-/+ destroy, then create.</b> AWS can't rename a repository, so Terraform deletes the old one — <b>with every image in it</b> — and makes a new one. The comment <code># forces replacement</code> points at the line that caused it. Stop and read.",
    tone: "bad",
  },
  remove: {
    label: "Delete the block",
    sym: "destroy",
    code: repo({ gone: true }),
    plan: lines(
      D("  # aws_ecr_repository.orders will be destroyed"),
      D("  # (because aws_ecr_repository.orders is not in configuration)"),
      M('  - resource "aws_ecr_repository" "orders" {'),
      M('      - name                 = "quickcart-orders" -> null'),
      M('      - image_tag_mutability = "IMMUTABLE" -> null'),
      M('      - repository_url       = "111122223333.dkr.ecr.us-east-1.amazonaws.com/quickcart-orders" -> null'),
      "    }",
      "",
      "Plan: 0 to add, 0 to change, " + M("1 to destroy") + ".",
    ),
    say: "<b>- destroy.</b> Code that disappears means a resource that disappears. <code>-&gt; null</code> means the value will be gone. Stop and read: is this really what you meant?",
    tone: "bad",
  },
  add: {
    label: "Add a second repository",
    sym: "create",
    code: repo({}) + "\n\n" + payments,
    plan: lines(
      D("  # aws_ecr_repository.payments will be created"),
      P('  + resource "aws_ecr_repository" "payments" {'),
      P("      + arn                  = (known after apply)"),
      P('      + image_tag_mutability = "IMMUTABLE"'),
      P('      + name                 = "quickcart-payments"'),
      P("      + repository_url       = (known after apply)"),
      "    }",
      "",
      "Plan: " + P("1 to add") + ", 0 to change, 0 to destroy.",
    ),
    say: "<b>+ create.</b> Something new, nothing touched. <code>(known after apply)</code> means AWS picks that value, so Terraform can't show it yet. The <code>orders</code> repository isn't mentioned, because it doesn't change.",
    tone: "good",
  },
};

export const LEGEND: [Sym, string, string][] = [
  ["create", "+", "create"],
  ["update", "~", "update in place"],
  ["replace", "-/+", "destroy, then create"],
  ["destroy", "-", "destroy"],
];

export const legendHtml = (s: Sym) =>
  LEGEND.map(([k, sym, t]) => `<li class="${k}${k === s ? " on" : ""}"${k === s ? ' aria-current="true"' : ""}><b>${esc(sym)}</b>${t}</li>`).join("");

export const codeHtml = (c: PlanCase) => `<span class="d">main.tf</span>\n\n${c.code}`;
export const planHtml = (c: PlanCase) => `<span class="d">$ terraform plan</span>\n\n${c.plan}`;
export const sayHtml = (c: PlanCase) => {
  const care = c.tone === "bad" ? "Stop and read" : "Read the fields, then carry on";
  return `<span class="step-l">What it means: ${care}</span>${c.say}`;
};
