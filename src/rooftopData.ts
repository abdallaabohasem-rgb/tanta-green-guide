export interface RooftopSource {
  id: string;
  label: string;
  url: string;
}

export interface RooftopPlant {
  id: string;
  name: string;
  scientific: string;
  minSunHours: number;
  sunLabel: string;
  minAreaSqm: number;
  containerSize: string;
  drainage: string;
  medium: string;
  watering: string;
  wind: string;
  seasonal: string;
  localNote: string;
  sourceIds: string[];
}

export interface RooftopPlantMatch {
  plant: RooftopPlant;
  reason: string;
}

export interface RooftopCarePillar {
  id: string;
  title: string;
  detail: string;
}

export const rooftopSources: Record<string, RooftopSource> = {
  ufContainers: {
    id: 'ufContainers',
    label: 'UF/IFAS: زراعة الخضروات في الأوعية',
    url: 'https://gardeningsolutions.ifas.ufl.edu/plants/edibles/vegetables/growing-vegetables-in-containers/',
  },
  ufHerbs: {
    id: 'ufHerbs',
    label: 'UF/IFAS: زراعة الأعشاب المنزلية',
    url: 'https://gardeningsolutions.ifas.ufl.edu/plants/edibles/vegetables/herbs/',
  },
  clemsonContainers: {
    id: 'clemsonContainers',
    label: 'Clemson HGIC 1251: زراعة الخضروات في الأصص',
    url: 'https://hgic.clemson.edu/factsheet/container-vegetable-gardening/',
  },
  clemsonHerbs: {
    id: 'clemsonHerbs',
    label: 'Clemson HGIC: دليل الأعشاب',
    url: 'https://hgic.clemson.edu/factsheet/herbs/',
  },
  clemsonBasil: {
    id: 'clemsonBasil',
    label: 'Clemson HGIC: زراعة الريحان',
    url: 'https://hgic.clemson.edu/factsheet/basil/',
  },
  faoMicrogardens: {
    id: 'faoMicrogardens',
    label: 'FAO: الحدائق المصغّرة بالمدن (PDF)',
    url: 'https://www.fao.org/ag/agp/greenercities/pdf/FS/UPH-FS-6.pdf',
  },
  umnGarden: {
    id: 'umnGarden',
    label: 'جامعة مينيسوتا: إرشادات الحدائق والأوعية',
    url: 'https://extension.umn.edu/yard-and-garden',
  },
};

export const rooftopCarePillars: readonly RooftopCarePillar[] = [
  {
    id: 'containers',
    title: 'حجم الوعاء والصرف',
    detail:
      'اختار وعاء بعمق وحجم يكفي الجذور عند النضج مع ثقوب تصريف مفتوحة في القاعدة؛ منع ركود المياه أساسي لتجنب عفن الجذور وحماية السطح ببطانة أو قواعد تمنع التسرب.',
  },
  {
    id: 'medium',
    title: 'بيئة الزراعة الخفيفة',
    detail:
      'تجنّب تربة الحديقة أو الطين الثقيل وحده لأنه ينضغط ويزيد الوزن ويمنع التهوية. استخدم خلطة أصص خفيفة جيدة الصرف (مثل بيتموس أو ألياف جوز الهند + كمبوست + بيرليت).',
  },
  {
    id: 'watering',
    title: 'الري وإدارة الحرارة',
    detail:
      'الأوعية على السطح تجف أسرع من الأرض، وقد تحتاج ريًا يوميًا أو مرتين وقت ذروة الصيف خصوصًا في الأوعية الصغيرة أو المحاصيل المثمرة، مع تصريف أي ماء زائد.',
  },
  {
    id: 'wind',
    title: 'الرياح وتثبيت الأوعية',
    detail:
      'رياح الأسطح أعلى سرعةً وتجفف التربة وتقلب الأوعية الخفيفة أو النباتات الطويلة. ضع الأوعية قرب ذرى السطح أو مصدات خفيفة، وثبّت النباتات المثمرة بدعامات.',
  },
  {
    id: 'seasonal',
    title: 'الرعاية الموسمية',
    detail:
      'جذور الأوعية تتأثر بتقلبات حرارة الهواء أكثر من التربة: في حر صيف طنطا قد تحتاج الورقيات تظليلًا خفيفًا وقت الظهيرة، وفي الشتاء يُخفَّف الري مع تجنّب تشبّع التربة.',
  },
];

