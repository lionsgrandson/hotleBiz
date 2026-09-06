export function ScoreCard({ reputation }: { reputation: any }) {
  const score = reputation?.score
  return <section className="scoreCard card">
    <div className="scoreRing"><strong>{score ?? '—'}</strong><span>/100</span></div>
    <div><span className="eyebrow">Network hospitality score</span><h2>{score == null ? 'Not enough data yet' : score >= 85 ? 'Excellent stay history' : score >= 70 ? 'Positive stay history' : score >= 50 ? 'Mixed stay history' : 'Needs careful review'}</h2>
      <p>{reputation?.count || 0} published stay review{reputation?.count === 1 ? '' : 's'} · {reputation?.confidence || 'none'} confidence. Serious incidents are shown separately and are not folded into this number.</p></div>
  </section>
}
