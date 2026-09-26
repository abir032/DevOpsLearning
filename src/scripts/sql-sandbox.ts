/*
 * Running SQL safely: the transaction sandbox.
 * Pure state and rendering, shared by the server render and the island.
 */

export interface Row { id: number; customer: number; status: string; total: string }

export const START: Row[] = [
  { id: 1001, customer: 41, status: "pending", total: "18.50" },
  { id: 1002, customer: 17, status: "paid", total: "22.00" },
  { id: 1003, customer: 52, status: "pending", total: "9.75" },
  { id: 1004, customer: 8, status: "delivered", total: "31.20" },
  { id: 1005, customer: 23, status: "paid", total: "14.00" },
  { id: 1006, customer: 64, status: "pending", total: "27.40" },
  { id: 1007, customer: 30, status: "delivered", total: "12.60" },
  { id: 1008, customer: 12, status: "paid", total: "19.90" },
];

export const copy = (rows: Row[]) => rows.map((r) => ({ ...r }));

export interface Sandbox {
  committed: Row[]; /* what every other session sees */
  mine: Row[];      /* what your session sees */
  inTx: boolean;
  expected: number | null; /* the count from your SELECT, if you ran one */
  out: string;      /* the mysql client's output, as HTML */
}

export const fresh = (): Sandbox => ({
  committed: copy(START), mine: copy(START), inTx: false, expected: null,
  out: '<span class="d">mysql&gt;</span> <span class="d">-- autocommit is on, as it is by default</span>',
});

function cell(r: Row, other: Row | undefined, mark: boolean) {
  const changed = mark && other && other.status !== r.status;
  const cls = [changed ? "dirty" : "", r.status === "cancelled" ? "cx" : ""].filter(Boolean).join(" ");
  return `<tr${cls ? ` class="${cls}"` : ""}><td>${r.id}</td><td>${r.customer}</td><td>${r.status}</td><td>${r.total}</td></tr>`;
}

function table(rows: Row[], other: Row[], mark: boolean, label: string) {
  return `<table class="sq-t"><caption class="sr">${label}</caption><thead><tr><th scope="col">id</th><th scope="col">customer</th><th scope="col">status</th><th scope="col">total</th></tr></thead><tbody>${rows.map((r, i) => cell(r, other[i], mark)).join("")}</tbody></table>`;
}

export function sandboxHtml(s: Sandbox) {
  const dirty = s.mine.some((r, i) => r.status !== s.committed[i].status);
  return `
  <div class="sq-pane me${s.inTx ? " tx" : ""}">
    <div class="sq-h"><b>Your session</b><span class="sq-chip${s.inTx ? " on" : ""}">${s.inTx ? "In a transaction" : "Autocommit: every statement is permanent"}</span></div>
    ${table(s.mine, s.committed, true, "The orders table as your session sees it")}
    <p class="sq-note">${dirty ? "Highlighted rows: changed by you, not committed yet." : "&nbsp;"}</p>
  </div>
  <div class="sq-pane other">
    <div class="sq-h"><b>Everyone else</b><span class="sq-chip">The app, other people</span></div>
    ${table(s.committed, s.committed, false, "The orders table as every other session sees it")}
    <p class="sq-note">${dirty ? "Still sees the old data. Nothing is permanent yet." : "&nbsp;"}</p>
  </div>`;
}

const q = (sql: string) => `<span class="d">mysql&gt;</span> ${sql}`;
const ok = (n: number, extra = "") => `Query OK, ${n} row${n === 1 ? "" : "s"} affected (0.00 sec)${extra}`;

export type Act = "begin" | "select" | "update" | "nowhere" | "rollback" | "commit";