export const rooftopPlants: readonly RooftopPlant[] = [
  {
    id: 'lettuce',
    name: 'الخس الورقي',
    scientific: 'Lactuca sativa',
    minSunHours: 4,
    sunLabel: '٤ ساعات شمس مباشرة على الأقل (يتحمل الظل الجزئي)',
    minAreaSqm: 0.2,
    containerSize: 'حوض مستطيل أو وعاء ضحل بعمق ١٥–٢٠ سم على الأقل (٦–٨ بوصات)',
    drainage: 'ثقوب تصريف فعالة في القاعدة دون إبقاء ماء راكد أسفل الحوض.',
    medium: 'خلطة أصص خفيفة مفككة (كمبوست ناضج + بيتموس أو كوير + بيرليت) دون طين ثقيل.',
    watering: 'ترطيب منتظم يحافظ على برودة ورطوبة الطبقة السطحية لأن الأوعية الضحلة تجف بسرعة.',
    wind: 'منخفض الارتفاع نسبيًا؛ يُحمى من الرياح الساخنة التي تذبل الأوراق وتجفف السطح.',
    seasonal: 'يناسب خريف وشتاء وربيع طنطا المعتدل؛ في الحر الشديد قد يزهر مبكرًا ويحتاج ظلًا خفيفًا.',
    localNote: 'تقدير الحوض (٠٫٢ م²) لوعاء ضحل؛ تحمّل صيف الدلتا يحتاج تظليلًا خفيفًا وقت الظهر.',
    sourceIds: ['clemsonContainers', 'umnGarden', 'faoMicrogardens'],
  },
  {
    id: 'parsley',
    name: 'البقدونس',
    scientific: 'Petroselinum crispum',
    minSunHours: 4,
    sunLabel: '٤–٦ ساعات شمس مباشرة (يتحمل ظلًا جزئيًا)',
    minAreaSqm: 0.2,
    containerSize: 'أصيص بعمق ١٥–٢٠ سم على الأقل وسعة ٤–٨ لترات (١–٢ جالون)',
    drainage: 'ثقوب تصريف مفتوحة ورفع الوعاء قليلًا عن بلاط السطح لمنع احتباس المياه.',
    medium: 'خلطة خفيفة جيدة التهوية والصرف غنية بالمادة العضوية، بدون تربة طينية ثقيلة.',
    watering: 'ري معتدل منتظم دون جفاف تام أو غمر مستمر.',
    wind: 'أوراقه قريبة من الحوض وأقل عرضة للكسر، مع مراعاة تعويض التبخر في الأيام العاصفة.',
    seasonal: 'جيد الأداء في اعتدال الخريف والشتاء والربيع؛ في الصيف يفضَّل تظليل جزئي بعد الظهر.',
    localNote: 'تقدير الحوض (٠٫٢ م²) لتوزيع وعاء واحد؛ متابعة التبخر مطلوبة في صيف طنطا.',
    sourceIds: ['clemsonHerbs', 'ufHerbs'],
  },
  {
    id: 'mint',
    name: 'النعناع',
    scientific: 'Mentha spp.',
    minSunHours: 4,
    sunLabel: '٤–٦ ساعات شمس مباشرة (ينمو في شمس كاملة أو ظل جزئي)',
    minAreaSqm: 0.25,
    containerSize: 'أصيص منفرد بعرض ٢٥–٣٠ سم وعمق ١٥–٢٠ سم على الأقل (يُزرع وحده لمنع تمدّده)',
    drainage: 'ثقوب تصريف واضحة؛ يحب الرطوبة مع تصريف الماء الزائد حتى لا تتعفن الجذور.',
    medium: 'خلطة أصص خفيفة تحتفظ بالرطوبة (بيتموس/كوير + كمبوست + بيرليت).',
    watering: 'ري متكرر يحافظ على رطوبة الخلطة خصوصًا في الحر، ولا يُجمع في وعاء واحد مع الأعشاب الجافة.',
    wind: 'نشارة عضوية خفيفة فوق السطح تساعد في تقليل جفاف الوعاء مع الرياح.',
    seasonal: 'ينمو بنشاط في الربيع والصيف والخريف ويخف نموه شتاءً مع تقليم الأفرع الجافة.',
    localNote: 'ملائم غالبًا لأجواء الدلتا في وعاء مستقل (تقدير ٠٫٢٥ م²)، مع فحص وتيرة الري صيفًا.',
    sourceIds: ['ufHerbs', 'clemsonHerbs'],
  },
  {
    id: 'basil',
    name: 'الريحان',
    scientific: 'Ocimum basilicum',
    minSunHours: 6,
    sunLabel: '٦ ساعات شمس مباشرة يوميًا على الأقل (شمس كاملة)',
    minAreaSqm: 0.25,
    containerSize: 'أصيص بعمق ٢٠ سم وسعة ٤–١١ لترًا (١–٣ جالونات) ومستقر القاعدة',
    drainage: 'تصريف جيد جدًا عبر ثقوب سفلية؛ التربة الغارقة تسبّب ذبول وتعفن الجذور.',
    medium: 'خلطة خفيفة جيدة الصرف والتهوية بدون تربة حديقة.',
    watering: 'رطوبة منتظمة دون إغراق مع قطف القمم الزهرية لاستمرار إنتاج الأوراق.',
    wind: 'سيقانه الغضة تتضرر من الهبات القوية؛ يُفضّل وضعه قرب ذرى السطح.',
    seasonal: 'نبات موسم دافئ يزدهر في ربيع وصيف طنطا ويتأثر ببرد الشتاء.',
    localNote: 'تقدير الحوض ٠٫٢٥ م²؛ في ذروة حرارة الظهيرة بالسطح يُراقَب جفاف التربة يوميًا.',
    sourceIds: ['clemsonBasil', 'ufHerbs'],
  },
  {
    id: 'rosemary',
    name: 'الروزماري (إكليل الجبل)',
    scientific: 'Salvia rosmarinus',
    minSunHours: 6,
    sunLabel: '٦ ساعات شمس مباشرة يوميًا على الأقل (شمس كاملة)',
    minAreaSqm: 0.35,
    containerSize: 'أصيص منفرد مستقر بعمق ٢٠–٢٥ سم وسعة ٨–١٢ لترًا على الأقل (٢–٣ جالونات)',
    drainage: 'صرف حاد وسريع إلزامي؛ بقاء الرطوبة الزائدة يؤدي لتعفن الجذور.',
    medium: 'خلطة خفيفة عالية التهوية (نسبة أعلى من البيرليت أو الرمل الخشن النظيف)، في أصيص مستقل.',
    watering: 'يُفضّل ترك الطبقة العليا تجف جزئيًا بين الريات؛ لا يُجمع مع النعناع أو الريحان.',
    wind: 'شجيرة معمرة تتحمل النسيم والشمس، لكن الوعاء يجب أن يكون ثابتًا ضد الانقلاب.',
    seasonal: 'دائم الخضرة وملائم معظم السنة في طنطا مع تقليل الري شتاءً ومنع تجمع ماء المطر.',
    localNote: 'تقدير الحوض ٠٫٣٥ م² لنمو شجيري؛ نجاحه يعتمد أساسًا على الصرف السريع.',
    sourceIds: ['ufHerbs', 'clemsonHerbs'],
  },
  {
    id: 'pepper',
    name: 'الفلفل (أصناف مدمجة للأصص)',
    scientific: 'Capsicum annuum',
    minSunHours: 6,
    sunLabel: '٦ ساعات شمس مباشرة يوميًا على الأقل (أفضل إنتاج مع ٨+ ساعات)',
    minAreaSqm: 0.4,
    containerSize: 'وعاء عميق بعرض نحو ٣٥ سم وسعة ١٢–١٩ لترًا (٣–٥ جالونات) لنبتة واحدة، مع دعامة',
    drainage: 'ثقوب تصريف واسعة تمنع غرق الجذور أثناء الري الصيفي المتكرر.',
    medium: 'خلطة أصص خفيفة غنية ومتوازنة مع تسميد دوري لطول موسم الإثمار.',
    watering: 'ري منتظم وقد يصل لمرتين يوميًا في حر الصيف الشديد مع فحص رطوبة الخلطة.',
    wind: 'النبتة المثمرة قد تنكسر أو تنقلب بالرياح؛ تحتاج دعامة ومكانًا محميًا نسبيًا.',
    seasonal: 'محصول دافئ ينشط في الربيع والصيف والخريف الدافئ ويضعف في برودة الشتاء.',
    localNote: 'تقدير ٠٫٤ م² لوعاء واحد مستقر؛ الأصناف القزمية أو المدمجة أنسب للسطح.',
    sourceIds: ['clemsonContainers', 'umnGarden'],
  },
  {
    id: 'cherryTomato',
    name: 'الطماطم الكرزية أو القزمية',
    scientific: 'Solanum lycopersicum',
    minSunHours: 6,
    sunLabel: '٦–٨+ ساعات شمس مباشرة يوميًا (شمس كاملة)',
    minAreaSqm: 0.5,
    containerSize: 'وعاء كبير لا يقل عن ١٩ لترًا (٥ جالونات، بعرض ٣٥–٥٠ سم وعمق ٣٠ سم) لنبتة واحدة فقط',
    drainage: 'عدة ثقوب تصريف حرة بالقاعدة دون ترك مياه راكدة.',
    medium: 'خلطة أصص خفيفة عميقة (كمبوست ناضج + بيتموس/كوير + بيرليت) وتغذية منتظمة.',
    watering: 'ري منتظم وغزير في الصيف؛ تذبذب الري يسبّب تشقق الثمار وعفن الطرف الزهري.',
    wind: 'تحتاج قفص دعم أو دعامة قوية ووعاء مستقر وموضعًا محميًا من هبات الرياح.',
    seasonal: 'أنسب في أواخر الشتاء والربيع وبداية الخريف في طنطا؛ حر الصيف العالي قد يقلل العقد.',
    localNote: 'تقدير ٠٫٥ م² لوعاء ٥ جالونات؛ اختيار صنف قزمي أو شجيري ضروري للأسطح.',
    sourceIds: ['ufContainers', 'clemsonContainers', 'umnGarden'],
  },
];

