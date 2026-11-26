import { estimateSolarAccess } from './solarAccess';
import { species } from './speciesData';
import { conditions, measurement } from './plantingData';
import type { SurveyValues } from './plantingData';

export function PlantingAssessment({ data, metersPerFloor, location }: {
  data: SurveyValues; metersPerFloor: number; location: [number, number];
}) {
  const street = measurement(data.street);
  const sidewalk = measurement(data.sidewalk);
  const near = measurement(data.nearBuilding);
  const opposite = measurement(data.oppositeBuilding);
  const direction = measurement(data.direction);
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

  const siteIssue = data.irrigation === 'غير متاح' || data.clearance === 'فيه عوائق معروفة'
    || ['بطيء', 'المياه بتتجمع'].includes(String(data.drainage));
  const candidates = sun ? species.filter(tree => {
    const minimumHours = tree.sun.includes('ظل جزئي') ? 3 : 6;
    return sun.summer[0] >= minimumHours;
  }) : [];

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
            <dd>{String(data[condition.key] || 'محتاج معاينة')}</dd>
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
      <h4>أنواع تستحق المعاينة</h4>
      {siteIssue ? <p>راجع الصرف وإمكانية ري الشتلة وأي عوائق سجّلتها قبل اختيار النوع.</p>
        : !sun ? <p>بعد استكمال قياسات الشارع هتظهر الأنواع المتوافقة مع تقدير الشمس.</p>
        : <>
          <p>الفرز المبدئي بياخد أقل تقدير للشمس على الرصيفين يوم ٢١ يونيو. حدود فرز تجريبية للمراجعة. بنستخدم ٦ ساعات للشمس الكاملة و٣ ساعات للأنواع اللي بتتحمل الظل الجزئي.</p>
          {candidates.length ? <ul>{candidates.map(tree => (
            <li key={tree.id}><a href={`#species-${tree.id}`}>{tree.name}</a> — {tree.sun}</li>
          ))}</ul> : <p>مفيش نوع من الأنواع المسجلة حقق الحد ده على الرصيفين. راقب الشمس عند نقطة الزراعة نفسها.</p>}
          <p>قبل الزراعة، راجع التربة ومساحة الجذور وعرض ممر المشاة ومصدر الري. اضغط على اسم النوع لمراجعة بطاقته.</p>
        </>}
    </section>
  );
}
