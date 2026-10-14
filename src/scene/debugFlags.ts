/**
 * Query-string switches for measuring what the scene costs (never user facing):
 *   ?tp-noenv    skip the drei Environment bake
 *   ?tp-nocrack  plain material, no crack shader injection
 *   ?tp-std      MeshStandardMaterial instead of MeshPhysicalMaterial
 * Read once at module load; absent in tests and SSR.
 */
function read(): { noenv: boolean; nocrack: boolean; std: boolean } {
  try {
    if (typeof location === 'undefined') return { noenv: false, nocrack: false, std: false }
    const q = new URLSearchParams(location.search)
    return { noenv: q.has('tp-noenv'), nocrack: q.has('tp-nocrack'), std: q.has('tp-std') }
  } catch {
    return { noenv: false, nocrack: false, std: false }
  }
}

export const DEBUG = read()
