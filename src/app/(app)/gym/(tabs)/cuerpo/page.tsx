import { Suspense } from "react";
import { ActionButton } from "@/components/ui/action-button";
import { FormSheet } from "@/components/ui/form-sheet";
import { Icon } from "@/components/ui/icon";
import { Columns, Row, RowList, Section, Skeleton, Stat, StatRow } from "@/components/ui/primitives";
import { PHOTO_ANGLES } from "@/lib/constants";
import { formatShortDay, todayISO } from "@/lib/dates";
import { deleteRow } from "@/features/common/actions";
import { addPhoto, deletePhoto, logBody } from "@/features/gym/actions";
import { BodyFields, PhotoFields } from "@/features/gym/components/fields";
import { formatKg } from "@/features/gym/logic";
import { getBody } from "@/features/gym/queries";

export const metadata = { title: "Cuerpo" };

const signed = (n: number | null, unit: string) =>
  n === null ? "—" : `${n > 0 ? "+" : ""}${n.toLocaleString("es-ES", { maximumFractionDigits: 1 })} ${unit}`;

export default function CuerpoPage() {
  return (
    <Suspense fallback={<Skeleton lines={5} />}>
      <Body />
    </Suspense>
  );
}

async function Body() {
  const { userId, weights, weight, weightChange, measures, photos } = await getBody();
  const today = todayISO();

  return (
    <>
      <StatRow>
        <Stat value={weight ? formatKg(weight) : "—"} label="Peso actual" accent />
        <Stat value={signed(weightChange, "kg")} label="Desde el primer registro" />
        <Stat value={weights.length} label="Registros" />
      </StatRow>

      <Columns>
      <div>
      <Section
        title="Peso y medidas"
        aside={
          <FormSheet title="Registrar" trigger={{ label: "Registrar" }} action={logBody}>
            <BodyFields today={today} />
          </FormSheet>
        }
      >
        <RowList>
          <Row title="Pecho" trailing={<span className="font-mono text-sm">{measures.chest.value ? `${measures.chest.value} cm` : "—"}</span>} subtitle={signed(measures.chest.change, "cm")} />
          <Row title="Cintura" trailing={<span className="font-mono text-sm">{measures.waist.value ? `${measures.waist.value} cm` : "—"}</span>} subtitle={signed(measures.waist.change, "cm")} />
          <Row title="Brazo" trailing={<span className="font-mono text-sm">{measures.arm.value ? `${measures.arm.value} cm` : "—"}</span>} subtitle={signed(measures.arm.change, "cm")} />
        </RowList>
        {weights.length > 0 && (
          <>
            <h3 className="section-title mt-5 mb-1">Últimos pesos</h3>
            <RowList>
              {weights.slice(0, 6).map((m) => (
                <Row
                  key={m.id}
                  title={formatShortDay(m.day)}
                  trailing={
                    <span className="flex items-center gap-1">
                      <span className="font-mono text-sm font-semibold">{formatKg(Number(m.weight_kg))}</span>
                      <ActionButton action={deleteRow.bind(null, "body_metrics", m.id)} label="Borrar registro" className="grid size-8 place-items-center text-muted">
                        <Icon name="x" size={15} />
                      </ActionButton>
                    </span>
                  }
                />
              ))}
            </RowList>
          </>
        )}
      </Section>

      </div>
      <div>
      <Section title="Fotos de progreso" aside={<span className="text-[13px] text-muted">Privadas</span>}>
        {photos.length > 0 && (
          <div className="mb-3 grid grid-cols-3 gap-2">
            {photos.map((p) => (
              <figure key={p.id} className="relative m-0 overflow-hidden rounded-xl bg-surface-2">
                {/* eslint-disable-next-line @next/next/no-img-element -- URL firmada temporal de Supabase */}
                {p.url && <img src={p.url} alt={`${PHOTO_ANGLES[p.angle].label}, ${formatShortDay(p.day)}`} className="aspect-[3/4] w-full object-cover" />}
                <figcaption className="absolute inset-x-0 bottom-0 flex items-center justify-between bg-black/55 px-2 py-1 text-[11px] font-semibold text-white">
                  {PHOTO_ANGLES[p.angle].label} · {formatShortDay(p.day)}
                  <ActionButton action={deletePhoto.bind(null, p.id)} confirm="¿Borrar esta foto?" label="Borrar foto" className="text-white">
                    <Icon name="x" size={13} />
                  </ActionButton>
                </figcaption>
              </figure>
            ))}
          </div>
        )}
        <FormSheet
          title="Subir foto"
          trigger={{ label: "Subir foto", icon: "upload", variant: "drop" }}
          action={addPhoto}
          upload={{ userId, folder: "gym", accept: "image/*", required: true, label: "Foto" }}
          submitLabel="Subir"
        >
          <PhotoFields today={today} />
        </FormSheet>
      </Section>
      </div>
      </Columns>
    </>
  );
}
