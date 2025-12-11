import requests

data = [
    {"x": 0.5, "y": 0.7, "team": "home", "type": "Wrist", "player_id": 12, "games_id": 88}
]
resp = requests.post("http://localhost:8000/calculate_xg", json=data)
print("Response:", resp.text)