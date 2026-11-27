import { useEffect, useState } from "react";
import "./App.css";

const API_URL = "http://127.0.0.1:8000";

function photoUrl(photo) {
  return `${API_URL}/uploads/${photo.filename}`;
}

function AlbumSpread({ leftPhoto, rightPhoto, leftPageNumber, rightPageNumber }) {
  return (
    <div className="spread-pages">
      <div className="spread-page left-spread-page">
        {leftPhoto ? (
          <>
            <img src={photoUrl(leftPhoto)} alt={leftPhoto.caption || "Album page"} />
            <p>{leftPhoto.caption || "A moment worth keeping."}</p>
            <span className="page-number">{leftPageNumber}</span>
          </>
        ) : (
          <div className="blank-page">Add a photo to this page.</div>
        )}
      </div>

      <div className="spread-page right-spread-page">
        {rightPhoto ? (
          <>
            <img src={photoUrl(rightPhoto)} alt={rightPhoto.caption || "Album page"} />
            <p>{rightPhoto.caption || "A moment worth keeping."}</p>
            {rightPageNumber && (
              <span className="page-number">{rightPageNumber}</span>
            )}
          </>
        ) : (
          <div className="blank-page">This page is available.</div>
        )}
      </div>
    </div>
  );
}

function App() {
  const [screen, setScreen] = useState("shelf");
  const [albums, setAlbums] = useState([]);
  const [selectedAlbum, setSelectedAlbum] = useState(null);
  const [albumPhotos, setAlbumPhotos] = useState([]);
  const [readerMode, setReaderMode] = useState("cover");
  const [currentSpreadIndex, setCurrentSpreadIndex] = useState(0);
  const [isCreatingAlbum, setIsCreatingAlbum] = useState(false);
  const [showUploadPanel, setShowUploadPanel] = useState(false);
  const [isFlipping, setIsFlipping] = useState(false);
  const [flipDirection, setFlipDirection] = useState("");
  const [turningSpread, setTurningSpread] = useState(null);
  const [isOpeningAlbum, setIsOpeningAlbum] = useState(false);
  const [message, setMessage] = useState("");

  const [newAlbumTitle, setNewAlbumTitle] = useState("");
  const [newAlbumDescription, setNewAlbumDescription] = useState("");
  const [selectedFile, setSelectedFile] = useState(null);
  const [caption, setCaption] = useState("");

  async function fetchAlbums() {
    const response = await fetch(`${API_URL}/albums`);
    const data = await response.json();
    setAlbums(data);
    return data;
  }

  async function fetchAlbumPhotos(albumId) {
    const response = await fetch(`${API_URL}/albums/${albumId}/photos`);
    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.detail || "Could not load this album.");
    }

    setAlbumPhotos(data);
    return data;
  }

  useEffect(() => {
    fetchAlbums().catch(() => {
      setMessage("Could not connect to the backend.");
    });
  }, []);

  async function openAlbum(album) {
    try {
      const photos = await fetchAlbumPhotos(album.id);
      setSelectedAlbum(album);
      setReaderMode("cover");
      setCurrentSpreadIndex(0);
      setScreen("reader");
      setMessage(photos.length === 0 ? "This album is ready for photos." : "");
    } catch (error) {
      setMessage(error.message);
    }
  }

  function goToShelf() {
    setScreen("shelf");
    setSelectedAlbum(null);
    setAlbumPhotos([]);
    setReaderMode("cover");
    setShowUploadPanel(false);
    setIsOpeningAlbum(false);
    setMessage("");
  }

  function handleFileChange(event) {
    const file = event.target.files[0];
    if (file) setSelectedFile(file);
  }

  async function createAlbum(event) {
    event.preventDefault();
    if (!newAlbumTitle.trim()) return;

    const response = await fetch(`${API_URL}/albums`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: newAlbumTitle,
        description: newAlbumDescription,
      }),
    });

    const createdAlbum = await response.json();

    if (!response.ok) {
      setMessage(createdAlbum.detail || "Could not create album.");
      return;
    }

    setAlbums((currentAlbums) => [createdAlbum, ...currentAlbums]);
    setNewAlbumTitle("");
    setNewAlbumDescription("");
    setSelectedAlbum(createdAlbum);
    setAlbumPhotos([]);
    setReaderMode("cover");
    setCurrentSpreadIndex(0);
    setIsCreatingAlbum(false);
    setScreen("reader");
  }

  async function uploadPhoto(event) {
    event.preventDefault();

    if (!selectedFile || !selectedAlbum) {
      setMessage("Please choose a photo first.");
      return;
    }

    const formData = new FormData();
    formData.append("file", selectedFile);
    formData.append("caption", caption);

    const response = await fetch(
      `${API_URL}/albums/${selectedAlbum.id}/photos`,
      { method: "POST", body: formData },
    );
    const data = await response.json();

    if (!response.ok) {
      setMessage(data.detail || "Upload failed.");
      return;
    }

    const updatedPhotos = await fetchAlbumPhotos(selectedAlbum.id);
    await fetchAlbums();

    setSelectedAlbum((album) => ({
      ...album,
      photo_count: updatedPhotos.length,
      cover_url: album.cover_url || data.url,
    }));
    setCurrentSpreadIndex(Math.floor((updatedPhotos.length - 1) / 2));
    setReaderMode("pages");
    setSelectedFile(null);
    setCaption("");
    setShowUploadPanel(false);
    setMessage("Photo added to this album.");

    const fileInput = document.querySelector("#album-photo-input");
    if (fileInput) fileInput.value = "";
  }

  function getSpread(index) {
    const leftIndex = index * 2;
    const rightIndex = leftIndex + 1;

    return {
      leftPhoto: albumPhotos[leftIndex] || null,
      rightPhoto: albumPhotos[rightIndex] || null,
      leftPageNumber: leftIndex + 1,
      rightPageNumber: rightIndex < albumPhotos.length ? rightIndex + 1 : null,
    };
  }

  function turnSpread(direction) {
    if (isFlipping || albumPhotos.length === 0) return;

    const totalSpreads = Math.ceil(albumPhotos.length / 2);
    const nextSpreadIndex = currentSpreadIndex + direction;

    if (nextSpreadIndex < 0 || nextSpreadIndex >= totalSpreads) return;

    setTurningSpread({
      front: getSpread(currentSpreadIndex),
      back: getSpread(nextSpreadIndex),
    });
    setFlipDirection(direction > 0 ? "next" : "previous");
    setIsFlipping(true);

    window.setTimeout(() => {
      setCurrentSpreadIndex(nextSpreadIndex);
    }, 330);

    window.setTimeout(() => {
      setIsFlipping(false);
      setFlipDirection("");
      setTurningSpread(null);
    }, 720);
  }

  function openAlbumPages() {
    if (albumPhotos.length === 0 || isOpeningAlbum) return;

    setIsOpeningAlbum(true);

    window.setTimeout(() => {
      setReaderMode("pages");
      setIsOpeningAlbum(false);
    }, 720);
  }

  useEffect(() => {
    function handleKeyboard(event) {
      if (screen !== "reader" || readerMode !== "pages" || showUploadPanel) {
        return;
      }

      if (event.target.tagName === "INPUT" || event.target.tagName === "TEXTAREA") {
        return;
      }

      if (event.key === "ArrowLeft") turnSpread(-1);
      if (event.key === "ArrowRight") turnSpread(1);
      if (event.key === "Escape") goToShelf();
    }

    window.addEventListener("keydown", handleKeyboard);
    return () => window.removeEventListener("keydown", handleKeyboard);
  }, [screen, readerMode, showUploadPanel, currentSpreadIndex, albumPhotos.length, isFlipping]);

  const totalSpreads = Math.ceil(albumPhotos.length / 2);
  const currentSpread = getSpread(currentSpreadIndex);
  if (screen === "reader") {
    return (
      <div className="app reader-screen">
        <header className="reader-header">
          <button className="text-button" onClick={goToShelf}>
            ← All albums
          </button>

          <div className="reader-title">
            <p className="eyebrow">NOW READING</p>
            <h1>{selectedAlbum.title}</h1>
            <span>{albumPhotos.length} photos</span>
          </div>

          <button
            className="primary-button small-button"
            onClick={() => setShowUploadPanel((visible) => !visible)}
          >
            + Add photos
          </button>
        </header>

        {showUploadPanel && (
          <section className="reader-upload-panel">
            <form onSubmit={uploadPhoto}>
              <label htmlFor="album-photo-input" className="file-label">
                {selectedFile ? selectedFile.name : "Choose a photo"}
              </label>
              <input
                id="album-photo-input"
                type="file"
                accept="image/*"
                onChange={handleFileChange}
              />
              <input
                className="caption-input"
                type="text"
                placeholder="Add a caption..."
                value={caption}
                onChange={(event) => setCaption(event.target.value)}
              />
              <button className="primary-button" type="submit">
                Add to this album
              </button>
            </form>
          </section>
        )}

        <main className="reader-main">
          {readerMode === "cover" ? (
            <>
              <div className="album-cover-stage">
                <div
                    className={`reader-cover ${isOpeningAlbum ? "is-opening" : ""}`}
                  style={
                    selectedAlbum.cover_url
                      ? { backgroundImage: `url(${selectedAlbum.cover_url})` }
                      : undefined
                  }
                >
                  <div className="reader-cover-shade" />
                  <div className="reader-cover-copy">
                    <span>INTERACTIVE PHOTO ALBUM</span>
                    <h2>{selectedAlbum.title}</h2>
                    <p>{selectedAlbum.description || "A collection of photos."}</p>
                    <small>{albumPhotos.length} photos</small>
                  </div>
                </div>
              </div>

              <div className="cover-actions">
                <button
                  className="primary-button"
                  onClick={openAlbumPages}
                  disabled={albumPhotos.length === 0}
                >
                  Open album →
                </button>
                <button
                  className="secondary-button"
                  onClick={() => setShowUploadPanel(true)}
                >
                  Add photos
                </button>
              </div>

              {albumPhotos.length === 0 && (
                <p className="reader-hint">Add a photo to create the first page.</p>
              )}
            </>
          ) : albumPhotos.length === 0 ? (
            <section className="empty-book">
              <div className="empty-book-icon">＋</div>
              <h2>This album has no photos yet.</h2>
              <button className="primary-button" onClick={() => setShowUploadPanel(true)}>
                Add the first photo
              </button>
            </section>
          ) : (
            <>
              <div className="reader-controls">
                <button
                  className="round-button"
                  onClick={() => turnSpread(-1)}
                  disabled={currentSpreadIndex === 0 || isFlipping}
                  aria-label="Previous spread"
                >
                  ←
                </button>
                <span>
                  Pages {currentSpread.leftPageNumber}
                  {currentSpread.rightPageNumber
                    ? `–${currentSpread.rightPageNumber}`
                    : ""} of {albumPhotos.length}
                </span>
                <button
                  className="round-button"
                  onClick={() => turnSpread(1)}
                  disabled={currentSpreadIndex === totalSpreads - 1 || isFlipping}
                  aria-label="Next spread"
                >
                  →
                </button>
              </div>

              <div className="spread-stage">
                <div className={`spread-book ${isFlipping ? "spread-hidden" : ""}`}>
                  <AlbumSpread
                    leftPhoto={currentSpread.leftPhoto}
                    rightPhoto={currentSpread.rightPhoto}
                    leftPageNumber={currentSpread.leftPageNumber}
                    rightPageNumber={currentSpread.rightPageNumber}
                  />
                  <div className="spread-spine" />
                </div>

                {isFlipping && turningSpread && (
                  <div className={`turning-spread ${flipDirection}`}>
                    <div className="spread-face spread-front">
                      <AlbumSpread
                        leftPhoto={turningSpread.front.leftPhoto}
                        rightPhoto={turningSpread.front.rightPhoto}
                        leftPageNumber={turningSpread.front.leftPageNumber}
                        rightPageNumber={turningSpread.front.rightPageNumber}
                      />
                    </div>
                    <div className="spread-face spread-back">
                      <AlbumSpread
                        leftPhoto={turningSpread.back.leftPhoto}
                        rightPhoto={turningSpread.back.rightPhoto}
                        leftPageNumber={turningSpread.back.leftPageNumber}
                        rightPageNumber={turningSpread.back.rightPageNumber}
                      />
                    </div>
                  </div>
                )}
              </div>

              <p className="reader-hint">
                Use the arrows or ← and → to flip through the album
              </p>
            </>
          )}

          {message && <p className="message">{message}</p>}
        </main>
      </div>
    );
  }

  return (
    <div className="app shelf-screen">
      <header className="shelf-header">
        <div>
          <p className="eyebrow">INTERACTIVE PHOTO ALBUM</p>
          <h1>Interactive Photo Album</h1>
          <p>Create albums, add photos, and flip through them.</p>
        </div>
        <div className="shelf-mark">♡</div>
      </header>

      <main className="shelf-main">
        <div className="shelf-heading">
          <div>
            <p className="eyebrow">ALBUMS</p>
            <h2>Your albums</h2>
          </div>
          <button
            className="primary-button"
            onClick={() => {
              setIsCreatingAlbum(true);
              setMessage("");
            }}
          >
            + Create new album
          </button>
        </div>

        {isCreatingAlbum && (
          <section className="create-album-card">
            <div>
              <p className="eyebrow">NEW ALBUM</p>
              <h2>Name your album</h2>
              <p>Give this album a title before adding photos.</p>
            </div>

            <form onSubmit={createAlbum}>
              <input
                className="caption-input"
                type="text"
                placeholder="Album title"
                value={newAlbumTitle}
                onChange={(event) => setNewAlbumTitle(event.target.value)}
                autoFocus
              />
              <textarea
                className="caption-input description-input"
                placeholder="Short description (optional)"
                value={newAlbumDescription}
                onChange={(event) => setNewAlbumDescription(event.target.value)}
              />
              <div className="form-actions">
                <button type="button" className="secondary-button" onClick={() => setIsCreatingAlbum(false)}>
                  Cancel
                </button>
                <button className="primary-button" type="submit">
                  Create album
                </button>
              </div>
            </form>
          </section>
        )}

        {message && <p className="message">{message}</p>}

        {albums.length === 0 ? (
          <div className="empty-shelf">
            <div className="empty-book-icon">＋</div>
            <h3>Your shelf is empty</h3>
            <p>Create an album to start adding photos.</p>
          </div>
        ) : (
          <div className="album-grid">
            {albums.map((album, index) => (
              <button className={`album-card album-card-${index % 3}`} key={album.id} onClick={() => openAlbum(album)}>
                <div className="album-cover">
                  {album.cover_url ? <img src={album.cover_url} alt="" /> : <div className="blank-cover">♡</div>}
                  <div className="cover-shade" />
                  <div className="cover-copy">
                    <span className="cover-label">PHOTO ALBUM</span>
                    <strong>{album.title}</strong>
                    <small>{album.photo_count} photos</small>
                  </div>
                </div>
                <span className="album-card-footer">
                  Open album <span>→</span>
                </span>
              </button>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}

export default App;
