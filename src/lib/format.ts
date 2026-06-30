export function formatAmount(amount: number): string {
  return Math.abs(amount).toLocaleString('it-IT', { minimumFractionDigits: 2 });
}

export function formatTime(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'Adesso';
  if (mins < 60) return `${mins} min fa`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours} ore fa`;
  return `${Math.floor(hours / 24)} giorni fa`;
}

export function formatDateTime(dateStr: string): string {
  const d = new Date(dateStr);
  return (
    d.toLocaleDateString('it-IT', { day: '2-digit', month: 'short' }) +
    ', ' +
    d.toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' })
  );
}
