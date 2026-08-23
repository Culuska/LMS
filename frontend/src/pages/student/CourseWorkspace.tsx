import { useCallback, useEffect, useRef, useState } from 'react';
import { useParams } from 'react-router-dom';
import { api, ApiError, downloadResource, uploadFileResource } from '../../api/client';
import { useAuth } from '../../auth/useAuth';
import type {
  AssessmentItem,
  AttendanceSession,
  CourseContentItem,
  Resource,
  Submission,
} from '../../types/domain';
import { PageHeader } from '../../components/PageHeader';
import { EmptyState, Loading } from '../../components/StateViews';
import { ForumSection } from '../../components/ForumSection';
import { IconBook, IconCheckCircle, IconClipboard, IconFile, IconUpload, IconVideo } from '../../components/icons';

const ATTENDANCE_CHIP: Record<string, string> = {
  PRESENT: 'chip-ok',
  LATE: 'chip-warn',
  EXCUSED: 'chip-neutral',
  ABSENT: 'chip-danger',
};

function formatDueAt(dueAt: string | null): string {
  if (!dueAt) return 'No deadline set';
  return new Date(dueAt).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' });
}

/** One assignment: its own submitted-state, a text box, and a file-attach button — kept
 * as its own component (rather than inlined in the parent's map) since it manages its
 * own submission text and upload-in-progress state independently of its siblings. */
function AssignmentCard({ item }: { item: AssessmentItem }) {
  // A separate `loading` flag rather than using `submission === undefined` as the
  // "not loaded yet" sentinel: a NestJS handler returning `null` (no submission yet)
  // arrives over the wire as an empty response body, and this app's fetch wrapper
  // treats an empty body as `undefined` (deliberately, for endpoints with no return
  // value at all — see api/client.ts). That collision meant "hasn't loaded" and
  // "loaded, nothing there" were indistinguishable and the spinner never cleared.
  const [submission, setSubmission] = useState<Submission | null>(null);
  const [loading, setLoading] = useState(true);
  const [content, setContent] = useState('');
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const load = useCallback(() => {
    api
      .get<Submission | null>(`/assessment-items/${item.id}/submissions/mine`)
      .then((s) => {
        setSubmission(s ?? null);
        setContent(s?.content ?? '');
      })
      .catch((err) => setError(err instanceof ApiError ? err.message : 'Failed to load your submission'))
      .finally(() => setLoading(false));
  }, [item.id]);

  useEffect(() => {
    load();
  }, [load]);

  const submit = async () => {
    setSaving(true);
    setError(null);
    try {
      await api.post(`/assessment-items/${item.id}/submissions`, { content: content || undefined });
      load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to submit');
    } finally {
      setSaving(false);
    }
  };

  const uploadFile = async (file: File) => {
    setUploading(true);
    setError(null);
    try {
      await uploadFileResource<Resource>(`/assessment-items/${item.id}/submissions/mine/resources`, file);
      load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to upload file');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="card">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 'var(--space-3)' }}>
        <h3 style={{ fontFamily: 'var(--font-display)', fontSize: 'var(--text-md)' }}>{item.title}</h3>
        {!loading &&
          (submission ? (
            <span className={`chip ${submission.isLate ? 'chip-warn' : 'chip-ok'}`}>
              {submission.isLate ? 'submitted late' : 'submitted'}
            </span>
          ) : (
            <span className="chip chip-neutral">not submitted</span>
          ))}
      </div>
      <p style={{ color: 'var(--color-ink-faint)', fontSize: 'var(--text-sm)' }}>Due: {formatDueAt(item.dueAt)}</p>
      {error && <p className="error" role="alert">{error}</p>}

      {loading ? (
        <Loading label="Loading…" />
      ) : (
        <>
          <label>
            <span className="sr-only">Your answer for {item.title}</span>
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Type your answer here (optional if you're only attaching a file)"
              rows={3}
              style={{ width: '100%' }}
            />
          </label>

          {submission && submission.resources.length > 0 && (
            <ul style={{ listStyle: 'none', margin: 'var(--space-2) 0', padding: 0, display: 'grid', gap: 'var(--space-2)' }}>
              {submission.resources.map((r) => (
                <li key={r.id} style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
                  <IconFile style={{ width: '1rem', height: '1rem', flexShrink: 0 }} />
                  <button
                    type="button"
                    onClick={() => void downloadResource(r.id)}
                    style={{ background: 'none', border: 'none', padding: 0, color: 'var(--color-brand-strong)', cursor: 'pointer', font: 'inherit', textDecoration: 'underline' }}
                  >
                    {r.fileName}
                  </button>
                </li>
              ))}
            </ul>
          )}

          <div style={{ display: 'flex', gap: 'var(--space-2)', marginTop: 'var(--space-3)' }}>
            <input
              type="file"
              ref={fileInputRef}
              style={{ display: 'none' }}
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) void uploadFile(file);
                e.target.value = '';
              }}
            />
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              disabled={uploading}
              onClick={() => fileInputRef.current?.click()}
            >
              <IconUpload style={{ width: '1rem', height: '1rem', marginRight: '0.35rem' }} />
              {uploading ? 'Uploading…' : 'Attach file'}
            </button>
            <button type="button" className="btn btn-primary btn-sm" disabled={saving} onClick={() => void submit()}>
              {saving ? 'Saving…' : submission ? 'Update submission' : 'Submit'}
            </button>
          </div>

          {submission?.mark && (
            <p style={{ marginTop: 'var(--space-3)' }}>
              <span className="chip chip-ok">Graded: {submission.mark.score} / {item.maxMarks}</span>
            </p>
          )}
        </>
      )}
    </div>
  );
}

