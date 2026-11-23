import { ActionButton } from "@/components/ui/action-button";
import { CheckRow } from "@/components/ui/check-row";
import { ChoicePills, Field, Input } from "@/components/ui/field";
import { FormSheet } from "@/components/ui/form-sheet";
import { Icon } from "@/components/ui/icon";
import { InlineAdd } from "@/components/ui/inline-add";
import { Chip } from "@/components/ui/primitives";
import { cn } from "@/lib/cn";
import { Markdown } from "@/components/ui/markdown";
import { FILE_KINDS, FILE_STATUS, toOptions, type AiFeature } from "@/lib/constants";
import { setFlag } from "@/features/common/actions";
import { addContent, addStudyFile, cycleFileStatus, deleteStudyFile, deleteTopic, rereadStudyFile, setMastery } from "../actions";
import { generateTopicFlashcards, summarizeTopic } from "../ai";
import { MAX_MASTERY, isReadable, topicStatus } from "../logic";
import type { StudyFileMeta, TopicDetail } from "../queries";
import { AiButton } from "./ai-button";
import { ExerciseTypes } from "./exercise-types";

const ACCEPT_FILES = "application/pdf,image/*,.doc,.docx,.odt,.zip";

function formatSize(bytes: number | null) {
  if (!bytes) return "";
  return bytes > 1_048_576 ? `${(bytes / 1_048_576).toFixed(1)} MB` : `${Math.max(1, Math.round(bytes / 1024))} KB`;
}

const SubHeading = ({ children }: { children: string }) => <h3 className="section-title mt-3">{children}</h3>;

/** Fila de archivo: abre el PDF, cambia el estado del boletín, lo vuelve a leer para Claude y lo borra. */
export function FileRow({ file }: { file: StudyFileMeta & { url: string | null } }) {
  const kind = FILE_KINDS[file.kind];
  const readable = isReadable(file.mime_type);
  return (
    <div className="flex items-center gap-3 rounded-xl border border-line px-2.5 py-2">
      <span className={cn("tinted grid h-10 w-[34px] shrink-0 place-items-center rounded-md font-mono text-[10px] font-bold", `tone-${kind.tone}`)}>
        {kind.short}
      </span>
      <a href={file.url ?? undefined} target="_blank" rel="noreferrer" className="min-w-0 flex-1">
        <span className="block truncate text-sm font-semibold">{file.name}</span>
        <span className="block text-[13px] text-muted">
          {kind.label}
          {file.size_bytes ? ` · ${formatSize(file.size_bytes)}` : ""}
          {readable && (file.content_source ? " · Claude puede leerlo" : " · sin leer")}
        </span>
      </a>
      {readable && (
        <ActionButton
          action={rereadStudyFile.bind(null, file.id)}
          label={file.content_source ? "Volver a leer para Claude" : "Leer para Claude"}
          className="grid size-9 shrink-0 place-items-center text-muted"
        >
          <Icon name="repeat" size={15} />
        </ActionButton>
      )}
      {file.status && (
        <ActionButton action={cycleFileStatus.bind(null, file.id, file.status)} label="Cambiar estado del boletín">
          <Chip tone={FILE_STATUS[file.status].tone}>{FILE_STATUS[file.status].label}</Chip>
        </ActionButton>
      )}
      <ActionButton
        action={deleteStudyFile.bind(null, file.id)}
        confirm={`¿Borrar «${file.name}»?`}
        label="Borrar archivo"
        className="grid size-9 shrink-0 place-items-center text-muted"
      >
        <Icon name="trash" size={16} />
      </ActionButton>
    </div>
  );
}

/** Formulario de subida de archivos, reutilizado en "General" y en cada tema. */
export function UploadFileSheet({ subjectId, topicId, userId }: { subjectId: string; topicId: string | null; userId: string }) {
  return (
    <FormSheet
      title={topicId ? "Subir al tema" : "Subir a General"}
      trigger={{ label: topicId ? "Subir PDF o boletín" : "Subir archivo", icon: "upload", variant: "drop" }}
      action={addStudyFile.bind(null, subjectId, topicId)}
      upload={{ userId, folder: `subjects/${subjectId}`, accept: ACCEPT_FILES, required: true }}
      submitLabel="Subir"
    >
      {topicId && <ChoicePills label="Tipo" name="kind" options={toOptions(FILE_KINDS, ["teoria", "boletin", "otro"])} defaultValue="teoria" />}
      <Field label="Nombre (opcional)">
        <Input name="name" placeholder="Si lo dejas vacío, se usa el del archivo" />
      </Field>
    </FormSheet>
  );
}

