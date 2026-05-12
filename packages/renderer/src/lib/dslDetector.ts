export interface DSLCheckResult {
  isSafe: boolean
  dangerousOperations: string[]
  warningMessage?: string
}

const DANGEROUS_PATTERNS = [
  {
    pattern: /_delete_by_query/i,
    name: 'Delete By Query',
    description: 'This operation will permanently delete documents matching your query',
  },
  {
    pattern: /_update/i,
    name: 'Update',
    description: 'This operation will update existing documents',
  },
  {
    pattern: /_update_by_query/i,
    name: 'Update By Query',
    description: 'This operation will update documents matching your query',
  },
  {
    pattern: /_bulk.*["']update["']/i,
    name: 'Bulk Update',
    description: 'This operation will perform bulk updates',
  },
  {
    pattern: /_bulk.*["']delete["']/i,
    name: 'Bulk Delete',
    description: 'This operation will perform bulk deletions',
  },
  {
    pattern: /_index.*["']delete["']/i,
    name: 'Delete Index',
    description: 'This operation will permanently delete the index',
  },
  {
    pattern: /delete\s*\(.*\)/i,
    name: 'JavaScript Delete',
    description: 'This operation may delete documents using script',
  },
  {
    pattern: /script.*["']source["']/i,
    name: 'Script Execution',
    description: 'This operation executes arbitrary scripts',
  },
]

export function detectDangerousOperations(dsl: string): DSLCheckResult {
  const dangerousOperations: string[] = []

  for (const { pattern, name, description } of DANGEROUS_PATTERNS) {
    if (pattern.test(dsl)) {
      dangerousOperations.push(`${name}: ${description}`)
    }
  }

  const isSafe = dangerousOperations.length === 0

  return {
    isSafe,
    dangerousOperations,
    warningMessage: isSafe
      ? undefined
      : `⚠️ Warning: The following potentially dangerous operations were detected:\n${dangerousOperations.join('\n')}`,
  }
}

export function isReadOnlyDSL(dsl: string): boolean {
  const readOnlyPatterns = [
    /_search/i,
    /_count/i,
    /_explain/i,
    /_validate/i,
    /_mget/i,
    /_bulk.*["']index["']/i,
  ]

  const writePatterns = [
    /_delete/i,
    /_update/i,
    /_index.*["']create["']/i,
    /_index.*["']delete["']/i,
  ]

  const hasWriteOperation = writePatterns.some((p) => p.test(dsl))
  const hasReadOperation = readOnlyPatterns.some((p) => p.test(dsl))

  return !hasWriteOperation && (hasReadOperation || /GET|HEAD/i.test(dsl))
}
