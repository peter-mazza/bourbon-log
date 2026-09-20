export function createImportQueue(entries) {
  let index = 0;
  return {
    current: () => (index < entries.length ? entries[index] : null),
    remaining: () => entries.length - index,
    advance: () => { index += 1; },
  };
}
