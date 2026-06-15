# ClearWork — Generated JSON-LD Schema
**Generated:** June 2026 | Source: seo-schema skill
**Paste each block into the relevant page's `<head>` as `<script type="application/ld+json">`**

> ⚠️ **FAQPage schema correction:** Earlier briefs said "FAQPage schema required." This is WRONG.
> FAQPage rich results are restricted to government and healthcare sites only (Google, Aug 2023).
> Using it on a SaaS blog will NOT produce rich results and wastes markup. Do NOT add FAQPage schema.
> The FAQ content still helps AI citation — just not via structured data.

---

## Schema Types Used Per Page

| Page Type | Schema Types |
|---|---|
| Blog post / guide | BlogPosting + BreadcrumbList |
| Pillar / ultimate guide | Article + BreadcrumbList |
| Comparison page | Article + BreadcrumbList |
| Feature landing page | SoftwareApplication + BreadcrumbList |
| All pages (sitewide) | Organization + WebSite (already in index.html) |

---

## 1. SITEWIDE — Organization (already in index.html — verify these fields)

```json
{
  "@context": "https://schema.org",
  "@type": "Organization",
  "name": "ClearWork",
  "url": "https://getclearwork.in",
  "logo": {
    "@type": "ImageObject",
    "url": "https://getclearwork.in/logo/full_logo.svg",
    "width": 200,
    "height": 60
  },
  "description": "India's all-in-one client management platform for freelancers and agencies. GST invoicing, e-sign contracts, proposals, and UPI payments in one tool.",
  "foundingDate": "2025",
  "foundingLocation": {
    "@type": "Place",
    "addressCountry": "IN",
    "addressLocality": "Bengaluru"
  },
  "address": {
    "@type": "PostalAddress",
    "addressCountry": "IN",
    "addressLocality": "Bengaluru",
    "addressRegion": "Karnataka"
  },
  "contactPoint": {
    "@type": "ContactPoint",
    "contactType": "customer support",
    "email": "hello@getclearwork.in",
    "availableLanguage": ["English", "Hindi"]
  },
  "sameAs": [
    "https://twitter.com/getclearwork",
    "https://www.linkedin.com/company/clearwork-india",
    "https://www.producthunt.com/products/clearwork"
  ],
  "knowsAbout": [
    "GST invoicing India",
    "Freelancer client management",
    "E-sign contracts IT Act 2000",
    "UPI payment integration",
    "TDS tracking India"
  ]
}
```

---

## 2. SITEWIDE — SoftwareApplication (homepage + feature pages)

```json
{
  "@context": "https://schema.org",
  "@type": "SoftwareApplication",
  "name": "ClearWork",
  "applicationCategory": "BusinessApplication",
  "applicationSubCategory": "Client Management Software",
  "operatingSystem": "Web, iOS, Android",
  "url": "https://getclearwork.in",
  "description": "All-in-one client management for Indian freelancers and agencies. GST invoices, e-sign contracts, proposals, UPI payments, and WhatsApp reminders in one platform.",
  "inLanguage": "en-IN",
  "offers": [
    {
      "@type": "Offer",
      "name": "Free Plan",
      "price": "0",
      "priceCurrency": "INR",
      "description": "3 projects, 3 proposals/month, basic invoicing. No credit card required."
    },
    {
      "@type": "Offer",
      "name": "Solo Plan",
      "price": "149",
      "priceCurrency": "INR",
      "billingIncrement": "P1M",
      "description": "Unlimited leads, proposals, contracts, GST invoicing, UPI payments. Founding price."
    },
    {
      "@type": "Offer",
      "name": "Studio Plan",
      "price": "349",
      "priceCurrency": "INR",
      "billingIncrement": "P1M",
      "description": "Everything in Solo plus team seats, white-label, multi-currency. Founding price."
    }
  ],
  "featureList": [
    "GST invoice generator with CGST/SGST/IGST auto-calculation",
    "UPI payment links in invoices via Razorpay",
    "OTP e-sign contracts valid under IT Act 2000",
    "Proposal tracking with open notifications",
    "WhatsApp invoice reminders",
    "TDS tracking (Section 194J/194C)",
    "Client CRM with lead pipeline",
    "Client portal",
    "AI proposal drafter"
  ],
  "audience": {
    "@type": "Audience",
    "audienceType": "Indian freelancers, consultants, and creative agencies"
  },
  "availableOnDevice": ["Desktop", "Mobile", "Tablet"],
  "screenshot": "https://getclearwork.in/screenshots/screenshot-dashboard.png",
  "aggregateRating": {
    "@type": "AggregateRating",
    "ratingValue": "4.8",
    "ratingCount": "47",
    "bestRating": "5",
    "worstRating": "1"
  }
}
```

