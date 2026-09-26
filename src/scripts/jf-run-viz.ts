/*
 * Data for the Jenkinsfile visual: step through one run of a Jenkinsfile and
 * see which stages run for a feature branch, a pull request and main.
 * Used at build time (first render) and in the browser.
 */

export type Build = "branch" | "pr" | "main";
export type St = "wait" | "run" | "ok" | "fail" | "skip" | "pause";

export const CODE = [
  "pipeline {",
  "  agent any",
  "  stages {",
  "    stage('Test') {",
  "      steps { sh './test.sh' }",
  "    }",
  "    stage('Plan') {",
  "      when { changeRequest() }",
  "      steps { sh 'terraform plan' }",
  "    }",
  "    stage('Build image') {",
  "      when { branch 'main' }",
  "      steps { sh './build-image.sh' }",
  "    }",
  "    stage('Deploy to prod') {",
  "      when { branch 'main' }",
  "      input { message 'Deploy to prod?' }",
  "      steps { sh './deploy.sh prod' }",
  "    }",
  "  }",
  "  post {",
  "    always  { junit 'reports/*.xml' }",
  "    success { echo 'Shipped' }",
  "    failure { echo 'Tell the team' }",
  "    cleanup { deleteDir() }",
  "  }",
  "}",
];

export const STAGES = ["Test", "Plan", "Build image", "Deploy to prod"];
export const POSTS = ["always", "success", "failure", "cleanup"];

export const BUILDS: Record<Build, { label: string; name: string; env: string }> = {
  branch: { label: "Feature branch", name: "feature/coupons", env: "BRANCH_NAME = feature/coupons" },
  pr: { label: "Pull request", name: "PR-42", env: "BRANCH_NAME = PR-42 · CHANGE_TARGET = main" },
  main: { label: "main", name: "main", env: "BRANCH_NAME = main" },
};

export interface Step {
  line: number;
  st: St[];
  post: St[];
  note: string[];
  say: string;
  head: string;
  tone: "" | "good" | "bad";
}

export function steps(build: Build, testsPass: boolean): Step[] {
  const out: Step[] = [];
  const st: St[] = STAGES.map(() => "wait");
  const post: St[] = POSTS.map(() => "wait");
  const note: string[] = STAGES.map(() => "");
  const name = BUILDS[build].name;
  const push = (line: number, head: string, say: string, tone: Step["tone"] = "") =>
    out.push({ line, st: [...st], post: [...post], note: [...note], head, say, tone });

  push(-1, "Ready", `A build of <b>${name}</b> is about to start. Choose <b>Run</b> or <b>Next step</b>.`);
  push(1, "agent any", `Jenkins finds a free executor on any agent and checks out <b>${name}</b>. It sets <code>${BUILDS[build].env}</code>, which the <code>when</code> conditions read.`);

  st[0] = "run";
  push(4, "Stage: Test", "<b>Test</b> has no <code>when</code>, so it runs on every build. Jenkins runs <code>./test.sh</code>.");
  let failed = false;
  if (testsPass) {
    st[0] = "ok";
    push(4, "Stage: Test", "<code>./test.sh</code> exits with <b>0</b>. The stage passes.", "good");
  } else {
    st[0] = "fail"; failed = true;
    push(4, "Stage: Test", "<code>./test.sh</code> exits with <b>1</b>: a test failed. The stage fails, and so does the build.", "bad");
  }

  const gated: [number, number, number, boolean, string][] = [
    [1, 7, 8, build === "pr", "<code>changeRequest()</code> is true only for pull requests"],
    [2, 11, 12, build === "main", "<code>branch 'main'</code> is true only when <code>BRANCH_NAME</code> is <code>main</code>"],
    [3, 15, 17, build === "main", "<code>branch 'main'</code> is true only when <code>BRANCH_NAME</code> is <code>main</code>"],
  ];
  for (const [i, whenLine, stepLine, ok, why] of gated) {
    const label = STAGES[i];
    if (failed) {
      st[i] = "skip"; note[i] = "earlier failure";
      push(whenLine - 1, `Stage: ${label}`, `<b>${label}</b> is skipped because an earlier stage failed. Jenkins doesn't even check its <code>when</code>.`, "bad");
      continue;
    }
    if (!ok) {
      st[i] = "skip"; note[i] = "when is false";
      push(whenLine, `Stage: ${label}`, `${why}. This build is <b>${name}</b>, so it's false and <b>${label}</b> is skipped. A skipped stage isn't a failure.`);
      continue;
    }
    st[i] = "run";
    push(whenLine, `Stage: ${label}`, `${why}. This build is <b>${name}</b>, so it's true and <b>${label}</b> runs.`);
    if (i === 3) {
      st[i] = "pause";
      push(16, `Stage: ${label}`, "<b>Paused.</b> The <code>input</code> waits for a person to choose <b>Proceed</b> or <b>Abort</b> on the build page. Someone chooses Proceed.");
      st[i] = "run";
    }
    st[i] = "ok";
    push(stepLine, `Stage: ${label}`, i === 1
      ? "<code>terraform plan</code> runs, so reviewers can see what the change would do before they approve the pull request."
      : i === 2 ? "The image is built. Only <code>main</code> builds images that could reach production." : "Deployed to production.", "good");
  }

  post[0] = "ok";
  push(21, "post: always", "The stages are done. <code>post</code> runs now, whatever happened. <b>always</b> runs every time: here it saves the test report.");
  if (failed) {
    post[1] = "skip"; post[2] = "ok";
    push(23, "post: failure", "The build failed, so <b>failure</b> runs and <b>success</b> doesn't. This is where you tell the team.", "bad");
  } else {
    post[1] = "ok"; post[2] = "skip";
    push(22, "post: success", "The build passed, so <b>success</b> runs and <b>failure</b> doesn't.", "good");
  }
  post[3] = "ok";
  const ran = STAGES.filter((_, i) => st[i] === "ok");
  push(24, failed ? "Result: FAILURE" : "Result: SUCCESS", `<b>cleanup</b> always runs last, after every other <code>post</code> block. ${failed
    ? "The build is red, and nothing after <b>Test</b> ran."
    : `For <b>${name}</b>, the stages that ran were: ${ran.join(", ")}.`}`, failed ? "bad" : "good");
  return out;
}

const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

export function codeHtml(line: number) {
  return CODE.map((l, i) => `<span class="jf-l${i === line ? " on" : ""}">${esc(l) || " "}</span>`).join("\n");
}

const WORD: Record<St, string> = { wait: "not yet", run: "running", ok: "passed", fail: "failed", skip: "skipped", pause: "waiting for approval" };

export function boardHtml(s: Step, build: Build) {
  const stages = STAGES.map((n, i) =>
    `<li class="jf-st ${s.st[i]}"><b>${n}</b><span>${WORD[s.st[i]]}${s.note[i] ? `: ${s.note[i]}` : ""}</span></li>`).join("");
  const posts = POSTS.map((n, i) =>
    `<li class="jf-st ${s.post[i]}"><b>${n}</b><span>${s.post[i] === "ok" ? "ran" : s.post[i] === "skip" ? "didn't run" : "not yet"}</span></li>`).join("");
  return `<p class="jf-env"><code>${BUILDS[build].env}</code></p><h3 class="jf-h">Stages</h3><ol class="jf-list">${stages}</ol><h3 class="jf-h">post</h3><ol class="jf-list post">${posts}</ol>`;
}

export const sayHtml = (s: Step, i: number, n: number) =>
  `<span class="step-l">${i === 0 ? "" : `Step ${i} of ${n}: `}${s.head}</span>${s.say}`;
