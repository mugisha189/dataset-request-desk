const dateFormat = new Intl.DateTimeFormat('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
const dateTimeFormat = new Intl.DateTimeFormat('en-GB', {
  day: '2-digit',
  month: 'short',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
})

export function formatDate(value: string | Date): string {
  return dateFormat.format(new Date(value))
}

export function formatDateTime(value: string | Date): string {
  return dateTimeFormat.format(new Date(value))
}

export function formatNumber(value: number): string {
  return new Intl.NumberFormat('en-GB').format(value)
}

export function formatHours(hours: number): string {
  if (hours < 1) return `${Math.round(hours * 60)}m`
  if (hours < 48) return `${hours.toFixed(1)}h`
  return `${(hours / 24).toFixed(1)}d`
}

/** "pick cup" -> "Pick cup". Task names are stored lowercase/normalized; this is display-only. */
export function titleCase(value: string): string {
  return value.length ? value[0].toUpperCase() + value.slice(1) : value
}