> 📝 Update `ratingValue` and `ratingCount` with real numbers once you have reviews. Do not keep placeholder values.

---

## 3. PILLAR PAGE — Article schema

**Page:** `/blog/freelancer-client-management-software-india`

```json
{
  "@context": "https://schema.org",
  "@type": "Article",
  "headline": "Freelancer Client Management Software India: The Complete Guide (2026)",
  "description": "Compare the best client management software for Indian freelancers. GST invoicing, UPI payments, e-sign contracts — all in one tool. See 2026 pricing.",
  "url": "https://getclearwork.in/blog/freelancer-client-management-software-india",
  "datePublished": "2026-06-14",
  "dateModified": "2026-06-14",
  "inLanguage": "en-IN",
  "author": {
    "@type": "Person",
    "name": "[Author Name]",
    "url": "https://getclearwork.in/about",
    "description": "Freelancer and co-founder of ClearWork, building tools for Indian freelancers since 2022."
  },
  "publisher": {
    "@type": "Organization",
    "name": "ClearWork",
    "url": "https://getclearwork.in",
    "logo": {
      "@type": "ImageObject",
      "url": "https://getclearwork.in/logo/full_logo.svg"
    }
  },
  "image": {
    "@type": "ImageObject",
    "url": "https://getclearwork.in/blog/og/freelancer-client-management-software-india.png",
    "width": 1200,
    "height": 630
  },
  "about": [
    {
      "@type": "Thing",
      "name": "Freelancer client management software"
    },
    {
      "@type": "Thing",
      "name": "GST invoicing India"
    },
    {
      "@type": "Thing",
      "name": "ClearWork"
    }
  ],
  "mentions": [
    { "@type": "SoftwareApplication", "name": "ClearWork", "url": "https://getclearwork.in" },
    { "@type": "SoftwareApplication", "name": "Bonsai", "url": "https://hellobonsai.com" },
    { "@type": "SoftwareApplication", "name": "Refrens", "url": "https://refrens.com" },
    { "@type": "SoftwareApplication", "name": "Zoho CRM", "url": "https://zoho.com/crm" }
  ],
  "isPartOf": {
    "@type": "WebSite",
    "name": "ClearWork",
    "url": "https://getclearwork.in"
  }
}
```

---

## 4. BLOG POST — BlogPosting schema (template for all blog articles)

**Use for:** All Cluster 1–6 spoke pages and hub blog pages.
Replace the bracketed values per page.

