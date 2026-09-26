/*
 * A coarse land mask for the regions globe, made from Natural Earth 1:110m land
 * (public domain). Each row runs from 90°N southwards, one row per STEP degrees.
 * A row lists runs of land as "start.length" in base 36, counted in cells from
 * 180°W. Antarctica is left out; nothing in the lesson happens there.
 */
export interface LandMask { step: number; rows: string[] }

export const LAND_3: LandMask = {"step":3,"rows":["","","v.8 18.9","s.7 12.g 1s.2 1v.1 2j.2","j.2 n.1 q.1 s.6 11.g 2a.1 2m.3","j.2 o.1 q.5 w.2 15.c 26.1 2f.d 2t.1 2z.1","6.4 m.4 s.1 u.7 16.9 1w.2 2a.2 2d.s","0.1 5.s y.1 10.3 16.7 1t.9 24.8 2d.z","6.r y.4 17.3 1h.2 1s.3 1w.1f","5.o y.2 18.2 1q.4 1v.19 35.1 37.3","8.1 e.f y.3 12.1 1m.1 1q.1 1s.2 1w.13 35.1","g.f y.6 1m.1 1s.1 1v.12 34.2","h.g y.7 1l.1 1n.1d 34.1","j.j 1n.1d","j.j 1n.b 1z.1 21.x 2z.1","j.i 1l.1 1n.3 1r.6 21.w 2z.1","j.g 1l.3 1t.3 1y.u 2t.2","j.g 1l.3 1s.1 1v.1 1x.w 2u.1 2y.1","k.e 1m.5 20.s 2w.2","l.c 1l.8 1v.2 20.t 2v.1","n.5 w.1 1k.f 20.4 25.o","o.4 1j.m 28.k","p.2 x.1 1j.h 21.7 2b.7 2j.7","p.3 u.1 10.1 1j.h 22.5 2c.4 2j.4 2o.1","r.4 1i.j 22.4 2c.3 2j.5 2s.1","u.2 1i.m 2d.2 2l.3","v.1 z.3 13.1 1j.m 2d.2 2n.1","y.6 1k.l 2t.1","y.9 1l.1 1q.e 2k.1 2q.2","y.9 1r.c 2l.2 2o.3","x.c 1r.b 2m.1 2p.2 2s.1 2w.1","x.e 1s.9 2m.1 2x.3","x.f 1s.9 2o.2 2y.3","y.e 1s.9","z.c 1s.a 24.1 2v.2 2z.1","10.b 1s.9 23.2 2t.5 2z.2","11.a 1s.8 23.1 2s.9","11.9 1t.7 22.2 2q.c","10.8 1t.6 2q.d","10.8 1t.6 2q.d","10.7 1u.4 2r.c","10.6 1u.1 2r.1 2y.4","z.6 2z.3 3a.1","z.4 3a.1","10.2 39.1","z.3 38.1","z.2","z.2"]};

export const LAND_2: LandMask = {"step":2,"rows":["","","","1d.8 1w.a","17.1 19.b 1m.p 3t.1","11.2 17.3 1b.5 1k.o 2o.5 3u.4","u.2 16.1 19.5 1i.r 2q.1 3x.2","y.3 14.1 16.1 18.6 1p.j 3a.2 3p.d 4f.3 4j.2","s.3 w.1 10.1 14.1 16.2 19.4 1e.2 1q.h 38.2 3m.l 48.2","0.1 b.2 s.1 v.7 16.2 1a.8 1s.d 26.1 2u.2 39.1 3f.3 3j.s 4c.a 4o.1 4z.1","8.d m.9 x.3 12.1 15.1 17.3 1b.2 1g.4 1s.d 2r.9 3c.3 3g.2 3j.1b 4v.5","0.3 8.15 1h.5 1r.a 2p.e 34.1 36.c 3j.1h","2.2 7.13 1b.1 1f.6 1s.6 27.4 2o.5 2v.4 30.1 32.1y","8.11 1i.2 1l.1 1t.4 2m.5 2t.27","7.7 f.s 1f.4 1u.3 2l.6 2t.1v 4q.1 4s.4","9.4 l.m 1f.4 1l.1 2l.6 2u.1n 4m.1 4q.1","b.1 n.m 1g.7 2f.2 2m.1 2o.2 2t.1m 4o.4","8.1 p.o 1f.a 2e.3 2m.1 2s.1m 4o.3","p.o 1f.b 2d.2 2g.2 2k.1y 4o.1","q.10 2g.2 2j.1x 4h.1","r.1 t.r 1l.1 1p.2 2h.1z 4h.1","s.u 1r.1 2h.1y 4h.1","s.s 1l.2 2h.7 2p.8 2z.1 31.1d","s.r 2d.7 2n.2 2r.5 32.1b 4g.2","s.q 2e.4 2m.1 2p.2 2s.4 2x.1e 4g.1","s.o 2d.5 2q.1 2s.2 2v.1a 49.1 4g.1","t.n 2f.2 2l.3 2p.1 2w.1b 49.2 4e.2","u.m 2f.8 2u.1 2y.1 30.16 49.1 4c.4","v.j 2e.a 30.16 4b.2","w.h 2d.e 2s.4 2x.1a","y.8 1d.1 2d.t 37.10","x.1 z.6 1d.1 2b.o 30.7 39.x","y.1 10.5 2b.o 31.7 39.1 3f.r","11.4 1c.2 2a.q 31.b 3h.n 46.1","11.4 19.2 1f.1 29.s 32.9 3h.9 3s.8","12.4 18.2 1i.1 2a.r 33.8 3i.6 3t.6 40.1","14.6 2a.r 33.6 3j.4 3t.7 46.1","18.4 29.t 33.4 3j.3 3v.5 46.1","1a.2 2a.t 34.1 3j.3 3v.6 46.1","1b.1 1g.4 2a.u 36.2 3k.2 3v.1 3y.2 48.1","1c.1 1e.1 1g.8 2b.w 3k.1 3m.1 3v.1 3y.1","1f.a 2c.v 3m.1 48.1","1f.d 2d.2 2g.1 2l.l 3u.1 3w.2 43.2","1f.e 2n.i 3v.1 3x.1 42.3","1e.f 2n.h 3v.2 41.4 46.1","1e.h 2m.h 3w.2 41.4 4b.2","1e.k 2n.f 3x.2 41.3 45.2 4a.1 4c.1 4e.3","1d.n 2o.e 3y.1 47.1 4f.4","1e.n 2o.e 3z.3 4f.5 4o.1","1f.l 2o.e 44.1 48.1 4g.2 4j.1 4q.1","1f.k 2p.d","1g.j 2o.e 36.1 4b.3 4h.1","1g.j 2o.e 36.1 48.6 4h.2 4t.1","1i.g 2o.d 34.3 47.8 4h.2","1j.f 2o.c 34.3 47.c","1j.f 2p.b 34.2 44.h 4s.1","1j.d 2p.b 34.2 43.i","1j.b 2p.a 34.1 43.j","1j.b 2q.8 43.k","1i.b 2q.8 43.k","1i.b 2r.6 44.j","1i.a 2r.5 44.4 4d.9","1i.7 44.1 4f.6 4w.1","1h.9 4g.5 4x.1","1h.6 4x.2","1h.4 1m.1 4i.2 4w.2","1i.4 4j.1 4v.2","1h.4 4u.2","1h.4","1g.4 3g.1","1g.3","1h.3","1i.2"]};

