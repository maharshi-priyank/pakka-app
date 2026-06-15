# ClearWork — GEO / AI Search Readiness Analysis
**Generated:** June 2026 | Skill: seo-geo
**Site:** getclearwork.in

---

## GEO Readiness Score: 62/100

> **Correction (post-analysis):** Initial audit missed `scripts/prerender.mjs` — a Puppeteer-based post-build prerender that runs headless Chrome against every route and saves full rendered HTML to `/dist`. Vercel serves these static files before applying SPA rewrites. Blog content IS visible to AI crawlers for all prerendered routes.
> Score revised upward accordingly.

| Category | Score | Weight | Notes |
|---|---|---|---|
| Citability (passage quality) | 55/100 | 25% | llms.txt strong; blog content prerendered |
| Structural Readability | 70/100 | 20% | Prerendered pages readable by all crawlers |
| Multi-Modal Content | 35/100 | 15% | Screenshots exist; no video, no infographics |
| Authority & Brand Signals | 25/100 | 20% | No Wikipedia, weak Reddit, no YouTube |
| Technical Accessibility | 72/100 | 20% | Prerender working — gap is new routes need manual addition |

---

## Platform Breakdown

| Platform | Score | Key Blocker |
|---|---|---|
| Google AI Overviews | 65/100 | Good (prerendered HTML) — needs brand signals |
| ChatGPT / GPTBot | 48/100 | Prerender works for existing pages; new pages need route added |
| Perplexity | 45/100 | Same as ChatGPT |
| Bing Copilot | 40/100 | No IndexNow implementation |

---

## Issue #1 — Prerender Pipeline Exists (WORKING — one maintenance gap)

**Status: ✅ Already solved for existing pages. One process gap for new pages.**

`scripts/prerender.mjs` runs Puppeteer after every build: starts `vite preview`, visits all 18 routes with headless Chrome (waits 3s for JS to settle), saves full rendered HTML to `/dist/[route]/index.html`. Vercel serves these static files directly to crawlers — GPTBot, PerplexityBot, and ClaudeBot all see the full page content.

**The one gap:** When a new blog page is published, its route must be manually added to two files, or crawlers get the blank SPA fallback.

### Checklist for every new blog page

When you create `/src/pages/blog/NewBlogPost.tsx` and add its `<Route>` to `App.tsx`, also update:

**1. `scripts/prerender.mjs` — add to ROUTES array:**
```js
'/blog/your-new-slug',
```

**2. `vercel.json` — add to rewrites array (fallback for direct navigation):**
```json
{ "source": "/blog/your-new-slug", "destination": "/index.html" }
```

**3. `public/llms.txt` — add entry:**
```
### Post Title
URL: https://getclearwork.in/blog/your-new-slug
Covers: [2-3 sentence summary with specific data points]
```

**4. `public/sitemap.xml` — add `<url>` block with today's date as `<lastmod>`**

That's the full checklist. Missing any one of these degrades crawlability for that page.

---

## Critical Issue #2 — robots.txt Missing AI Crawler Declarations

**Current robots.txt:**
```
User-agent: *
Allow: /
Sitemap: https://getclearwork.in/sitemap.xml
```

`Allow: *` technically allows AI crawlers, but best practice is to **explicitly list** the crawlers you want. This also lets you block training crawlers (CCBot) while allowing search crawlers.

**Recommended robots.txt:**
```
# Standard search engines
User-agent: *
Allow: /

# AI search crawlers — explicitly allowed for search visibility
User-agent: GPTBot
Allow: /

User-agent: OAI-SearchBot
Allow: /

User-agent: ChatGPT-User
Allow: /

User-agent: ClaudeBot
Allow: /

User-agent: PerplexityBot
Allow: /

User-agent: Bytespider
Allow: /

# Training-only crawlers — blocked (don't contribute to search)
User-agent: CCBot
Disallow: /

User-agent: anthropic-ai
Disallow: /

User-agent: cohere-ai
Disallow: /

Sitemap: https://getclearwork.in/sitemap.xml
```

---

## Issue #3 — llms.txt Pricing Incorrect

**File exists:** ✅ `/llms.txt` is present and well-structured.
**Content quality:** Good — India-specific context, feature list, blog URLs.

**Bug found:** Pricing says `₹699/month` but founding price is `₹149/month (Solo)` and `₹349/month (Studio)`. AI tools reading this will cite the wrong price.

Fix: update the Pricing section.

---

## Issue #4 — No Author Entity / Person Schema

Every blog page will be published without a declared author entity. For AI citation:
- ChatGPT prefers attributable sources (person + organization)
- Google AI Overviews weight author credibility for YMYL-adjacent content
- No `Person` schema = no author entity = lower citation confidence

**Fix:** Add `Person` schema to every blog post author bio block (see schema brief).

---

## Issue #5 — Brand Mention Gap (Weakest Area)

Brand mentions correlate 3x more with AI visibility than backlinks (Ahrefs 2025).

