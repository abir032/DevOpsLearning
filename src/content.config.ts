import { defineCollection } from "astro:content";
import { glob } from "astro/loaders";
import { z } from "astro/zod";
import { ORDER } from "./data/curriculum";

const slugs = ORDER.map((l) => l.slug);

const option = z.object({
  t: z.string(),
  /* Why this option is right or wrong. Every option gets one. */
  why: z.string(),
});

const question = z
  .object({
    q: z.string(),
    options: z.array(option).min(3).max(5),
    answer: z.number().int().min(0),
  })
  .refine((q) => q.answer < q.options.length, { message: "answer index is past the last option" });

const lessons = defineCollection({
  loader: glob({ pattern: "*.mdx", base: "./src/content/lessons" }),
  schema: z.object({
    /* Title and summary come from src/data/curriculum.ts, so they never drift. */
    time: z.string(),
    level: z.enum(["Beginner", "Intermediate", "Advanced"]),
    /* Lessons to read first, by slug. Empty means none. */
    before: z.array(z.string().refine((s) => slugs.includes(s), { message: "unknown lesson slug" })).default([]),
    cost: z.string(),
    quiz: z.array(question).min(4).max(6),
  }),
});

const projects = defineCollection({
  loader: glob({ pattern: "*.mdx", base: "./src/content/projects" }),
  schema: z.object({
    time: z.string(),
    cost: z.string(),
  }),
});

export const collections = { lessons, projects };
