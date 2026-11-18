import { useState } from 'react';
import type { FormEvent } from 'react';
import { PlantingAssessment, PlantingConditions } from './PlantingConditions';

const fields = [
  { key: 'street', label: 'عرض الشارع من واجهة لواجهة', unit: 'م', min: 0.1 },
  { key: 'sidewalk', label: 'عرض الرصيف عند النقطة', unit: 'م', min: 0 },
  { key: 'nearBuilding', label: 'عدد أدوار المبنى ناحية الزراعة', unit: 'دور', min: 0, floors: true },
  { key: 'oppositeBuilding', label: 'عدد أدوار المبنى المقابل', unit: 'دور', min: 0, floors: true },
  { key: 'direction', label: 'زاوية محور الشارع من الشمال', unit: '°', min: 0, max: 179.9 },
] as const;
const metersPerFloor = 3;

export function PlantingSurvey({ location }: { location: [number, number] }) {
  const [review, setReview] = useState<FormData | null>(null);

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setReview(new FormData(event.currentTarget));
  }

  return (
    <div className="planting-survey">
      <form onSubmit={submit} onInput={() => setReview(null)}>
        <fieldset>
          <legend>بيانات مكان الزراعة</legend>
          <p className="survey-help">املأ اللي تعرفه وسيب الباقي فاضي. البيانات بتفضل في الصفحة لحد ما تغيّر الموقع أو تعيد تحميلها.</p>
          <p id="building-height-help" className="survey-help">احسب الدور الأرضي ضمن الأدوار. الارتفاع تقديري على أساس ٣ أمتار لكل دور. لو مفيش مبنى، اكتب ٠.</p>
          {fields.map(field => (
            <label key={field.key}>
              {field.label} <span>({field.unit})</span>
              <input name={field.key} type="number" inputMode={'floors' in field ? 'numeric' : 'decimal'} min={field.min}
                max={'max' in field ? field.max : undefined} step={'floors' in field ? 1 : 0.1}
                aria-describedby={'floors' in field ? 'building-height-help' : field.key === 'direction' ? 'street-direction-help' : undefined} />
            </label>
          ))}
          <p id="street-direction-help" className="survey-help">٠° لمحور شمال–جنوب و٩٠° لمحور شرق–غرب.</p>
          <PlantingConditions />
          <button type="submit">راجع بيانات الموقع</button>
        </fieldset>
      </form>
      <div aria-live="polite">
        {review && (<>
          <section className="survey-review" aria-label="ملخص بيانات الزراعة">
            <h3>ملخص بيانات الموقع</h3>
            <dl>
              {fields.map(field => {
                const value = review.get(field.key);
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
