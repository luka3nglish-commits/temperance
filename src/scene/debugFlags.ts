/**
 * Query-string switches for measuring what the scene costs (never user facing):
 *   ?tp-noenv    skip the drei Environment bake
 *   ?tp-nocrack  plain material, no crack shader injection
 *   ?tp-std      MeshStandardMaterial instead of MeshPhysicalMaterial
 *   ?tp-chunks   a performance mark after each compile chunk (tp:gl-chunk-<program>)
 *   ?tp-notemple no DOM temple (shaft, colonnade, pool, haze)
 *   ?tp-nomask   no bottom fade mask on the stage
 * Read once at module load; absent in tests and SSR.
 */
type Flags = { noenv: boolean; nocrack: boolean; std: boolean; chunks: boolean; notemple: boolean; nomask: boolean }
const NONE: Flags = { noenv: false, nocrack: false, std: false, chunks: false, notemple: false, nomask: false }
function read(): Flags {
  try {
    if (typeof location === 'undefined') return NONE
    const q = new URLSearchParams(location.search)
    return {
      noenv: q.has('tp-noenv'),
      nocrack: q.has('tp-nocrack'),
      std: q.has('tp-std'),
      chunks: q.has('tp-chunks'),
      notemple: q.has('tp-notemple'),
      nomask: q.has('tp-nomask'),
    }
  } catch {
    return NONE
  }
}

export const DEBUG = read()
