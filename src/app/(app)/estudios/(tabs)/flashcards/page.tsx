import Link from "next/link";
import { Suspense } from "react";
import { FormSheet } from "@/components/ui/form-sheet";
import { Chip, EmptyState, Row, Section, Skeleton } from "@/components/ui/primitives";
import { createFlashcard } from "@/features/estudios/actions";
import { CoverArt } from "@/components/ui/cover-art";
import { FlashcardFields } from "@/features/estudios/components/fields";
import { getDecks } from "@/features/estudios/queries";

export const metadata = { title: "Flashcards" };

export default function FlashcardsPage() {
  return (
    <Suspense fallback={<Skeleton lines={4} />}>
      <Decks />
    </Suspense>
  );
}

async function Decks() {
  const { subjects, decks } = await getDecks();
  if (!subjects.length) {
    return (
      <EmptyState icon="layers" title="Sin barajas">
        Cada asignatura tiene su baraja. Crea primero tus asignaturas.
      </EmptyState>
    );
  }

  return (
    <Section
      title="Barajas"
      aside={
        <FormSheet title="Nueva tarjeta" trigger={{ label: "Nueva tarjeta" }} action={createFlashcard} submitLabel="Crear">
          <FlashcardFields subjects={subjects} />
        </FormSheet>
      }
    >
      <div className="list-grid">
        {decks.map(({ subject, total, due }) => {
          const content = (
            <Row
              leading={<CoverArt item={subject} url={null} />}
              title={subject.name}
              subtitle={total ? `${total} tarjetas` : "Sin tarjetas todavía"}
              trailing={<Chip tone={due ? "acc" : "mut"}>{due ? `${due} para hoy` : "Al día"}</Chip>}
            />
          );
          return due ? (
            <Link key={subject.id} href={`/estudios/repasar/${subject.id}`} className="block">
              {content}
            </Link>
          ) : (
            <div key={subject.id}>{content}</div>
          );
        })}
      </div>
      <p className="mt-4 text-[13px] text-muted">
        Repetición espaciada con FSRS: cada tarjeta vuelve justo antes de que se te olvide.
      </p>
    </Section>
  );
}
