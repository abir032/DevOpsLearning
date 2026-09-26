/*
 * Glossary terms. `lesson` is the lesson that explains the term properly.
 * `match` lists the words that, on first use in a lesson, link back here.
 * Keep matches specific: a common word like "state" would link everywhere.
 */

import { readdirSync, readFileSync, existsSync } from "node:fs";
import { join } from "node:path";

export interface Term {
  term: string;
  def: string;
  lesson: string;
  match: string[];
}

const BASE_TERMS: Term[] = [
  { term: "AWS account", lesson: "what-the-cloud-is", match: ["AWS account"],
    def: "Your own space inside AWS. Everything you create belongs to it, and it gets the bill." },
  { term: "Availability zone", lesson: "regions-and-zones", match: ["availability zone", "availability zones"],
    def: "One of several separate data centre sites inside a region. Running in two means one can fail and you stay up." },
  { term: "Backend (Terraform)", lesson: "terraform-state", match: ["backend block"],
    def: "Where Terraform keeps its state file. For a team, an S3 bucket." },
  { term: "CIDR", lesson: "subnets-and-cidr", match: ["CIDR"],
    def: "A way of writing an IP address range. 10.0.0.0/16 means 65,536 addresses; /24 means 256. A smaller number after the slash means a bigger range." },
  { term: "Container", lesson: "images-and-containers", match: ["container", "containers"],
    def: "A running copy of an image. Many containers can start from one image." },
  { term: "Drift", lesson: "operating-terraform", match: ["drift"],
    def: "When what is really in AWS no longer matches your Terraform code — usually because someone changed it in the console." },
  { term: "Elastic IP", lesson: "routing", match: ["Elastic IP"],
    def: "A public IP address that stays yours until you release it, instead of changing when a server restarts." },
  { term: "Image", lesson: "images-and-containers", match: ["container image"],
    def: "A packaged app: code, libraries and a small operating system. It never changes once built." },
  { term: "Internet gateway", lesson: "vpc", match: ["internet gateway"],
    def: "The door between your VPC and the internet. A subnet only uses it if its route table says so." },
  { term: "Load balancer", lesson: "load-balancers", match: ["load balancer"],
    def: "One fixed address in front of many servers. Sends each request to a healthy one." },
  { term: "Lock (state lock)", lesson: "terraform-state", match: ["state lock", "locking"],
    def: "A marker Terraform places on the state while it works, so two people cannot apply at the same time." },
  { term: "NAT gateway", lesson: "routing", match: ["NAT gateway"],
    def: "Lets servers in a private subnet reach the internet — to download updates — while nothing on the internet can reach them." },
  { term: "Plan (Terraform)", lesson: "first-resource", match: ["terraform plan"],
    def: "Terraform's list of what it would create, change or destroy. Read it before you apply." },
  { term: "Private subnet", lesson: "vpc", match: ["private subnet"],
    def: "A subnet with no route to the internet gateway. Nothing on the internet can reach it directly." },
  { term: "Public subnet", lesson: "vpc", match: ["public subnet"],
    def: "A subnet whose route table sends internet traffic to the internet gateway." },
  { term: "Region", lesson: "regions-and-zones", match: ["region"],
    def: "A geographic area where AWS runs, like us-east-1 in Virginia. Each has several availability zones." },
  { term: "Route table", lesson: "vpc", match: ["route table"],
    def: "The rules that decide where a subnet's traffic goes. It is the only thing that makes a subnet public or private." },
  { term: "Security group", lesson: "security-groups", match: ["security group"],
    def: "A firewall attached to a resource, listing what may connect to it and what it may connect to." },
  { term: "State (Terraform)", lesson: "terraform-state", match: ["terraform.tfstate"],
    def: "Terraform's memory: a file linking each resource in your code to the real thing in AWS." },
  { term: "Subnet", lesson: "vpc", match: ["subnet"],
    def: "A slice of a VPC's address range. Each subnet lives in exactly one availability zone." },
  { term: "Versioning (S3)", lesson: "s3", match: ["versioning"],
    def: "S3 keeping every past version of a file, so a damaged or deleted one can be brought back." },
  { term: "VPC", lesson: "vpc", match: ["VPC"],
    def: "Virtual Private Cloud: your own private section of AWS's network. Nothing gets in unless you open a way." },
];

/* More terms live in src/data/glossary/*.json (arrays of Term), one file per
   module, so several people can add terms without editing the same file.
   A term defined twice keeps the later definition. */
function extraTerms(): Term[] {
  const dir = join(process.cwd(), "src/data/glossary");
  if (!existsSync(dir)) return [];
  return readdirSync(dir).filter((f) => f.endsWith(".json")).sort()
    .flatMap((f) => JSON.parse(readFileSync(join(dir, f), "utf8")) as Term[]);
}

const byName = new Map<string, Term>();
for (const t of [...BASE_TERMS, ...extraTerms()]) byName.set(t.term.toLowerCase(), t);
export const GLOSSARY: Term[] = [...byName.values()];

export const termId = (t: string) => "g-" + t.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