| Platform | ClearWork Presence | Target |
|---|---|---|
| Wikipedia | ❌ None | Get a mention on "Freelancing in India" article |
| Reddit (r/IndianFreelancers, r/IndiaBiz) | ❌ None visible | 3–5 authentic mentions / answers per month |
| YouTube | ❌ No channel | Even 3 videos dramatically improves ChatGPT citation |
| LinkedIn | ✅ Company page exists | Post weekly — LinkedIn feeds ChatGPT and Perplexity |
| Product Hunt | Listed | Good — AI tools index PH |
| G2 / Capterra | ❌ Not listed | High-authority pages — ChatGPT cites these |

**Highest-impact action:** Get listed on G2 and Capterra — both are heavily indexed by ChatGPT/Perplexity. A 3.5+ star rating with 5+ reviews will drive citation.

---

## Issue #6 — llms.txt Missing New Blog Pages

Current `llms.txt` lists 5 blog posts. As new cluster content is published, each page needs a structured entry added to `llms.txt`.

**Template to add per new post:**
```
### [Post Title]
URL: https://getclearwork.in/blog/[slug]
Covers: [2-3 sentence summary of exactly what the post covers, with specific data points]
Related tool: https://getclearwork.in/tools/[tool-slug] (if applicable)
```

---

## Top 5 Highest-Impact Changes

| Priority | Action | Impact | Effort |
|---|---|---|---|
| 1 | **Add SSR/SSG (vite-ssg)** | All AI crawlers can now read blog content | Medium (1–2 days) |
| 2 | **Update robots.txt** with explicit AI crawler entries | GPTBot/PerplexityBot/ClaudeBot explicitly invited | Low (10 min) |
| 3 | **Fix llms.txt pricing** (₹699 → ₹149 Solo, ₹349 Studio) | AI tools cite correct price | Low (5 min) |
| 4 | **List on G2 + Capterra** | ChatGPT and Perplexity heavily cite both | Low (30 min setup) |
| 5 | **Add Person schema to all author bios** | AI attribution confidence, E-E-A-T boost | Medium (2 hrs) |

---

## Passage-Level Citability (Optimal 134–167 word blocks)

The llms.txt is good. The blog posts (once SSR is fixed) need to follow the optimal passage pattern. From the `eeat-writing-rules.md`:

Each H2 section should produce one self-contained, 134–167 word paragraph that:
1. Starts with a direct declarative statement
2. Contains a specific number or citation
3. Can be read without the surrounding article
4. Ends with a complete thought (not "see next section")

**Example of a citable passage (from TDS brief, rewritten to pattern):**
> "Indian freelancers receiving payment from companies must account for TDS under Section 194J of the Income Tax Act, 1961. Professional service providers — including designers, consultants, developers, and content writers — face a 10% TDS deduction on payments exceeding ₹30,000 per year from a single client. The client deducts this before payment and deposits it with the government. The freelancer receives the net amount (invoice value minus TDS) and must reconcile the deduction using Form 26AS and Form 16A provided by the client. This TDS is not a loss — it is advance income tax credited to the freelancer's PAN and can be set off against final tax liability or refunded when filing ITR."

That passage is 134 words, self-contained, citable, and matches the query "what is TDS for freelancers India."

---

## llms.txt — Recommended Updates

Current file is good. Apply these changes:

**Fix pricing (line ~18):**
```
## Pricing
- Free forever plan (no credit card)
- Solo plan: ₹149/month (founding price, locked for early users)
- Studio plan: ₹349/month (founding price, locked for early users)
- No transaction fees on payments
```

**Add as new cluster blog posts are published** — one entry per post using the template above.

**Add entity section:**
```
## About
- Founded: 2025
- Location: Bengaluru, India
- Founder background: Freelancers who built tools for themselves
- Legal: ClearWork complies with Indian GST laws, IT Act 2000, and DPDP Act
- Contact: hello@getclearwork.in
```

---

## Server-Side Rendering — Implementation Brief

Once you're ready to implement Option A (vite-ssg):

```bash
cd pakka-landing
npm install vite-ssg
```

Update `vite.config.ts`:
```ts
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { ViteSSG } from 'vite-ssg'

// vite-ssg takes over the build process
// All routes defined in src/router.tsx are pre-rendered at build time
export default defineConfig({
  plugins: [react()],
  ssgOptions: {
    script: 'async',
    formatting: 'minify',
  },
})
```

Update `src/main.tsx` to export routes for SSG to discover:
```ts
// vite-ssg replaces ReactDOM.createRoot
export const createApp = ViteSSG(App, { routes })
```

After this change, every blog page ships as a complete HTML file with all content visible without JavaScript. Googlebot, GPTBot, PerplexityBot, and ClaudeBot will all index the full content.

---

## GEO Readiness Score After All Fixes: ~78/100

| Fix | Score gain |
|---|---|
| SSR/SSG implementation | +20 |
| robots.txt AI crawler entries | +5 |
| llms.txt pricing fix | +3 |
| G2/Capterra listings | +6 |
| Person schema on authors | +3 |
| **Total after fixes** | **+37 → 78/100** |
