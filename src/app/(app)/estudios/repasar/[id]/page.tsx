import { Suspense } from "react";
import { cacheLife } from "next/cache";
import { PageHeader } from "@/components/layout/page-header";
import { Skeleton } from "@/components/ui/primitives";
import { Review } from "@/features/estudios/components/review";
import { getDueCards } from "@/features/estudios/queries";

export const metadata = { title: "Repasar" };

type Params = Promise<{ id: string }>;

export default function RepasarPage({ params }: { params: Params }) {
  return (
    <Suspense fallback={<Skeleton lines={4} />}>
      <Session params={params} />
    </Suspense>
  );
}

async function Session({ params }: { params: Params }) {
  const { id } = await params;
  return <SessionView id={id} />;
}

async function SessionView({ id }: { id: string }) {
  "use cache: private";
  cacheLife("pantalla");
  const { subject, cards } = await getDueCards(id);
  return (
    <>
      <PageHeader title="Repasar" eyebrow={subject.name} back={{ href: "/estudios/flashcards", label: "Flashcards" }} />
      <Review cards={cards} />
    </>
  );
}
