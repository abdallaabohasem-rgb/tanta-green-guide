const localSource = 'https://sci.tanta.edu.eg/files/53-التاريخ%20والتنوع%20النباتي%20بحديقة%20الأندلس%20العامة%20بطنطا.pdf';

const species = [
  {
    id: 'delonix', name: 'البونسيانا', scientific: 'Delonix regia',
    photo: 'f/f5/Delonix_regia_tree_with_red_flowers.jpg',
    author: 'Raviteja29123', license: 'by-sa', file: 'Delonix_regia_tree_with_red_flowers.jpg',
    height: '١٠٫٧–١٢٫٢ م', crown: '١٢٫٢–١٨٫٣ م', sun: 'شمس كاملة',
    soil: 'تربة جيدة الصرف، وتشمل الأنواع التي تتحملها الطينية والرملية والطميية.',
    water: 'ري جيد حتى الاستقرار، ثم خلال الجفاف الشديد وفق مرجع فلوريدا. تحمّل الجفاف عالٍ.',
    benefit: 'تاج واسع وظل مصفّى وإزهار أحمر برتقالي.',
    risk: 'جذور سطحية كبيرة قد تؤثر على الرصف، وأفرع قابلة للكسر وقرون متساقطة. تحتاج تقليمًا هيكليًا مبكرًا.',
    local: 'مسجلة في حديقة الأندلس بطنطا. اعتمادها للرصيف يحتاج فحص المساحة والمرافق.',
    study: 'تستحق الدراسة في مساحة مشمسة واسعة تسمح بامتداد التاج والجذور.',
    missing: 'مساحة التربة، والمسافة من الرصف والمرافق، وبرنامج الري المحلي.',
    source: 'ST228', pages: '١–٢', evidence: 'وجود موثق بحديقة الأندلس',
  },
  {
    id: 'jacaranda', name: 'الجاكرندا', scientific: 'Jacaranda mimosifolia',
    photo: '3/39/Jacaranda_mimosifolia_tree.jpg',
    author: 'Sandhiya Rangasami', license: 'by', file: 'Jacaranda_mimosifolia_tree.jpg',
    height: '٧٫٦–١٢٫٢ م', crown: '١٣٫٧–١٨٫٣ م', sun: 'شمس كاملة',
    soil: 'تربة جيدة الصرف. الصرف السيئ يرتبط بمشكلات عفن الجذور.',
    water: 'تتحمل الجفاف بدرجة عالية، مع الري أثناء فترات الجفاف بحسب المرجع.',
    benefit: 'ظل خفيف مصفّى وإزهار بنفسجي وتاج منتشر.',
    risk: 'قد تكوّن جذورًا سطحية كبيرة. تحتاج تقليمًا هيكليًا وتنظيف الأزهار والأوراق المتساقطة.',
    local: 'يسجل ملحق طنطا Jacaranda acutifolia. يعامل Kew الاسمين كنوعين مستقلين، ويحتاج تطابق النوع المزروع تأكيدًا نباتيًا.',
    study: 'تستحق الدراسة بموقع مشمس جيد الصرف يتسع للتاج والجذور.',
    missing: 'تأكيد الهوية النباتية، وقياس التاج محليًا والصرف ومساحة الجذور.',
    source: 'ST317', pages: '٢–٤', evidence: 'الهوية المحلية تحتاج تأكيدًا',
  },
  {
    id: 'bauhinia', name: 'خف الجمل', scientific: 'Bauhinia variegata',
    photo: '7/77/Bauhinia_variegata_var._variegata_50D_7059.jpg',
    author: 'SAplants', license: 'by-sa', file: 'Bauhinia_variegata_var._variegata_50D_7059.jpg',
    height: '٦٫١–١٢٫٢ م', crown: '٧٫٦–١٠٫٧ م', sun: 'شمس كاملة إلى ظل جزئي',
    soil: 'تحتاج تربة جيدة الصرف، وتتحمل قلوية طفيفة بحسب المرجع.',
    water: 'تحمّل الجفاف عالٍ. برنامج ري التأسيس والكميات المحلية يحتاجان مرجعًا إضافيًا.',
    benefit: 'تاج متوسط الكثافة وإزهار مميز.',
    risk: 'خشب قابل للكسر وأفرع منخفضة وتساقط وبادرات كثيرة. تحتاج تربية وتقليمًا، مع تقييم الانتشار محليًا.',
    local: 'مسجلة بحديقة الأندلس بصيغة صنف أبيض. يحتاج الصنف المزروع تثبيتًا.',
    study: 'تدخل المقارنة للمواقع محدودة شريط الزراعة بعد حساب التاج ومسار المشاة.',
    missing: 'تثبيت الصنف، وأداؤه على الرصيف، وبرنامج الصيانة والري.',
    source: 'ST092', pages: '١–٣', evidence: 'سجل محلي لصنف أبيض',
  },
  {
    id: 'cassia', name: 'خيار شنبر', scientific: 'Cassia fistula',
    photo: 'f/f3/GOLDEN_SHOWER_TREE%28cassia_fistula%29.jpg',
    author: 'Gayathri8843', license: 'by-sa', file: 'GOLDEN_SHOWER_TREE(cassia_fistula).jpg',
    height: '٩٫١–١٢٫٢ م', crown: '٩٫١–١٢٫٢ م', sun: 'شمس كاملة',
    soil: 'تربة جيدة الصرف.',
    water: 'تحمّل الجفاف متوسط. كمية الري عند التأسيس وبعد الاستقرار تحتاج بيانات محلية.',
    benefit: 'تاج متوسط الكثافة وإزهار أصفر.',
    risk: 'قرون متساقطة وبذور سامة وحساسية للحرارة تحت التجمد. تحتاج الأفرع الصغيرة المتدلية إلى تشكيل.',
    local: 'يسجله Kew مُدخلًا إلى مصر. إثبات وجوده ونجاحه في طنطا يحتاج حصرًا إضافيًا.',
    study: 'يستحق الدراسة بموقع مشمس جيد الصرف يتسع لتاجه، مع تقييم وصول الأطفال للقرون.',
    missing: 'إثبات محلي، وأداء الشتاء، وبرنامج الري والتنظيف.',
    source: 'ST127', pages: '١–٣', evidence: 'وجود بمصر لدى Kew',
  },
];