export function CourseWorkspace() {
  const { offeringId } = useParams<{ offeringId: string }>();
  const { user } = useAuth();
  const [content, setContent] = useState<CourseContentItem[] | null>(null);
  const [assignments, setAssignments] = useState<AssessmentItem[] | null>(null);
  const [sessions, setSessions] = useState<AttendanceSession[] | null>(null);
  const [attendancePercentage, setAttendancePercentage] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!offeringId) return;
    Promise.all([
      api.get<CourseContentItem[]>(`/course-offerings/${offeringId}/content`),
      api.get<AssessmentItem[]>(`/course-offerings/${offeringId}/assessment-items`),
      api.get<AttendanceSession[]>(`/course-offerings/${offeringId}/attendance-sessions`),
    ])
      .then(([contentData, itemsData, sessionData]) => {
        setContent(contentData);
        setAssignments(itemsData.filter((i) => i.type === 'ASSIGNMENT'));
        setSessions(sessionData);
      })
      .catch((err) => setError(err instanceof ApiError ? err.message : 'Failed to load course'));

    if (user?.studentId) {
      api
        .get<{ percentage: number }>(
          `/course-offerings/${offeringId}/attendance-sessions/percentage?studentId=${user.studentId}`,
        )
        .then((r) => setAttendancePercentage(r.percentage))
        .catch(() => setAttendancePercentage(null));
    }
  }, [offeringId, user?.studentId]);

  if (!offeringId) return <p className="error" role="alert">Missing offering id.</p>;

  const mySessions = (sessions ?? [])
    .map((s) => ({ ...s, mine: s.records.find((r) => r.studentId === user?.studentId) }))
    .filter((s) => s.mine);

  return (
    <div>
      <PageHeader
        title="Course Materials"
        subtitle="Notes, videos, files, and assignments for this course."
        crumbs={[{ label: 'Dashboard', to: '/dashboard' }, { label: 'My Courses', to: '/my-courses' }, { label: 'Course' }]}
      />
      {error && <p className="error" role="alert">{error}</p>}

      <h2 style={{ marginBottom: 'var(--space-3)' }}>Content</h2>
      {!content ? (
        <Loading label="Loading content…" />
      ) : content.length === 0 ? (
        <EmptyState icon={<IconBook />} title="No content yet" description="Your lecturer hasn't added any course materials yet." />
      ) : (
        <div style={{ display: 'grid', gap: 'var(--space-3)' }}>
          {content.map((item) => (
            <div key={item.id} className="card">
              <h3 style={{ fontFamily: 'var(--font-display)', fontSize: 'var(--text-md)' }}>{item.title}</h3>
              {item.body && <p style={{ color: 'var(--color-ink-soft)' }}>{item.body}</p>}
              {item.videoUrl && (
                <p style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                  <IconVideo style={{ width: '1rem', height: '1rem', flexShrink: 0 }} />
                  <a href={item.videoUrl} target="_blank" rel="noopener noreferrer">
                    {item.videoUrl}
                  </a>
                </p>
              )}
              {item.resources.length > 0 && (
                <ul style={{ listStyle: 'none', margin: 'var(--space-2) 0 0', padding: 0, display: 'grid', gap: 'var(--space-2)' }}>
                  {item.resources.map((r) => (
                    <li key={r.id} style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
                      <IconFile style={{ width: '1rem', height: '1rem', flexShrink: 0 }} />
                      <button
                        type="button"
                        onClick={() => void downloadResource(r.id)}
                        style={{ background: 'none', border: 'none', padding: 0, color: 'var(--color-brand-strong)', cursor: 'pointer', font: 'inherit', textDecoration: 'underline' }}
                      >
                        {r.fileName}
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          ))}
        </div>
      )}

      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', margin: 'var(--space-6) 0 var(--space-3)' }}>
        <h2>Attendance</h2>
        {attendancePercentage !== null && (
          <span className={`chip ${attendancePercentage >= 75 ? 'chip-ok' : 'chip-warn'}`}>
            <IconCheckCircle style={{ width: '0.9rem', height: '0.9rem', marginRight: '0.3rem' }} />
            {attendancePercentage}% present
          </span>
        )}
      </div>
      {!sessions ? (
        <Loading label="Loading attendance…" />
      ) : mySessions.length === 0 ? (
        <EmptyState icon={<IconClipboard />} title="No attendance recorded yet" description="Your lecturer hasn't taken attendance yet." />
      ) : (
        <div className="table-scroll">
          <table className="data-table">
            <thead>
              <tr>
                <th>Date</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {mySessions.map((s) => (
                <tr key={s.id}>
                  <td>{new Date(s.sessionDate).toLocaleDateString(undefined, { dateStyle: 'medium' })}</td>
                  <td>
                    <span className={`chip ${ATTENDANCE_CHIP[s.mine!.status]}`}>{s.mine!.status.toLowerCase()}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <h2 style={{ margin: 'var(--space-6) 0 var(--space-3)' }}>Assignments</h2>
      {!assignments ? (
        <Loading label="Loading assignments…" />
      ) : assignments.length === 0 ? (
        <EmptyState icon={<IconClipboard />} title="No assignments yet" description="Your lecturer hasn't posted any assignments yet." />
      ) : (
        <div style={{ display: 'grid', gap: 'var(--space-3)' }}>
          {assignments.map((item) => (
            <AssignmentCard key={item.id} item={item} />
          ))}
        </div>
      )}

      <h2 style={{ margin: 'var(--space-6) 0 var(--space-3)' }}>Discussion Forum</h2>
      <ForumSection offeringId={offeringId} />
    </div>
  );
}
