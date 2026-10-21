from pathlib import Path
from uuid import uuid4

from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles


app = FastAPI()

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
async def upload_photo(file: UploadFile = File(...)):
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

    return {
        "filename": file.filename,
        "url": f"http://127.0.0.1:8000/uploads/{new_filename}"
    }