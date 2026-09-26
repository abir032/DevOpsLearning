/*
 * Files on S3: versioning, delete markers and restoring.
 * Pure state and rendering, shared by the server render and the island.
 */

export interface Ver { id: string; kind: "obj" | "marker"; photo: number }

export interface Bucket {
  versioning: boolean;
  stack: Ver[]; /* newest first */
  photos: number; /* how many photos have been uploaded so far */
  ids: number;
}

/* Made-up version IDs, the shape S3 uses. Unversioned objects have the ID "null". */
const IDS = ["3sL4kQtJ9wYf", "Wq1x8TzR0bNa", "p7GmVd2LcE5u", "Kx9oHs3TfP1r", "b2RnZ6yWqM8e", "Tj5cU0aXvD4k", "m8FqL1eS7hYw", "Zr3pB9dN2gCq"];

export const empty = (versioning: boolean): Bucket => ({ versioning, stack: [], photos: 0, ids: 0 });

const nextId = (b: Bucket) => (b.versioning ? IDS[b.ids++ % IDS.length] : "null");

export function current(b: Bucket): Ver | undefined {
  return b.stack[0];
}

export function getResult(b: Bucket) {
  const c = current(b);
  if (!c) return { ok: false, text: "404 Not Found — NoSuchKey" };
  if (c.kind === "marker") return { ok: false, text: "404 Not Found — the newest version is a delete marker" };
  return { ok: true, text: `200 OK — photo ${c.photo}` };
}

export function bucketHtml(b: Bucket) {
  const g = getResult(b);
  const rows = b.stack.length
    ? b.stack.map((v, i) => {
        const tag = v.kind === "marker" ? "Delete marker" : i === 0 ? "Current version" : "Older version";
        const what = v.kind === "marker" ? "no content: a note saying “deleted”" : `photo ${v.photo}`;
        return `<li class="s3v ${v.kind}${i === 0 ? " top" : ""}"><span class="s3-what">${what}</span><span class="s3-id">Version ID: ${v.id}</span><span class="s3-tag">${tag}</span></li>`;
      }).join("")
    : `<li class="s3-empty">No versions. As far as S3 knows, menu.jpg has never existed.</li>`;
  return `
  <div class="s3-col">
    <div class="s3-h"><b>quickcart-menu</b> / menu.jpg <span class="s3-chip${b.versioning ? " on" : ""}">Versioning ${b.versioning ? "on" : "off"}</span></div>
    <p class="s3-sub">Every version S3 is keeping, newest at the top</p>
    <ul class="s3-stack">${rows}</ul>
  </div>
  <div class="s3-get ${g.ok ? "ok" : "no"}"><span>The app asks for <code>menu.jpg</code> and gets</span><b>${g.text}</b></div>`;
}

export type Act = "upload" | "delete" | "unmark" | "restore";

export function act(b: Bucket, a: Act): [string, string, "" | "good" | "bad"] {
  const c = current(b);
  if (a === "upload") {
    const photo = ++b.photos;
    const v: Ver = { id: nextId(b), kind: "obj", photo };
    if (b.versioning) {
      b.stack.unshift(v);
      return ["Upload", b.stack.length > 1
        ? `Photo ${photo} is now the current version. <b>The older versions are still kept underneath</b>, each with its own version ID.`
        : `Photo ${photo} is uploaded. With versioning on it gets its own version ID.`, ""];
    }
    const lost = c && c.kind === "obj";
    b.stack = [v];
    return ["Upload", lost
      ? `Photo ${photo} <b>replaced photo ${c!.photo}</b>. Versioning is off, so the old photo is gone for good. There is nothing underneath.`
      : `Photo ${photo} is uploaded. With versioning off its version ID is <code>null</code>, and there is only ever one copy.`, lost ? "bad" : ""];
  }
  if (a === "delete") {
    if (!c || c.kind === "marker") return ["Delete", "There's no current menu.jpg to delete.", ""];
    if (b.versioning) {
      b.stack.unshift({ id: nextId(b), kind: "marker", photo: 0 });
      return ["Delete", "S3 did not delete anything. It put a <b>delete marker</b> on top. The app now gets 404, but every photo is still underneath.", ""];
    }
    b.stack = [];
    return ["Delete", "<b>Gone for good.</b> Versioning is off, so the delete removed the only copy. Nothing in S3 can bring it back.", "bad"];
  }
  if (a === "unmark") {
    if (c?.kind !== "marker") {
      return ["Delete the delete marker", b.versioning
        ? "There's no delete marker on top to remove."
        : "There is no delete marker. With versioning off, a delete really deletes, so there is nothing to undo.", b.versioning ? "" : "bad"];
    }
    b.stack.shift();
    return ["Delete the delete marker", `The marker is gone, so <b>photo ${current(b)!.photo} is current again</b>. The app gets it back straight away. That is the whole undo.`, "good"];
  }
  /* restore an older version: copy it on top, as a new current version */
  const older = b.stack.filter((v) => v.kind === "obj").slice(c?.kind === "obj" ? 1 : 0)[0];
  if (!b.versioning) return ["Restore an older version", "There is no older version. With versioning off, S3 keeps only the latest copy.", "bad"];
  if (!older) return ["Restore an older version", "There is no older photo to restore yet. Upload twice first.", ""];
  b.stack.unshift({ id: nextId(b), kind: "obj", photo: older.photo });
  return ["Restore an older version", `S3 copied photo ${older.photo} to the top as a <b>new current version</b>. Nothing was removed, so you could change your mind again.`, "good"];
}