export function SpeciesGuide() {
  return (
    <section id="species-guide" className="species-guide" aria-labelledby="guide-heading">
      <div className="intro">
        <h2 id="guide-heading">دليل أنواع الأشجار</h2>
        <p>٤ بطاقات بحثية أولية للمراجعة. اختيار النوع لموقع زراعة يحتاج مطابقة المساحة والتربة والمرافق.</p>
      </div>
      <p className="guide-note">أبعاد النمو من مراجع جامعة فلوريدا، وتتغير بالمناخ والتربة والتقليم. كميات الري باللتر ونسب ظل المشاة تحتاج استكمالًا محليًا.</p>
      <nav className="species-links" aria-label="اختار نوع شجرة">
        {species.map(tree => <a key={tree.id} href={`#species-${tree.id}`}>{tree.name}</a>)}
        <a href="#species-comparison">قارن الأنواع</a>
      </nav>
      <div className="species-grid">
        {species.map(tree => (
          <article key={tree.id} id={`species-${tree.id}`} className="species-card" aria-labelledby={`heading-${tree.id}`}>
            <h3 id={`heading-${tree.id}`}>{tree.name}</h3>
            <p className="scientific"><bdi lang="la">{tree.scientific}</bdi></p>
            <figure className="species-photo">
              <a href={`https://commons.wikimedia.org/wiki/File:${tree.file}`} target="_blank" rel="noreferrer" aria-label={`افتح صورة ${tree.name} ومصدرها`}>
                <img src={`https://upload.wikimedia.org/wikipedia/commons/thumb/${tree.photo}/960px-${tree.photo.split('/').at(-1)}`}
                  alt={`شجرة ${tree.name} من النوع ${tree.scientific}`}
                  width="960" height="640" loading="lazy" decoding="async" />
              </a>
              <figcaption>
                صورة مرجعية للنوع · <a href={`https://commons.wikimedia.org/wiki/File:${tree.file}`} target="_blank" rel="noreferrer"><bdi>{tree.author}</bdi></a>
                {' · '}<a href={`https://creativecommons.org/licenses/${tree.license}/4.0/`} target="_blank" rel="noreferrer"><bdi>{tree.license === 'by' ? 'CC BY 4.0' : 'CC BY-SA 4.0'}</bdi></a>
              </figcaption>
            </figure>
            <dl className="species-facts">
              <div><dt>الشمس</dt><dd>{tree.sun}</dd></div>
              <div><dt>الارتفاع عند النضج</dt><dd>{tree.height}</dd></div>
              <div><dt>عرض التاج</dt><dd>{tree.crown}</dd></div>
            </dl>
            <h4>الفائدة المتوقعة</h4><p>{tree.benefit}</p>
            <h4>التربة والصرف</h4><p>{tree.soil}</p>
            <h4>الري</h4><p>{tree.water}</p>
            <h4>المخاطر والصيانة</h4><p>{tree.risk}</p>
            <details>
              <summary>الدليل المحلي وشروط دراسة الموقع</summary>
              <h4>الدليل المحلي</h4><p>{tree.local}</p>
              <h4>أين ندرس زراعتها</h4><p>{tree.study}</p>
              <h4>بيانات تحتاج استكمالًا</h4><p>{tree.missing}</p>
            </details>
            <div className="species-sources">
              <a href={`https://ask.ifas.ufl.edu/publication/${tree.source}/pdf`} target="_blank" rel="noreferrer">مرجع UF/IFAS، مراجعة ٢٠١٨، ص {tree.pages} ↗</a>
              {tree.id !== 'cassia' && <a href={localSource} target="_blank" rel="noreferrer">ملحق حديقة الأندلس بجامعة طنطا ↗</a>}
              {tree.id === 'jacaranda' && <>
                <a href="https://powo.science.kew.org/taxon/130936-2" target="_blank" rel="noreferrer">Kew لنوع mimosifolia ↗</a>
                <a href="https://powo.science.kew.org/taxon/109767-1" target="_blank" rel="noreferrer">Kew لنوع acutifolia ↗</a>
              </>}
              {tree.id === 'cassia' && <a href="https://powo.science.kew.org/taxon/484507-1" target="_blank" rel="noreferrer">Kew ودليل الوجود بمصر ↗</a>}
            </div>
          </article>
        ))}
      </div>
      <h3 id="species-comparison">قارن الأنواع</h3>
      <div className="comparison-scroll" role="region" aria-label="جدول مقارنة أنواع الأشجار" tabIndex={0}>
        <table>
          <caption>مقارنة أولية من البطاقات ومصادرها</caption>
          <thead><tr><th scope="col">النوع</th><th scope="col">الشمس</th><th scope="col">عرض التاج</th><th scope="col">الدليل المحلي</th></tr></thead>
          <tbody>{species.map(tree => <tr key={tree.id}><th scope="row"><a href={`#species-${tree.id}`}>{tree.name}</a></th><td>{tree.sun}</td><td>{tree.crown}</td><td>{tree.evidence}</td></tr>)}</tbody>
        </table>
      </div>
    </section>
  );
}
