import sqlite3
from pathlib import Path

DB_PATH = Path(__file__).parent / "album.db"

def get_connection():
    return sqlite3.connect(DB_PATH)

def initialize_database():
    connection = get_connection()
    cursor = connection.cursor()

    cursor.execute("""
        CREATE TABLE IF NOT EXISTS albums (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            title TEXT NOT NULL,
            description TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    """)

    cursor.execute("""
        CREATE TABLE IF NOT EXISTS photos (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            album_id INTEGER,
            filename TEXT NOT NULL,
            file_path TEXT NOT NULL,
            caption TEXT,
            uploaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            exif_timestamp TEXT,
            latitude REAL,
            longitude REAL,
            FOREIGN KEY (album_id) REFERENCES albums(id)
        )
    """)

    connection.commit()
    connection.close()