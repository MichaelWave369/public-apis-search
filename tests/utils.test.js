const test = require('node:test');
const assert = require('node:assert/strict');

const { parseMarkdownAPIs, filterAndSortAPIs, toCSV, apiId } = require('../app.js');

test('parseMarkdownAPIs parses valid markdown table rows', () => {
  const markdown = `## Animals\n| API | Description | Auth | HTTPS | CORS |\n| --- | --- | --- | --- | --- |\n| [Cat Facts](https://example.com) | Random cat facts | No | Yes | Yes |`;
  const { apis, warnings } = parseMarkdownAPIs(markdown);

  assert.equal(apis.length, 1);
  assert.equal(apis[0].name, 'Cat Facts');
  assert.equal(apis[0].auth, 'No');
  assert.equal(warnings.length, 0);
});

test('filterAndSortAPIs supports favorites and sorting', () => {
  const apis = [
    { name: 'B', description: 'beta', auth: 'No', https: 'Yes', cors: 'Yes', category: 'Data', link: 'https://b.com' },
    { name: 'A', description: 'alpha', auth: 'OAuth', https: 'Yes', cors: 'No', category: 'Data', link: 'https://a.com' },
  ];
  const favorites = new Set([apiId(apis[1])]);

  const result = filterAndSortAPIs(apis, { favoritesOnly: true, sort: 'name-asc' }, favorites);

  assert.equal(result.length, 1);
  assert.equal(result[0].name, 'A');
});

test('toCSV escapes commas and quotes correctly', () => {
  const csv = toCSV([
    { name: 'A "quoted" API', description: 'desc, with comma', auth: 'No', https: 'Yes', cors: 'Yes', category: 'Test', link: 'https://a.com' },
  ]);

  assert.match(csv, /"A ""quoted"" API"/);
  assert.match(csv, /"desc, with comma"/);
});
