#!/usr/bin/env node

import fs from 'node:fs/promises';
import path from 'node:path';

const BASE_URL = 'https://www.shadertoy.com/api/v1';
const DEFAULT_OUTPUT_DIR = path.resolve(process.cwd(), 'data', 'shadertoy');
const DEFAULT_CONCURRENCY = 4;
const DEFAULT_DELAY_MS = 150;

function printUsage() {
  console.log(`
Usage:
  node scripts/save-shadertoy-shaders.mjs --all [options]
  node scripts/save-shadertoy-shaders.mjs --query <term> [options]
  node scripts/save-shadertoy-shaders.mjs --ids <id1,id2,...> [options]
  node scripts/save-shadertoy-shaders.mjs --ids-file <path> [options]

Required:
  --key <app-key>               Shadertoy app key
                                or set SHADERTOY_API_KEY

Selection:
  --all                         Archive every shader ID exposed by the API key
  --query <term>                Query Shadertoy and archive matching IDs
  --ids <comma-separated-ids>   Archive specific shader IDs
  --ids-file <path>             Archive IDs from a newline-delimited file

Options:
  --out <dir>                   Output directory (default: data/shadertoy)
  --limit <n>                   Max shaders to archive for --query/--all
  --from <n>                    Query offset (default: 0)
  --sort <name>                 Query sort, e.g. hotness/newest/love/views
  --concurrency <n>             Parallel fetches (default: 4)
  --delay-ms <n>                Delay between completed fetches (default: 150)
  --resume                      Skip shaders that already have metadata.json
  --force                       Re-download shaders even if already archived
  --download-assets             Download referenced inputs under assets/
  --help                        Show this help
`);
}

function parseArgs(argv) {
  const args = {
    all: false,
    query: null,
    ids: [],
    idsFile: null,
    out: DEFAULT_OUTPUT_DIR,
    key: process.env.SHADERTOY_API_KEY ?? '',
    limit: null,
    from: 0,
    sort: 'hotness',
    concurrency: DEFAULT_CONCURRENCY,
    delayMs: DEFAULT_DELAY_MS,
    resume: false,
    force: false,
    downloadAssets: false,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];
    const next = argv[index + 1];

    switch (token) {
      case '--all':
        args.all = true;
        break;
      case '--query':
        args.query = next;
        index += 1;
        break;
      case '--ids':
        args.ids.push(
          ...String(next ?? '')
            .split(',')
            .map((value) => value.trim())
            .filter(Boolean),
        );
        index += 1;
        break;
      case '--ids-file':
        args.idsFile = next;
        index += 1;
        break;
      case '--out':
        args.out = path.resolve(process.cwd(), next ?? DEFAULT_OUTPUT_DIR);
        index += 1;
        break;
      case '--key':
        args.key = next ?? '';
        index += 1;
        break;
      case '--limit':
        args.limit = Number.parseInt(next ?? '', 10);
        index += 1;
        break;
      case '--from':
        args.from = Number.parseInt(next ?? '0', 10);
        index += 1;
        break;
      case '--sort':
        args.sort = next ?? 'hotness';
        index += 1;
        break;
      case '--concurrency':
        args.concurrency = Number.parseInt(next ?? `${DEFAULT_CONCURRENCY}`, 10);
        index += 1;
        break;
      case '--delay-ms':
        args.delayMs = Number.parseInt(next ?? `${DEFAULT_DELAY_MS}`, 10);
        index += 1;
        break;
      case '--resume':
        args.resume = true;
        break;
      case '--force':
        args.force = true;
        break;
      case '--download-assets':
        args.downloadAssets = true;
        break;
      case '--help':
        printUsage();
        process.exit(0);
      default:
        if (token.startsWith('--')) {
          throw new Error(`Unknown argument: ${token}`);
        }
    }
  }

  return args;
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function slugify(value) {
  const normalized = String(value ?? 'untitled')
    .normalize('NFKD')
    .replace(/[^\w\s-]/g, '')
    .trim()
    .toLowerCase()
    .replace(/[-\s]+/g, '-');

  return normalized || 'untitled';
}

