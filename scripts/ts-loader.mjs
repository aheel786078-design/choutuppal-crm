import path from 'path';
import { pathToFileURL } from 'url';

/**
 * Lightweight TypeScript module resolver loader for Node.js ESM test runners.
 * Automatically resolves extensionless relative imports (e.g. ./constants -> ./constants.ts)
 * and maps Next.js aliases (@/ and next/server).
 */
export async function resolve(specifier, context, nextResolve) {
  if (specifier === 'next/server' || specifier === 'next/headers') {
    return {
      shortCircuit: true,
      url: pathToFileURL(path.resolve('./scripts/next-shim.mjs')).href,
    };
  }
  if (specifier.startsWith('@/')) {
    const absPath = path.resolve('./src/' + specifier.slice(2));
    const target = hasExtension(absPath) ? absPath : absPath + '.ts';
    return {
      shortCircuit: true,
      url: pathToFileURL(target).href,
    };
  }
  if (specifier.startsWith('.') && !hasExtension(specifier)) {
    try {
      return await nextResolve(specifier + '.ts', context);
    } catch (_) {}
  }
  return nextResolve(specifier, context);
}

function hasExtension(p) {
  return p.endsWith('.ts') || p.endsWith('.js') || p.endsWith('.mjs') || p.endsWith('.json');
}
