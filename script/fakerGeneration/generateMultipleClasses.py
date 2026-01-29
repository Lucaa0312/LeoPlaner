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


def createRandomRooms(count=20):
    csvHeader = "room;number;name;prefix;suffix;types"

    for _ in range(count):
        roomNumber = random.randint(10, 500)
        roomName = fake.last_name().upper()
        nameShort = roomName[:3]

        numOfTypes = random.randint(1, 2)
        selectedTypes = ",".join(random.sample(roomTypes, k=numOfTypes))

        # Join with semicolons
        row = f"{roomNumber};{roomName};{nameShort};{selectedTypes}"
        print(row)


if __name__ == "__main__":
    createRandomRooms(5)
