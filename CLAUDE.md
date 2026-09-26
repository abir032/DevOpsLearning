# Build prompt: "Laptop to Production" — a DevOps course website

Paste everything below this line into Claude Code (or another coding agent) from an empty project folder. Put the source material listed in **Section 10** into a `source/` folder first.

---

## 1. What you are building

A static documentation-style website that teaches DevOps from zero to job-ready, for **software engineers who have never worked on backend infrastructure** — for example, mobile or frontend developers.

The whole course follows **one story**: *QuickCart*, a food-ordering app, growing from a single laptop to millions of users. Every concept is introduced at the moment QuickCart needs it, as the answer to a concrete problem. The reader should never meet a tool before meeting the problem it solves.

The site must be **generic**. It is for anyone. It must not contain any real person's name, account ID, domain, company, AWS profile, email address, or reference to a private training programme. See **Section 11**.

**Primary jobs of the site, in order:**
1. Let a learner follow the course from start to finish in a sensible order.
2. Let someone jump straight to one topic and understand it without reading everything before it.
3. Let them build every idea hands-on in their own AWS account, safely and cheaply.

---

## 2. Tech stack

- **Astro** with **MDX** for content, so lessons are Markdown with embedded components
- **Tailwind CSS** for styling, with design tokens as CSS variables so light and dark themes work
- **React islands** (or Svelte, your choice — be consistent) for interactive visuals only; everything else is static HTML
- **Three.js** only for the two or three 3D visuals listed in Section 7
- **Pagefind** for static full-text search
- **Playwright** for visual and behaviour tests
- Output is a fully static site deployable to GitHub Pages, Cloudflare Pages or S3 + CloudFront

Do not use a pre-themed docs framework's default look. Astro Starlight is acceptable only if fully re-themed to match Section 6.

---

## 3. Information architecture

Organise by **subject**, not by calendar. Twelve modules, each a "station" on the route:

```
00  Start here               the roadmap · how the course works · setting up a Mac
01  How software ships       the DevOps lifecycle · DORA metrics · SLOs and error budgets · release strategies · feature flags
02  The cloud, simply        what the cloud is · IAM · regions and availability zones
03  Networking               VPC · subnets and CIDR · routing, internet and NAT gateways · security groups · DNS and HTTPS
04  Running code             EC2 · load balancers · auto scaling
05  Data                     RDS · running SQL safely · S3 · secrets
06  Watching it run          CloudWatch logs and metrics · alarms · CloudTrail
07  Containers               images and containers · the Dockerfile · volumes and networking · ECR
08  Running containers       ECS on Fargate · releases without downtime · Kubernetes and EKS · choosing ECS or EKS
09  Infrastructure as code   why Terraform · first resource · variables, locals, outputs · loops and lifecycle · modules · state · environments and regions · operating Terraform
10  Automation               Jenkins from zero · the Jenkinsfile · continuous integration · continuous delivery · canary from a pipeline
11  When things break        where to look first · runbooks · real incidents
★   Projects                 five end-to-end builds (Section 9)
```

Plus: a **glossary**, a **cheat sheet index**, and a **"which lesson do I need?"** page that maps common questions ("why can't my server reach the internet?") to lessons.

URLs: `/modules/03-networking/`, `/lessons/vpc/`, `/projects/01-network-by-hand/`, `/glossary/`.

---

## 4. The lesson template

**Every lesson has exactly these six parts, in this order.** The consistency is the point — learners always know where they are.

| # | Part | What it contains |
|---|---|---|
| 1 | **The problem** | What goes wrong for QuickCart without this. A short story, then a **real-world case** where this failure actually happened to someone. |
| 2 | **The idea** | The concept in plain words, before any jargon. Tables for anything with several parts. A **"You already know this"** box comparing it to something app developers know. One **key sentence** to remember. |
| 3 | **See it** | One interactive visual (Section 7) with a short intro and a "what to notice" line after. |
| 4 | **Do it** | A hands-on lab (Section 5): numbered steps, a cost badge, and clean-up. |
| 5 | **Check yourself** | 4–6 multiple-choice questions with an explanation for every answer. |
| 6 | **Cheat sheet** | The essentials on one card. |

Lesson header shows: title, one-line summary, time needed, level, and what to read first.

Each lesson page also has: breadcrumbs, a sticky "on this page" tracker showing the six parts, a "mark as done" control, and previous/next links.

### "You already know this" comparisons

Tie each idea to something an app developer already understands. Examples that work:

