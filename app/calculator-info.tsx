import { RELEASES_URL, SEO_FAQ, SEO_INFO_INTRO, SEO_INFO_TITLE } from "./seo-metadata";

export default function CalculatorInfo() {
  return (
    <section className="calculator-info" aria-labelledby="calculator-info-title">
      <div className="info-intro"><span className="eyebrow">Zum Rechner</span><h2 id="calculator-info-title">{SEO_INFO_TITLE}</h2><p>{SEO_INFO_INTRO}</p><a href={RELEASES_URL} className="download-link">Offline-Version herunterladen <span aria-hidden="true">↗</span></a></div>
      <div className="faq-list">{SEO_FAQ.map((item) => <details key={item.question}><summary>{item.question}</summary><p>{item.answer}</p></details>)}</div>
    </section>
  );
}
