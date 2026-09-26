/*
 * The course structure. Everything that lists modules or lessons — the rail,
 * the route map, module pages, prev/next, search — reads from here.
 * A lesson is "ready" when a matching file exists in src/content/lessons/.
 */

export type Track = "start" | "ship" | "cloud" | "box" | "code" | "auto" | "proj";

export interface LessonRef {
  slug: string;
  title: string;
  sum: string;
}

export interface Module {
  id: string;
  slug: string;
  track: Track;
  title: string;
  blurb: string;
  qc: string;
  kind: "lessons" | "projects";
  lessons: LessonRef[];
}

export const TRACKS: Record<Track, string> = {
  start: "Start",
  ship: "How software ships",
  cloud: "The AWS line",
  box: "Containers",
  code: "Infrastructure as code",
  auto: "Automation",
  proj: "Projects",
};

export const MODULES: Module[] = [
  {
    id: "00", slug: "00-start-here", track: "start", title: "Start here", kind: "lessons",
    blurb: "What DevOps is for, how this course works, and setting up your computer.",
    qc: "Meet QuickCart: a food-ordering app with a small team and big plans.",
    lessons: [
      { slug: "roadmap", title: "The roadmap", sum: "Where QuickCart starts, and where it ends up." },
      { slug: "how-this-course-works", title: "How this course works", sum: "The six parts of every lesson, and how to practise safely." },
      { slug: "computer-setup", title: "Set up your computer", sum: "Your tools and a safe AWS login, on macOS, Windows or Linux." },
    ],
  },
  {
    id: "01", slug: "01-how-software-ships", track: "ship", title: "How software ships", kind: "lessons",
    blurb: "The DevOps lifecycle, and how good teams measure delivery.",
    qc: "QuickCart releases once a month and it hurts. Why, and what better looks like.",
    lessons: [
      { slug: "devops-lifecycle", title: "The DevOps lifecycle", sum: "Plan, code, build, test, release, deploy, operate, monitor." },
      { slug: "dora-metrics", title: "Measuring delivery", sum: "The four DORA numbers every team is judged on." },
      { slug: "slos", title: "Reliability targets", sum: "SLIs, SLOs and the error budget you are allowed to spend." },
      { slug: "release-strategies", title: "Ways to release", sum: "Rolling, blue/green and canary — and when each fits." },
      { slug: "feature-flags", title: "Feature flags", sum: "Shipping code without switching it on." },
    ],
  },
  {
    id: "02", slug: "02-the-cloud", track: "cloud", title: "The cloud, simply", kind: "lessons",
    blurb: "What AWS actually is, who can do what, and where it all physically lives.",
    qc: "QuickCart moves off a laptop and onto AWS.",
    lessons: [
      { slug: "what-the-cloud-is", title: "What the cloud is", sum: "Renting computers by the second, and what that changes." },
      { slug: "iam", title: "Who can do what: IAM", sum: "Users, roles, policies, and why root keys are dangerous." },
      { slug: "regions-and-zones", title: "Regions and zones", sum: "Why QuickCart runs in two buildings at once." },
    ],
  },
  {
    id: "03", slug: "03-networking", track: "cloud", title: "Networking", kind: "lessons",
    blurb: "Your private network on AWS, and deciding exactly what the internet can reach.",
    qc: "The app must reach the API. Nobody should ever reach the database.",
    lessons: [
      { slug: "vpc", title: "What is a VPC?", sum: "Your own private section of AWS's network." },
      { slug: "subnets-and-cidr", title: "Subnets and IP ranges", sum: "Slicing the network, and planning addresses for growth." },
      { slug: "routing", title: "Routes, gateways and NAT", sum: "How traffic finds its way in and out." },
      { slug: "security-groups", title: "Security groups", sum: "The firewall on every resource, and chaining them." },
      { slug: "dns-and-https", title: "Domain names and HTTPS", sum: "Route 53, certificates and a padlock in the browser." },
    ],
  },
  {
    id: "04", slug: "04-running-code", track: "cloud", title: "Running code", kind: "lessons",
    blurb: "Servers, load balancers, and adding capacity automatically.",
    qc: "Launch day. The one server falls over at 7pm.",
    lessons: [
      { slug: "ec2", title: "Servers on EC2", sum: "Launching a machine, and what an image is." },
      { slug: "load-balancers", title: "Load balancers", sum: "One address in front of many servers." },
      { slug: "auto-scaling", title: "Auto scaling", sum: "Adding servers when busy, replacing them when they die." },
    ],
  },
  {
    id: "05", slug: "05-data", track: "cloud", title: "Data", kind: "lessons",
    blurb: "Databases, files and secrets — the parts you cannot afford to lose.",
    qc: "Orders must never be lost, and the database password must never leak.",
    lessons: [
      { slug: "rds", title: "Managed databases: RDS", sum: "Backups, failover and a second copy in another zone." },
      { slug: "sql-safely", title: "Running SQL safely", sum: "Transactions, checking before committing, undo scripts." },
      { slug: "s3", title: "Files on S3", sum: "Menu photos, receipts and storage that never fills up." },
      { slug: "secrets", title: "Secrets", sum: "Keeping passwords out of code for good." },
    ],
  },
  {
    id: "06", slug: "06-watching-it-run", track: "cloud", title: "Watching it run", kind: "lessons",
    blurb: "Knowing something is wrong before your customers tell you.",
    qc: "Checkout has been failing for an hour. Nobody noticed.",
    lessons: [
      { slug: "logs-and-metrics", title: "Logs and metrics", sum: "CloudWatch, and asking questions of your logs." },
      { slug: "alarms", title: "Alarms that actually fire", sum: "Thresholds with reasons, and proving they work." },
      { slug: "cloudtrail", title: "Who changed what", sum: "CloudTrail, and answering 'who did this?'." },
    ],
  },
  {
    id: "07", slug: "07-containers", track: "box", title: "Containers", kind: "lessons",
    blurb: "Packaging the app once so it runs the same everywhere.",
    qc: "'It worked on my laptop' breaks a release.",
    lessons: [
      { slug: "images-and-containers", title: "Images and containers", sum: "The package and the running copy." },
      { slug: "dockerfile", title: "Writing a Dockerfile", sum: "Every line, and why the order matters." },
      { slug: "volumes-and-networking", title: "Data and networking", sum: "Volumes, bind mounts and container networks." },
      { slug: "ecr", title: "Storing images: ECR", sum: "Private images, scanning and tags that never change." },
    ],
  },
  {
    id: "08", slug: "08-running-containers", track: "box", title: "Running containers", kind: "lessons",
    blurb: "ECS and Kubernetes: keeping containers alive and releasing without downtime.",
    qc: "Friday releases stop causing errors.",
    lessons: [
      { slug: "ecs-fargate", title: "ECS on Fargate", sum: "Running containers with no servers to manage." },
      { slug: "zero-downtime-releases", title: "Releases without downtime", sum: "Why requests get dropped, and the three fixes." },
      { slug: "kubernetes-and-eks", title: "Kubernetes and EKS", sum: "Pods, deployments, and the load balancer controller." },
      { slug: "ecs-or-eks", title: "ECS or EKS?", sum: "Deciding with evidence, not opinion." },
    ],
  },
  {
    id: "09", slug: "09-infrastructure-as-code", track: "code", title: "Infrastructure as code", kind: "lessons",
    blurb: "Terraform from your first resource to a whole platform in two regions.",
    qc: "Opening in a second country took a week of clicking. Next time: one command.",
    lessons: [
      { slug: "why-terraform", title: "Why Terraform", sum: "What goes wrong when infrastructure lives in people's heads." },
      { slug: "first-resource", title: "Your first resource", sum: "Providers, plan, apply, destroy — and reading a plan." },
      { slug: "terraform-variables", title: "Variables, locals and outputs", sum: "One set of code for every environment." },
      { slug: "terraform-loops", title: "Loops and lifecycle", sum: "for_each, count's trap, and protecting what matters." },
      { slug: "terraform-modules", title: "Modules", sum: "Reusable pieces, and where your standards live." },
      { slug: "terraform-state", title: "Terraform state", sum: "How Terraform remembers — and keeping that memory safe." },
      { slug: "environments-and-regions", title: "Environments and regions", sum: "dev, stg and a second region by changing variables." },
      { slug: "operating-terraform", title: "Operating Terraform", sum: "Drift, import, moved blocks and recovering from mistakes." },
    ],
  },
  {
    id: "10", slug: "10-automation", track: "auto", title: "Automation", kind: "lessons",
    blurb: "Jenkins and the pipeline that takes a commit all the way to production.",
    qc: "Releases stop needing someone awake at 2am.",
    lessons: [
      { slug: "jenkins", title: "Jenkins from zero", sum: "Controllers, agents, credentials and backups." },
      { slug: "jenkinsfile", title: "The Jenkinsfile", sum: "A pipeline written as code, line by line." },
      { slug: "continuous-integration", title: "Continuous integration", sum: "Lint, test, build, scan, and a plan on every pull request." },
      { slug: "continuous-delivery", title: "Continuous delivery", sum: "Approval gates, deploys, smoke tests and one-click rollback." },
      { slug: "canary-pipeline", title: "Canary from a pipeline", sum: "Promotion and abort criteria, written down first." },
    ],
  },
  {
    id: "11", slug: "11-when-things-break", track: "ship", title: "When things break", kind: "lessons",
    blurb: "Where to look first, runbooks, and learning from real failures.",
    qc: "3am. Checkout is down. What do you open first?",
    lessons: [
      { slug: "where-to-look-first", title: "Where to look first", sum: "A checklist that finds most problems in minutes." },
      { slug: "runbooks", title: "Runbooks", sum: "Procedures written down, tested and timed." },
      { slug: "real-incidents", title: "Real incidents", sum: "Every failure from this course, and what it taught." },
    ],
  },
];

