import { useEffect, useRef, useState } from 'react';
import type { FormEvent } from 'react';
import { PlantingAssessment } from './PlantingAssessment';
import { conditions, fields, metersPerFloor, sidewalkMessage } from './plantingData';
import type { Coordinates, SurveyKey, SurveyValues } from './plantingData';

export function PlantingSurvey({ location, values, onChange, onSave }: {
  location: Coordinates;
  values: SurveyValues;
  onChange: (values: SurveyValues) => void;
  onSave: () => void;
}) {
  const [review, setReview] = useState<SurveyValues | null>(null);
  const sidewalkInput = useRef<HTMLInputElement>(null);
  const error = sidewalkMessage(values);
  useEffect(() => { sidewalkInput.current?.setCustomValidity(error); }, [error]);

  function update(key: SurveyKey, value: string) {
    onChange({ ...values, [key]: value });
    setReview(null);
  }

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const button = (event.nativeEvent as SubmitEvent).submitter as HTMLButtonElement | null;
    if (button?.value === 'save') onSave();
    else setReview(values);
  }

  return (
    <div className="planting-survey">
      <form onSubmit={submit}>
        <fieldset>
          <legend>بيانات مكان الزراعة</legend>
          <p className="survey-help">املأ اللي تعرفه وسيب الباقي فاضي. لحفظ النقطة والقياسات على الجهاز، اضغط «احفظ المسودة على الجهاز».</p>
          <p id="building-height-help" className="survey-help">احسب الدور الأرضي ضمن الأدوار. الارتفاع تقديري على أساس ٣ أمتار لكل دور. لو مفيش مبنى، اكتب ٠.</p>
          {fields.map(field => (
            <label key={field.key}>
              {field.label} <span>({field.unit})</span>
              <input ref={field.key === 'sidewalk' ? sidewalkInput : undefined}
                value={values[field.key]} onChange={event => update(field.key, event.currentTarget.value)}
                aria-invalid={field.key === 'sidewalk' && !!error}
                name={field.key} type="number" inputMode={'floors' in field ? 'numeric' : 'decimal'} min={field.min}
                max={'max' in field ? field.max : undefined} step={'floors' in field ? 1 : 0.1}
                aria-describedby={'floors' in field ? 'building-height-help' : field.key === 'direction' ? 'street-direction-help' : field.key === 'sidewalk' && error ? 'sidewalk-error' : undefined} />
            </label>
          ))}
          <p id="street-direction-help" className="survey-help">٠° لمحور شمال–جنوب و٩٠° لمحور شرق–غرب.</p>
          {error && <p id="sidewalk-error" role="alert">{error}</p>}
          <details className="planting-optional">
            <summary>تفاصيل اختيارية عن التربة والري والعوائق</summary>
            {conditions.map(condition => (
              <label key={condition.key}>
                {condition.label}
                <select name={condition.key} value={values[condition.key]}
                  onChange={event => update(condition.key, event.currentTarget.value)}>
                  <option value="">مش متأكد</option>
                  {condition.options.map(option => <option key={option}>{option}</option>)}
                </select>
              </label>
            ))}
          </details>
          <div className="survey-actions">
            <button type="submit" value="review">راجع بيانات الموقع</button>
            <button type="submit" value="save">احفظ المسودة على الجهاز</button>
          </div>
        </fieldset>
      </form>
      <div aria-live="polite">
        {review && (<>
          <section className="survey-review" aria-label="ملخص بيانات الزراعة">
            <h3>ملخص بيانات الموقع</h3>
            <dl>
              {fields.map(field => {
                const value = review[field.key];
                return (
                  <div key={field.key}>
                    <dt>{field.label}</dt>
                    <dd>
                      {value ? (
                        <>
                          <bdi>{String(value)}</bdi> {field.unit}
                          {'floors' in field && <><br />حوالي <bdi>{Number(value) * metersPerFloor}</bdi> م</>}
                        </>
                      ) : 'محتاج قياس'}
                    </dd>
                  </div>
                );
              })}
            </dl>
          </section>
          <PlantingAssessment data={review} metersPerFloor={metersPerFloor} location={location} />
        </>)}
      </div>
    </div>
  );
}

