import { cacheLife } from "next/cache";
import Link from "next/link";
import { Icon } from "@/components/ui/icon";
import { EXAM_KINDS } from "@/lib/constants";
import { countdown } from "@/lib/dates";
import { getNextExam } from "../queries";

/** Aviso del próximo examen en la cabecera de Estudios. */
export async function NextExamChip() {
  "use cache: private";
  cacheLife("pantalla");
  const exam = await getNextExam();
  if (!exam) return null;
  return (
    <Link href="/estudios/examenes" className="chip tone-acc h-9 text-[13px]">
      <Icon name="clock" size={15} />
      {EXAM_KINDS[exam.kind].label} · {countdown(exam.days)}
    </Link>
  );
}
