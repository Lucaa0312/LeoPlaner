from typing import Required
from faker import Faker
import random

fake = Faker()

subjects = [
    "Math",
    "Physics",
    "History",
    "Biology",
    "Chemistry",
    "Art",
    "PE",
    "CS",
]
days = ["MONDAY", "TUESDAY", "WEDNESDAY", "THURSDAY", "FRIDAY"]
roomTypes = ["CLASSROOM", "EDV", "CHEM", "PHY", "SPORT", "WORKSHOP"]
classNames = ["4CHITM", "4AHITM", "3CHITM", "3IHF", "1CHIF", "1CHITM"]
possibleHours = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]
teachers = {}
classSubjects = {}


def createRandomClasses(count):
    count = max(count, len(classNames))

    classesSelected = random.sample(classNames, k=count)

    for className in classesSelected:
        createRandomClassSubjects(10, className)


def createRandomRooms(count=20):
    csvHeader = "room;number;name;prefix;suffix;types"

    for _ in range(count):
        roomNumber = random.randint(10, 500)
        roomName = fake.last_name().upper()
        nameShort = roomName[:3]

        numOfTypes = random.randint(1, 2)
        selectedTypes = ",".join(random.sample(roomTypes, k=numOfTypes))

        row = f"{roomNumber};{roomName};{nameShort};{selectedTypes}"


def createRandomTeachers(count=20):
    for i in range(count):
        teacherName = fake.name()
        teacherInitials = teacherName.split()[0][0] + teacherName.split()[1][0]

        numOfSubjects = random.randint(1, 3)
        teacherSubjects = []
        teacherSubjects.append(random.sample(subjects, k=numOfSubjects))

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
            "name": teacherName,
            "initials": teacherInitials,
            "subjects": teacherSubjects,
            "teacherNonWorking": nonWorkingDays,
            "teacherNonPreferred": nonPreferredDays,
        }

        teachers[i] = teacher


def createRandomClassSubjects(classesCount, className):
    csvHeader = "classsubject;subjectname;teachername;weeklyHours;requiresDoublePeriod;isBetterDoublePeriod;className"

    for i in range(classesCount):
        className = random.sample(classNames, k=1)
        subject = random.sample(subjects, k=1)
        weeklyHours = random.randint(1, 3)
        betterDoublePeriod = fake.boolean()
        requiredDoublePeriod = fake.boolean()

        classSubject = {
            "subject": subject,
            "weeklyHours": weeklyHours,
            "betterDoublePeriod": betterDoublePeriod,
            "requiresDoublePeriod": requiredDoublePeriod,
            "classname": className,
        }

        classSubjects[i] = classSubject


if __name__ == "__main__":
    createRandomTeachers(20)
    createRandomClasses(5)
    print(classSubjects)