/* Run one statement. Returns the narration: [step label, html, tone]. */
export function run(s: Sandbox, act: Act): [string, string, "" | "good" | "bad"] {
  const wrecked = () => s.committed.every((r) => r.status === "cancelled");
  if (act === "begin") {
    s.inTx = true;
    s.out = q("START TRANSACTION;") + "\n" + ok(0);
    return ["START TRANSACTION", "A transaction is open. Until you <b>COMMIT</b>, your changes are visible only to you, and <b>ROLLBACK</b> can undo them.", ""];
  }
  if (act === "select") {
    const n = s.mine.filter((r) => r.status === "pending").length;
    s.expected = n;
    const lines = s.mine.filter((r) => r.status === "pending").map((r) => `| ${r.id} | ${r.status}  |`);
    s.out = q("SELECT id, status FROM orders WHERE status = 'pending';") + "\n" +
      (n ? `+------+----------+\n| id   | status   |\n+------+----------+\n${lines.join("\n")}\n+------+----------+\n${n} rows in set (0.00 sec)` : "Empty set (0.00 sec)");
    return ["SELECT first", `<b>${n} row${n === 1 ? "" : "s"}</b> match. That is the number the UPDATE with the same WHERE should report. Write it down.`, ""];
  }
  if (act === "update" || act === "nowhere") {
    const all = act === "nowhere";
    const match = s.mine.filter((r) => all || r.status === "pending");
    const changed = match.filter((r) => r.status !== "cancelled").length;
    match.forEach((r) => (r.status = "cancelled"));
    const sql = all ? "UPDATE orders SET status = 'cancelled';" : "UPDATE orders SET status = 'cancelled' WHERE status = 'pending';";
    s.out = q(sql) + "\n" + ok(changed, `\nRows matched: ${match.length}  Changed: ${changed}  Warnings: 0`);
    if (!s.inTx) s.committed = copy(s.mine);
    const exp = s.expected;
    const cmp = exp === null ? "You didn't run the SELECT first, so you have no number to compare it with." :
      changed === exp ? `That matches the <b>${exp}</b> from your SELECT.` : `You expected <b>${exp}</b>.`;
    if (all) {
      return s.inTx
        ? ["UPDATE without WHERE", `<b>${changed} rows affected.</b> ${cmp} Every order is now cancelled, but only in your session. Everyone else still sees the real data. Choose <b>ROLLBACK</b>.`, "bad"]
        : ["UPDATE without WHERE, no transaction", `<b>${changed} rows affected, and it is already permanent.</b> ${cmp} Autocommit saved it the moment it ran, so every customer sees their order cancelled. ROLLBACK can't bring it back. Only a backup or an undo script can.`, "bad"];
    }
    return s.inTx
      ? ["UPDATE with WHERE", `<b>${changed} row${changed === 1 ? "" : "s"} affected.</b> ${cmp} The other side still sees <code>pending</code>. Check, then <b>COMMIT</b>, or <b>ROLLBACK</b> if anything looks wrong.`, exp !== null && changed === exp ? "good" : ""]
      : ["UPDATE with WHERE, no transaction", `<b>${changed} row${changed === 1 ? "" : "s"} affected, and already permanent.</b> ${cmp} There was no START TRANSACTION, so autocommit saved it at once. It was right this time, but you had no chance to check first.`, ""];
  }
  if (act === "rollback") {
    s.out = q("ROLLBACK;") + "\n" + ok(0);
    if (s.inTx) {
      s.inTx = false;
      s.mine = copy(s.committed);
      return ["ROLLBACK", "<b>Rolled back.</b> Your session matches everyone else's again. Nobody ever saw the change.", "good"];
    }
    return ["ROLLBACK, with nothing to roll back", `No transaction was open, so there is nothing to undo. ${wrecked() ? "<b>Every order stays cancelled.</b> " : ""}Anything that ran under autocommit is already permanent.`, wrecked() ? "bad" : ""];
  }
  /* commit */
  s.out = q("COMMIT;") + "\n" + ok(0);
  if (!s.inTx) return ["COMMIT, with nothing to commit", "No transaction was open. Every statement was already committed as it ran.", ""];
  s.inTx = false;
  s.committed = copy(s.mine);
  return wrecked()
    ? ["COMMIT", "<b>Committed. Every order is now cancelled for everyone</b>, and ROLLBACK can no longer undo it. The row count told you, and the commit ignored it.", "bad"]
    : ["COMMIT", "<b>Committed.</b> Now everyone sees the change, and ROLLBACK can no longer undo it. That is why you check the row count before this step.", "good"];
}
