from pathlib import Path
from uuid import uuid4
from database import initialize_database, get_connection
import sqlite3

from fastapi import FastAPI, UploadFile, File, HTTPException, Form
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles


app = FastAPI()
initialize_database()

# Allow the React frontend to communicate with FastAPI
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


UPLOAD_DIR = Path("uploads")
UPLOAD_DIR.mkdir(exist_ok=True)

app.mount(
    "/uploads",
    StaticFiles(directory=UPLOAD_DIR),
    name="uploads"
)


@app.get("/")
def home():
    return {"message": "Backend is running!"}


@app.get("/message")
def get_message():
    return {"message": "Hello! The backend responded to the button click."}


@app.post("/photos")
async def upload_photo(file: UploadFile = File(...), caption: str = Form("")):
    if not file.content_type or not file.content_type.startswith("image/"):
        raise HTTPException(
            status_code=400,
            detail="Only image files are allowed"
        )

    file_extension = Path(file.filename or "").suffix
    new_filename = f"{uuid4()}{file_extension}"
    file_location = UPLOAD_DIR / new_filename

    file_contents = await file.read()

    with open(file_location, "wb") as image_file:
        image_file.write(file_contents)

    connection = get_connection()
    cursor = connection.cursor()

    cursor.execute("""
        INSERT INTO photos (filename, file_path, caption)
        VALUES (?, ?, ?)
    """, (new_filename, str(file_location), caption))

    connection.commit()
    print("Saved photo to database:", cursor.lastrowid)
    connection.close()

    return {
        "filename": file.filename,
        "caption": caption,
        "url": f"http://127.0.0.1:8000/uploads/{new_filename}"
    }

@app.get("/photos")
def get_photos():
    connection = get_connection()
    connection.row_factory = sqlite3.Row
    cursor = connection.cursor()

    cursor.execute("SELECT * FROM photos")
    photos = [dict(row) for row in cursor.fetchall()]

    connection.close()

    return photos