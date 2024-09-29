const express = require('express');
const fs = require('fs');
const path = require('path');
const app = express();
const PORT = 3000;

app.use(express.json());

const booksFilePath = path.join(__dirname, 'books.json');

// Helper function to read books from JSON file
function readBooksFromFile() {
  const data = fs.readFileSync(booksFilePath, 'utf-8');
  return JSON.parse(data);
}

// Helper function to write books to JSON file
function writeBooksToFile(books) {
  fs.writeFileSync(booksFilePath, JSON.stringify(books, null, 2), 'utf-8');
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

// Add a new book
app.post('/books', (req, res) => {
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

  // Add the new book
  const newBook = { title, author, publisher, publishedDate, isbn };
  books.push(newBook);
  writeBooksToFile(books);

  res.status(201).json(newBook);
});

// Update book by ISBN
app.put('/books/:isbn', (req, res) => {
  const { title, author, publisher, publishedDate } = req.body;
  let books = readBooksFromFile();
  const bookIndex = books.findIndex(b => b.isbn === req.params.isbn);

  if (bookIndex === -1) return res.status(404).json({ message: 'Book not found' });

  // Update book details
  if (title) books[bookIndex].title = title;
  if (author) books[bookIndex].author = author;
  if (publisher) books[bookIndex].publisher = publisher;
  if (publishedDate) books[bookIndex].publishedDate = publishedDate;

  writeBooksToFile(books);

  res.json(books[bookIndex]);
});

// Delete a book by ISBN
app.delete('/books/:isbn', (req, res) => {
  let books = readBooksFromFile();
  const bookIndex = books.findIndex(b => b.isbn === req.params.isbn);

  if (bookIndex === -1) return res.status(404).json({ message: 'Book not found' });

  books.splice(bookIndex, 1);
  writeBooksToFile(books);

  res.json({ message: 'Book deleted successfully' });
});

app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
