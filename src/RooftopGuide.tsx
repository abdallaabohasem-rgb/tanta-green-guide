import { useRef, useState } from 'react';
import type { FormEvent } from 'react';
import {
  matchRooftopPlants,
  rooftopCarePillars,
  rooftopNumberFormat,
  rooftopPlants,
  rooftopSources,
  validateRooftopInputs,
} from './rooftopData';
import type { RooftopPlantMatch } from './rooftopData';

const numberFormat = rooftopNumberFormat;

interface SubmittedQuery {
  areaSqm: number;
  sunHours: number;
  matches: RooftopPlantMatch[];
}

export function RooftopGuide() {
  const [areaInput, setAreaInput] = useState('');
  const [sunInput, setSunInput] = useState('');
  const [areaError, setAreaError] = useState('');
  const [sunError, setSunError] = useState('');
  const [submitted, setSubmitted] = useState<SubmittedQuery | null>(null);

  const areaRef = useRef<HTMLInputElement>(null);
  const sunRef = useRef<HTMLInputElement>(null);
  const resultsHeadingRef = useRef<HTMLHeadingElement>(null);

  function handleAreaChange(value: string) {
    setAreaInput(value);
    setSubmitted(null);
    if (areaError) setAreaError('');
  }

  function handleSunChange(value: string) {
    setSunInput(value);
    setSubmitted(null);
    if (sunError) setSunError('');
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const result = validateRooftopInputs(areaInput, sunInput);
    if (!result.ok) {
      setAreaError(result.areaError);
      setSunError(result.sunError);
      setSubmitted(null);
      if (result.areaError) areaRef.current?.focus();
      else if (result.sunError) sunRef.current?.focus();
      return;
    }

    setAreaError('');
    setSunError('');
    const matches = matchRooftopPlants(result.areaSqm, result.sunHours);
    setSubmitted({
      areaSqm: result.areaSqm,
      sunHours: result.sunHours,
      matches,
    });
    requestAnimationFrame(() => {
      resultsHeadingRef.current?.focus({ preventScroll: true });
    });
  }

  function handleReset() {
    setAreaInput('');
    setSunInput('');
    setAreaError('');
    setSunError('');
    setSubmitted(null);
    areaRef.current?.focus();
  }

  return (
    <section id="rooftop-guide" className="species-guide rooftop-guide" aria-labelledby="rooftop-heading">
      <div className="intro">
        <h1 id="rooftop-heading" tabIndex={-1}>دليل زراعة الأسطح</h1>
        <p>
          دليل مستقل لاختيار نباتات الأوعية على السطح حسب المساحة المتاحة للزراعة وساعات الشمس المباشرة، مستند إلى مراجع إرشاد زراعي أولية ({numberFormat.format(rooftopPlants.length)} أنواع أولية).
        </p>
      </div>

      <section className="rooftop-safety-note" aria-labelledby="rooftop-load-heading">
        <h2 id="rooftop-load-heading">تنبيه مهم عن سلامة السطح والأحمال</h2>
        <p>
          لا يمكن استنتاج الحمل الإنشائي الآمن للسطح من المساحة بالمتر المربع. قبل وضع أي أوعية أو أحواض، لازم التأكد من سلامة السطح الإنشائية وقدرته على تحمّل وزن الأوعية المشبعة بالماء، ومراجعة العزل المائي وتصريف السطح مع مهندس مختص أو الجهة المسؤولة.
        </p>
        <p className="rooftop-disclaimer">
          المساحات بالمتر المربع لكل نبتة هنا هي تقديرات أولية لموضع الحوض وحده، وأداء الأصناف ومعدل الري في صيف ورياح طنطا يحتاجان تجربة ومتابعة محلية على السطح نفسه.
        </p>
      </section>

      <section className="species-controls rooftop-controls" aria-labelledby="rooftop-filter-heading">
        <h2 id="rooftop-filter-heading" className="rooftop-subheading">أدخل معطيات السطح</h2>
        <form className="rooftop-form" onSubmit={handleSubmit} noValidate>
          <div className="rooftop-fields-row">
            <div className="rooftop-field">
              <label htmlFor="rooftop-area">المساحة القابلة للزراعة (م²)</label>
              <p id="rooftop-area-help" className="survey-help">
                أدخل مساحة الأوعية المتاحة بالمتر المربع (مثال: ٠٫٥ أو ٢٫٥). هذا الإدخال لا يحدّد الحمولة الآمنة للسطح.
              </p>
              <input
                ref={areaRef}
                id="rooftop-area"
                name="usableArea"
                type="number"
                inputMode="decimal"
                min="0.1"
                max="2000"
                step="0.1"
                value={areaInput}
                onChange={event => handleAreaChange(event.currentTarget.value)}
                aria-invalid={!!areaError}
                aria-describedby={areaError ? 'rooftop-area-help rooftop-area-error' : 'rooftop-area-help'}
              />
              {areaError && (
                <p id="rooftop-area-error" className="field-error" role="alert">
                  {areaError}
                </p>
              )}
            </div>

            <div className="rooftop-field">
              <label htmlFor="rooftop-sun">ساعات الشمس المباشرة يوميًا</label>
              <p id="rooftop-sun-help" className="survey-help">
                عدد ساعات الشمس المباشرة التي تصل لمكان الأوعية (من ٠ إلى ١٤ ساعة).
              </p>
              <input
                ref={sunRef}
                id="rooftop-sun"
                name="sunHours"
                type="number"
                inputMode="decimal"
                min="0"
                max="14"
                step="0.5"
                value={sunInput}
                onChange={event => handleSunChange(event.currentTarget.value)}
                aria-invalid={!!sunError}
                aria-describedby={sunError ? 'rooftop-sun-help rooftop-sun-error' : 'rooftop-sun-help'}
              />
              {sunError && (
                <p id="rooftop-sun-error" className="field-error" role="alert">
                  {sunError}
                </p>
              )}
            </div>
          </div>

          <div className="rooftop-form-actions">
            <button type="submit" className="rooftop-submit">اعرض النباتات المناسبة</button>
            {(areaInput || sunInput || submitted) && (
              <button type="button" className="species-reset-btn" onClick={handleReset}>
                إعادة ضبط المدخلات
              </button>
            )}
          </div>
        </form>
      </section>

      <section className="rooftop-results" aria-live="polite">
        <h2 id="rooftop-results-heading" ref={resultsHeadingRef} tabIndex={-1}>
          {submitted
            ? `نتائج الترشيح المبدئي (${numberFormat.format(submitted.matches.length)} من ${numberFormat.format(rooftopPlants.length)})`
            : 'النباتات المرجعية للأسطح'}
        </h2>

        {!submitted ? (
          <p className="rooftop-prompt-note">
            أدخل المساحة وساعات الشمس المباشرة بالأعلى واضغط «اعرض النباتات المناسبة» لمعرفة الأنواع المتوافقة مع ظروف سطحك وسبب اختيار كل نوع.
          </p>
        ) : submitted.matches.length === 0 ? (
          <div className="species-no-results" role="status">
            <h3>لا توجد نباتات مناسبة في هذا الدليل للمعطيات المدخلة</h3>
            <p>
              بإضاءة {numberFormat.format(submitted.sunHours)} ساعة شمس ومساحة {numberFormat.format(submitted.areaSqm)} م²، لا يتوافق أي من الأنواع المرجعية الحالية (أقل حد موثق هنا هو ٤ ساعات شمس مباشرة و٠٫٢ م² لوعاء ضحل مستقر). راجع ما إذا كان يمكن نقل الأوعية لموضع أكثر تعرضًا للشمس أو توفير مساحة أوسع بعد التأكد من سلامة السطح.
            </p>
            <button type="button" className="species-reset-btn" onClick={handleReset}>
              جرّب قياسات أخرى
            </button>
          </div>
        ) : (
          <div className="species-grid">
            {submitted.matches.map(({ plant, reason }) => (
              <article key={plant.id} className="species-card rooftop-plant-card" aria-labelledby={`rooftop-plant-${plant.id}`}>
                <div className="rooftop-card-head">
                  <h3 id={`rooftop-plant-${plant.id}`}>{plant.name}</h3>
                  <span className="status local-status">مناسب مبدئيًا (تقدير مرجعي)</span>
                </div>
                <p className="scientific"><bdi lang="la">{plant.scientific}</bdi></p>
                <p className="rooftop-fit-reason">{reason}</p>
                <dl className="species-facts">
                  <div><dt>احتياج الشمس</dt><dd>{plant.sunLabel}</dd></div>
                  <div><dt>المساحة التقديرية للوعاء</dt><dd>{numberFormat.format(plant.minAreaSqm)} م² (تقدير أولي)</dd></div>
                  <div><dt>حجم الوعاء المطلوب</dt><dd>{plant.containerSize}</dd></div>
                </dl>
                <h4>الصرف</h4><p>{plant.drainage}</p>
                <h4>بيئة الزراعة</h4><p>{plant.medium}</p>
                <h4>الري</h4><p>{plant.watering}</p>
                <h4>الرياح</h4><p>{plant.wind}</p>
                <h4>الرعاية الموسمية</h4><p>{plant.seasonal}</p>
                <h4>حدود التقدير والملاءمة لطنطا</h4><p>{plant.localNote}</p>
                <div className="species-sources">
                  {plant.sourceIds.map(sourceId => {
                    const source = rooftopSources[sourceId];
                    return source ? (
                      <a key={source.id} href={source.url} target="_blank" rel="noreferrer">
                        {source.label} ↗
                      </a>
                    ) : null;
                  })}
                </div>
              </article>
            ))}
          </div>
        )}
      </section>

      <section className="rooftop-pillars-section" aria-labelledby="rooftop-pillars-heading">
        <h2 id="rooftop-pillars-heading">أساسيات تجهيز أوعية السطح</h2>
        <div className="rooftop-pillars">
          {rooftopCarePillars.map(pillar => (
            <article key={pillar.id} className="rooftop-pillar-card">
              <h3>{pillar.title}</h3>
              <p>{pillar.detail}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="rooftop-sources-footer" aria-labelledby="rooftop-sources-heading">
        <h2 id="rooftop-sources-heading">المصادر البستانية الأولية</h2>
        <ul>
          {Object.values(rooftopSources).map(source => (
            <li key={source.id}>
              <a href={source.url} target="_blank" rel="noreferrer">{source.label} ↗</a>
            </li>
          ))}
        </ul>
      </section>
    </section>
  );
}