| DevOps idea | Comparison |
|---|---|
| VPC | The app sandbox — private by default, you choose what to expose |
| Canary release | A staged rollout in the Play Store / App Store phased release |
| Staging environment | TestFlight / internal testing track |
| Monitoring and alarms | Crash reporting |
| Feature flags | Feature flags — the same thing |
| Terraform state without a lock | Offline sync where "last write wins" silently loses one device's change |
| Container image | A signed app build: the same binary on every device |
| Rollback | Pulling a bad release and re-promoting the previous build |

Use one comparison per lesson at most. Skip it when there isn't a genuinely good one.

---

## 5. Writing and code rules

These rules come from real feedback on earlier drafts. Follow them strictly.

**Voice**
- Plain words. One idea per sentence. Explain the problem before the tool.
- No textbook background unless the learner needs it to understand the next step. If a concept needs depth, explain it fully — never "touch and go".
- Sentence case everywhere. No marketing tone.

**Commands** — every command is followed by a table breaking it into parts:

```
docker run -d -p 8080:8080 --name orders order-service:v1
```
| Part | What it means |
|---|---|
| `docker run` | start a container from an image |
| `-d` | run it in the background |
| … | … |

Then a **"You should see"** box with the real expected output.

**Never** hide shell plumbing inside commands. No `$(...)` capture chains, no unexplained pipes, no heredocs the learner must paste. If a command needs a value, show a clearly marked placeholder and say where to get the value. If a pipe or loop is unavoidable, explain it in the parts table.

**AWS steps** use the **console**, with a console path and a table of exactly what to type in each field:

> **VPC** → Your VPCs → **Create VPC**
> | Field | Enter |
> |---|---|
> | Name tag | `quickcart-vpc` |

Use the CLI only where the console genuinely has no equivalent, and say so.

**Code blocks**
- Every code block must be **complete and runnable**. Never `...` or `# ...` inside code.
- Every **Terraform attribute** is explained: what it does, what happens if you leave it out, and when you would change it. Use a table after each resource.
- Every file shows its filename.
- Every block has a copy button.

**Every concept that has a common mistake** gets that mistake shown — the error message, why it happened, and the fix.

**Real cases** must be genuine, widely reported patterns. Do not invent specific companies, dates or numbers. If you are not sure a case is real, describe it as "a common mistake" instead.

**Cost** — every lab shows a badge: *Free*, *Pennies*, or *Costs money: about $X a day — delete it after*. Expensive resources (EKS, NAT gateways, RDS, load balancers) get a warning at the start of the lab and a clean-up step at the end.

---

## 6. Design direction

Start from this direction. Refine it, but do not replace it with a generic docs look.

**The concept: a route map.** Learning DevOps is a journey, and so is a QuickCart order. Navigation uses transit-map language:
- each subject area is a coloured **line**
- each module is a **station** on it
- each lesson is a **stop**, filled in when done
- the home page is one large vertical route map that draws itself once on first load

**Colour** encodes which line you are on — never decoration.

| Token | Light | Dark | Used for |
|---|---|---|---|
| bg | `#F6F7F9` | `#11151D` | page |
| surface | `#FFFFFF` | `#181D27` | panels |
| ink | `#171B22` | `#E8EBF1` | text |
| ink-2 | `#4F5767` | `#A9B1C0` | secondary text |
| rule | `#DDE1E8` | `#2A3140` | borders |
| ship | `#D23B32` | `#F0655C` | How software ships, When things break |
| cloud | `#1F64C8` | `#5A93EC` | AWS modules |
| box | `#0B9180` | `#2EC2AE` | Containers |
| code | `#7446C9` | `#A07EF0` | Infrastructure as code |
| auto | `#D68000` | `#F0A53A` | Automation |

**Type:** Overpass (descended from US road-signage lettering — wayfinding type for a wayfinding site) for everything; Overpass Mono **only** for code and terminal output. Headlines heavy and tight.

**Layout:** sticky top bar; left rail showing modules as coloured lines with lesson stops; a reading column under 75 characters; a sticky "on this page" tracker on wide screens. The rail becomes a drawer on mobile.

**Avoid:** grids of identical rounded cards, ALL-CAPS labels above headings, monospace for UI labels, gradient washes, arrows appended to link text, and scroll-triggered fade-in on every section.

**Motion:** only in response to the learner's action, plus the single route-map drawing on the home page. Respect `prefers-reduced-motion` everywhere — visuals jump to end states instead of animating.

A working prototype of this direction exists at `source/prototype/index.html` (Section 10). Match its feel; rebuild it properly.

---

## 7. Interactive visuals