export interface Project {
  n: number;
  slug: string;
  title: string;
  sum: string;
  builds: string;
  proves: string;
  uses: string[]; // module slugs
}

export const PROJECTS: Project[] = [
  {
    n: 1, slug: "01-network-by-hand", title: "A network by hand",
    sum: "VPC, subnets, NAT, endpoints and least-privilege roles.",
    builds: "A VPC across two zones, public, app and data subnets, internet and NAT gateways, route tables, VPC endpoints, a security group chain, and least-privilege IAM roles.",
    proves: "You understand every networking piece, because you placed each one yourself.",
    uses: ["02-the-cloud", "03-networking"],
  },
  {
    n: 2, slug: "02-self-healing-environment", title: "A self-healing environment",
    sum: "Survives losing a server and a whole zone, with numbers to prove it.",
    builds: "A launch template, an auto scaling group across two zones, a load balancer with HTTPS, a managed database, S3, secrets, logs and alarms.",
    proves: "It survives losing a server and a whole zone — measured, with numbers.",
    uses: ["04-running-code", "05-data", "06-watching-it-run"],
  },
  {
    n: 3, slug: "03-one-service-two-runtimes", title: "One service, two runtimes",
    sum: "The same container on ECS and EKS, released with zero failures.",
    builds: "The same container on ECS Fargate and on EKS, both behind HTTPS load balancers.",
    proves: "A new version released under load with zero failed requests, counted by a load-testing script, plus a written ECS-or-EKS recommendation.",
    uses: ["07-containers", "08-running-containers"],
  },
  {
    n: 4, slug: "04-everything-as-code", title: "Everything as code",
    sum: "Projects 1 to 3 rebuilt from empty by Terraform, in two regions.",
    builds: "Projects 1 to 3 rebuilt with Terraform modules, remote state with locking, two environments that differ only by variables, and a second region.",
    proves: "Destroy and rebuild from empty with no manual step, and the next plan is clean.",
    uses: ["09-infrastructure-as-code"],
  },
  {
    n: 5, slug: "05-the-pipeline", title: "The pipeline",
    sum: "A commit reaches production with nobody touching the console.",
    builds: "A Jenkins pipeline: lint, test, scan and a Terraform plan on every pull request; build, push, deploy, smoke test, approval, canary with abort criteria and one-click rollback; two operations jobs; and a runbook.",
    proves: "A commit reaches production with nobody touching the console.",
    uses: ["10-automation", "11-when-things-break"],
  },
];

