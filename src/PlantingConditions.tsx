const conditions = [
  { key: 'soil', label: 'نوع التربة', options: ['رملية', 'طينية', 'طميية', 'ردم أو تربة مختلطة'] },
  { key: 'drainage', label: 'صرف التربة', options: ['جيد', 'بطيء', 'المياه بتتجمع'] },
  { key: 'irrigation', label: 'توفر الري', options: ['متاح بانتظام', 'محدود', 'غير متاح'] },
  { key: 'clearance', label: 'عوائق عند النقطة', options: ['فيه عوائق معروفة', 'مفيش عوائق ظاهرة'] },
] as const;

export function PlantingConditions() {
  return (
    <details className="planting-optional">
      <summary>تفاصيل اختيارية عن التربة والري والعوائق</summary>
      {conditions.map(condition => (
        <label key={condition.key}>
          {condition.label}
          <select name={condition.key} defaultValue="">
            <option value="">مش متأكد</option>
            {condition.options.map(option => <option key={option}>{option}</option>)}
          </select>
        </label>
      ))}
    </details>
  );
}

function measurement(data: FormData, key: string): number | null {
  const value = data.get(key);
  return typeof value === 'string' && value !== '' ? Number(value) : null;
}

export function PlantingAssessment({ data, metersPerFloor, location }: {
  data: FormData; metersPerFloor: number; location: [number, number];
}) {
  const street = measurement(data, 'street');
  const sidewalk = measurement(data, 'sidewalk');
  const near = measurement(data, 'nearBuilding');
  const opposite = measurement(data, 'oppositeBuilding');
  const direction = measurement(data, 'direction');
  const ratio = street && near !== null && opposite !== null
    ? ((near + opposite) * metersPerFloor / 2 / street).toFixed(2)
    : null;
  const [longitude, latitude] = location;
  const sun = street !== null && sidewalk !== null && sidewalk > 0 && sidewalk < street
    && near !== null && opposite !== null && direction !== null
    ? estimateSolarAccess(latitude, longitude, street, sidewalk / 2, near * metersPerFloor, opposite * metersPerFloor, direction)
    : null;
  const hours = new Intl.NumberFormat('ar-EG', { maximumFractionDigits: 1 });
  function formatRange([minimum, maximum]: [number, number]) {
    const low = hours.format(minimum);
    const high = hours.format(maximum);
    return low === high ? low : `${low}–${high}`;
  }

  return (
    <section className="survey-review" aria-label="مؤشرات الترشيح">
      <h3>مؤشرات الترشيح</h3>
      <h4>ساعات الشمس المباشرة المحتملة</h4>
      {sun ? (
        <>
          <dl>
            <div><dt>حوالي ٢١ يونيو</dt><dd><bdi>{formatRange(sun.summer)}</bdi> ساعة</dd></div>
            <div><dt>حوالي ٢١ ديسمبر</dt><dd><bdi>{formatRange(sun.winter)}</bdi> ساعة</dd></div>
          </dl>
          <p>تقدير لمنتصف الرصيف بين واجهتين مستقيمتين في يوم صافي. النطاق يغطي الاحتمالين لجهة الرصيف. التقاطعات والأشجار والعوائق الأخرى ممكن تغيّر النتيجة.</p>
        </>
      ) : <p>عشان نحسب الشمس، كمل عرض الشارع والرصيف وعدد أدوار الناحيتين وزاوية الشارع. عرض الرصيف لازم يكون أكبر من صفر وأقل من عرض الشارع.</p>}
      <dl>
        {conditions.map(condition => (
          <div key={condition.key}>
            <dt>{condition.label}</dt>
            <dd>{String(data.get(condition.key) || 'محتاج معاينة')}</dd>
          </div>
        ))}
        <div>
          <dt>متوسط ارتفاع المباني ÷ عرض الشارع</dt>
          <dd>{ratio === null ? 'محتاج قياس' : <bdi>{ratio}</bdi>}</dd>
        </div>
        <div>
          <dt>نسبة ظل الشجرة على مسار المشاة</dt>
          <dd>محتاجة بيانات تاج الشجرة<br />ومسار المشاة ووقت الدراسة</dd>
        </div>
      </dl>
      <p>نسبة الارتفاع للعرض بتوصف شكل الشارع. اتجاه الشارع لوحده ما يحددش ساعات الشمس.</p>
      <p>ترشيح نوع مناسب محتاج دليل أنواع معتمد لطنطا ومعاينة مساحة الجذور ومسار المشاة والمرافق.</p>
    </section>
  );
}
import { estimateSolarAccess } from './solarAccess';

