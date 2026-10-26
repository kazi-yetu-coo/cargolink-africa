// The server derives review ownership; this helper only narrows displayed records.
type Filterable = {
  filter: (column: string, operator: string, value: unknown) => unknown;
};
export function recordScope<T extends Filterable>(
  query: T,
  review: boolean,
  userId?: string,
): T {
  return query.filter(
    "review_owner_id",
    review && userId ? "eq" : "is",
    review && userId ? userId : null,
  ) as T;
}
