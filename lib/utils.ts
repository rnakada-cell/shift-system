export function toLocalDateString(date: Date): string {
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

export function getDateRange(start: string, end: string): string[] {
    const dates = [];
    const [sy, sm, sd] = start.split('-').map(Number);
    const [ey, em, ed] = end.split('-').map(Number);
    let current = new Date(sy, sm - 1, sd);
    const last = new Date(ey, em - 1, ed);
    while (current <= last) {
        dates.push(toLocalDateString(current));
        current.setDate(current.getDate() + 1);
    }
    return dates;
}

export function formatDate(dateStr: string) {
    const d = new Date(dateStr);
    const days = ['日', '月', '火', '水', '木', '金', '土'];
    return `${d.getMonth() + 1}/${d.getDate()}(${days[d.getDay()]})`;
}
