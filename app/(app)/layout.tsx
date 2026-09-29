import { redirect } from 'next/navigation';
import { getSession } from '@/lib/session';
import { AppShell } from '@/components/AppShell';
import { ReminderProvider } from '@/components/ReminderProvider';
import { OfflineProvider } from '@/components/OfflineProvider';
import { FeedbackProvider } from '@/components/FeedbackProvider';

export default async function AuthenticatedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getSession();
  if (!session || !session.userId) {
    redirect('/login');
  }

  return (
    // FeedbackProvider must WRAP AppShell, not sit inside it: AppShell renders
    // <AiChatPanel /> as a sibling of {children}, and that panel reads
    // useFeedback(). Wrapping the shell keeps every consumer inside the provider.
    <FeedbackProvider>
      <AppShell username={session.username}>
        <OfflineProvider>
          <ReminderProvider>{children}</ReminderProvider>
        </OfflineProvider>
      </AppShell>
    </FeedbackProvider>
  );
}
