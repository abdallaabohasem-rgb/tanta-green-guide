import { useState } from 'react';

import { treeFilters } from './treeData';
const labels = ['نقطة مرصودة في العينة التجريبية', 'شجرة قائمة موثّقة على الخريطة', 'شجرة مزروعة ضمن المبادرة', 'موقع مقترح للزراعة على الأرصفة'];
const photo = './images/tanta-street-shade-illustrative.jpg';
const number = new Intl.NumberFormat('ar-EG');

export function Homepage({ statuses, state, explore, propose, rooftop }: {
  statuses: string[]; state: string; explore: (filter: string) => void; propose: () => void; rooftop: () => void;
}) {
  const [choice, setChoice] = useState(0);
  const [participate, setParticipate] = useState(false);
  const counts = treeFilters.map((status, i) => i === 0 ? statuses.length : statuses.filter(s => s === status).length);
  const display = (value: number) => state === 'ready' ? number.format(value) : '—';
  return <div className="landing">
    <section className="home-hero">
      <img className="street-photo" src={photo} alt="" />
      <div className="hero-story">
        <p className="eyebrow">إصدار تجريبي • رصد تشاركي لمدينة طنطا</p>
        <h1>ظلّ الرصيف يبدأ<br/> من خريطة واحدة</h1>
        <p className="sample-count">{display(counts[0])} نقطة في عيّنة طنطا</p>
        <p className="lead">دليل تفاعلي مفتوح لاستكشاف أشجار شوارع طنطا، التعرّف على حالتها، واقتراح مواقع جديدة للزراعة على مسارات المشي اليومية.</p>
        <div className="hero-actions"><button onClick={() => explore('الكل')}>استكشف خريطة الأشجار</button><button onClick={propose}>اقترح موقع زراعة</button><button onClick={rooftop}>دليل زراعة الأسطح</button></div>
      </div>
      <div className="action-card"><h2>ابدأ الاستكشاف أو المشاركة</h2>
        <div className="switch">{['استكشف الأشجار','اقترح موقعًا'].map((label,i) => <button key={label} aria-pressed={participate === Boolean(i)} onClick={() => setParticipate(Boolean(i))}>{label}</button>)}</div>
        {participate ? <ol><li>افتح الخريطة في وضع الاقتراح.</li><li>اضغط على الرصيف المناسب.</li><li>راجع النقطة المؤقتة أو ألغِها بحرية.</li></ol> : <>
          <div className="home-filters">{treeFilters.map((label,i) => <button key={label} aria-pressed={choice === i} onClick={() => setChoice(i)}>{label}</button>)}</div>
          <p aria-live="polite">{state === 'error' ? 'تعذّر تحميل عينة الأشجار.' : state === 'loading' ? 'جاري تحميل العينة…' : '♧　يظهر ' + display(counts[choice]) + ' من أصل ' + display(counts[0]) + ' نقطة على خريطة طنطا'}</p>
          <div className="coverage"><small>نطاق الرصد الأولي — وسط طنطا</small><span className="status">بيانات تجريبية</span></div>
          <progress aria-label="نسبة الأشجار المصنفة قائمة أو مزروعة" max={counts[0] || 1} value={counts[1]+counts[2]} />
        </>}
        <button className="launch" onClick={() => participate ? propose() : explore(treeFilters[choice])}>{participate ? 'افتح الخريطة وحدد موقعًا مؤقتًا ←' : 'افتح الخريطة بالتصفية المختارة ←'}</button>
        <small>بدون تسجيل دخول • بيانات تجريبية أولية قيد التطوير</small>
      </div>
      <small className="photo-credit">صورة توضيحية لمسار مشاة مظلل مستوحى من طنطا</small>
    </section>
    <section className="metrics" aria-label="مؤشرات العينة">{labels.map((label,i) => <article key={label}><span aria-hidden="true">{['⌖','♧','❧','＋'][i]}</span><strong>{display(counts[i])}</strong><p>{label}</p></article>)}
      <article className="field-note"><img src={photo} alt="صورة توضيحية"/><div><small>ملاحظات ميدانية • شوارع طنطا</small><p>«كل شجرة ناضجة تحوّل الرصيف المشمس وقت الظهر إلى مسار مريح للمشاة.»</p><button onClick={() => explore('الكل')}>تصفّح النقاط على الخريطة ←</button></div></article>
    </section>
  </div>;
}