Motion helps only when the idea itself involves movement or depth. **Every visual must teach one specific thing**, have controls the learner operates, and narrate what is happening in text (in an `aria-live` region, so it works without seeing the animation).

| Lesson | Visual | What the learner does | What it teaches |
|---|---|---|---|
| VPC | Request journey through the network | Send an order from the app; attack the database; switch the database subnet between private and public | One route table line decides what the internet can reach |
| Routing | Route table editor | Add and remove routes, send traffic | Public vs private vs isolated subnets |
| Security groups | The chain: load balancer → app → database | Break a rule (e.g. wrong port), send a request | "Timed out" means the network, not the code |
| Load balancers | Traffic spreading across servers | Mark a server unhealthy | Health checks decide who gets traffic |
| Auto scaling | Servers under load | Raise traffic; terminate a server | Self-healing and scaling out |
| Regions and zones | **3D globe** with regions and zones | Fail a zone | Why you run in two zones |
| Release strategies | Rolling, blue/green and canary side by side | Release a good version, then a bad one | The difference between the three is how they move |
| Containers | **3D stack**: virtual machine vs container layers | Toggle between them | What sits on top of what |
| Dockerfile | Layer cache | Edit a line, rebuild | Why instruction order changes build time |
| Kubernetes | Reconcile loop | Delete a pod | Desired state is restored automatically |
| Terraform plan | Code vs state vs AWS | Add to code, change AWS by hand, lose state | What the next plan does in each case |
| Terraform loops | `count` vs `for_each` | Remove the middle item of a list | Why `count` destroys the wrong thing |
| Terraform state | Two engineers applying at once | Toggle locking on and off, step through | Last-write-wins without a lock |
| CI/CD | A commit moving through a pipeline | Push a commit; make a test fail | Each stage is a gate |
| Canary from a pipeline | Traffic shifting with abort criteria | Push a version that raises errors | Automatic abort and rollback |

The prototype already contains working versions of the first and the last three Terraform visuals — port and improve them.

**3D:** use Three.js only for the globe and the container stack. Lazy-load it so pages without 3D never download it. Provide a static 2D fallback for reduced motion and for devices without WebGL.

---

## 8. Site features

- **Search** (Pagefind): lessons, modules, glossary terms and headings. Opens with `/` or Ctrl/⌘+K.
- **Progress** stored in `localStorage`, wrapped in try/catch. Lessons marked done fill their stop on the route map and in the rail; module stations show partial fill.
- **Light and dark themes**, following the system setting by default, with a toggle that persists.
- **Glossary** where every term links to the lesson that explains it, and terms in lessons link back to the glossary on first use.
- **Copy buttons** on every code block.
- **Quizzes** with instant feedback and an explanation for each answer.
- **Print styles** for cheat sheets.
- Works fully offline once loaded; no external requests except fonts.

---

## 9. The projects

Five builds that combine the modules. Each is a step-by-step guide in the lesson style (Section 5), with a cost badge, a "what you will have at the end" diagram, checkpoints with expected output, a troubleshooting section built from real mistakes, and a full clean-up.

| Project | What gets built | Proves |
|---|---|---|
| **1: A network by hand** | VPC across two zones, public/app/data subnets, internet and NAT gateways, route tables, VPC endpoints, a security group chain, least-privilege IAM roles | The learner understands every networking piece |
| **2: A self-healing environment** | Launch template, auto scaling group across two zones, load balancer with HTTPS, managed database, S3, secrets, logs and alarms | It survives losing a server and a whole zone — measured, with numbers |
| **3: One service, two runtimes** | The same container on ECS Fargate and on EKS, both behind HTTPS load balancers | A new version released under load with zero failed requests, counted by a load-testing script; plus a written ECS-vs-EKS recommendation |
| **4: Everything as code** | Projects 1–3 rebuilt with Terraform modules, remote state with locking, two environments that differ only by variables, and a second region | Destroy and rebuild from empty with no manual step; the next plan is clean |
| **5: The pipeline** | Jenkins pipeline: lint, test, scan, Terraform plan on pull request; build, push, deploy, smoke test, approval, canary with abort criteria, one-click rollback; two parameterised operations jobs (safe SQL in a transaction, log extraction for a time window); an operations runbook | A commit reaches production with nobody touching the console |

Every project uses placeholder values: account `111122223333`, region `us-east-1`, domain `example.com`, bucket `quickcart-tfstate-111122223333`. Where a real domain would be needed for a trusted certificate, offer both paths: a domain the learner owns, or a self-signed certificate with the trade-off explained.

---

## 10. Source material