```json
{
  "@context": "https://schema.org",
  "@type": "BlogPosting",
  "headline": "[Page H1 — max 110 characters]",
  "description": "[Meta description — 130-150 characters]",
  "url": "https://getclearwork.in/blog/[slug]",
  "datePublished": "2026-06-[DD]",
  "dateModified": "2026-06-[DD]",
  "inLanguage": "en-IN",
  "author": {
    "@type": "Person",
    "name": "[Author Name]",
    "url": "https://getclearwork.in/about"
  },
  "publisher": {
    "@type": "Organization",
    "name": "ClearWork",
    "url": "https://getclearwork.in",
    "logo": {
      "@type": "ImageObject",
      "url": "https://getclearwork.in/logo/full_logo.svg"
    }
  },
  "image": {
    "@type": "ImageObject",
    "url": "https://getclearwork.in/blog/og/[slug].png",
    "width": 1200,
    "height": 630
  },
  "mainEntityOfPage": {
    "@type": "WebPage",
    "@id": "https://getclearwork.in/blog/[slug]"
  },
  "about": {
    "@type": "Thing",
    "name": "[Primary topic — e.g. 'GST invoicing for freelancers India']"
  },
  "keywords": "[comma, separated, secondary, keywords]",
  "articleSection": "[Cluster name — e.g. 'GST Invoicing' or 'Freelancer Tools India']",
  "wordCount": [target word count as integer],
  "isPartOf": {
    "@type": "Blog",
    "name": "ClearWork Blog",
    "url": "https://getclearwork.in/blog"
  }
}
```

---

## 5. FEATURE LANDING PAGE — SoftwareApplication (for Cluster Hubs that are feature pages)

**Use for:** `/gst-invoice`, `/proposals`, `/contracts` feature pages.

```json
{
  "@context": "https://schema.org",
  "@type": "SoftwareApplication",
  "name": "ClearWork GST Invoice Generator",
  "applicationCategory": "BusinessApplication",
  "applicationSubCategory": "GST Invoice Software",
  "operatingSystem": "Web, iOS, Android",
  "url": "https://getclearwork.in/gst-invoice",
  "description": "Auto-calculate CGST, SGST and IGST by client state. Create GST invoices with UPI payment links, TDS tracking, and WhatsApp reminders. Free plan available.",
  "inLanguage": "en-IN",
  "offers": {
    "@type": "Offer",
    "price": "0",
    "priceCurrency": "INR",
    "description": "Free GST invoice generator. Paid plans from ₹149/month."
  },
  "featureList": [
    "Auto CGST/SGST/IGST calculation by client state",
    "GSTIN validation and auto-fill",
    "UPI payment link via Razorpay",
    "TDS flagging (Section 194J/194C)",
    "WhatsApp reminders at 3, 7, 14 days overdue",
    "Recurring invoice support",
    "GST quarterly export (CA-ready PDF)",
    "SAC code support"
  ],
  "publisher": {
    "@type": "Organization",
    "name": "ClearWork",
    "url": "https://getclearwork.in"
  }
}
```

---

## 6. BREADCRUMBLIST — Template (add to every page)

```json
{
  "@context": "https://schema.org",
  "@type": "BreadcrumbList",
  "itemListElement": [
    {
      "@type": "ListItem",
      "position": 1,
      "name": "Home",
      "item": "https://getclearwork.in/"
    },
    {
      "@type": "ListItem",
      "position": 2,
      "name": "Blog",
      "item": "https://getclearwork.in/blog"
    },
    {
      "@type": "ListItem",
      "position": 3,
      "name": "[Page Title]",
      "item": "https://getclearwork.in/blog/[slug]"
    }
  ]
}
```

For feature pages (non-blog), use:
```json
{
  "@context": "https://schema.org",
  "@type": "BreadcrumbList",
  "itemListElement": [
    {
      "@type": "ListItem",
      "position": 1,
      "name": "Home",
      "item": "https://getclearwork.in/"
    },
    {
      "@type": "ListItem",
      "position": 2,
      "name": "[Feature Name]",
      "item": "https://getclearwork.in/[feature-slug]"
    }
  ]
}
```

---

## 7. COMPARISON PAGE — Article with mentions (Cluster 4 pages)

**Use for:** HoneyBook alternative, Bonsai alternative, comparison pages.

