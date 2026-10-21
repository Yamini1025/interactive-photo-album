import { useState } from "react";

function App() {
  const [message, setMessage] = useState("");
  const [selectedFile, setSelectedFile] = useState(null);
  const [imageUrl, setImageUrl] = useState("");

  async function contactBackend() {
    const response = await fetch("http://127.0.0.1:8000/message");
    const data = await response.json();

    setMessage(data.message);
  }

   function handleFileChange(event) {
    setSelectedFile(event.target.files[0]);
  }

  async function uploadPhoto() {
    if (!selectedFile) {
      setMessage("Please choose an image first.");
      return;
    }

    const formData = new FormData();
    formData.append("file", selectedFile);

    const response = await fetch("http://127.0.0.1:8000/photos", {
      method: "POST",
      body: formData,
    });

    const data = await response.json();

    if (!response.ok) {
      setMessage(data.detail || "Upload failed.");
      return;
    }

    setImageUrl(data.url);
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
      <input type="text" placeholder="Photo caption" />
      <button onClick={uploadPhoto}>Upload Photo</button>

      {message && <p>{message}</p>}

      {imageUrl && (
        <div>
          <h2>Your Uploaded Photo</h2>
          <img
            src={imageUrl}
            alt="Uploaded"
            width="400"
          />
        </div>
      )}

    </div>
  )
}



export default App
