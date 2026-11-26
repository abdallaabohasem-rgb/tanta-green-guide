export const fields = [
  { key: 'street', label: 'عرض الشارع من واجهة لواجهة', unit: 'م', min: 0.1 },
  { key: 'sidewalk', label: 'عرض الرصيف عند النقطة', unit: 'م', min: 0 },
  { key: 'nearBuilding', label: 'عدد أدوار المبنى ناحية الزراعة', unit: 'دور', min: 0, floors: true },
  { key: 'oppositeBuilding', label: 'عدد أدوار المبنى المقابل', unit: 'دور', min: 0, floors: true },
  { key: 'direction', label: 'زاوية محور الشارع من الشمال', unit: '°', min: 0, max: 179.9 },
] as const;

export const conditions = [
  { key: 'soil', label: 'نوع التربة', options: ['رملية', 'طينية', 'طميية', 'ردم أو تربة مختلطة'] },
  { key: 'drainage', label: 'صرف التربة', options: ['جيد', 'بطيء', 'المياه بتتجمع'] },
  { key: 'irrigation', label: 'توفر الري', options: ['متاح بانتظام', 'محدود', 'غير متاح'] },
  { key: 'clearance', label: 'عوائق عند النقطة', options: ['فيه عوائق معروفة', 'مفيش عوائق ظاهرة'] },
] as const;

export type SurveyKey = (typeof fields)[number]['key'] | (typeof conditions)[number]['key'];
export type SurveyValues = Record<SurveyKey, string>;
export type Coordinates = [longitude: number, latitude: number];

export const metersPerFloor = 3;
export const emptySurvey: SurveyValues = {
  street: '', sidewalk: '', nearBuilding: '', oppositeBuilding: '', direction: '',
  soil: '', drainage: '', irrigation: '', clearance: '',
};

export function measurement(value: string): number | null {
  if (!value.trim()) return null;
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

export function sidewalkMessage(values: SurveyValues): string {
  const street = measurement(values.street);
  const sidewalk = measurement(values.sidewalk);
  return street !== null && sidewalk !== null && sidewalk >= street
    ? 'عرض الرصيف لازم يكون أقل من عرض الشارع من واجهة لواجهة.'
    : '';
}
