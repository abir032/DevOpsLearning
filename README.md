# Laptop to Production

A static DevOps course site. It follows one app, QuickCart, from a laptop to millions of users.

Built with Astro 7 and MDX. The visuals are small vanilla TypeScript islands. Styling is plain CSS with design tokens, and search runs on Pagefind. The output is fully static, so it deploys to GitHub Pages, Cloudflare Pages or S3 + CloudFront.

## Commands

| Command | What it does |
|---|---|
| `npm run dev` | Dev server. Search shows titles only, because Pagefind builds its index after `astro build` |
| `npm run build` | Build to `dist/` and index the site for search |
| `npm test` | Every check, in order: code blocks, contrast, build, forbidden strings, links, Playwright |
| `npm run check:links -- --external` | Also check external links |
| `SITE_BASE=/repo-name npm run build` | Build for a sub-path, such as a GitHub Pages project site |

The code-block check needs `terraform`, `shellcheck`, `hadolint` and `yamllint`. Install them with `brew install shellcheck hadolint yamllint hashicorp/tap/terraform`.

## Where things live

| Path | What |
|---|---|
| `src/data/curriculum.ts` | Modules, lessons, projects and their order. The single source for navigation |
| `src/data/glossary.ts` | Glossary terms. `match` controls the first-use auto-links in lessons |
| `src/content/lessons/<slug>.mdx` | One file per finished lesson. A lesson without a file shows as "being written" |
| `src/components/lesson/` | The lesson components (see below) |
| `src/components/viz/` | Interactive visuals, one component each |
| `src/lib/rehype-*.mjs` | Code blocks, tables, glossary links and base paths |
| `forbidden-strings.json` | Strings and patterns that fail the build if they reach `dist/` |
| `source/` | The original notes. Raw material only, never published. Contains personal data |

## Writing a lesson

A lesson is six `<Part>`s in fixed order: `problem`, `idea`, `see`, `doit`, `quiz`, `cheat`. The quiz goes in the frontmatter. Every option carries its own `why`. You don't import components; they're all available.

| Component | Use |
|---|---|
| `<Story who="…">` | QuickCart's part of the problem |
| `<Case title="…">` | A genuine, widely reported real-world case |
| `<YouKnow title="…">` | One comparison to something app developers know |
| `<Key>` | The one sentence to remember |
| `<Note title="…">` | A warning or aside |
| `<Mistake title="…">` | A common mistake: the error in an `output` block, then **Why:** and **The fix:** |
| `<ConsolePath path="VPC > Your VPCs > Create VPC" />` | Where to click in the console |
| `<Cost kind="free\|pennies\|paid">` | The cost badge at the top of every lab |
| `<Steps>` and `<Step title="…">` | Lab steps; the last one is `<Step title="Clean up" cleanup>` |
| `<See>` | "You should see", described in words |
| `<Quiz questions={frontmatter.quiz} />` | The quiz |
| `<Cheat>` | Wraps the cheat-sheet table |

The rest of the conventions:

- **Code blocks:** use ` ```hcl title="main.tf" ` and ` ```sh `. Mark placeholders with `ph="LOCK_ID"`.
- **Expected output:** use ` ```output `. It renders as "You should see", and a `title="…"` changes that label.
- **Command breakdowns:** follow each command with a table headed `| Part | What it means |`.
- **Console forms:** use a table headed `| Field | Enter |`.
- **Terraform:** every attribute gets a table row.
- **No `...`:** the code check rejects any block containing it.

Real names, account IDs, domains and programme details must never appear on the site. Use the placeholders `111122223333`, `us-east-1` and `example.com`. The forbidden-strings check enforces this.
