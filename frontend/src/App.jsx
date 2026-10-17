function App() {
  return (
    <div>
      <h1>Interactive Photo Album</h1>
      <p>Create albums and preserve your favorite memories.</p>

      <h2>My Albums</h2>
      <button>Create New Album</button>

      <h2>Upload a Photo</h2>
      <input type="file" accept="image/*" />
      <br />
      <input type="text" placeholder="Photo caption" />
      <button>Upload Photo</button>
    </div>
  )
}

export default App
