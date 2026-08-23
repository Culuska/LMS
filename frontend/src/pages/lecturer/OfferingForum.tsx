import { useParams } from 'react-router-dom';
import { PageHeader } from '../../components/PageHeader';
import { ForumSection } from '../../components/ForumSection';

export function OfferingForum() {
  const { offeringId } = useParams<{ offeringId: string }>();
  if (!offeringId) return <p className="error" role="alert">Missing offering id.</p>;

  return (
    <div>
      <PageHeader
        title="Discussion Forum"
        subtitle="Answer student questions and start conversations about this course."
        crumbs={[
          { label: 'Dashboard', to: '/dashboard' },
          { label: 'My Offerings', to: '/my-offerings' },
          { label: 'Discussion Forum' },
        ]}
      />
      <ForumSection offeringId={offeringId} />
    </div>
  );
}