The `source/` folder contains earlier course notes and guides. Use them as **raw material**: the technical content is checked and tested, but it was written for one person on a private training programme.

| File | Contains |
|---|---|
| `devops-ramp-notes-weeks1-2.md` | Delivery principles, AWS foundations, IAM, VPC, EC2, load balancers, RDS, S3, CloudWatch |
| `devops-ramp-notes-week3.md` | Docker, ECS, releases, EKS |
| `devops-ramp-notes-week4.md` | Terraform, basics to advanced |
| `week1/2/3-learning-summary.md` | Condensed summaries — useful for cheat sheets and quizzes |
| `a2-complete-build.html` | Project 2 build guide |
| `a3-build-guide.html` | Project 3 build guide — closest to the target lab style |
| `a3-why-each-step.html` | Problem-first explanations with real incidents from the build |
| `prototype/index.html` | The design prototype with two finished lessons and three visuals |

**How to use it:**
- **Rewrite, don't copy.** Restructure into the six-part template and the module order.
- **Keep** the technical accuracy, the troubleshooting cases and the expected outputs.
- **Remove** everything personal (Section 11).
- **Where the notes are thin** — AWS fundamentals, and all of Jenkins — write new content to the same standard. The Jenkins module has no source notes yet; cover the controller and agent model, the controller provisioned with Terraform, plugins, the credentials store, backing up `JENKINS_HOME`, the declarative Jenkinsfile (agents, stages, environment, parameters, `when`, `post`), multibranch pipelines, webhooks, shared libraries, OIDC and IAM roles instead of stored keys, and timeouts, retries and idempotency.

---

## 11. Must not appear anywhere on the site

- Any real person's name, including in stories. QuickCart's team uses invented names.
- Real AWS account IDs, profile names, ARNs, subnet or VPC IDs — use placeholders.
- Real domain names — use `example.com`.
- Company names, client names, training programme names, reviewer or approver names.
- Dates tied to a specific cohort or schedule.
- Screenshots or logs containing any of the above.

Add an automated check (Section 13) that fails the build if any of a configurable list of forbidden strings appears in the output.

---

## 12. Quality bar

- **Responsive** from 360px wide upward. The rail is a drawer on mobile; visuals scroll horizontally rather than shrinking unreadably.
- **Accessible:** semantic HTML, visible keyboard focus, every control reachable by keyboard, visuals narrated in text, WCAG AA contrast in both themes, headings in order.
- **Reduced motion** respected everywhere.
- **Fast:** static HTML first; JavaScript only for islands; Three.js lazy-loaded. Lighthouse performance 90+ on a lesson page.
- **Consistent:** every lesson uses the same components for commands, outputs, console paths, tables, cases, key points and quizzes. Build these as components first.

---

## 13. Testing — required, not optional

- **Code blocks:** extract every block and validate it. `terraform fmt -check` and `terraform validate` on HCL, `shellcheck` on shell, a YAML linter on YAML and Kubernetes manifests, `hadolint` on Dockerfiles, JSON parsing on JSON. Fail the build on any error. Flag any block containing `...`.
- **Links:** no broken internal or external links.
- **Behaviour:** Playwright tests for navigation, search, progress, theme, quizzes, and every interactive visual's main path.
- **Visual:** Playwright screenshots of the home page, one lesson, and every visual at 1440px, 390px, and in dark mode. Review them yourself and fix what looks wrong before calling anything done.
- **Content:** the forbidden-strings check from Section 11.

---

## 14. Build order

Work in phases, and stop for review after Phase 1.

1. **Foundation:** Astro project, design tokens, layout, rail, route map home page, search, progress, theme, all the content components, and the test harness. Port the two prototype lessons (VPC, Terraform state) and their visuals as the reference implementation. **Stop and show the result for review.**
2. **AWS modules (02–06)**, rewritten in the plain problem-first style.
3. **Containers and orchestration (07–08).**
4. **Terraform (09)**, with every attribute explained.
5. **Automation (10)** — new content — and **When things break (11).**
6. **Start here (00), How software ships (01), the projects, the glossary and cheat sheets.**
7. **Remaining visuals**, then a full test and review pass.

For each phase, report what was built, what the tests found, and anything you were unsure about.

---

## 15. Definition of done

- All twelve modules and five projects are complete, in the six-part template.
- Every code block passes validation; there is no `...` in any code.
- Every lab has a cost badge and a clean-up step, and has been checked for accuracy against current AWS console and tool behaviour.
- Every visual works with a mouse, a keyboard, and reduced motion.
- The forbidden-strings check passes.
- A learner with no backend experience could go from Module 00 to Project 5 using only this site.
