// ==========================================
// PDF Export XSS Escape Tests
// ==========================================
//
// Tests that escapeHtml (called via generateHtmlFromSlides) properly
// neutralises HTML injection vectors in slide titles and content.
// Covers REVIEW issue: Back-end Agent 3 / XSS dans PDF export.
//
// The private escapeHtml() function in pdf.ts escapes: & < > " '
// These tests verify the escaping through the public generateHtmlFromSlides API.

import { describe, it, expect } from 'vitest'
import { generateHtmlFromSlides } from '@/lib/exporters/pdf'

describe('PDF export XSS prevention (escapeHtml via generateHtmlFromSlides)', () => {
  // -----------------------------------------------------------------------
  // Basic character escaping
  // -----------------------------------------------------------------------
  it('should escape < in slide title', () => {
    const html = generateHtmlFromSlides({
      title: 'Test',
      slides: [{ title: '<script>evil()</script>', layout: 'TITLE_SLIDE', content: {} }],
    })

    // The < and > should be escaped to &lt; and &gt;
    expect(html).toContain('&lt;script&gt;evil()&lt;/script&gt;')
    // Must NOT contain raw <script> tag
    expect(html).not.toContain('<script>')
    expect(html).not.toContain('</script>')
  })

  it('should escape > in slide title', () => {
    const html = generateHtmlFromSlides({
      title: 'Test',
      slides: [{ title: 'x > y', layout: 'TITLE_SLIDE', content: {} }],
    })

    expect(html).toContain('x &gt; y')
    expect(html).not.toContain('x > y')
  })

  it('should escape & in slide title', () => {
    const html = generateHtmlFromSlides({
      title: 'Test',
      slides: [{ title: 'A & B', layout: 'TITLE_SLIDE', content: {} }],
    })

    expect(html).toContain('A &amp; B')
    expect(html).not.toContain('A & B')
  })

  it('should escape " in slide title', () => {
    const html = generateHtmlFromSlides({
      title: 'Test',
      slides: [{ title: 'size = "large"', layout: 'TITLE_SLIDE', content: {} }],
    })

    expect(html).toContain('size = &quot;large&quot;')
    expect(html).not.toContain('size = "large"')
  })

  it("should escape ' in slide title", () => {
    const html = generateHtmlFromSlides({
      title: 'Test',
      slides: [{ title: "it's fine", layout: 'TITLE_SLIDE', content: {} }],
    })

    expect(html).toContain('it&#x27;s fine')
    expect(html).not.toContain("it's fine")
  })

  // -----------------------------------------------------------------------
  // <script> injection
  // -----------------------------------------------------------------------
  it('should neutralise <script>alert("xss")</script> in slide title', () => {
    const html = generateHtmlFromSlides({
      title: 'Test Report',
      slides: [
        {
          title: '<script>alert("xss")</script>',
          layout: 'TITLE_SLIDE',
          content: {},
        },
      ],
    })

    // The script tag must be escaped
    expect(html).toContain('&lt;script&gt;alert(&quot;xss&quot;)&lt;/script&gt;')
    // No executable script should be present
    expect(html).not.toMatch(/<script[^>]*>/)
    expect(html).not.toMatch(/<\/script>/)
  })

  it('should neutralise <script>alert("xss")</script> in slide content', () => {
    const html = generateHtmlFromSlides({
      title: 'Test Report',
      slides: [
        {
          title: 'Safe Title',
          layout: 'KPI_GRID',
          content: { injected: '<script>alert("xss")</script>' },
        },
      ],
    })

    // The injected content goes through JSON.stringify first (which escapes " to \")
    // then through escapeHtml (which converts & < > " ' to entities).
    // The <pre> block will contain the JSON representation with HTML entities.
    // JSON.stringify produces: {"injected":"<script>alert(\"xss\")</script>"}
    // After escapeHtml: {&quot;injected&quot;:&quot;&lt;script&gt;alert(\&quot;xss\&quot;)&lt;/script&gt;&quot;}
    expect(html).toContain('&lt;script&gt;')
    expect(html).toContain('alert(\\&quot;xss\\&quot;)')
    // No raw script tags
    expect(html).not.toContain('<script>')
    expect(html).not.toMatch(/<\/script>/)
  })

  // -----------------------------------------------------------------------
  // JSON.stringify — objects and arrays must survive unscathed
  // -----------------------------------------------------------------------
  it('should correctly render plain object content via JSON.stringify', () => {
    const content = { kpis: [{ label: 'Revenue', value: '$42k' }] }
    const html = generateHtmlFromSlides({
      title: 'Dashboard',
      slides: [{ title: 'KPI Slide', layout: 'KPI_GRID', content }],
    })

    // The JSON representation should appear in the HTML
    expect(html).toContain('Revenue')
    expect(html).toContain('$42k')
    // It should be inside a <pre> block as JSON
    expect(html).toContain('<pre>')
    // The keys should be present (escaped by escapeHtml: " → &quot;)
    expect(html).toContain('&quot;kpis&quot;')
    expect(html).toContain('&quot;label&quot;')
    expect(html).toContain('&quot;value&quot;')
  })

  it('should correctly render array content via JSON.stringify', () => {
    const content = { points: ['First point', 'Second point', 'Third point'] }
    const html = generateHtmlFromSlides({
      title: 'List',
      slides: [{ title: 'Bullets', layout: 'TEXT_SUMMARY', content }],
    })

    expect(html).toContain('First point')
    expect(html).toContain('Second point')
    expect(html).toContain('Third point')
    // Array brackets should be visible in JSON
    expect(html).toContain('[')
    expect(html).toContain(']')
  })

  it('should handle nested objects in content JSON', () => {
    const content = {
      metrics: {
        total: 100,
        completed: 75,
        percentage: '75%',
      },
    }
    const html = generateHtmlFromSlides({
      title: 'Nested',
      slides: [{ title: 'Metrics', layout: 'KPI_GRID', content }],
    })

    expect(html).toContain('75%')
    expect(html).toContain('&quot;percentage&quot;')
  })

  it('should handle empty content object', () => {
    const html = generateHtmlFromSlides({
      title: 'Empty',
      slides: [{ title: 'Empty Slide', layout: 'BLANK', content: {} }],
    })

    // Should render an empty JSON object inside <pre>
    expect(html).toContain('{}')
  })

  it('should handle content with null values', () => {
    const content = { name: 'Test', value: null, optional: undefined }
    const html = generateHtmlFromSlides({
      title: 'Nulls',
      slides: [{ title: 'Slide', layout: 'KPI_GRID', content }],
    })

    // JSON.stringify drops undefined keys, keeps null
    expect(html).toContain('null')
    expect(html).not.toContain('"optional"')
  })

  // -----------------------------------------------------------------------
  // </script><svg onload=alert(1)> injection
  // -----------------------------------------------------------------------
  it('should neutralise </script><svg onload=alert(1)> injection in title', () => {
    const payload = '</script><svg onload=alert(1)>'
    const html = generateHtmlFromSlides({
      title: 'Report',
      slides: [
        {
          title: payload,
          layout: 'TITLE_SLIDE',
          content: {},
        },
      ],
    })

    // The injection must be escaped
    expect(html).toContain('&lt;/script&gt;&lt;svg onload=alert(1)&gt;')
    // No raw script or svg with onload should remain
    expect(html).not.toMatch(/<\/script>/)
    expect(html).not.toMatch(/<svg[^>]*onload/)
  })

  it('should neutralise </script><svg onload=alert(1)> injection in content', () => {
    const payload = '</script><svg onload=alert(1)>'
    const html = generateHtmlFromSlides({
      title: 'Report',
      slides: [
        {
          title: 'Safe',
          layout: 'KPI_GRID',
          content: { injected: payload },
        },
      ],
    })

    // In JSON content, characters are escaped via JSON.stringify first,
    // then the whole JSON string is run through escapeHtml.
    // JSON.stringify will escape < > as \u003c \u003e
    // Then escapeHtml will also escape & < > " '
    // The end result should contain no raw script/svg tags.
    expect(html).not.toMatch(/<\/script>/i)
    expect(html).not.toMatch(/<svg[^>]*onload/i)
  })

  // -----------------------------------------------------------------------
  // Edge cases: empty strings, special characters
  // -----------------------------------------------------------------------
  it('should handle empty slide title', () => {
    const html = generateHtmlFromSlides({
      title: 'Test',
      slides: [{ title: '', layout: 'TITLE_SLIDE', content: {} }],
    })

    expect(html).toContain('<h1></h1>')
  })

  it('should handle title with only special characters', () => {
    const html = generateHtmlFromSlides({
      title: 'Test',
      slides: [{ title: '<>&"\'>', layout: 'TITLE_SLIDE', content: {} }],
    })

    expect(html).toContain('&lt;&gt;&amp;&quot;&#x27;&gt;')
  })

  it('should handle multiple slides with mixed content', () => {
    const html = generateHtmlFromSlides({
      title: 'Mixed Report',
      slides: [
        { title: 'Safe', layout: 'TITLE_SLIDE', content: { a: 1 } },
        { title: '<script>xss()</script>', layout: 'TITLE_SLIDE', content: { b: 2 } },
        { title: 'Another Safe', layout: 'TITLE_SLIDE', content: { c: 3 } },
      ],
    })

    // Safe slides should remain intact
    expect(html).toContain('Safe')
    expect(html).toContain('Another Safe')
    // XSS slide must be escaped
    expect(html).toContain('&lt;script&gt;xss()&lt;/script&gt;')
    // No raw script tags anywhere
    expect(html).not.toMatch(/<script[^>]*>/)
    expect(html).not.toMatch(/<\/script>/)
  })

  it('should escape title in the <title> tag', () => {
    const html = generateHtmlFromSlides({
      title: '<script>alert("xss")</script>',
      slides: [],
    })

    expect(html).toContain('&lt;script&gt;alert(&quot;xss&quot;)&lt;/script&gt;')
    expect(html).not.toMatch(/<script[^>]*>/)
  })

  it('should escape ampersands before other entities to prevent double-escaping', () => {
    // Input: &amp;lt; → after escapeHtml: &amp;amp;lt;
    // The ampersand in the input must be escaped first to prevent it being
    // reinterpreted as the start of an HTML entity.
    const html = generateHtmlFromSlides({
      title: 'Test',
      slides: [{ title: '&amp;lt;', layout: 'TITLE_SLIDE', content: {} }],
    })

    // The & must be escaped to &amp; so that the remaining text loses
    // its entity meaning and renders as literal text '&lt;'
    expect(html).toContain('&amp;amp;lt;')
  })

  it('should escape content that contains HTML entities', () => {
    const html = generateHtmlFromSlides({
      title: 'Test',
      slides: [
        {
          title: 'Entities',
          layout: 'TEXT_SUMMARY',
          content: { html: '<b>bold</b> & <i>italic</i>' },
        },
      ],
    })

    // The <b> and <i> should be JSON-stringified first (producing a string with
    // escaped quotes and newlines), then that string is passed through escapeHtml.
    // The content should be completely neutralised.
    // JSON.stringify produces: {"html":"<b>bold</b> & <i>italic</i>"}
    // After escapeHtml the <pre> block should contain entity-escaped content:
    // &lt;b&gt;bold&lt;/b&gt; &amp; &lt;i&gt;italic&lt;/i&gt;
    expect(html).toContain('&lt;b&gt;bold&lt;/b&gt;')
    expect(html).toContain('&lt;i&gt;italic&lt;/i&gt;')
    expect(html).toContain('&amp;')
    // No literal HTML tags should remain
    expect(html).not.toContain('<b>')
    expect(html).not.toContain('</b>')
    expect(html).not.toContain('<i>')
    expect(html).not.toContain('</i>')
  })
})
