from faker import Faker
import random
import csv
import os

fake = Faker()

subjects = [
    "Math",
    "Physics",
    "History",
    "Biology",
    "Chemistry",
    "law",
    "Economy",
    "English",
    "Geography",
    "SEW",
    "German",
    "Insy",
    "ITP",
    "Religion",
    "MEDTPD",
    "MEDTMC",
    "MEDTFI",
    "MEDTSM",
    "MEDT3D",
]
days = ["MONDAY", "TUESDAY", "WEDNESDAY", "THURSDAY", "FRIDAY"]
roomTypes = ["CLASSROOM", "EDV", "CHEM", "PHY", "SPORT", "WORKSHOP"]
classNames = ["4CHITM", "4AHITM", "3CHITM", "3IHF", "1CHIF", "1CHITM"]
possibleHours = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]
teachers = []
classSubjects = []
rooms = []


def createRandomClasses(count):
    count = max(count, len(classNames))

    classesSelected = random.sample(classNames, k=count)

    for className in classesSelected:
        createRandomClassSubjects(10, className)


def createRandomRooms(count=20):
    for _ in range(count):
        roomNumber = random.randint(10, 500)
        roomName = fake.last_name().upper()
        nameShort = roomName[:3]

        numOfTypes = random.randint(1, 2)
        selectedTypes = ",".join(random.sample(roomTypes, k=numOfTypes))

        room = {
            "roomNumber": roomNumber,
            "name": roomName,
            "shortName": nameShort,
            "roomTypes": selectedTypes,
        }
        rooms.append(room)

        exportToCsv("rooms.csv", 
                    ["roomNumber",
                    "name",
                    "shortName",
                    "roomTypes"],
                    rooms
                    )


def createRandomTeachers(count=20):
    for _ in range(count):
        teacherName = fake.name()
        teacherInitials = teacherName.split()[0][0] + teacherName.split()[1][0]

        numOfSubjects = random.randint(1, 3)
        teacherSubjects = ",".join(random.sample(subjects, k=numOfSubjects))

        numOfNonWorkingDays = random.randint(1, 2)
        numOfNonWorkingHoursOnDay = random.randint(1, 8)
        nonWorkingDays = {}
        for _ in range(numOfNonWorkingDays):
            nonWorkingDays[random.choice(days)] = random.sample(
                possibleHours, k=numOfNonWorkingHoursOnDay
            )

        numOfNonPreferredDays = random.randint(1, 2)
        numOfNonPreferredHoursOnDay = random.randint(1, 8)
        nonPreferredDays = {}
        for _ in range(numOfNonPreferredDays):
            nonPreferredDays[random.choice(days)] = random.sample(
                possibleHours, k=numOfNonPreferredHoursOnDay
            )

        teacher = {
            "teacherName": teacherName,
            "initials": teacherInitials,
            "subjects": teacherSubjects,
            "nonWorking": formatDayDict(nonWorkingDays),
            "nonPreferred": formatDayDict(nonPreferredDays),
        }

        teachers.append(teacher)

        exportToCsv(
            "teachers.csv",
            [
                "teacherName",
                "initials",
                "subjects",
                "nonWorking",
                "nonPreferred",
            ],
            teachers,
        )


def createRandomClassSubjects(classesCount, className):
    roomChosen = random.choice(rooms)
    classRoom = str(roomChosen["roomNumber"]) + roomChosen["name"]
    rooms.remove(roomChosen)  # TODO maybe change in a duplicate list to delete

    teacherChosen = random.choice(teachers)
    teacher = teacherChosen["teacherName"]
    teachers.remove(teacherChosen)

    for _ in range(classesCount):
        subject = random.choice(subjects)
        weeklyHours = random.randint(1, 3)
        betterDoublePeriod = fake.boolean()
        requiredDoublePeriod = fake.boolean()

        classSubject = {
            "classSubjectName": subject,
            "teacherName": teacher,
            "weeklyHours": weeklyHours,
            "requiresDoublePeriod": requiredDoublePeriod,
            "betterDoublePeriod": betterDoublePeriod,
            "className": className,
            "classRoom": classRoom
        }

        classSubjects.append(classSubject)

    exportToCsv(
        "classSubjects.csv",
        [
            "classSubjectName",
            "teacherName",
            "weeklyHours",
            "requiresDoublePeriod",
            "betterDoublePeriod",
            "className",
            "classRoom",
        ],
        classSubjects,
    )


def formatDayDict(data_dict):
    day_strings = []
    for day, hours in data_dict.items():
        hours_str = ",".join(map(str, sorted(hours)))
        day_strings.append(f"{day}-{hours_str}")

    return ":".join(day_strings)


def exportToCsv(filename, fieldnames, data, folder="csvOutput"):
    if not os.path.exists(folder):
        os.makedirs(folder)

    filepath = os.path.join(folder, filename)

    with open(filepath, mode="w", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(f, fieldnames=fieldnames, delimiter=";")
        writer.writeheader()
        for row in data:
            writer.writerow(row)


if __name__ == "__main__":
    createRandomRooms(10)
    createRandomTeachers(20)
    createRandomClasses(5)
