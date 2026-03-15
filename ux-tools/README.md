# UX Analysis Tools

Permanent, reusable tools for analyzing and improving dashboard UX.

## Quick Commands

### 1. Quick Screenshot
Take instant screenshots without writing new scripts:

```bash
# Desktop screenshot
npm run screenshot

# Mobile screenshot
npm run screenshot http://localhost:4000 dashboard --mobile

# Tablet screenshot
npm run screenshot http://localhost:4000 dashboard --tablet

# Viewport only (no full page)
npm run screenshot http://localhost:4000 dashboard --viewport-only
```

### 2. Record User Session
Record actual user interactions and generate flow reports:

```bash
# Record 30 seconds (default)
npm run record-session

# Record 60 seconds
npm run record-session http://localhost:4000 60
```

This will:
- Open browser in visible mode
- Track clicks, scrolls, inputs
- Take screenshots every 5 seconds
- Generate detailed JSON report
- Save to `ux-analysis/recordings/`

### 3. Quick UX Test
Fast health check for dashboard UX (runs in 5-10 seconds):

```bash
npm run quick-test
```

Tests:
- ✅ Page load speed (<3s target)
- ✅ Mobile responsiveness (no horizontal scroll)
- ✅ Critical elements (Record Sale, Add Item, Search)
- ✅ Console errors
- ✅ Performance metrics (FCP, resources)

### 4. Full UX Analysis
Comprehensive 11-point analysis with detailed recommendations:

```bash
npm run analyze-ux
```

## Output Locations

All results are saved to:
- Screenshots: `./ux-analysis/screenshots/`
- Reports: `./ux-analysis/reports/`
- Recordings: `./ux-analysis/recordings/`

## Common Use Cases

### Before Deployment
```bash
npm run quick-test
```

### Debugging UX Issues
```bash
npm run screenshot http://localhost:4000 issue --mobile
```

### Understanding User Flow
```bash
npm run record-session http://localhost:4000 60
```

### Comprehensive Audit
```bash
npm run analyze-ux
```

## Tips

1. **For quick checks**: Use `quick-test` (fastest, <10s)
2. **For visual bugs**: Use `screenshot` with different viewports
3. **For flow issues**: Use `record-session` to see actual interactions
4. **For audits**: Use `analyze-ux` for comprehensive report

## Future Improvements

To improve the knowledge base and prevent script rewrites:

1. **Save this README** - Refer to it whenever you need UX analysis
2. **Version Compatibility** - All tools use modern Puppeteer syntax (`setTimeout` instead of deprecated `waitForTimeout`)
3. **Modular Design** - Each tool is standalone and focused on one task
4. **Documentation** - This README serves as permanent reference

## Troubleshooting

### "waitForTimeout is not a function"
Already fixed! All tools use `new Promise(r => setTimeout(r, ms))` instead.

### Browser won't launch
Add `--no-sandbox` flag (already included in all tools).

### Port 4000 not accessible
Your dev server runs on port 4000 (from package.json). Make sure it's running:
```bash
npm run dev
```
