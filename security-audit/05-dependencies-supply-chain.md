# Dependencies & Supply Chain Security Audit

**Audit Date:** 2026-05-19  
**Application:** DataPresent  
**Audit Type:** Dependency Vulnerability & Supply Chain Review

---

## Summary

The audit identified **18 vulnerabilities** across the dependency tree, with **9 high-severity**, **6 moderate-severity**, and **3 low-severity** issues. The most critical concerns are the **unmaintained xlsx package** with prototype pollution vulnerabilities and **multiple Next.js CVEs** in the current version.

**Security Score: 45/100**

---

## Vulnerabilities Found

### HIGH SEVERITY

#### 1. xlsx (SheetJS) - Prototype Pollution & ReDoS
- **Severity:** High (CVSS 7.8)
- **Location:** datapresent-web/package.json -> xlsx@0.18.5
- **CVE:** CVE-2023-30533, CVE-2024-22363
- **Description:**
  - **CVE-2023-30533:** All versions through 0.19.2 are vulnerable to Prototype Pollution when reading specially crafted files. An attacker can inject properties into JavaScript objects through malicious Excel files.
  - **CVE-2024-22363:** SheetJS CE before 0.20.2 is vulnerable to Regular Expression Denial of Service (ReDoS). Specially crafted spreadsheet files can cause excessive CPU consumption.
- **Recommendation:** **CRITICAL - Replace this package immediately.** The xlsx npm package is no longer maintained. Migrate to:
  - Commercial SheetJS Pro: https://cdn.sheetjs.com/
  - Alternative: Use exceljs or xlsx-populate packages that are actively maintained
  - If xlsx is required for legacy reasons, migrate to version 0.20.2+ from CDN
- **Impact:** Remote code execution possible via prototype pollution, DoS via ReDoS

#### 2. Next.js 16.2.4 - Multiple High-Severity CVEs
- **Severity:** High (CVSS 7.5-8.6)
- **Location:** datapresent-web/package.json -> next@16.2.4 (also affects packages/datapresent-ui)
- **CVE:** CVE-2026-23870, CVE-2026-45109, CVE-2026-44575, CVE-2026-44574, CVE-2026-44573, CVE-2026-44578, CVE-2026-44579
- **Description:**
  - **CVE-2026-23870 (GHSA-8h8q-6873-q5fj):** DoS with Server Components - specially crafted HTTP requests to App Router Server Functions can trigger excessive CPU usage
  - **CVE-2026-45109 (GHSA-26hh-7cqf-hhc6):** Middleware/Proxy bypass via segment-prefetch routes (incomplete fix follow-up)
  - **CVE-2026-44575 (GHSA-267c-6grr-h53f):** Middleware bypass in App Router via segment-prefetch routes - allows unauthorized access without middleware checks
  - **CVE-2026-44574 (GHSA-492v-c6pp-mqqv):** Authorization bypass via dynamic route parameter injection - protected content can be rendered without middleware authorization
  - **CVE-2026-44573 (GHSA-36qx-fr4f-26g5):** Middleware bypass in Pages Router with i18n - protected page data accessible without authorization
  - **CVE-2026-44578 (GHSA-c4j6-fc7j-m34r):** SSRF via WebSocket upgrade requests - attacker can proxy requests to arbitrary internal/external destinations
  - **CVE-2026-44579 (GHSA-mg66-mrh9-m8jx):** DoS via connection exhaustion in Cache Components - connection deadlock consuming file descriptors
- **Recommendation:** **Upgrade to Next.js 16.2.6 immediately.** Run: pnpm add next@16.2.6
- **Impact:** Authorization bypass, SSRF, DoS, cache poisoning

---

### MODERATE SEVERITY

#### 3. nodemailer@7.0.13 - SMTP Command Injection
- **Severity:** Moderate (CVSS 4.9)
- **Location:** datapresent-web/package.json -> nodemailer@7.0.13 (transitive via @auth/core from next-auth and @auth/prisma-adapter)
- **CVE:** GHSA-c7w3-x93f-qmm8, GHSA-vvjj-xcjg-gr5g
- **Description:**
  - **GHSA-c7w3-x93f-qmm8:** When custom envelope object with size property containing CRLF characters is passed to sendMail(), the value concatenates directly into SMTP MAIL FROM command without sanitization, allowing injection of arbitrary SMTP commands (e.g., RCPT TO for silent recipient addition)
  - **GHSA-vvjj-xcjg-gr5g:** Transport name configuration option is not sanitized for CRLF sequences, allowing SMTP command injection via EHLO/HELO commands
- **Recommendation:** Upgrade nodemailer to version 8.0.5 or later: pnpm add nodemailer@8.0.5
- **Impact:** SMTP command injection, email spoofing, phishing relay