/* The projects appear in the rail and on the route map as a final "module". */
export const PROJECTS_MODULE: Module = {
  id: "★", slug: "projects", track: "proj", title: "Projects", kind: "projects",
  blurb: "Five builds that put each part together, with step-by-step guides.",
  qc: "Everything above, built for real.",
  lessons: PROJECTS.map((p) => ({ slug: p.slug, title: `${p.n}: ${p.title}`, sum: p.sum })),
};

export const ALL_MODULES: Module[] = [...MODULES, PROJECTS_MODULE];

export interface FlatLesson extends LessonRef {
  module: Module;
}

/* Every lesson in reading order. Projects are not in this list: prev/next
   runs through the lessons, and projects have their own pager. */
export const ORDER: FlatLesson[] = MODULES.flatMap((m) => m.lessons.map((l) => ({ ...l, module: m })));

export function lessonBySlug(slug: string): FlatLesson | undefined {
  return ORDER.find((l) => l.slug === slug);
}

export function moduleOf(slug: string): Module | undefined {
  return MODULES.find((m) => m.lessons.some((l) => l.slug === slug));
}

/* Prefix paths with the configured base, so the site works under a sub-path. */
export function href(path: string): string {
  const base = import.meta.env.BASE_URL.replace(/\/$/, "");
  return base + path;
}

export const lessonHref = (slug: string) => href(`/lessons/${slug}/`);
export const moduleHref = (m: Module) => (m.kind === "projects" ? href("/projects/") : href(`/modules/${m.slug}/`));
export const projectHref = (slug: string) => href(`/projects/${slug}/`);
export const stopHref = (m: Module, slug: string) => (m.kind === "projects" ? projectHref(slug) : lessonHref(slug));
