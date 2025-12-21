export function buildTaskContent(
  baseText: string,
  options: {
    dueDate?: number | undefined;
    priority?: number | undefined;
    assignedTo?: string | null | undefined;
    labels?: string[] | undefined;
  }
): string {
  const parts: string[] = [baseText.trim()];
  if (options.assignedTo && options.assignedTo.trim().length > 0) {
    parts.push(`@assign(${options.assignedTo.trim()})`);
  }
  if (options.dueDate) {
    const d = new Date(options.dueDate);
    const iso = isNaN(d.getTime()) ? '' : d.toISOString().slice(0, 10);
    if (iso) parts.push(`@due(${iso})`);
  }
  if (options.priority && options.priority > 0) {
    parts.push(`@p(${options.priority})`);
  }
  if (options.labels && options.labels.length > 0) {
    for (const label of options.labels) {
      if (label) parts.push(`#${label.replace(/\s+/g, '')}`);
    }
  }
  return parts.join(' ').replace(/\s+/g, ' ').trim();
}