/** Puntos 1–5 de dominio: tocar uno lo fija; tocar el actual baja un nivel. */
function MasteryPicker({ topicId, value }: { topicId: string; value: number }) {
  return (
    <div className="flex items-center gap-3">
      <div className="flex gap-1.5" role="group" aria-label={`Dominio ${value} de ${MAX_MASTERY}`}>
        {Array.from({ length: MAX_MASTERY }, (_, i) => {
          const level = i + 1;
          return (
            <ActionButton
              key={level}
              action={setMastery.bind(null, topicId, value === level ? level - 1 : level)}
              label={`Dominio ${level}`}
              pressed={level <= value}
              className="grid size-9 place-items-center"
            >
              <span className={cn("size-4 rounded-full", level <= value ? "bg-accent" : "bg-surface-2")} />
            </ActionButton>
          );
        })}
      </div>
      <span className="text-[13px] text-muted">
        {value}/{MAX_MASTERY}
      </span>
    </div>
  );
}

/** Tema desplegable (como una sección de Moodle): dominio, archivos y contenidos. */
export function TopicItem({
  topic,
  index,
  subjectId,
  subjectName,
  userId,
  defaultOpen,
  ai,
}: {
  topic: TopicDetail;
  index: number;
  subjectId: string;
  subjectName: string;
  userId: string;
  defaultOpen?: boolean;
  /** Funciones de IA activas (null si no hay GEMINI_API_KEY). */
  ai: Record<AiFeature, boolean> | null;
}) {
  const status = topicStatus(topic.mastery, topic.files.length > 0);
  const done = topic.contents.filter((c) => c.done).length;
  const subtitle = [
    `${topic.files.length} ${topic.files.length === 1 ? "archivo" : "archivos"}`,
    topic.contents.length ? `${done}/${topic.contents.length} contenidos` : null,
  ]
    .filter(Boolean)
    .join(" · ");

  return (
    <details open={defaultOpen} className="group border-t border-line">
      <summary className="flex min-h-16 items-center gap-3 py-2">
        <span className="grid size-[38px] shrink-0 place-items-center rounded-xl bg-surface-2 font-mono text-sm font-semibold group-open:bg-accent group-open:text-ink">
          {index + 1}
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-sm font-semibold">{topic.title}</span>
          <span className="block text-[13px] text-muted">{subtitle}</span>
        </span>
        <Chip tone={status.tone}>{status.label}</Chip>
        <Icon name="chevron-right" size={18} className="shrink-0 text-muted transition-transform group-open:rotate-90" />
      </summary>

      <div className="flex flex-col gap-2 pb-5">
        <SubHeading>Dominio</SubHeading>
        <MasteryPicker topicId={topic.id} value={topic.mastery} />

        <SubHeading>Archivos</SubHeading>
        {topic.files.map((file) => (
          <FileRow key={file.id} file={file} />
        ))}
        {!topic.files.length && <p className="text-[13px] text-muted">Todavía no has subido nada a este tema.</p>}
        <UploadFileSheet subjectId={subjectId} topicId={topic.id} userId={userId} />

        {ai && (ai.resumen || ai.flashcards || topic.summary) && (
          <>
            <SubHeading>Con IA</SubHeading>
            {topic.summary && <Markdown className="rounded-xl bg-surface-2 p-3.5 text-sm">{topic.summary}</Markdown>}
            <div className="flex flex-wrap gap-2">
              {ai.resumen && <AiButton action={summarizeTopic.bind(null, topic.id)}>{topic.summary ? "Rehacer resumen" : "Resumir tema"}</AiButton>}
              {ai.flashcards && (
                <AiButton action={generateTopicFlashcards.bind(null, topic.id)} icon="layers">
                  Crear flashcards
                </AiButton>
              )}
            </div>
          </>
        )}

        <SubHeading>Tipos de ejercicio</SubHeading>
        <ExerciseTypes topic={topic} subjectName={subjectName} gemini={Boolean(ai?.practica)} />

        <SubHeading>Contenidos a estudiar</SubHeading>
        <div>
          {topic.contents.map((c) => (
            <CheckRow key={c.id} square done={c.done} label={c.title} action={setFlag.bind(null, "topic_contents", c.id, !c.done)} />
          ))}
        </div>
        <InlineAdd action={addContent.bind(null, topic.id)} placeholder="Añadir contenido…" />

        <ActionButton
          action={deleteTopic.bind(null, topic.id)}
          confirm={`¿Borrar el tema «${topic.title}» con sus archivos y contenidos?`}
          className="mt-2 self-end text-[13px] font-semibold text-muted"
        >
          Eliminar tema
        </ActionButton>
      </div>
    </details>
  );
}
