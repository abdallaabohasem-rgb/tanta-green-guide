import type { DemoCandidateLocation, InitiativeRoleId, InitiativeTaskStatus, StreetInitiativeState } from './streetInitiative';
import {
  computeInitiativeProgress,
  demoCandidateLocations,
  initiativeRoles,
  initiativeTasks,
  taskStatusLabels,
} from './streetInitiative';

export interface StreetInitiativeNotice {
  text: string;
  tone: 'status' | 'alert';
}

interface Props {
  state: StreetInitiativeState;
  previewCandidateId: string | null;
  notice: StreetInitiativeNotice | null;
  onTogglePreview: (candidate: DemoCandidateLocation) => void;
  onToggleRole: (roleId: InitiativeRoleId) => void;
  onUpdateTaskStatus: (taskId: string, status: InitiativeTaskStatus) => void;
  onResetDemo: () => void;
}

const format = new Intl.NumberFormat('ar-EG');
const taskStates: readonly InitiativeTaskStatus[] = ['todo', 'in-progress', 'done'];
const roleLabelMap = new Map(initiativeRoles.map(role => [role.id, role.label]));

export function StreetInitiativePanel({
  state,
  previewCandidateId,
  notice,
  onTogglePreview,
  onToggleRole,
  onUpdateTaskStatus,
  onResetDemo,
}: Props) {
  const progress = computeInitiativeProgress(state.taskStatuses);
  const claimedSet = new Set(state.claimedRoles);

  return (
    <section className="initiative-panel" aria-labelledby="initiative-heading">
      <div className="initiative-header">
        <h2 id="initiative-heading" tabIndex={-1}>شجّروا شارعكم مع بعض</h2>
        <div className="initiative-badges">
          <span className="status initiative-demo-badge">نموذج تجريبي افتراضي</span>
          <span className="status local-status">حفظ على المتصفح ده فقط</span>
        </div>
      </div>

      <p className="initiative-subtitle">
        <strong>شارع افتراضي تجريبي (عينة عرض — غير معتمد)</strong>
      </p>
      <p className="initiative-disclaimer">
        الشارع ده ونقاطه أمثلة تجريبية افتراضية ومش شارع تجربة معتمد ولا حاصل على موافقة تنفيذية. أي اختيار دور أو تحديث حالة مهام بيفضل محفوظ على المتصفح ده فقط، والتنسيق المشترك الفعلي بين السكان لسه مرحلة مستقبلية.
      </p>

      <div className="initiative-progress-box">
        <div className="initiative-progress-head">
          <h3>التقدّم المحلي للمهام</h3>
          <span>{format.format(progress.percent)}٪</span>
        </div>
        <progress
          max={100}
          value={progress.percent}
          aria-label="نسبة تقدم مهام مبادرة الشارع التجريبية"
        />
        <p className="initiative-progress-stats" aria-live="polite">
          مكتملة: {format.format(progress.done)} · قيد التنفيذ: {format.format(progress.inProgress)} · لسه ما بدأتش: {format.format(progress.todo)} (من أصل {format.format(progress.total)})
        </p>
      </div>

      <div className="initiative-block">
        <h3>نقاط مقترحة للمعاينة فقط (افتراضية)</h3>
        <p className="survey-help">
          المعاينة بتوجّه الخريطة للنقطة الافتراضية بعلامة مؤقتة من غير إنشاء مسودة زراعة.
        </p>
        <ul className="initiative-candidate-list">
          {demoCandidateLocations.map(candidate => {
            const isPreviewing = previewCandidateId === candidate.id;
            return (
              <li key={candidate.id} className="initiative-candidate-card">
                <div className="initiative-candidate-info">
                  <strong>{candidate.label}</strong>
                  <span>{candidate.note} · <bdi dir="ltr">{candidate.coordinates.map(v => v.toFixed(4)).join(', ')}</bdi></span>
                </div>
                <button
                  type="button"
                  aria-pressed={isPreviewing}
                  onClick={() => onTogglePreview(candidate)}
                >
                  {isPreviewing ? 'إخفاء المعاينة' : 'عاين على الخريطة'}
                </button>
              </li>
            );
          })}
        </ul>
      </div>

      <div className="initiative-block">
        <h3>أدوار المشاركة المحلية</h3>
        <p className="survey-help">
          اختار دورك أو اتنازل عنه محليًا على المتصفح ده؛ أدوار باقي السكان هتتزامن لما يتاح التنسيق المشترك مستقبلًا.
        </p>
        <ul className="initiative-role-list">
          {initiativeRoles.map(role => {
            const claimed = claimedSet.has(role.id);
            return (
              <li key={role.id} className="initiative-role-card">
                <div className="initiative-role-head">
                  <strong>{role.label}</strong>
                  <span className={'status ' + (claimed ? 'initiative-role-claimed' : 'initiative-role-open')}>
                    {claimed ? 'دورك على الجهاز ده' : 'متاح للتجربة المحلية'}
                  </span>
                </div>
                <p className="initiative-role-summary">{role.summary}</p>
                <button
                  type="button"
                  className="initiative-role-btn"
                  aria-pressed={claimed}
                  onClick={() => onToggleRole(role.id)}
                >
                  {claimed ? 'اتنازل عن الدور' : 'اختر الدور ده'}
                </button>
              </li>
            );
          })}
        </ul>
      </div>

      <div className="initiative-block">
        <h3>مهام الزراعة والرعاية والتوثيق</h3>
        <ul className="initiative-task-list">
          {initiativeTasks.map(task => {
            const status = state.taskStatuses[task.id] ?? task.defaultStatus;
            const roleClaimed = claimedSet.has(task.role);
            return (
              <li key={task.id} className="initiative-task-card">
                <div className="pending-tree-badges">
                  <span className="status">{roleLabelMap.get(task.role) ?? task.role}</span>
                  {roleClaimed && <span className="status initiative-role-claimed">ضمن دورك</span>}
                </div>
                <strong className="initiative-task-title">{task.title}</strong>
                <div className="initiative-status-group" role="group" aria-label={`حالة مهمة: ${task.title}`}>
                  {taskStates.map(option => (
                    <button
                      key={option}
                      type="button"
                      aria-pressed={status === option}
                      onClick={() => onUpdateTaskStatus(task.id, option)}
                    >
                      {taskStatusLabels[option]}
                    </button>
                  ))}
                </div>
              </li>
            );
          })}
        </ul>
      </div>

      <div className="initiative-footer-actions">
        <button type="button" onClick={onResetDemo}>رجّع النموذج التجريبي لوضعه الأصلي</button>
      </div>

      {notice && (
        <p className="add-tree-notice" role={notice.tone}>
          {notice.text}
        </p>
      )}
    </section>
  );
}