#### 4. postcss@8.4.31 - XSS via Unescaped </style>
- **Severity:** Moderate (CVSS 6.1)
- **Location:** Transitive dependency via Next.js 16.2.4
- **CVE:** CVE-2026-41305 (GHSA-qx2v-qp2m-jg93)
- **Description:** PostCSS does not escape </style> sequences when stringifying CSS ASTs. When user-submitted CSS is embedded in HTML <style> tags, the </style> breaks out of style context, enabling XSS.
- **Recommendation:** Upgrade to postcss 8.5.10 or later. This will be resolved by upgrading Next.js to 16.2.5+
- **Impact:** Cross-site scripting in applications using PostCSS with user-submitted CSS

#### 5. Next.js 16.2.4 - Additional Moderate Issues
- **Severity:** Moderate (CVSS 4.7-6.1)
- **CVE:** CVE-2026-44581, CVE-2026-44580, CVE-2026-44577, CVE-2026-44576
- **Description:**
  - **CVE-2026-44581 (XSS with CSP nonces):** Malformed nonce values from request headers can be reflected unsafely into HTML, enabling cache-poisoning XSS
  - **CVE-2026-44580 (XSS in beforeInteractive scripts):** Serialized script content not escaped before embedding, allowing script injection
  - **CVE-2026-44577 (DoS in Image Optimization):** No size limit on local image fetches - attacker can cause OOM by requesting large local assets
  - **CVE-2026-44576 (RSC cache poisoning):** Cache poisoning via collisions in React Server Component cache-busting
- **Recommendation:** Upgrade to Next.js 16.2.5+ (already covered by high-severity fix)

---

### LOW SEVERITY

#### 6-8. Next.js 16.2.4 - Low Severity CVEs
- **Severity:** Low (CVSS 3.7)
- **CVE:** CVE-2026-44572, CVE-2026-44582
- **Description:**
  - **CVE-2026-44572:** Middleware redirect cache poisoning via x-nextjs-data header injection
  - **CVE-2026-44582:** Cache poisoning via RSC cache-busting collisions
- **Recommendation:** Addressed by Next.js 16.2.5+ upgrade

---

## Dependency Confusion Assessment

### Workspace Configuration
- **Status:** SECURE
- **File:** pnpm-workspace.yaml properly configured:
  `yaml
  packages:
    - 'packages/*'
    - 'datapresent-web'
  `
- **Internal packages:** Use workspace:* protocol correctly (@datapresent/ui: workspace:*)
- **No dependency confusion risks detected** - all internal packages are properly scoped and referenced via workspace protocol

### Scoped Package Security
- All internal packages use @datapresent/* scope
- No unscoped packages that could be confused with public npm packages

---

## Additional Security Observations

### No Issues Found
- **Code Execution:** No usage of eval(), 
ew Function(), or similar dynamic code execution patterns detected
- **Unsafe Dependencies:** No deprecated or known-malicious packages detected (beyond the vulnerable ones)
- **Supply Chain Attacks:** No evidence of dependency confusion, typosquatting, or malicious package substitution

### Monitor These Dependencies
| Package | Version | Status | Notes |
|---------|---------|--------|-------|
| next-auth | 5.0.0-beta.31 | Beta | Using beta version - monitor for security updates |
| puppeteer-core | 22.0.0 | Older | Chromium version specific - ensure @sparticuz/chromium is updated |
| googleapis | 171.4.0 | Large | Large attack surface - ensure minimal permissions on GCP credentials |

---

## Priority Remediation Matrix

| Priority | Action | Effort | Deadline |
|----------|--------|--------|----------|
| P0 - CRITICAL | Replace xlsx package | Medium | 1 week |
| P0 - CRITICAL | Upgrade Next.js to 16.2.6 | Low | 1 week |
| P1 - HIGH | Upgrade nodemailer to 8.0.5+ | Low | 2 weeks |
| P2 - MONITOR | Update next-auth to stable release | Low | When available |

---

## Recommended Commands

`ash
# Upgrade critical packages
pnpm add next@16.2.6 nodemailer@8.0.5

# Replace xlsx with maintained alternative
pnpm remove xlsx
pnpm add exceljs  # or another maintained alternative

# After changes, re-audit
pnpm audit
`

---

## Conclusion

The dependency security posture requires **immediate attention** due to the critical xlsx vulnerability and multiple Next.js CVEs. The unmaintained xlsx package presents the highest risk as it cannot receive security patches through standard npm channels. Next.js upgrade should be prioritized given the multiple authorization bypass and SSRF vulnerabilities.

The monorepo structure with pnpm workspaces is properly configured with no dependency confusion risks. Internal packages are correctly scoped and use the workspace protocol.
