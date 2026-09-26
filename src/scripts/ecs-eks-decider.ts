/*
 * The questions behind the "ECS or EKS?" decision helper, and how answers
 * add up to a recommendation. Used at build time (to render the questions)
 * and in the browser.
 */

export interface Answer { t: string; ecs: number; eks: number; why: string }
export interface Question { id: string; q: string; answers: Answer[] }

export const QUESTIONS: Question[] = [
  {
    id: "people", q: "Who will run the platform day to day?",
    answers: [
      { t: "One or two people, between features", ecs: 3, eks: 0, why: "With one or two part-time operators, EKS's upgrades and add-ons compete with feature work. ECS has no cluster to upgrade." },
      { t: "A few people, part time", ecs: 1, eks: 0, why: "A few part-time people can run EKS, but it will take a real share of their week." },
      { t: "A dedicated platform team", ecs: 0, eks: 2, why: "A dedicated team can own Kubernetes upgrades, add-ons and on-call properly." },
    ],
  },
  {
    id: "leave", q: "Is running outside AWS a real plan?",
    answers: [
      { t: "No", ecs: 2, eks: 0, why: "Portability is worth little if you never use it. ECS being AWS-only costs you nothing." },
      { t: "Maybe, one day", ecs: 1, eks: 0, why: "\"Maybe one day\" rarely justifies paying for portability now. Your app is already in a container, which makes a later move easier either way." },
      { t: "Yes, with a date", ecs: 0, eks: 3, why: "Kubernetes runs on every major cloud and on your own servers, so the skills and most of the manifests travel with you." },
    ],
  },
  {
    id: "tool", q: "Does the app need a tool only Kubernetes has?",
    answers: [
      { t: "No", ecs: 2, eks: 0, why: "If you can't name the Kubernetes-only tool you need, you don't need one yet." },
      { t: "Not sure", ecs: 1, eks: 0, why: "\"Not sure\" usually means no. Find the specific tool before choosing a platform for it." },
      { t: "Yes, and we can name it", ecs: 0, eks: 3, why: "A named need, such as a particular operator or a custom controller, is a genuine reason. ECS can't be extended that way." },
    ],
  },
  {
    id: "skills", q: "What does the team know today?",
    answers: [
      { t: "ECS", ecs: 2, eks: 0, why: "The team can release and debug on ECS today. Kubernetes would take months to learn well." },
      { t: "Neither", ecs: 1, eks: 0, why: "Starting from nothing, ECS has far fewer ideas to learn before the first release." },
      { t: "Kubernetes, well", ecs: 0, eks: 2, why: "Existing Kubernetes skill removes most of EKS's learning cost." },
    ],
  },
  {
    id: "running", q: "What already runs in production?",
    answers: [
      { t: "ECS", ecs: 2, eks: 0, why: "Adding EKS means running two platforms: two ways to release, to debug and to secure. That cost is easy to miss." },
      { t: "Nothing yet", ecs: 0, eks: 0, why: "There's no existing platform to protect, so neither side gains here." },
      { t: "Kubernetes", ecs: 0, eks: 2, why: "Choosing ECS now would mean two platforms, or a migration. Staying on Kubernetes is cheaper." },
    ],
  },
  {
    id: "scale", q: "How many services, and how many teams?",
    answers: [
      { t: "A handful, one team", ecs: 1, eks: 0, why: "EKS's fixed costs, the control plane, add-ons and upgrades, are spread over very little." },
      { t: "Dozens, a few teams", ecs: 0, eks: 0, why: "Both platforms handle dozens of services well. This doesn't decide it." },
      { t: "Hundreds, many teams", ecs: 0, eks: 1, why: "At this size, Kubernetes' shared tools and ecosystem start to pay back its overhead." },
    ],
  },
];

/* QuickCart's answers: a small team, already on ECS, no plans to leave AWS */
export const QUICKCART = [1, 0, 1, 0, 0, 0];

export interface Verdict { answered: number; ecs: number; eks: number; pick: "ecs" | "eks" | "close" | "none"; title: string; body: string; change: string }

export function verdict(picks: (number | null)[]): Verdict {
  let ecs = 0, eks = 0, answered = 0;
  picks.forEach((p, i) => {
    if (p == null) return;
    answered++;
    ecs += QUESTIONS[i].answers[p].ecs;
    eks += QUESTIONS[i].answers[p].eks;
  });
  const total = QUESTIONS.length;
  if (!answered) {
    return { answered, ecs, eks, pick: "none", title: "Answer the questions", body: `Choose one answer for each of the ${total} questions. The recommendation and its reasons appear here as you go.`, change: "" };
  }
  const d = ecs - eks;
  const pick = d >= 3 ? "ecs" : d <= -3 ? "eks" : "close";
  const sofar = answered < total ? `So far, from ${answered} of ${total} answers: ` : "";
  if (pick === "ecs") {
    return { answered, ecs, eks, pick, title: sofar + "ECS on Fargate",
      body: "The simpler platform fits this team. Less to run means more time for the product, and fewer ways to break at 2am.",
      change: "A real plan to run outside AWS, a team big enough to own Kubernetes, or a tool the app needs that only Kubernetes has." };
  }
  if (pick === "eks") {
    return { answered, ecs, eks, pick, title: sofar + "EKS",
      body: "This team can carry Kubernetes' extra work, and has a concrete use for what it adds.",
      change: "Losing the people who run it, or the Kubernetes-only need going away. Then its extra work no longer pays for itself." };
  }
  return { answered, ecs, eks, pick, title: sofar + "Too close to call",
    body: "The answers pull both ways. Run the same service on both and measure: time to set up, release under load, time to undo a bad release, and cost.",
    change: "Any one clear answer, especially who will run it, and whether leaving AWS is really planned." };
}
