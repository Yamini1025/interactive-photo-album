from pathlib import Path
from typing import Optional
from uuid import uuid4
import sqlite3

from database import initialize_database, get_connection
from fastapi import FastAPI, UploadFile, File, HTTPException, Form
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel


app = FastAPI()
initialize_database()

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


UPLOAD_DIR = Path("uploads")
UPLOAD_DIR.mkdir(exist_ok=True)

app.mount(
    "/uploads",
    StaticFiles(directory=UPLOAD_DIR),
    name="uploads",
)


class AlbumCreate(BaseModel):
    title: str
    description: str = ""


def album_exists(album_id: int) -> bool:
    connection = get_connection()
    connection.row_factory = sqlite3.Row
    cursor = connection.cursor()
    cursor.execute("SELECT 1 FROM albums WHERE id = ?", (album_id,))
    exists = cursor.fetchone() is not None
    connection.close()
    return exists


def photo_url(filename: str) -> str:
    return f"http://127.0.0.1:8000/uploads/{filename}"


@app.get("/")
def home():
    return {"message": "Backend is running!"}


@app.get("/albums")
def get_albums():
    connection = get_connection()
    connection.row_factory = sqlite3.Row
    cursor = connection.cursor()

    cursor.execute(
        """
        SELECT
            albums.id,
            albums.title,
            albums.description,
            albums.created_at,
            COUNT(photos.id) AS photo_count,
            (
                SELECT p.filename
                FROM photos p
                WHERE p.album_id = albums.id
                ORDER BY p.id
                LIMIT 1
            ) AS cover_filename
        FROM albums
        LEFT JOIN photos ON photos.album_id = albums.id
        GROUP BY albums.id
        ORDER BY albums.created_at DESC, albums.id DESC
        """
    )

    albums = []
    for row in cursor.fetchall():
        album = dict(row)
        album["cover_url"] = (
            photo_url(album["cover_filename"])
            if album["cover_filename"]
            else None
        )
        albums.append(album)

    connection.close()
    return albums


@app.post("/albums")
def create_album(album: AlbumCreate):
    title = album.title.strip()

    if not title:
        raise HTTPException(status_code=400, detail="Album title is required")

    connection = get_connection()
    connection.row_factory = sqlite3.Row
    cursor = connection.cursor()
    cursor.execute(
        "INSERT INTO albums (title, description) VALUES (?, ?)",
        (title, album.description.strip()),
    )
    album_id = cursor.lastrowid
    connection.commit()

    cursor.execute("SELECT * FROM albums WHERE id = ?", (album_id,))
    created_album = dict(cursor.fetchone())
    connection.close()

    created_album["photo_count"] = 0
    created_album["cover_filename"] = None
    created_album["cover_url"] = None
    return created_album


@app.get("/albums/{album_id}/photos")
def get_album_photos(album_id: int):
    if not album_exists(album_id):
        raise HTTPException(status_code=404, detail="Album not found")

    connection = get_connection()
    connection.row_factory = sqlite3.Row
    cursor = connection.cursor()
    cursor.execute(
        "SELECT * FROM photos WHERE album_id = ? ORDER BY id",
        (album_id,),
    )

    photos = []
    for row in cursor.fetchall():
        photo = dict(row)
        photo["url"] = photo_url(photo["filename"])
        photos.append(photo)

    connection.close()
    return photos


async def save_photo(album_id: int, file: UploadFile, caption: str):
    if not file.content_type or not file.content_type.startswith("image/"):
        raise HTTPException(
            status_code=400,
            detail="Only image files are allowed",
        )

    file_extension = Path(file.filename or "").suffix
    new_filename = f"{uuid4()}{file_extension}"
    file_location = UPLOAD_DIR / new_filename
    file_contents = await file.read()

    with open(file_location, "wb") as image_file:
        image_file.write(file_contents)

    connection = get_connection()
    cursor = connection.cursor()
    cursor.execute(
        """
        INSERT INTO photos (album_id, filename, file_path, caption)
        VALUES (?, ?, ?, ?)
        """,
        (album_id, new_filename, str(file_location), caption),
    )
    connection.commit()
    photo_id = cursor.lastrowid
    connection.close()

    return {
        "id": photo_id,
        "filename": file.filename,
        "caption": caption,
        "url": photo_url(new_filename),
    }


@app.post("/albums/{album_id}/photos")
async def upload_album_photo(
    album_id: int,
    file: UploadFile = File(...),
    caption: str = Form(""),
):
    if not album_exists(album_id):
        raise HTTPException(status_code=404, detail="Album not found")

    return await save_photo(album_id, file, caption)


# Kept for compatibility with the earlier version of the frontend.
@app.post("/photos")
async def upload_photo(
    file: UploadFile = File(...),
    caption: str = Form(""),
    album_id: Optional[int] = Form(None),
):
    if album_id is None:
        raise HTTPException(
            status_code=400,
            detail="Choose an album before uploading a photo",
        )

    if not album_exists(album_id):
        raise HTTPException(status_code=404, detail="Album not found")

    return await save_photo(album_id, file, caption)


# Kept for compatibility with the earlier version of the frontend.
@app.get("/photos")
def get_photos():
    connection = get_connection()
    connection.row_factory = sqlite3.Row
    cursor = connection.cursor()
    cursor.execute("SELECT * FROM photos ORDER BY id")
    photos = [dict(row) for row in cursor.fetchall()]
    connection.close()
    return photos
