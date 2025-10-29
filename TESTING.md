# Testing Guide

This project uses **Vitest** for unit testing to ensure the search history API always returns results sorted by date (most recent first).

## Why Testing?

The search history sorting broke multiple times, with searches being sorted by popularity instead of date. The tests prevent this regression by **automatically failing** when the sort order is incorrect.

## Available Test Commands

```bash
# Run tests once (used in CI and pre-commit hooks)
npm test

# Run tests in watch mode (automatically re-run on file changes)
npm run test:watch

# Run tests with UI interface
npm run test:ui

# Run tests with coverage report
npm run test:coverage
```

## Test Files

- **`server/index.test.js`** - Search history API tests

### Key Tests

1. **Date-based sorting test**: Verifies searches appear in chronological order (newest first)
2. **CRITICAL test**: Ensures recent searches (with low count) appear **before** old popular searches (with high count)
3. **Limit parameter test**: Validates pagination works correctly with date sorting

## Automatic Testing

### Watch Mode (Development)

To run tests automatically whenever you change server code:

```bash
npm run test:watch
```

This will:
- ✅ Watch `server/index.js` and test files
- ✅ Re-run tests immediately on save
- ✅ Show clear pass/fail status
- ✅ Catch bugs before committing

### Pre-Commit Hook (Git)

Tests automatically run **before every commit** thanks to Husky:

```bash
git commit -m "fix: update search endpoint"
# Tests run automatically here
# Commit only proceeds if tests pass ✅
```

If tests fail, the commit is blocked until you fix the issue.

## Test Database

Tests use a separate SQLite database (`singtube-test.db`) that is:
- ✅ Created automatically before tests
- ✅ Cleaned between test runs
- ✅ Deleted after tests complete
- ✅ Ignored by Git (won't be committed)

## Common Scenarios

### Scenario 1: Tests Failing After Code Change

```bash
$ npm test

❌ FAIL: CRITICAL: should prioritize recent searches over popular ones
   Expected: 'recent search' (most recent)
   Received: 'old popular' (high count but older)
```

**Fix**: Check the `ORDER BY` clause in `/api/history/top`:
- ❌ Wrong: `ORDER BY search_count DESC, last_searched DESC`
- ✅ Correct: `ORDER BY last_searched DESC`

### Scenario 2: Adding New Sorting Logic

If you need to change sorting:

1. Update `server/index.js` endpoint
2. Update tests in `server/index.test.js` to match expected behavior
3. Run `npm test` to verify
4. Commit (tests will run again automatically)

### Scenario 3: Testing Before Deployment

```bash
# Run full test suite with coverage
npm run test:coverage

# Check coverage report
open coverage/index.html
```

## Example Test Output

### ✅ Passing Tests

```
✓ server/index.test.js > Search History API Tests > GET /api/history/top
  ✓ should return search history sorted by date (most recent first)
  ✓ CRITICAL: should prioritize recent searches over popular ones
  ✓ should respect the limit parameter

 Test Files  1 passed (1)
      Tests  10 passed (10)
```

### ❌ Failing Tests

```
❌ server/index.test.js > CRITICAL: should prioritize recent searches over popular ones
   Expected recent search (1 count, newest) to appear FIRST
   But received old popular search (11 counts, older) FIRST

   This means the API is sorting by popularity, not date!
```

## Integration with Development Workflow

### Recommended Workflow

1. **Start watch mode**: `npm run test:watch`
2. **Edit code**: Make changes to `server/index.js`
3. **Save file**: Tests run automatically
4. **See results**: Instant feedback in terminal
5. **Commit**: Tests run again via pre-commit hook
6. **Deploy**: All tests passed ✅

### CI/CD Integration (Future)

Add to `.github/workflows/test.yml`:

```yaml
name: Test
on: [push, pull_request]
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
      - run: npm install
      - run: npm test
```

## Troubleshooting

### Tests pass locally but fail in CI

- Check Node.js version (requires v18+)
- Verify test database files are in `.gitignore`
- Ensure all dependencies are installed

### Watch mode not detecting changes

- Make sure you're editing files in the correct directory
- Check that Vitest is watching the right paths
- Try restarting watch mode

### Pre-commit hook not running

```bash
# Reinstall husky hooks
npm run prepare
```

## Adding More Tests

To test additional endpoints:

1. Add test cases to `server/index.test.js`
2. Follow existing test patterns
3. Use descriptive test names
4. Test both success and failure cases

Example:

```javascript
it('should return 400 for invalid search query', async () => {
  const response = await request(app)
    .post('/api/history/track')
    .send({ query: '', gender: 'all' });

  expect(response.status).toBe(400);
});
```

---

## Quick Reference

| Command | Purpose |
|---------|---------|
| `npm test` | Run all tests once |
| `npm run test:watch` | Auto-run tests on file changes |
| `npm run test:ui` | Visual test interface |
| `npm run test:coverage` | Generate coverage report |
| `git commit` | Triggers tests automatically |

**Remember**: If search history sorting breaks again, the tests will catch it! 🎯
