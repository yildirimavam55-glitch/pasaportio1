export function ReviewSourceMark({source}:{source:string}) {
 if(source==='Google') return <span className="review-source-mark google-wordmark" role="img" aria-label="Google">{'Google'.split('').map((letter,i)=><span key={i} className={`google-letter-${i}`}>{letter}</span>)}</span>;
 if(source==='Trustpilot') return <span className="review-source-mark trustpilot-wordmark" role="img" aria-label="Trustpilot"><svg viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="m12 1 2.7 8.2H23l-6.7 5 2.6 8.1L12 17.3l-6.9 5 2.6-8.1L1 9.2h8.3Z"/></svg><span>Trustpilot</span></span>;
 return <span className="review-source-mark">{source}</span>;
}