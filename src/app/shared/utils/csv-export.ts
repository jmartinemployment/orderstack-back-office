/**
 * Export data as a CSV file download.
 *
 * @param filename - Name for the downloaded file (include .csv extension)
 * @param headers - Column header labels
 * @param rows - Array of row arrays (each row is string[])
 */
export function exportToCsv(
  filename: string,
  headers: string[],
  rows: string[][]
): void {
  const escapeCsvField = (field: string): string => {
    if (/[",\n\r]/.exec(field) !== null) {
      return `"${field.replaceAll('"', '""')}"`;
    }
    return field;
  };

  const lines = [
    headers.map(escapeCsvField).join(','),
    ...rows.map(row => row.map(escapeCsvField).join(',')),
  ];

  const csvContent = lines.join('\r\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);

  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  link.style.display = 'none';
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}
