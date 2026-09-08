import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';
import test from 'node:test';

const spec = JSON.parse(readFileSync('api-reference/openapi.json', 'utf8'));
const config = JSON.parse(readFileSync('docs.json', 'utf8'));
const schemas = spec.components.schemas;
const root = '/me/addresses';
const suffixes = ['', '/{addressId}/consumption', '/{addressId}/solar-export',
  '/{addressId}/consumption-costs', '/{addressId}/solar-export-revenue',
  '/{addressId}/prices', '/{addressId}/forecast-prices'];

function pages(directory) {
  return readdirSync(directory, { withFileTypes: true }).flatMap(entry => {
    const path = join(directory, entry.name);

    return entry.isDirectory() ? pages(path) : path.endsWith('.mdx') ? [path] : [];
  });
}

function keys(schemaName, expected) {
  assert.deepEqual(Object.keys(schemas[schemaName].properties).sort(), expected.slice().sort());
  assert.deepEqual(schemas[schemaName].required.slice().sort(), expected.slice().sort());
}

test('only the seven Consumer GET operations are documented', () => {
  assert.equal(spec.openapi, '3.1.0');
  assert.equal(spec.servers[0].url, 'https://api.minstroem.app/consumer/v1');
  assert.deepEqual(Object.keys(spec.paths).sort(), suffixes.map(s => root + s).sort());
  assert.deepEqual(spec.security, [{ ConsumerBearer: [] }]);

  for (const [path, item] of Object.entries(spec.paths)) {
    assert.deepEqual(Object.keys(item), ['get']);
    const names = (item.get.parameters ?? []).map(p =>
      spec.components.parameters[p.$ref.split('/').at(-1)].name);
    const expected = path === root ? [] : path.endsWith('/forecast-prices')
      ? ['addressId'] : ['addressId', 'from', 'to', path.endsWith('/prices') ? 'resolution' : 'aggregation'];
    assert.deepEqual(names, expected);
  }
});

test('response fields match the reviewed backend DTOs', () => {
  keys('Address', ['id', 'label', 'formattedAddress', 'region', 'timeZone',
    'gridOperatorName', 'supplierName', 'capabilities']);
  keys('Capabilities', ['consumption', 'solarExport', 'consumptionCosts',
    'solarExportRevenue', 'prices', 'forecastPrices']);
  keys('UsageInterval', ['start', 'end', 'energyKWh', 'isEstimate']);
  keys('CostInterval', ['start', 'end', 'energyKWh', 'totalPricePerKWh',
    'fixedFeesForInterval', 'totalCost', 'isEstimate']);
  keys('RevenueInterval', ['start', 'end', 'energyKWh', 'totalPricePerKWh',
    'fixedFeesForInterval', 'netRevenue', 'isEstimate']);
  keys('PriceInterval', ['start', 'end', 'totalPricePerKWh', 'variableChargesPerKWh']);
  keys('ForecastResponse', ['addressId', 'resolution', 'isEstimate', 'timeZone',
    'currency', 'vatIncluded', 'data']);
  keys('Error', ['error', 'reason', 'errorCode']);
  assert.equal(schemas.ForecastResponse.properties.isEstimate.const, true);
  assert.equal(schemas.ForecastResponse.properties.resolution.const, 'hour');
  assert.equal(schemas.RevenueResponse.properties.vatIncluded.const, false);

  for (const [name, field] of [['Address', 'region'], ['Address', 'gridOperatorName'],
    ['Address', 'supplierName'], ['CostInterval', 'totalPricePerKWh'],
    ['RevenueInterval', 'totalPricePerKWh'], ['PriceInterval', 'variableChargesPerKWh']]) {
    assert.ok(schemas[name].properties[field].type.includes('null'));
  }
});

test('Consumer documentation stays external-facing and links quick start to the reference', () => {
  const publicFiles = [...pages('consumer-api'), 'introduction.mdx', 'api-reference/openapi.json'];
  const internalDetails = /user[-\s]?id|msp_(?:live|test)_|Redis|RevenueCat|persisted|metadata repair|best-effort loading|native app aggregates|source selection|server's Copenhagen|seven-day horizon|rejects all query parameters/i;

  for (const path of publicFiles) {
    assert.doesNotMatch(readFileSync(path, 'utf8'), internalDetails, path);
  }

  const quickstart = readFileSync('consumer-api/quickstart.mdx', 'utf8');
  assert.ok(quickstart.includes('](/consumer-api/reference/list-addresses)'));
  assert.ok(quickstart.includes('](/consumer-api/reference/consumption)'));
  assert.doesNotMatch(quickstart, /purchase flow/i);

  const authentication = readFileSync('consumer-api/authentication.mdx', 'utf8');
  assert.match(authentication, /<Note>[\s\S]*active Min Strøm Plus subscription[\s\S]*valid API key[\s\S]*<\/Note>/);

  for (const [path, item] of Object.entries(spec.paths)) {
    const slug = path === root ? 'list-addresses' : path.split('/').at(-1);
    const page = readFileSync('consumer-api/reference/' + slug + '.mdx', 'utf8');
    assert.ok(page.includes('```http\nGET /consumer/v1' + path));
    assert.ok(page.includes('openapi: "GET ' + path + '"'));
    assert.ok(item.get.responses['200'].content['application/json'].examples.synthetic);
  }
});

