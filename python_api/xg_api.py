from fastapi import FastAPI
from pydantic import BaseModel
from typing import List
import numpy as np
import pandas as pd
import sqlite3
from scipy.optimize import minimize
import psycopg2
from sqlalchemy import create_engine

app = FastAPI()

# Maalin koordinaatit
x_goal_home, y_goal_home = 0.0875, 0.5  # Oman joukkueen maali
x_goal_away, y_goal_away = 0.9215, 0.5  # Vastustajan maali

# Yhteysasetukset (saat Neonin hallintapaneelista)
conn = psycopg2.connect(
    dbname="neondb",
    user="neondb_owner",
    password="npg_5iPWXw4TAuIf",
    host="ep-still-band-ahzressd-pooler.c-3.us-east-1.aws.neon.tech",
    port=5432,
    sslmode="require"
)

engine = create_engine("postgresql://neondb_owner:npg_5iPWXw4TAuIf@ep-still-band-ahzressd-pooler.c-3.us-east-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require")
# Mallin sovitus käynnistyksessä
def fit_model():
    # Lue laukaukset DataFrameen
    data = pd.read_sql_query("SELECT x, y, team, type FROM shotmap", engine)
    # Muunna team: 1 -> 'home', 0 -> 'away'
    data['team_str'] = data['team'].apply(lambda t: 'home' if t == 1 else 'away')
    # Muunna type: 'M' -> 1, muut -> 0
    data['goal'] = data['type'].apply(lambda t: 1 if t == 'M' else 0)
    # Laske etäisyys ja kulma oikeaan maaliin
    def calc_distance_angle(row):
        if row['team_str'] == 'home':
            x_goal, y_goal = x_goal_away, y_goal_away
        else:
            x_goal, y_goal = x_goal_home, y_goal_home
        distance = np.sqrt((row['x'] - x_goal)**2 + (row['y'] - y_goal)**2)
        angle_rad = np.arctan2(row['y'] - y_goal, row['x'] - x_goal)
        angle_deg = np.degrees(angle_rad)
        return pd.Series({'distance': distance, 'angle_deg': angle_deg})
    data[['distance', 'angle_deg']] = data.apply(calc_distance_angle, axis=1)
    X = data[['distance', 'angle_deg']].values
    y = data['goal'].values

    def neg_log_likelihood(beta, X, y):
        linear_pred = beta[0] + beta[1] * X[:, 0] + beta[2] * np.cos(np.radians(X[:, 1]))
        p = 1 / (1 + np.exp(-linear_pred))
        p = np.clip(p, 1e-10, 1 - 1e-10)
        ll = y * np.log(p) + (1 - y) * np.log(1 - p)
        return -np.sum(ll)
    result = minimize(neg_log_likelihood, x0=[0, 0, 0], args=(X, y), method='BFGS')
    return result.x

BETA = fit_model()  # Sovitetut kertoimet

class Shot(BaseModel):
    x: float
    y: float
    team: str  # 'home' tai 'away'

# xG-laskenta

def calculate_xg(x, y, team):
    if team == 'home':
        x_goal, y_goal = x_goal_away, y_goal_away  # Oma joukkue hyökkää vastustajan maaliin
    else:
        x_goal, y_goal = x_goal_home, y_goal_home  # Vastustaja hyökkää omaan maaliin
    distance = np.sqrt((x - x_goal)**2 + (y - y_goal)**2)
    angle_rad = np.arctan2(y - y_goal, x - x_goal)
    cos_theta = np.cos(angle_rad)
    linear_pred = BETA[0] + BETA[1] * distance + BETA[2] * cos_theta
    p = 1 / (1 + np.exp(-linear_pred))
    return float(p)

@app.post("/calculate_xg")
def calculate_xg_api(shots: List[Shot]):
    xg_list = [calculate_xg(shot.x, shot.y, shot.team) for shot in shots]
    xg_total = sum(xg_list)
    return {"xg_total": xg_total, "xg_per_shot": xg_list}
