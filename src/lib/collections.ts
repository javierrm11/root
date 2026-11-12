// Utilidades de listas compartidas por las consultas.

export function groupBy<T, K>(items: T[], key: (item: T) => K) {
  const map = new Map<K, T[]>();
  items.forEach((item) => {
    const k = key(item);
    map.set(k, [...(map.get(k) ?? []), item]);
  });
  return map;
}

/** Suma un campo numérico (Postgres numeric puede llegar como string). */
export const sum = <T>(items: T[], value: (item: T) => number | string | null) =>
  items.reduce((total, item) => total + Number(value(item) ?? 0), 0);
