import type { Species } from './speciesData';

const attributes = [
  ['sun', 'الشمس'],
  ['height', 'الارتفاع عند النضج'],
  ['crown', 'عرض التاج'],
  ['water', 'الري'],
  ['soil', 'التربة والصرف'],
  ['benefit', 'الفائدة المتوقعة'],
  ['risk', 'المخاطر والصيانة'],
  ['evidence', 'الدليل المحلي'],
] as const;

export function SelectedSpeciesTable({ trees, onOpen }: { trees: Species[]; onOpen: (id: string) => void }) {
  return (
    <div className="comparison-scroll species-compare-matrix" role="region" aria-label="جدول الأنواع المختارة" tabIndex={0}>
      <table>
        <caption>مقارنة أولية من بطاقات الأنواع ومصادرها</caption>
        <thead>
          <tr>
            <th scope="col">الخاصية</th>
            {trees.map(tree => (
              <th scope="col" key={tree.id}><a href={`#species-${tree.id}`} onClick={() => onOpen(tree.id)}>{tree.name}</a></th>
            ))}
          </tr>
        </thead>
        <tbody>
          {attributes.map(([key, label]) => (
            <tr key={key}>
              <th scope="row">{label}</th>
              {trees.map(tree => <td key={tree.id}>{tree[key]}</td>)}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