function coerceIsoDate(value) {
  if (value == null || value === '') {
    return null;
  }

  if (typeof value === 'number') {
    const millis = value > 10_000_000_000 ? value : value * 1000;
    const date = new Date(millis);
    return Number.isNaN(date.getTime()) ? null : date.toISOString();
  }

  if (typeof value === 'string' && /^\d+$/.test(value.trim())) {
    return coerceIsoDate(Number.parseInt(value.trim(), 10));
  }

  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

function getShaderNode(payload) {
  return payload?.Shader ?? payload?.shader ?? payload;
}

function pickCreatedAt(info) {
  return (
    coerceIsoDate(info?.date) ??
    coerceIsoDate(info?.published) ??
    coerceIsoDate(info?.publishedAt) ??
    coerceIsoDate(info?.created) ??
    coerceIsoDate(info?.createdAt) ??
    null
  );
}

function normalizeShaderPayload(shaderId, payload) {
  const shader = getShaderNode(payload);
  const info = shader?.info ?? payload?.info ?? {};
  const renderpass = Array.isArray(shader?.renderpass)
    ? shader.renderpass
    : Array.isArray(shader?.passes)
      ? shader.passes
      : [];
  const tags = Array.isArray(info?.tags) ? info.tags : [];
  const createdAt = pickCreatedAt(info);
  const title = info?.name ?? info?.title ?? shaderId;
  const author = info?.username ?? info?.author ?? 'unknown';
  const description = info?.description ?? info?.desc ?? '';
  const recordId = info?.id ?? shader?.id ?? shaderId;

  return {
    id: recordId,
    title,
    titleSlug: slugify(title),
    author,
    authorSlug: slugify(author),
    description,
    tags,
    createdAt,
    createdDate: createdAt ? createdAt.slice(0, 10) : null,
    likes: info?.likes ?? null,
    views: info?.views ?? null,
    published: info?.published ?? null,
    privacy: info?.privacy ?? null,
    usesSound: info?.useSound ?? null,
    hasLiked: info?.hasliked ?? null,
    parentId: info?.parentid ?? null,
    renderpass,
    raw: payload,
  };
}

function buildShaderDir(rootDir, normalized) {
  const dateSegment = normalized.createdDate ?? 'undated';
  return path.join(
    rootDir,
    normalized.authorSlug,
    `${dateSegment}_${normalized.titleSlug}_${normalized.id}`,
  );
}

async function shaderAlreadyArchived(rootDir, shaderId) {
  const authorDirs = await fs.readdir(rootDir, { withFileTypes: true }).catch(() => []);

  for (const entry of authorDirs) {
    if (!entry.isDirectory()) {
      continue;
    }

    const authorDir = path.join(rootDir, entry.name);
    const shaderDirs = await fs.readdir(authorDir, { withFileTypes: true }).catch(() => []);

    for (const shaderEntry of shaderDirs) {
      if (!shaderEntry.isDirectory()) {
        continue;
      }

      if (!shaderEntry.name.endsWith(`_${shaderId}`)) {
        continue;
      }

      const metadataPath = path.join(authorDir, shaderEntry.name, 'metadata.json');
      try {
        await fs.access(metadataPath);
        return true;
      } catch {
        // Keep searching.
      }
    }
  }

  return false;
}

function assetUrlFromInput(input) {
  if (!input?.src) {
    return null;
  }

  if (String(input.src).startsWith('http://') || String(input.src).startsWith('https://')) {
    return input.src;
  }

  return `https://www.shadertoy.com${input.src}`;
}

async function fetchJson(url) {
  const response = await fetch(url, {
    headers: {
      accept: 'application/json',
      'user-agent': 'Utopia Shadertoy Archiver',
    },
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Request failed (${response.status}) for ${url}\n${body}`);
  }

  return response.json();
}

function extractIdList(payload) {
  if (Array.isArray(payload)) {
    return payload;
  }

  if (Array.isArray(payload?.Results)) {
    return payload.Results;
  }

  if (Array.isArray(payload?.results)) {
    return payload.results;
  }

  if (Array.isArray(payload?.Shaders)) {
    return payload.Shaders;
  }

  if (Array.isArray(payload?.shaders)) {
    return payload.shaders;
  }

  throw new Error('Could not extract shader IDs from Shadertoy response.');
}

async function loadIdsFromFile(filePath) {
  const raw = await fs.readFile(path.resolve(process.cwd(), filePath), 'utf8');
  return raw
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
}

async function resolveShaderIds(args) {
  if (args.ids.length > 0) {
    return args.ids;
  }

  if (args.idsFile) {
    return loadIdsFromFile(args.idsFile);
  }

  if (args.query) {
    const queryPath = `${BASE_URL}/shaders/query/${encodeURIComponent(args.query)}?key=${encodeURIComponent(args.key)}&from=${args.from}&num=${args.limit ?? 100}&sort=${encodeURIComponent(args.sort)}`;
    const payload = await fetchJson(queryPath);
    return extractIdList(payload);
  }

  if (args.all) {
    const payload = await fetchJson(`${BASE_URL}/shaders?key=${encodeURIComponent(args.key)}`);
    return extractIdList(payload);
  }

  throw new Error('Choose one selector: --all, --query, --ids, or --ids-file');
}

async function downloadAssetsIfNeeded(shaderDir, renderpass, downloadAssets) {
  if (!downloadAssets) {
    return [];
  }

  const assetsDir = path.join(shaderDir, 'assets');
  const downloaded = [];

  for (const pass of renderpass) {
    const inputs = Array.isArray(pass?.inputs) ? pass.inputs : [];

    for (const input of inputs) {
      const sourceUrl = assetUrlFromInput(input);
      if (!sourceUrl) {
        continue;
      }

      const sourceName = path.basename(new URL(sourceUrl).pathname) || `channel-${input.channel ?? 'x'}`;
      const targetPath = path.join(assetsDir, sourceName);

      await fs.mkdir(assetsDir, { recursive: true });

      try {
        const response = await fetch(sourceUrl, {
          headers: {
            'user-agent': 'Utopia Shadertoy Archiver',
          },
        });

        if (!response.ok) {
          throw new Error(`Asset request failed with ${response.status}`);
        }

        const arrayBuffer = await response.arrayBuffer();
        await fs.writeFile(targetPath, Buffer.from(arrayBuffer));
        downloaded.push({
          channel: input.channel ?? null,
          src: input.src ?? null,
          savedAs: path.relative(shaderDir, targetPath),
        });
      } catch (error) {
        downloaded.push({
          channel: input.channel ?? null,
          src: input.src ?? null,
          error: error instanceof Error ? error.message : String(error),
        });
      }
    }
  }

  return downloaded;
}

async function writeShaderArchive(rootDir, shaderId, payload, downloadAssets) {
  const normalized = normalizeShaderPayload(shaderId, payload);
  const shaderDir = buildShaderDir(rootDir, normalized);
  const passesDir = path.join(shaderDir, 'passes');

  await fs.mkdir(passesDir, { recursive: true });

  const passSummaries = [];
  for (let index = 0; index < normalized.renderpass.length; index += 1) {
    const pass = normalized.renderpass[index];
    const passType = slugify(pass?.type ?? `pass-${index}`);
    const fileName = `${String(index).padStart(2, '0')}_${passType}.glsl`;
    const targetPath = path.join(passesDir, fileName);
    const source = pass?.code ?? pass?.source ?? '';

    await fs.writeFile(targetPath, source, 'utf8');
    passSummaries.push({
      index,
      type: pass?.type ?? null,
      name: pass?.name ?? null,
      file: path.relative(shaderDir, targetPath),
      inputs: Array.isArray(pass?.inputs) ? pass.inputs : [],
      outputs: Array.isArray(pass?.outputs) ? pass.outputs : [],
    });
  }

  const downloadedAssets = await downloadAssetsIfNeeded(
    shaderDir,
    normalized.renderpass,
    downloadAssets,
  );

  const metadata = {
    id: normalized.id,
    title: normalized.title,
    author: normalized.author,
    description: normalized.description,
    tags: normalized.tags,
    createdAt: normalized.createdAt,
    likes: normalized.likes,
    views: normalized.views,
    privacy: normalized.privacy,
    published: normalized.published,
    usesSound: normalized.usesSound,
    parentId: normalized.parentId,
    source: {
      shadertoyUrl: `https://www.shadertoy.com/view/${normalized.id}`,
      apiUrl: `${BASE_URL}/shaders/${normalized.id}`,
    },
    files: {
      raw: 'raw.json',
      passes: passSummaries,
      assets: downloadedAssets,
    },
    archivedAt: new Date().toISOString(),
  };

  await fs.writeFile(path.join(shaderDir, 'metadata.json'), JSON.stringify(metadata, null, 2), 'utf8');
  await fs.writeFile(path.join(shaderDir, 'raw.json'), JSON.stringify(payload, null, 2), 'utf8');

  return {
    id: normalized.id,
    title: normalized.title,
    author: normalized.author,
    createdAt: normalized.createdAt,
    tags: normalized.tags,
    directory: shaderDir,
    passCount: passSummaries.length,
  };
}

async function mapWithConcurrency(items, limit, iterator) {
  const results = new Array(items.length);
  let cursor = 0;

  async function worker() {
    while (true) {
      const current = cursor;
      cursor += 1;
      if (current >= items.length) {
        return;
      }

      results[current] = await iterator(items[current], current);
    }
  }

  const workers = Array.from({ length: Math.max(1, limit) }, () => worker());
  await Promise.all(workers);
  return results;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));

  if (!args.key) {
    throw new Error('Missing Shadertoy API key. Pass --key or set SHADERTOY_API_KEY.');
  }

  const shaderIds = await resolveShaderIds(args);
  const uniqueIds = [...new Set(shaderIds)].filter(Boolean);
  const selectedIds =
    typeof args.limit === 'number' && Number.isFinite(args.limit)
      ? uniqueIds.slice(0, args.limit)
      : uniqueIds;

  await fs.mkdir(args.out, { recursive: true });

  console.log(`Preparing ${selectedIds.length} shaders for archive in ${args.out}`);

  const manifestEntries = [];

  await mapWithConcurrency(selectedIds, args.concurrency, async (shaderId, index) => {
    if (args.resume && !args.force) {
      const alreadyArchived = await shaderAlreadyArchived(args.out, shaderId);
      if (alreadyArchived) {
        manifestEntries.push({
          id: shaderId,
          skipped: true,
        });
        console.log(`[${index + 1}/${selectedIds.length}] skipped ${shaderId} (already archived)`);
        if (args.delayMs > 0) {
          await sleep(args.delayMs);
        }
        return;
      }
    }

    const apiUrl = `${BASE_URL}/shaders/${encodeURIComponent(shaderId)}?key=${encodeURIComponent(args.key)}`;

    try {
      const payload = await fetchJson(apiUrl);
      const archived = await writeShaderArchive(args.out, shaderId, payload, args.downloadAssets);
      manifestEntries.push(archived);
      console.log(`[${index + 1}/${selectedIds.length}] saved ${archived.author} / ${archived.title} (${archived.id})`);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      manifestEntries.push({
        id: shaderId,
        error: message,
      });
      console.error(`[${index + 1}/${selectedIds.length}] failed ${shaderId}: ${message}`);
    }

    if (args.delayMs > 0) {
      await sleep(args.delayMs);
    }
  });

  const manifest = {
    archivedAt: new Date().toISOString(),
    source: 'Shadertoy API',
    selection: {
      all: args.all,
      query: args.query,
      idsFile: args.idsFile,
      requestedIds: args.ids.length > 0 ? args.ids : null,
      resume: args.resume,
      force: args.force,
      totalResolved: uniqueIds.length,
      totalSelected: selectedIds.length,
      totalArchived: manifestEntries.filter((entry) => !entry.error).length,
      totalSkipped: manifestEntries.filter((entry) => entry.skipped).length,
    },
    entries: manifestEntries.sort((left, right) => {
      const leftKey = `${left.author ?? 'zzzz'}-${left.title ?? left.id}`;
      const rightKey = `${right.author ?? 'zzzz'}-${right.title ?? right.id}`;
      return leftKey.localeCompare(rightKey);
    }),
  };

  await fs.writeFile(path.join(args.out, 'manifest.json'), JSON.stringify(manifest, null, 2), 'utf8');
  console.log(`Manifest written to ${path.join(args.out, 'manifest.json')}`);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
