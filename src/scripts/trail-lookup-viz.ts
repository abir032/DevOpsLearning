/*
 * Data and rendering for the CloudTrail event lookup visual.
 * Teaches: every change is an API call with a name, a person and a time.
 * Filter to the write you care about, then read the record.
 */

export interface Ev {
  id: string; time: string; name: string; user: string; source: string;
  resource: string; ro: boolean; record: Record<string, unknown>;
}

const ACCT = "111122223333";
const who = (user: string) =>
  user === "pipeline"
    ? { type: "AssumedRole", arn: `arn:aws:sts::${ACCT}:assumed-role/quickcart-deploy/pipeline`, accountId: ACCT }
    : { type: "IAMUser", arn: `arn:aws:iam::${ACCT}:user/${user}`, accountId: ACCT, userName: user };

function ev(id: string, time: string, name: string, user: string, source: string, resource: string, ro: boolean, req: Record<string, unknown>, ip = "203.0.113.24"): Ev {
  return {
    id, time, name, user, source, resource, ro,
    record: {
      eventTime: `2026-09-25T${time}Z`, eventSource: source, eventName: name, awsRegion: "us-east-1",
      sourceIPAddress: ip, userIdentity: who(user), requestParameters: req, readOnly: ro, eventType: "AwsApiCall", managementEvent: true,
    },
  };
}

const DB_SG = "sg-0db5e1f2";
const APP_SG = "sg-0a9b8c7d";

export const EVENTS: Ev[] = [
  ev("e1", "14:20:03", "DescribeSecurityGroups", "leo", "ec2.amazonaws.com", "", true, { filterSet: {} }, "198.51.100.7"),
  ev("e2", "14:18:44", "RevokeSecurityGroupIngress", "noor", "ec2.amazonaws.com", DB_SG, false,
    { groupId: DB_SG, ipPermissions: { items: [{ ipProtocol: "tcp", fromPort: 3306, toPort: 3306, groups: { items: [{ groupId: APP_SG }] } }] } }),
  ev("e3", "14:18:39", "DescribeSecurityGroupRules", "noor", "ec2.amazonaws.com", DB_SG, true, { filterSet: { items: [{ name: "group-id", valueSet: { items: [{ value: DB_SG }] } }] } }),
  ev("e4", "14:12:09", "AuthorizeSecurityGroupIngress", "maya", "ec2.amazonaws.com", APP_SG, false,
    { groupId: APP_SG, ipPermissions: { items: [{ ipProtocol: "tcp", fromPort: 8080, toPort: 8080, ipRanges: { items: [{ cidrIp: "10.0.0.0/16" }] } }] } }, "192.0.2.51"),
  ev("e5", "14:05:51", "DescribeInstances", "leo", "ec2.amazonaws.com", "", true, { instancesSet: {} }, "198.51.100.7"),
  ev("e6", "13:58:30", "UpdateService", "pipeline", "ecs.amazonaws.com", "quickcart-orders", false,
    { cluster: "quickcart", service: "quickcart-orders", taskDefinition: "quickcart-orders:14" }, "198.51.100.40"),
  ev("e7", "13:41:12", "DescribeLogGroups", "maya", "logs.amazonaws.com", "", true, { logGroupNamePrefix: "/quickcart" }, "192.0.2.51"),
];

export const LOOKUPS: { k: string; label: string; test: (e: Ev) => boolean }[] = [
  { k: "all", label: "No filter", test: () => true },
  { k: "write", label: "Read-only: false", test: (e) => !e.ro },
  { k: "revoke", label: "Event name: RevokeSecurityGroupIngress", test: (e) => e.name === "RevokeSecurityGroupIngress" },
  { k: "res", label: `Resource name: ${DB_SG}`, test: (e) => e.resource === DB_SG },
  { k: "s3", label: "Event name: DeleteObject", test: () => false },
];

const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

export function tableHtml(k: string, open: string | null) {
  const l = LOOKUPS.find((x) => x.k === k)!;
  const rows = EVENTS.filter(l.test);
  if (!rows.length) return `<p class="tl-none">No matching events in the last 90 days.</p>`;
  return `<table class="tl-tbl"><thead><tr><th scope="col">Event time</th><th scope="col">Event name</th><th scope="col">User name</th><th scope="col">Event source</th><th scope="col">Resource</th></tr></thead><tbody>` +
    rows.map((e) => `<tr class="${e.ro ? "ro" : "w"}${open === e.id ? " open" : ""}"><td>${e.time}</td><td><button type="button" class="tl-ev" data-ev="${e.id}" aria-expanded="${open === e.id}">${e.name}</button></td><td>${esc(e.user)}</td><td>${e.source}</td><td>${e.resource ? `<code>${esc(e.resource)}</code>` : "—"}</td></tr>`).join("") +
    `</tbody></table>`;
}

export function recordHtml(id: string | null) {
  if (!id) return "";
  const e = EVENTS.find((x) => x.id === id)!;
  return `<div class="tl-rec-h">Event record: ${e.name}</div><pre class="plan-out tl-rec" tabindex="0">${esc(JSON.stringify(e.record, null, 2))}</pre>`;
}

export function sayHtml(k: string, open: string | null): { html: string; tone: "" | "good" | "bad" } {
  const head = (t: string) => `<span class="step-l">${t}</span>`;
  if (open) {
    const e = EVENTS.find((x) => x.id === open)!;
    if (e.name === "RevokeSecurityGroupIngress") return { tone: "good", html: head("Found it") + `<b>noor</b> removed the rule letting <code>${APP_SG}</code> reach port <b>3306</b> on <code>${DB_SG}</code>, at 14:18:44, from 203.0.113.24. The record says who, what, when and from where. Now you can ask her why, and put it back.` };
    return { tone: "", html: head(`${e.name} by ${esc(e.user)}`) + (e.ro ? "A read-only call: somebody looked at something. It changed nothing, so it can't have broken anything." : "A change, but not the one you're looking for. Check the resource and the time.") };
  }
  const n = EVENTS.filter(LOOKUPS.find((x) => x.k === k)!.test).length;
  if (k === "all") return { tone: "", html: head(`${n} events`) + "The question: <b>who removed the database's security group rule?</b> Unfiltered, the history is mostly people looking at things. Filter it." };
  if (k === "write") return { tone: "", html: head(`${n} changes`) + `Read-only calls are gone, so only changes are left: three of them. Two changed security groups. Choose the one on the database's group, <code>${DB_SG}</code>, to read its record.` };
  if (k === "revoke") return { tone: "", html: head(`${n} event`) + "Removing an inbound rule is the API call <b>RevokeSecurityGroupIngress</b>. There's one. Choose it to open the record." };
  if (k === "res") return { tone: "", html: head(`${n} events`) + "Everything that touched this one security group: someone looked at its rules, then removed one, a few seconds later. Choose the event name to read it." };
  return { tone: "bad", html: head("Nothing, even though it happened") + "Deleting a file in S3 is a <b>data event</b>. Event history only keeps <b>management events</b>: changes to resources, not to what's inside them. To see data events you need a trail with data events turned on, and that costs money." };
}
