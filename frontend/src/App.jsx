import { useEffect, useState } from "react";

function App() {
  const [message, setMessage] = useState("");
  const [selectedFile, setSelectedFile] = useState(null);
  const [imageUrl, setImageUrl] = useState("");
  const [caption, setCaption] = useState("");
  const [photos, setPhotos] = useState([]);

  async function contactBackend() {
    const response = await fetch("http://127.0.0.1:8000/message");
    const data = await response.json();

    setMessage(data.message);
  }

   function handleFileChange(event) {
    setSelectedFile(event.target.files[0]);
  }

  async function fetchPhotos() {
    const response = await fetch("http://127.0.0.1:8000/photos");
    const data = await response.json();

    setPhotos(data);
  }
  useEffect(() => {
    fetchPhotos();
  }, []);

  async function uploadPhoto() {
    if (!selectedFile) {
      setMessage("Please choose an image first.");
      return;
    }

    const formData = new FormData();
    formData.append("file", selectedFile);
    formData.append("caption", caption);

    const response = await fetch("http://127.0.0.1:8000/photos", {
      method: "POST",
      body: formData,
    });

    const data = await response.json();

    if (!response.ok) {
      setMessage(data.detail || "Upload failed.");
      return;
    }

    await fetchPhotos();
  setMessage("Photo uploaded successfully.");
  }

  return (
    <div>
      <h1>Interactive Photo Album</h1>
      <p>Create albums and preserve your favorite memories.</p>

      <h2>My Albums</h2>
      <button onClick={contactBackend}>Create New Album</button>

      <h2>Upload a Photo</h2>
      <input type="file" 
              accept="image/*" 
              onChange={handleFileChange}
      />
      <br />
      <input
        type="text"
        placeholder="Photo caption"
        value={caption}
        onChange={(event) => setCaption(event.target.value)}
      />
      <button onClick={uploadPhoto}>Upload Photo</button>

      {message && <p>{message}</p>}

      <div>
      <h2>Your Photo Gallery</h2>

      {photos.map((photo) => (
        <div key={photo.id}>
          <img
            src={`http://127.0.0.1:8000/uploads/${photo.filename}`}
            alt={photo.caption || "Uploaded photo"}
            width="400"
          />
          <p>{photo.caption}</p>
        </div>
      ))}
    </div>

    </div>
  )
}



export default App
