// The school week as shown in the timetable and in the availability grid.
// schoolHour is the number the backend uses (1 = 1. EH).

export type SchoolDay = "MONDAY" | "TUESDAY" | "WEDNESDAY" | "THURSDAY" | "FRIDAY";

export type Day = {
    key: SchoolDay;
    name: string;
    short: string;
};

export type Period = {
    schoolHour: number;
    label: string;
    start: string;
    end: string;
};

export const DAYS: Day[] = [
    { key: "MONDAY", name: "Montag", short: "Mo" },
    { key: "TUESDAY", name: "Dienstag", short: "Di" },
    { key: "WEDNESDAY", name: "Mittwoch", short: "Mi" },
    { key: "THURSDAY", name: "Donnerstag", short: "Do" },
    { key: "FRIDAY", name: "Freitag", short: "Fr" },
];

export const PERIODS: Period[] = [
    { schoolHour: 1, label: "1. EH", start: "08:00", end: "08:50" },
    { schoolHour: 2, label: "2. EH", start: "08:55", end: "09:45" },
    { schoolHour: 3, label: "3. EH", start: "10:00", end: "10:50" },
    { schoolHour: 4, label: "4. EH", start: "10:55", end: "11:45" },
    { schoolHour: 5, label: "5. EH", start: "11:50", end: "12:40" },
    { schoolHour: 6, label: "6. EH", start: "12:45", end: "13:35" },
    { schoolHour: 7, label: "7. EH", start: "13:40", end: "14:30" },
    { schoolHour: 8, label: "8. EH", start: "14:35", end: "15:25" },
    { schoolHour: 9, label: "9. EH", start: "15:30", end: "16:20" },
    { schoolHour: 10, label: "10. EH", start: "16:25", end: "17:15" },
];
