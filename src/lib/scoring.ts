export type RatingRow = {
  cleanliness: number
  property_care: number
  staff_respect: number
  noise: number
  payment: number
  policy_compliance: number
  would_host_again?: boolean | null
}

const WEIGHTS = {
  cleanliness: 0.20,
  property_care: 0.20,
  staff_respect: 0.15,
  noise: 0.15,
  payment: 0.15,
  policy_compliance: 0.15,
} as const

export function calculateWeightedRating(row: RatingRow) {
  const keys = Object.keys(WEIGHTS) as (keyof typeof WEIGHTS)[]
  return keys.reduce((sum, key) => sum + Number(row[key]) * WEIGHTS[key], 0)
}

export function calculateReputation(rows: RatingRow[]) {
  if (!rows.length) return { score: null, average: null, count: 0, confidence: 'none', dimensions: null, rebookRate: null }
  const keys = Object.keys(WEIGHTS) as (keyof typeof WEIGHTS)[]
  const dimensions = Object.fromEntries(keys.map(key => [key, rows.reduce((s, r) => s + Number(r[key]), 0) / rows.length])) as Record<keyof typeof WEIGHTS, number>
  const average = rows.reduce((sum, row) => sum + calculateWeightedRating(row), 0) / rows.length
  const answered = rows.filter(r => typeof r.would_host_again === 'boolean')
  const rebookRate = answered.length ? answered.filter(r => r.would_host_again).length / answered.length : null
  return {
    score: Math.round(average * 20),
    average: Number(average.toFixed(2)),
    count: rows.length,
    confidence: rows.length >= 6 ? 'high' : rows.length >= 3 ? 'medium' : 'low',
    dimensions,
    rebookRate,
  }
}
