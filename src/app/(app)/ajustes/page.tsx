import { PageHeader } from "@/components/layout/page-header";
import { ThemePicker } from "@/components/layout/theme-picker";
import { Button } from "@/components/ui/button";
import { Section } from "@/components/ui/primitives";
import { signOut } from "@/app/login/actions";

export const metadata = { title: "Ajustes" };

export default function AjustesPage() {
  return (
    <>
      <PageHeader title="Ajustes" back={{ href: "/", label: "Hoy" }} />
      <ThemePicker />
      <Section title="Sesión">
        <form action={signOut}>
          <Button type="submit" variant="ghost" icon="logout" wide>
            Cerrar sesión
          </Button>
        </form>
      </Section>
    </>
  );
}