test('curl examples are syntactically valid and use the documented path and query', () => {
  for (const [path, { get: operation }] of Object.entries(spec.paths)) {
    assert.equal(operation['x-codeSamples'].length, 1);
    const sample = operation['x-codeSamples'][0];
    assert.equal(sample.lang, 'curl');
    assert.equal(spawnSync('bash', ['-n'], { input: sample.source }).status, 0);
    assert.ok(sample.source.includes('Authorization: Bearer ${MINSTROEM_API_TOKEN}'));
    assert.ok(sample.source.includes(spec.servers[0].url +
      path.replace('{addressId}', '${MINSTROEM_ADDRESS_ID}')));
    const queryNames = [...sample.source.matchAll(/--data-urlencode "([^=]+)=/g)].map(m => m[1]);
    const expected = (operation.parameters ?? []).map(p =>
      spec.components.parameters[p.$ref.split('/').at(-1)]).filter(p => p.in === 'query').map(p => p.name);
    assert.deepEqual(queryNames, expected);
  }

  for (const path of pages('consumer-api')) {
    const body = readFileSync(path, 'utf8');

    for (const match of body.matchAll(/\x60{3}bash\n([\s\S]*?)\x60{3}/g)) {
      const result = spawnSync('bash', ['-n'], { input: match[1] });
      assert.equal(result.status, 0, path + ': ' + result.stderr.toString());
    }
  }
});

test('guide JSON examples parse and preserve sparse-data and error semantics', () => {
  let count = 0;

  for (const path of pages('consumer-api')) {
    for (const match of readFileSync(path, 'utf8').matchAll(/\x60{3}json\n([\s\S]*?)\x60{3}/g)) {
      const example = JSON.parse(match[1]);
      count++;

      if (example.error === true) {
        assert.deepEqual(Object.keys(example).sort(), ['error', 'errorCode', 'reason']);
      } else {
        assert.deepEqual(Object.keys(example).sort(), schemas.UsageResponse.required.slice().sort());

        for (const row of example.data) {
          assert.deepEqual(Object.keys(row).sort(), schemas.UsageInterval.required.slice().sort());
          assert.ok(row.start.endsWith('Z') && row.end.endsWith('Z'));
        }

        assert.equal(example.data.length, 2);
        assert.equal(example.data[1].energyKWh, 0);
        assert.notEqual(example.data[0].end, example.data[1].start);
      }
    }
  }

  assert.equal(count, 2);
});

test('Consumer-first navigation keeps Enterprise URLs and disables the playground', () => {
  assert.equal(config.navigation.tabs[0].tab, 'Consumer API');
  assert.equal(config.navigation.tabs[0].groups[0].pages[0], 'introduction');
  const enterprise = config.navigation.tabs[1];
  assert.equal(enterprise.tab, 'Enterprise API (B2B)');
  const enterprisePages = enterprise.groups.flatMap(g => g.pages);

  for (const page of ['api-reference/authentication', 'api-reference/endpoints', 'api-reference/shared']) {
    assert.ok(enterprisePages.includes(page));
  }

  assert.equal(config.api.playground.display, 'none');
  assert.deepEqual(config.api.examples.languages, ['curl']);
  assert.equal(config.api.examples.autogenerate, false);
  assert.equal(config.api.openapi, 'api-reference/openapi.json');
  assert.deepEqual(config.contextual.options, ['copy', 'download-spec']);
  assert.match(readFileSync('consumer-api/quickstart.mdx', 'utf8'), /\*\*Download API spec\*\*/);
  const currentConsumerFiles = [...pages('consumer-api'), 'introduction.mdx', 'api-reference/openapi.json'];

  for (const path of currentConsumerFiles) {
    assert.doesNotMatch(readFileSync(path, 'utf8'), /\/personal\/v1|isEstimated|"unit"\s*:|Plant Store/);
  }
});
