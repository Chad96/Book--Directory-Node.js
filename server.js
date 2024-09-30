const express = require('express');
const fs = require('fs');
const path = require('path');
const multer = require('multer'); // For handling image uploads
const app = express();
const { v4: uuidv4 } = require('uuid'); // For generating unique IDs for books
const PORT = 3000;

app.use(express.json());

const booksFilePath = path.join(__dirname, 'books.json');
const imagePath = path.join(__dirname, 'uploads');

// Create 'uploads' directory if it doesn't exist
if (!fs.existsSync(imagePath)) {
  fs.mkdirSync(imagePath);
}

// Configure multer for handling file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, imagePath); // Save uploaded images in the 'uploads' directory
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + '-' + file.originalname); // Save the file with a unique name
  }
});
const upload = multer({ storage });

// Helper function to read books from JSON file
function readBooksFromFile() {
  const data = fs.readFileSync(booksFilePath, 'utf-8');
  return JSON.parse(data);
}

// Helper function to write books to JSON file
function writeBooksToFile(books) {
  fs.writeFileSync(booksFilePath, JSON.stringify(books, null, 2), 'utf-8');
}

// Helper function to delete an image file
function deleteImageFile(imageFileName) {
  const filePath = path.join(imagePath, imageFileName);
  if (fs.existsSync(filePath)) {
    fs.unlinkSync(filePath); // Delete the image file
  }
}

// Get all books
app.get('/books', (req, res) => {
  const books = readBooksFromFile();
  res.json(books);
});

// Get a book by ISBN
app.get('/books/:isbn', (req, res) => {
  const books = readBooksFromFile();
  const book = books.find(b => b.isbn === req.params.isbn);
  if (!book) return res.status(404).json({ message: 'Book not found' });
  res.json(book);
});

// Add a new book with optional image upload
app.post('/books', upload.single('image'), (req, res) => {
  const { title, author, publisher, publishedDate, isbn } = req.body;
  let books = readBooksFromFile();

  // Basic validation
  if (!title || !author || !publisher || !publishedDate || !isbn) {
    return res.status(400).json({ message: 'All fields are required' });
  }

  // Check if ISBN already exists
  const existingBook = books.find(b => b.isbn === isbn);
  if (existingBook) {
    return res.status(400).json({ message: 'Book with this ISBN already exists' });
  }

  // Add the new book with optional image
  const newBook = {
    id: uuidv4(),
    title,
    author,
    publisher,
    publishedDate,
    isbn,
    image: req.file ? req.file.filename : null // Save the uploaded image filename, if present
  };
  
  books.push(newBook);
  writeBooksToFile(books);

  res.status(201).json(newBook);
});

// Update book by ISBN, including optional image update
app.put('/books/:isbn', upload.single('image'), (req, res) => {
  const { title, author, publisher, publishedDate } = req.body;
  let books = readBooksFromFile();
  const bookIndex = books.findIndex(b => b.isbn === req.params.isbn);

  if (bookIndex === -1) return res.status(404).json({ message: 'Book not found' });

  // Update book details
  if (title) books[bookIndex].title = title;
  if (author) books[bookIndex].author = author;
  if (publisher) books[bookIndex].publisher = publisher;
  if (publishedDate) books[bookIndex].publishedDate = publishedDate;

  // Update image if a new one is uploaded
  if (req.file) {
    // Delete the old image if it exists
    if (books[bookIndex].image) {
      deleteImageFile(books[bookIndex].image);
    }
    books[bookIndex].image = req.file.filename; // Save the new image filename
  }

  writeBooksToFile(books);

  res.json(books[bookIndex]);
});

// Delete a book by ISBN along with its image
app.delete('/books/:isbn', (req, res) => {
  let books = readBooksFromFile();
  const bookIndex = books.findIndex(b => b.isbn === req.params.isbn);

  if (bookIndex === -1) return res.status(404).json({ message: 'Book not found' });

  // If the book has an associated image, delete it
  if (books[bookIndex].image) {
    deleteImageFile(books[bookIndex].image);
  }

  books.splice(bookIndex, 1); // Remove the book from the list
  writeBooksToFile(books);

  res.json({ message: 'Book and associated image deleted successfully' });
});

// Serve uploaded images
app.get('/uploads/:imageName', (req, res) => {
  const filePath = path.join(imagePath, req.params.imageName);
  if (fs.existsSync(filePath)) {
    res.sendFile(filePath);
  } else {
    res.status(404).json({ message: 'Image not found' });
  }
});

app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
