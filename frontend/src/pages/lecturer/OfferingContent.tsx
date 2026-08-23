import { useCallback, useEffect, useRef, useState } from 'react';
import { useParams } from 'react-router-dom';
import { api, ApiError, downloadResource, uploadFileResource } from '../../api/client';
import type { CourseContentItem, Resource } from '../../types/domain';
import { PageHeader } from '../../components/PageHeader';
import { EmptyState, Loading } from '../../components/StateViews';
import { IconBook, IconFile, IconUpload, IconVideo } from '../../components/icons';

const EMPTY_FORM = { title: '', body: '', videoUrl: '' };

/** Lecturer-side course materials: text notes, an optional video link, and file
 * attachments (PDFs, slides, docs) — see backend/src/storage for the upload flow. Flat
 * list rather than the nested tree the backend supports (CourseContent.parentId): a
 * single lecturer's course materials don't need folders-within-folders to stay usable. */
export function OfferingContent() {
  const { offeringId } = useParams<{ offeringId: string }>();
  const [items, setItems] = useState<CourseContentItem[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [creating, setCreating] = useState(false);
  const [uploadingFor, setUploadingFor] = useState<string | null>(null);
  const fileInputRefs = useRef<Record<string, HTMLInputElement | null>>({});

  const load = useCallback(() => {
    if (!offeringId) return;
    api
      .get<CourseContentItem[]>(`/course-offerings/${offeringId}/content`)
      .then(setItems)
      .catch((err) => setError(err instanceof ApiError ? err.message : 'Failed to load course content'));
  }, [offeringId]);

  useEffect(() => {
    load();
  }, [load]);

  if (!offeringId) return <p className="error" role="alert">Missing offering id.</p>;

  const createItem = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setCreating(true);
    try {
      await api.post(`/course-offerings/${offeringId}/content`, {
        title: form.title,
        body: form.body || undefined,
        videoUrl: form.videoUrl || undefined,
      });
      setForm(EMPTY_FORM);
      load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to add content');
    } finally {
      setCreating(false);
    }
  };

  const removeItem = async (contentId: string) => {
    if (!confirm('Delete this content item and its attached files?')) return;
    try {
      await api.delete(`/course-offerings/${offeringId}/content/${contentId}`);
      load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to delete content');
    }
  };

  const removeResource = async (contentId: string, resourceId: string) => {
    try {
      await api.delete(`/course-offerings/${offeringId}/content/${contentId}/resources/${resourceId}`);
      load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to delete file');
    }
  };

  const uploadFile = async (contentId: string, file: File) => {
    setUploadingFor(contentId);
    setError(null);
    try {
      await uploadFileResource<Resource>(
        `/course-offerings/${offeringId}/content/${contentId}/resources`,
        file,
      );
      load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to upload file');
    } finally {
      setUploadingFor(null);
    }
  };

  return (
    <div>
      <PageHeader
        title="Course Content"
        subtitle="Notes, video links, and files students can access once they're on this course."
        crumbs={[
          { label: 'Dashboard', to: '/dashboard' },
          { label: 'My Offerings', to: '/my-offerings' },
          { label: 'Content' },
        ]}
      />
      {error && <p className="error" role="alert">{error}</p>}

      <form className="inline-form" onSubmit={createItem} aria-label="Add course content">
        <label>
          Title
          <input
            placeholder="e.g. Week 1: Introduction"
            value={form.title}
            onChange={(e) => setForm({ ...form, title: e.target.value })}
            required
          />
        </label>
        <label>
          Notes
          <input
            placeholder="Optional notes or description"
            value={form.body}
            onChange={(e) => setForm({ ...form, body: e.target.value })}
          />
        </label>
        <label>
          Video URL
          <input
            type="url"
            placeholder="Optional — YouTube, etc."
            value={form.videoUrl}
            onChange={(e) => setForm({ ...form, videoUrl: e.target.value })}
          />
        </label>
        <button type="submit" className="btn btn-primary" disabled={creating}>
          {creating ? 'Adding…' : 'Add content'}
        </button>
      </form>

      <div style={{ marginTop: 'var(--space-6)' }}>
        {!items ? (
          <Loading label="Loading content…" />
        ) : items.length === 0 ? (
          <EmptyState
            icon={<IconBook />}
            title="No content yet"
            description="Add your first item above — notes, a video link, or a file."
          />
        ) : (
          <div style={{ display: 'grid', gap: 'var(--space-3)' }}>
            {items.map((item) => (
              <div key={item.id} className="card">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 'var(--space-3)' }}>
                  <h3 style={{ fontFamily: 'var(--font-display)', fontSize: 'var(--text-md)' }}>{item.title}</h3>
                  <button className="btn btn-danger btn-sm" onClick={() => void removeItem(item.id)}>
                    Delete
                  </button>
                </div>
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
                          style={{
                            background: 'none',
                            border: 'none',
                            padding: 0,
                            color: 'var(--color-brand-strong)',
                            cursor: 'pointer',
                            font: 'inherit',
                            textDecoration: 'underline',
                          }}
                        >
                          {r.fileName}
                        </button>
                        <button
                          type="button"
                          className="btn btn-secondary btn-sm"
                          onClick={() => void removeResource(item.id, r.id)}
                        >
                          Remove
                        </button>
                      </li>
                    ))}
                  </ul>
                )}

                <div style={{ marginTop: 'var(--space-3)' }}>
                  <input
                    type="file"
                    ref={(el) => {
                      fileInputRefs.current[item.id] = el;
                    }}
                    style={{ display: 'none' }}
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) void uploadFile(item.id, file);
                      e.target.value = '';
                    }}
                  />
                  <button
                    type="button"
                    className="btn btn-secondary btn-sm"
                    disabled={uploadingFor === item.id}
                    onClick={() => fileInputRefs.current[item.id]?.click()}
                  >
                    <IconUpload style={{ width: '1rem', height: '1rem', marginRight: '0.35rem' }} />
                    {uploadingFor === item.id ? 'Uploading…' : 'Attach file'}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