```json
{
  "@context": "https://schema.org",
  "@type": "Article",
  "headline": "HoneyBook Alternative India 2026 — ClearWork vs Bonsai vs Dubsado",
  "description": "HoneyBook doesn't work in India. Compare ClearWork vs Bonsai vs Dubsado for Indian freelancers — GST, UPI payments, INR pricing. From ₹149/mo.",
  "url": "https://getclearwork.in/blog/honeybook-bonsai-dubsado-alternative-india",
  "datePublished": "2026-06-14",
  "dateModified": "2026-06-14",
  "inLanguage": "en-IN",
  "author": {
    "@type": "Person",
    "name": "[Author Name]",
    "url": "https://getclearwork.in/about"
  },
  "publisher": {
    "@type": "Organization",
    "name": "ClearWork",
    "url": "https://getclearwork.in",
    "logo": {
      "@type": "ImageObject",
      "url": "https://getclearwork.in/logo/full_logo.svg"
    }
  },
  "image": {
    "@type": "ImageObject",
    "url": "https://getclearwork.in/blog/og/honeybook-bonsai-dubsado-alternative-india.png",
    "width": 1200,
    "height": 630
  },
  "about": {
    "@type": "Thing",
    "name": "Freelancer software comparison India"
  },
  "mentions": [
    { "@type": "SoftwareApplication", "name": "HoneyBook", "url": "https://www.honeybook.com" },
    { "@type": "SoftwareApplication", "name": "Bonsai", "url": "https://hellobonsai.com" },
    { "@type": "SoftwareApplication", "name": "Dubsado", "url": "https://www.dubsado.com" },
    { "@type": "SoftwareApplication", "name": "ClearWork", "url": "https://getclearwork.in" }
  ],
  "mainEntityOfPage": {
    "@type": "WebPage",
    "@id": "https://getclearwork.in/blog/honeybook-bonsai-dubsado-alternative-india"
  }
}
```

---

## 8. Per-Page Schema Quick Reference

| URL | Schema Type | Notes |
|---|---|---|
| `/` | SoftwareApplication + Organization + WebSite | Already in index.html — add featureList + offers |
| `/gst-invoice` | SoftwareApplication + BreadcrumbList | Use template #5 above |
| `/blog/freelancer-client-management-software-india` | Article + BreadcrumbList | Use template #3 |
| `/blog/how-to-create-gst-invoice-freelancer-india` | BlogPosting + BreadcrumbList | Use template #4 |
| `/blog/gst-for-freelancers-india-complete-guide` | BlogPosting + BreadcrumbList | Add wordCount: 3000 |
| `/blog/tds-for-freelancers-india-explained` | BlogPosting + BreadcrumbList | Add wordCount: 1800 |
| `/blog/honeybook-bonsai-dubsado-alternative-india` | Article + BreadcrumbList | Use template #7 (with mentions) |
| `/blog/honeybook-alternative-india` | Article + BreadcrumbList | Add mentions: HoneyBook + ClearWork |
| `/blog/bonsai-alternative-india` | Article + BreadcrumbList | Add mentions: Bonsai + ClearWork |
| `/blog/refrens-alternative-india` | Article + BreadcrumbList | Add mentions: Refrens + ClearWork |
| `/blog/esign-contract-freelancers-india-it-act-2000` | BlogPosting + BreadcrumbList | Use template #4 |
| `/blog/best-crm-freelancers-india` | Article + BreadcrumbList | Use template #4 |
| All Cluster 6 profession pages | BlogPosting + BreadcrumbList | Use template #4 |

---

## 9. Schema Validation

Before pushing live, validate every JSON-LD block at:
- **Google Rich Results Test:** https://search.google.com/test/rich-results
- **Schema.org Validator:** https://validator.schema.org

Common errors to check:
- `datePublished` must be ISO 8601 format: `"2026-06-14"` ✓ not `"June 14, 2026"` ✗
- `image.url` must be absolute URL (https://...) ✓ not relative (/blog/og/...) ✗
- `wordCount` must be integer, not string: `1500` ✓ not `"1500"` ✗
- Do NOT add FAQPage schema — restricted to government/healthcare only
- Do NOT add HowTo schema — deprecated September 2023
