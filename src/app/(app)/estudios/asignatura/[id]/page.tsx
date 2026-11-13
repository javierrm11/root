import Link from "next/link";
import { Suspense } from "react";
import { ActionButton } from "@/components/ui/action-button";
import { FormSheet } from "@/components/ui/form-sheet";
import { Icon } from "@/components/ui/icon";
import { InlineAdd } from "@/components/ui/inline-add";
import { Columns, Section, Skeleton, Stat, StatRow } from "@/components/ui/primitives";
import { EXAM_KINDS } from "@/lib/constants";
import { countdown } from "@/lib/dates";
import { addTopic, deleteSubject, saveSubject } from "@/features/estudios/actions";
import { CoverArt } from "@/components/ui/cover-art";
import { AddExamSheet, ExamRow } from "@/features/estudios/components/exams";
import { SubjectFields } from "@/features/estudios/components/fields";
import { FileRow, TopicItem, UploadFileSheet } from "@/features/estudios/components/topic-item";
import { getSubjectDetail } from "@/features/estudios/queries";
import { getSettings } from "@/features/ajustes/queries";
import { aiConfigured } from "@/lib/ai";

type Params = Promise<{ id: string }>;

export default function SubjectPage({ params }: { params: Params }) {
  return (
    <>
      <Link href="/estudios" className="-ml-1 mb-2 inline-flex h-11 items-center gap-0.5 text-[15px] font-semibold text-acc">
        <Icon name="chevron-left" size={22} />
        Asignaturas
      </Link>
      <Suspense fallback={<Skeleton lines={6} />}>
        <Subject params={params} />
      </Suspense>
    </>
  );
}

async function Subject({ params }: { params: Params }) {
  const { id } = await params;
  const [{ userId, subject, coverUrl, generalFiles, topics, pct, fileCount, boletines, exams, nextExam }, settings] = await Promise.all([
    getSubjectDetail(id),
    getSettings(),
  ]);
  const ai = aiConfigured() ? settings.ai : null;

  // El primer tema con prioridad se abre solo: es lo que toca estudiar.
  const firstPriority = topics.findIndex((t) => t.mastery <= 1 && t.files.length > 0);
  const subjectRef = [{ id: subject.id, name: subject.name }];

  return (
    <>
      <CoverArt item={subject} url={coverUrl} variant="banner" badge={`${subject.course_year}º · ${subject.semester}º cuatri`} />

      <div className="mt-4 flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h1 className="text-2xl leading-tight font-bold tracking-[-0.02em]">{subject.name}</h1>
          <p className="mt-1 font-mono text-xs text-muted">
            {[subject.code, `${topics.length} temas`, `${fileCount} archivos`].filter(Boolean).join(" · ")}
          </p>
        </div>
        <FormSheet
          title="Editar asignatura"
          trigger={{ label: "Editar asignatura", icon: "pencil", variant: "icon" }}
          action={saveSubject.bind(null, subject.id)}
          upload={{ userId, folder: "covers", accept: "image/*", label: "Cambiar foto de portada (opcional)" }}
        >
          <SubjectFields subject={subject} />
        </FormSheet>
      </div>
      {subject.description && <p className="mt-3 text-sm text-muted">{subject.description}</p>}

      <div className="mt-5">
        <StatRow>
          <Stat
            accent
            value={nextExam ? countdown(nextExam.days) : "—"}
            label={nextExam ? EXAM_KINDS[nextExam.kind].label : "Sin examen"}
          />
          <Stat value={`${pct} %`} label="Dominio" />
          <Stat value={`${boletines.done}/${boletines.total}`} label="Boletines" />
        </StatRow>
      </div>

      <Columns>
      <div>
      <Section title="General" aside={<span className="text-[13px] text-muted">Guía docente, calendario…</span>}>
        <div className="flex flex-col gap-2">
          {generalFiles.map((file) => (
            <FileRow key={file.id} file={file} />
          ))}
          <UploadFileSheet subjectId={subject.id} topicId={null} userId={userId} />
        </div>
      </Section>

      <Section title="Temas">
        <div className="-mt-1 border-b border-line">
          {topics.map((topic, index) => (
            <TopicItem
              key={topic.id}
              topic={topic}
              index={index}
              subjectId={subject.id}
              userId={userId}
              defaultOpen={index === firstPriority}
              ai={ai}
            />
          ))}
        </div>
        <div className="mt-3">
          <InlineAdd action={addTopic.bind(null, subject.id)} placeholder="Nuevo tema…" />
        </div>
      </Section>

      </div>
      <div>
      <Section title="Exámenes" aside={<AddExamSheet subjects={subjectRef} subjectId={subject.id} />}>
        {exams.length ? (
          <div className="divide-y divide-line">
            {exams.map((exam) => (
              <ExamRow
                key={exam.id}
                exam={exam}
                days={exam.days}
                title={exam.title ?? subject.name}
                subjects={subjectRef}
                fixedSubject
              />
            ))}
          </div>
        ) : (
          <p className="text-sm text-muted">Añade la fecha del examen para ver la cuenta atrás y cuándo empezar.</p>
        )}
      </Section>
      </div>
      </Columns>

      <div className="mt-6 flex justify-center">
        <ActionButton
          action={deleteSubject.bind(null, subject.id)}
          confirm={`¿Borrar «${subject.name}» con todos sus temas, archivos y exámenes?`}
          className="min-h-11 text-[13px] font-semibold text-muted"
        >
          Borrar asignatura
        </ActionButton>
      </div>
    </>
  );
}
