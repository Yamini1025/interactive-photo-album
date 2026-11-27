import sqlite3
from pathlib import Path


DB_PATH = Path(__file__).parent / "album.db"


def get_connection():
    connection = sqlite3.connect(DB_PATH)
    connection.execute("PRAGMA foreign_keys = ON")
    return connection


def initialize_database():
    connection = get_connection()
    cursor = connection.cursor()

    cursor.execute(
        """
        CREATE TABLE IF NOT EXISTS albums (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            title TEXT NOT NULL,
            description TEXT DEFAULT '',
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
        """
    )

    cursor.execute(
        """
        CREATE TABLE IF NOT EXISTS photos (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            album_id INTEGER,
            filename TEXT NOT NULL,
            file_path TEXT NOT NULL,
            caption TEXT DEFAULT '',
            uploaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            exif_timestamp TEXT,
            latitude REAL,
            longitude REAL,
            FOREIGN KEY (album_id) REFERENCES albums(id) ON DELETE CASCADE
        )
        """
    )

    # Keep photos from the earlier version visible by putting them in one album.
    cursor.execute("SELECT COUNT(*) FROM albums")
    album_count = cursor.fetchone()[0]
    cursor.execute("SELECT COUNT(*) FROM photos WHERE album_id IS NULL")
    unassigned_photo_count = cursor.fetchone()[0]

    if album_count == 0 and unassigned_photo_count > 0:
        cursor.execute(
            "INSERT INTO albums (title, description) VALUES (?, ?)",
            ("My Memories", "Photos from your first collection"),
        )
        default_album_id = cursor.lastrowid
        cursor.execute(
            "UPDATE photos SET album_id = ? WHERE album_id IS NULL",
            (default_album_id,),
        )

    connection.commit()
    connection.close()
