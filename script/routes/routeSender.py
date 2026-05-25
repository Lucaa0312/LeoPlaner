import requests

BASE_URL = "http://localhost:8080"

ROUTES = {
    "1": ("GET", "/api/run/algorithmAllClasses"),
    "2": ("GET", "/api/run/generateRandomSchedule"),
    "3": ("GET", "/api/run/testCsvOriginal"),
    "4": ("GET", "/api/run/testCsvNew"),
    "5": ("GET", "/api/randomize"),
    "6": ("GET", "/api/loadBestSchedule"),
    "7": ("GET", "/api/isAlgorithmRunning"),
    "8": ("GET", "/api/isAlgorithmRunningAtLeastOnce"),
    "9": ("GET", "/api/isAutomaticMode"),
    "10": ("GET", "/api/toggleAutomaticMode"),
    "11": ("GET", "/api/stopAlgorithmAllClasses"),
    "12": ("GET", "/api/setGeoCooling"),
    "13": ("GET", "/api/setLogCooling"),
}


def print_menu():
    for key, (method, route) in ROUTES.items():
        print(f"{key}. [{method}] {route}")

    print("0. Exit")


while True:
    print_menu()

    choice = input("Select option: ").strip()

    if choice == "0":
        break

    if choice not in ROUTES:
        continue

    method, route = ROUTES[choice]

    url = BASE_URL + route

    try:
        print(url)

        response = requests.request(method, url)

        print("Status Code:", response.status_code)
        print(response.text)

    except Exception as e:
        print("\nRequest failed:")
        print(e)
