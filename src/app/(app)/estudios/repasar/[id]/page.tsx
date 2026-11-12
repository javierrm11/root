import { Suspense } from "react";
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
  const { subject, cards } = await getDueCards(id);
  return (
    <>
      <PageHeader title="Repasar" eyebrow={subject.name} back={{ href: "/estudios/flashcards", label: "Flashcards" }} />
      <Review cards={cards} />
    </>
  );
}
