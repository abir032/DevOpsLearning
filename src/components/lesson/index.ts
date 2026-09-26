/*
 * Every component a lesson's MDX can use, without importing it.
 * Pass this map to <Content components={lessonComponents} />.
 *
 * Visuals are picked up automatically: any src/components/viz/Name.astro is
 * available in lessons as <Name />.
 */
import Part from "./Part.astro";
import Story from "./Story.astro";
import Case from "./Case.astro";
import YouKnow from "./YouKnow.astro";
import Key from "./Key.astro";
import Note from "./Note.astro";
import Mistake from "./Mistake.astro";
import ConsolePath from "./ConsolePath.astro";
import See from "./See.astro";
import Steps from "./Steps.astro";
import Step from "./Step.astro";
import Cost from "./Cost.astro";
import Quiz from "./Quiz.astro";
import Cheat from "./Cheat.astro";

const vizModules = import.meta.glob<{ default: unknown }>("../viz/*.astro", { eager: true });
const visuals = Object.fromEntries(
  Object.entries(vizModules).map(([path, mod]) => [path.split("/").pop()!.replace(/\.astro$/, ""), mod.default]),
);

export const lessonComponents = {
  Part, Story, Case, YouKnow, Key, Note, Mistake, ConsolePath, See, Steps, Step, Cost, Quiz, Cheat,
  ...visuals,
};
