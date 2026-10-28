import sqlite3

def get_connection(): #to connect to database everytime we need
    connection = sqlite3.connect("application.db")
    return connection

connection = get_connection()
cursor = connection.cursor() #over cursor we send SQL commands to database

cursor.execute("""
CREATE TABLE IF NOT EXISTS applications (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    company TEXT NOT NULL,
    position TEXT NOT NULL,
    status TEXT NOT NULL,
    notes TEXT
)
""")

connection.commit()
connection.close()