import { useState, useEffect } from 'react';
import { SelectedSpeciesTable } from './SelectedSpeciesTable';

import { localSource, species, sunOptions } from './speciesData';
import './species-guide.css';

const numberFormat = new Intl.NumberFormat('ar-EG');

export function normalizeText(text: string): string {
  return text
    .toLowerCase()
    .replace(/[\u064B-\u065F\u0670\u0640]/g, '')
    .replace(/[أإآٱ]/g, 'ا')
    .replace(/ة/g, 'ه')
    .replace(/ى/g, 'ي')
    .trim();
}

export function matchesSearch(tree: (typeof species)[number], query: string): boolean {
  const normQuery = normalizeText(query);
  if (!normQuery) return true;

  const normName = normalizeText(tree.name);
  const normSci = normalizeText(tree.scientific);

  if (normName.includes(normQuery) || normSci.includes(normQuery)) {
    return true;
  }

  const tokens = normQuery.split(/\s+/).filter(Boolean);
  return tokens.every(token => {
    if (normName.includes(token) || normSci.includes(token)) return true;

    if (token.startsWith('ال') && token.length > 3) {
      const stripped = token.slice(2);
      if (normName.includes(stripped) || normSci.includes(stripped)) return true;
    }

    if (token.length > 3) {
      const stem = token.replace(/[اه]$/, '');
      if (normName.includes(stem)) return true;
    }

    return false;
  });
}