export type RooftopValidationResult =
  | { ok: true; areaSqm: number; sunHours: number }
  | { ok: false; areaError: string; sunError: string };

export function validateRooftopInputs(areaRaw: string, sunRaw: string): RooftopValidationResult {
  const areaTrimmed = areaRaw.trim();
  const sunTrimmed = sunRaw.trim();
  const areaNum = Number(areaTrimmed);
  const sunNum = Number(sunTrimmed);

  let areaError = '';
  let sunError = '';

  if (!areaTrimmed || !Number.isFinite(areaNum) || areaNum <= 0 || areaNum > 2000) {
    areaError = 'أدخل مساحة صالحة للزراعة أكبر من صفر بالمتر المربع (حتى ٢٠٠٠ م²).';
  }
  if (!sunTrimmed || !Number.isFinite(sunNum) || sunNum < 0 || sunNum > 14) {
    sunError = 'أدخل عدد ساعات الشمس المباشرة بين ٠ و١٤ ساعة يوميًا.';
  }

  if (areaError || sunError) {
    return { ok: false, areaError, sunError };
  }

  return { ok: true, areaSqm: areaNum, sunHours: sunNum };
}

export const rooftopNumberFormat = new Intl.NumberFormat('ar-EG', { maximumFractionDigits: 2 });

export function matchRooftopPlants(areaSqm: number, sunHours: number): RooftopPlantMatch[] {
  return rooftopPlants
    .filter(plant => sunHours >= plant.minSunHours && areaSqm >= plant.minAreaSqm)
    .map(plant => ({
      plant,
      reason: `تناسب ${rooftopNumberFormat.format(sunHours)} ساعة شمس مباشرة (الحد المرجعي ${rooftopNumberFormat.format(plant.minSunHours)} ساعات) وتتسع لها مساحة الحوض التقديرية (${rooftopNumberFormat.format(plant.minAreaSqm)} م²) ضمن مساحتك المتاحة (${rooftopNumberFormat.format(areaSqm)} م²).`,
    }));
}
