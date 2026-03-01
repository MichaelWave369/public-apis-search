const test = require('node:test');
const assert = require('node:assert/strict');

const {
  parseMarkdownAPIs,
  normalizeApiRow,
  filterAndSortAPIs,
  scoreApi,
  toCSV,
  apiId,
  parseTableLine,
} = require('../app.js');

test('parseTableLine returns null for separator and array for valid rows', () => {
  assert.equal(parseTableLine('| --- | --- | --- | --- | --- |'), null);
  assert.deepEqual(parseTableLine('| A | B | C | D | E |'), ['A', 'B', 'C', 'D', 'E']);
});

test('normalizeApiRow sanitizes and validates fields', () => {
  const row = normalizeApiRow(['[Demo](https://demo.dev)', 'desc', 'api key', 'yes', ''], 'Tools');
  assert.equal(row.name, 'Demo');
  assert.equal(row.auth, 'apiKey');
  assert.equal(row.https, 'Yes');
  assert.equal(row.cors, 'Unknown');
});

test('parseMarkdownAPIs handles markdown and deduplicates', () => {
  const md = [
    '## Animals',
    '| API | Description | Auth | HTTPS | CORS |',
    '| --- | --- | --- | --- | --- |',
    '| [Cats](https://cat.dev) | cat data | No | Yes | Yes |',
    '| [Cats](https://cat.dev) | cat data | No | Yes | Yes |',
  ].join('\n');

  const parsed = parseMarkdownAPIs(md);
  assert.equal(parsed.apis.length, 1);
  assert.equal(parsed.apis[0].name, 'Cats');
});

test('scoreApi ranks exact name over description-only match', () => {
  const exact = scoreApi({ name: 'Weather', description: 'forecast', category: 'Tools' }, 'weather');
  const descOnly = scoreApi({ name: 'Sky', description: 'weather info', category: 'Tools' }, 'weather');
  assert.ok(exact > descOnly);
});

test('filterAndSortAPIs honors favorites and relevance sort', () => {
  const apis = [
    { name: 'Weather', description: 'forecast', auth: 'No', https: 'Yes', cors: 'Yes', category: 'Tools', link: 'https://weather.dev' },
    { name: 'Cat Facts', description: 'weather mention', auth: 'No', https: 'Yes', cors: 'Yes', category: 'Animals', link: 'https://cats.dev' },
  ];
  const favorites = new Set([apiId(apis[0])]);

  const result = filterAndSortAPIs(apis, { query: 'weather', sort: 'relevance', favoritesOnly: true }, favorites);
  assert.equal(result.length, 1);
  assert.equal(result[0].name, 'Weather');
});

test('toCSV escapes quotes, commas, and line breaks', () => {
  const csv = toCSV([
    {
      name: 'A "Quoted" API',
      description: 'Line1\nLine2,with comma',
      auth: 'No',
      https: 'Yes',
      cors: 'Yes',
      category: 'Test',
      link: 'https://a.dev',
    },
  ]);

  assert.match(csv, /"A ""Quoted"" API"/);
  assert.match(csv, /"Line1\nLine2,with comma"/);
});