export function SpeciesGuide() {
  const [query, setQuery] = useState('');
  const [sunFilter, setSunFilter] = useState('الكل');
  const [comparisonIds, setComparisonIds] = useState<string[]>([]);
  const selectedSpecies = species.filter(tree => comparisonIds.includes(tree.id));

  function setCompared(id: string, checked: boolean) {
    setComparisonIds(ids => checked ? [...new Set([...ids, id])] : ids.filter(treeId => treeId !== id));
  }

  const filteredSpecies = species.filter(tree => {
    const matchesQ = matchesSearch(tree, query);
    const matchesS = sunFilter === 'الكل' || tree.sun === sunFilter;
    return matchesQ && matchesS;
  });

  const isFiltered = query.trim() !== '' || sunFilter !== 'الكل';

  function resetFilters() {
    setQuery('');
    setSunFilter('الكل');
    document.getElementById('species-search-input')?.focus();
  }

  function revealTree(id: string) {
    const tree = species.find(item => item.id === id);
    if (!tree) return;
    setQuery(current => matchesSearch(tree, current) ? current : '');
    setSunFilter(current => current === 'الكل' || tree.sun === current ? current : 'الكل');
    requestAnimationFrame(() => document.getElementById(`species-${id}`)?.scrollIntoView({ block: 'start' }));
  }

  useEffect(() => {
    function handleHashNavigation() {
      const hash = window.location.hash;
      if (!hash.startsWith('#species-')) return;
      const targetId = hash.slice('#species-'.length);
      if (targetId === 'guide' || targetId === 'comparison') {
        requestAnimationFrame(() => document.getElementById(hash.slice(1))?.scrollIntoView({ block: 'start' }));
        return;
      }

      revealTree(targetId);
    }

    handleHashNavigation();
    window.addEventListener('hashchange', handleHashNavigation);
    return () => window.removeEventListener('hashchange', handleHashNavigation);
  }, []);

  return (
    <section id="species-guide" className="species-guide" aria-labelledby="guide-heading">


      <div className="intro">
        <h2 id="guide-heading">دليل أنواع الأشجار</h2>
        <p>{numberFormat.format(species.length)} بطاقات بحثية أولية للمراجعة. اختيار النوع لموقع زراعة يحتاج مطابقة المساحة والتربة والمرافق.</p>
      </div>
      <p className="guide-note">أبعاد النمو من مراجع جامعة فلوريدا، وتتغير بالمناخ والتربة والتقليم. كميات الري باللتر ونسب ظل المشاة تحتاج استكمالًا محليًا.</p>

      <div className="species-controls" role="search" aria-label="بحث وتصفية الأشجار">
        <div className="species-controls-row">
          <div className="species-search-field">
            <label htmlFor="species-search-input">البحث بالاسم العربي أو العلمي</label>
            <div className="species-input-wrapper">
              <input
                id="species-search-input"
                type="search"
                dir="auto"
                value={query}
                onChange={e => setQuery(e.target.value)}
                placeholder="ابحث بالاسم العربي أو العلمي (مثال: بونسيانا، خف الجمل، Delonix)..."
                aria-label="البحث بالاسم العربي أو العلمي"
                autoComplete="off"
                spellCheck={false}
              />
              {query && (
                <button
                  type="button"
                  className="species-clear-btn"
                  onClick={() => { setQuery(''); document.getElementById('species-search-input')?.focus(); }}
                  aria-label="مسح نص البحث"
                  title="مسح البحث"
                >
                  ×
                </button>
              )}
            </div>
          </div>

          <div className="species-sun-field">
            <label htmlFor="species-sun-select">احتياج الشمس الموثق</label>
            <div className="species-sun-controls">
              <select
                id="species-sun-select"
                aria-label="تصفية حسب احتياج الشمس الموثق"
                value={sunFilter}
                onChange={e => setSunFilter(e.target.value)}
                className="species-sun-select"
              >
                {sunOptions.map(option => (
                  <option key={option} value={option}>{option}</option>
                ))}
              </select>
              <div className="chips" role="group" aria-label="أزرار تصفية الشمس الموثقة">
                {sunOptions.map(option => (
                  <button
                    key={option}
                    type="button"
                    aria-pressed={sunFilter === option}
                    onClick={() => setSunFilter(option)}
                  >
                    {option}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {isFiltered && (
            <div className="species-reset-field">
              <button
                type="button"
                className="species-reset-btn"
                onClick={resetFilters}
                aria-label="إعادة ضبط البحث والتصفية"
              >
                إعادة ضبط التصفية
              </button>
            </div>
          )}
        </div>

        <div className="species-filter-summary" aria-live="polite">
          <span>
            {filteredSpecies.length === species.length
              ? `عرض جميع الأنواع (${numberFormat.format(species.length)})`
              : `يظهر ${numberFormat.format(filteredSpecies.length)} من أصل ${numberFormat.format(species.length)} أنواع موثقة`}
          </span>
          {isFiltered && (
            <button
              type="button"
              className="species-reset-link"
              onClick={resetFilters}
            >
              إلغاء التصفية وإظهار الكل
            </button>
          )}
        </div>
      </div>

      <section className="species-compare-summary" aria-labelledby="species-selection">
        <h3 id="species-selection" tabIndex={-1}>اختيارات المقارنة</h3>
        <p role="status">
          {selectedSpecies.length
            ? `عدد الأنواع المختارة: ${numberFormat.format(selectedSpecies.length)}`
            : 'علّم على «أضف للمقارنة» في بطاقات الأنواع اللي عايز تقارنها.'}
        </p>
        {selectedSpecies.length > 0 && (
          <>
            <ul className="species-compare-selected" aria-label="الأنواع المختارة للمقارنة">
              {selectedSpecies.map(tree => (
                <li key={tree.id}>
                  <button type="button" aria-label={`إزالة ${tree.name} من المقارنة`} onClick={() => {
                    document.getElementById('species-selection')?.focus({ preventScroll: true });
                    setCompared(tree.id, false);
                  }}>
                    {tree.name} <span aria-hidden="true">×</span>
                  </button>
                </li>
              ))}
            </ul>
            <a className="species-compare-jump" href="#species-comparison">افتح المقارنة</a>
            <button type="button" onClick={() => {
              document.getElementById('species-selection')?.focus({ preventScroll: true });
              setComparisonIds([]);
            }}>
              امسح الاختيارات
            </button>
          </>
        )}
      </section>

      <nav className="species-links" aria-label="اختار نوع شجرة">
        {filteredSpecies.map(tree => <a key={tree.id} href={`#species-${tree.id}`}>{tree.name}</a>)}
        {!selectedSpecies.length && <a href="#species-comparison">قارن الأنواع</a>}
      </nav>

      <div className="species-grid">
        {filteredSpecies.length > 0 ? (
          filteredSpecies.map(tree => (
            <article key={tree.id} id={`species-${tree.id}`} className="species-card" aria-labelledby={`heading-${tree.id}`}>
              <h3 id={`heading-${tree.id}`}>{tree.name}</h3>
              <p className="scientific"><bdi lang="la">{tree.scientific}</bdi></p>
              <label className="species-compare-toggle">
                <input type="checkbox" checked={comparisonIds.includes(tree.id)}
                  aria-label={`أضف ${tree.name} للمقارنة`}
                  onChange={event => setCompared(tree.id, event.currentTarget.checked)} />
                أضف للمقارنة
              </label>
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
          ))
        ) : (
          <div className="species-no-results" role="status" aria-live="polite">
            <h3>لا توجد نتائج مطابقة</h3>
            <p>لم يتم العثور على أي شجرة تطابق بحثك أو تصفية الشمس المحددة.</p>
            <button type="button" className="species-reset-btn" onClick={resetFilters}>
              إعادة ضبط البحث والتصفية
            </button>
          </div>
        )}
      </div>

      <h3 id="species-comparison">{selectedSpecies.length ? 'مقارنة الأنواع المختارة' : 'قارن الأنواع'}</h3>
      {selectedSpecies.length > 0 ? (
        <SelectedSpeciesTable trees={selectedSpecies} onOpen={revealTree} />
      ) : (
      <div className="comparison-scroll" role="region" aria-label="جدول مقارنة أنواع الأشجار" tabIndex={0}>
        <table>
          <caption>مقارنة أولية من البطاقات ومصادرها</caption>
          <thead><tr><th scope="col">النوع</th><th scope="col">الشمس</th><th scope="col">عرض التاج</th><th scope="col">الدليل المحلي</th></tr></thead>
          <tbody>
            {filteredSpecies.length > 0 ? (
              filteredSpecies.map(tree => (
                <tr key={tree.id}>
                  <th scope="row"><a href={`#species-${tree.id}`}>{tree.name}</a></th>
                  <td>{tree.sun}</td>
                  <td>{tree.crown}</td>
                  <td>{tree.evidence}</td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={4} className="species-table-empty">
                  لا توجد أنواع مطابقة لمعايير البحث والتصفية.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      )}
    </section>
  );
}