/* Every run of land as [row, first column, number of cells]. */
export function landRuns(m: LandMask): [number, number, number][] {
  const out: [number, number, number][] = [];
  m.rows.forEach((row, r) => {
    if (!row) return;
    for (const run of row.split(" ")) {
      const [s, n] = run.split(".").map((v) => parseInt(v, 36));
      out.push([r, s, n]);
    }
  });
  return out;
}

/* Some of AWS's regions, placed roughly where they are. */
export const REGIONS: { code: string; name: string; lat: number; lon: number }[] = [
  { code: "us-east-1", name: "N. Virginia", lat: 38.9, lon: -77.4 },
  { code: "us-west-2", name: "Oregon", lat: 45.8, lon: -119.7 },
  { code: "ca-central-1", name: "Canada (Central)", lat: 45.5, lon: -73.6 },
  { code: "sa-east-1", name: "São Paulo", lat: -23.5, lon: -46.6 },
  { code: "eu-west-1", name: "Ireland", lat: 53.3, lon: -6.3 },
  { code: "eu-west-2", name: "London", lat: 51.5, lon: -0.1 },
  { code: "eu-central-1", name: "Frankfurt", lat: 50.1, lon: 8.7 },
  { code: "eu-north-1", name: "Stockholm", lat: 59.3, lon: 18.1 },
  { code: "me-central-1", name: "UAE", lat: 24.5, lon: 54.4 },
  { code: "af-south-1", name: "Cape Town", lat: -33.9, lon: 18.4 },
  { code: "ap-south-1", name: "Mumbai", lat: 19.1, lon: 72.9 },
  { code: "ap-southeast-1", name: "Singapore", lat: 1.35, lon: 103.8 },
  { code: "ap-northeast-1", name: "Tokyo", lat: 35.7, lon: 139.7 },
  { code: "ap-southeast-2", name: "Sydney", lat: -33.9, lon: 151.2 },
];

/* The three zones of us-east-1 the visual uses. On the globe they are spread
   far wider than in real life, so you can see them. */
export const ZONES = ["a", "b", "c"] as const;
export type Zone = (typeof ZONES)[number];
export const ZONE_SPOTS: Record<Zone, { lat: number; lon: number }> = {
  a: { lat: 41.6, lon: -79.4 },
  b: { lat: 36.6, lon: -80.6 },
  c: { lat: 37.6, lon: -74.2 },
};

export type Mode = "one" | "two";

/* Which zone each of QuickCart's two servers runs in. */
export const SERVER_ZONES: Record<Mode, [Zone, Zone]> = { one: ["a", "a"], two: ["a", "b"] };

/* Where things sit in the zone panel (an SVG 640 wide). */
export const ZONE_BOX: Record<Zone, { x: number; y: number; w: number; h: number }> = {
  a: { x: 22, y: 166, w: 190, h: 116 },
  b: { x: 225, y: 166, w: 190, h: 116 },
  c: { x: 428, y: 166, w: 190, h: 116 },
};
export const SERVER_W = 76;
export const SERVER_H = 46;

export function serverSpots(mode: Mode): { x: number; y: number }[] {
  const [z1, z2] = SERVER_ZONES[mode];
  const y = 208;
  if (z1 === z2) {
    const b = ZONE_BOX[z1];
    return [{ x: b.x + 14, y }, { x: b.x + b.w - 14 - SERVER_W, y }];
  }
  return [z1, z2].map((z) => ({ x: ZONE_BOX[z].x + (ZONE_BOX[z].w - SERVER_W) / 2, y }));
}

/* The wire from the load balancer down to a server. */
export const wire = (s: { x: number; y: number }) => `M320 122 L${s.x + SERVER_W / 2} ${s.y}`;
