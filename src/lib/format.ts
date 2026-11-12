// Formatos numéricos en español.

const euros = new Intl.NumberFormat("es-ES", { style: "currency", currency: "EUR", maximumFractionDigits: 0 });
const decimal = new Intl.NumberFormat("es-ES", { maximumFractionDigits: 1 });

/** 1.250 € */
export const formatMoney = (amount: number) => euros.format(amount);

/** 24,5 €/h, o "—" si no hay horas. */
export const formatPerHour = (amount: number | null) => (amount === null ? "—" : `${decimal.format(amount)} €/h`);

/** 2,5 h */
export const formatHours = (hours: number) => `${decimal.format(hours)} h`;

/** Divide sin reventar con 0: null si no hay divisor. */
export const ratio = (a: number, b: number) => (b > 0 ? a / b : null);
