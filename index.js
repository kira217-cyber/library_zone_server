const express = require("express");
const app = express();
const cors = require("cors");
require("dotenv").config();

const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
const port = process.env.PORT || 3000;

// Middle Ware
app.use(cors());
app.use(express.json());

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.v36kmoi.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

async function run() {
  try {
    // Connect the client to the server	(optional starting in v4.7)
    // await client.connect();
    // Send a ping to confirm a successful connection

    const booksCollection = client.db("libraryZone").collection("books");
    const borrowedBookCollection = client
      .db("libraryZone")
      .collection("borrowedBooks");

    // books api

    app.get("/books", async (req, res) => {
      const cursor = booksCollection.find();
      const result = await cursor.toArray();
      res.send(result);
    });

    // single book api

    app.get("/books/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await booksCollection.findOne(query);
      res.send(result);
    });

    // post single book method
    app.post("/books", async (req, res) => {
      const newBook = req.body;
      const result = await booksCollection.insertOne(newBook);
      res.send(result);
    });

    // update any book api

    app.put("/books/:id", async (req, res) => {
      const id = req.params.id;
      const filter = { _id: new ObjectId(id) };
      const options = { upsert: true };
      const updateBook = req.body;
      const updateDoc = {
        $set: updateBook,
      };
      const result = await booksCollection.updateOne(
        filter,
        updateDoc,
        options
      );
      res.send(result);
    });

    // Borrow single book method
    app.post("/borrowed/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const borrowedBook = req.body;
      const result = await borrowedBookCollection.insertOne(borrowedBook);

      if (result.insertedId) {
        await booksCollection.updateOne(query, {
          $inc: {
            quantity: -1,
          },
        });
      }
      res.send(result);
    });

    // BorrowBooks get method

    app.get("/borrowed/:email", async (req, res) => {
      const email = req.params.email;
      const filter = { email: email };
      const result = await borrowedBookCollection.find(filter).toArray();
      res.send(result);
    });

    app.delete("/borrowed/:id", async (req, res) => {
      const id = req.params.id;

      try {
        const query = { _id: new ObjectId(id) };

        // Step 1: Find the borrowed book entry first (to get bookId)
        const borrowedEntry = await borrowedBookCollection.findOne(query);
        if (!borrowedEntry) {
          return res.status(404).send({ message: "Borrowed book not found." });
        }

        const bookId = borrowedEntry.bookId; // assuming this is stored in borrowed entry

        // Step 2: Delete the borrowed entry
        const deleteResult = await borrowedBookCollection.deleteOne(query);

        if (deleteResult.deletedCount > 0 && bookId) {
          // Step 3: Increase the quantity of the book by 1
          await booksCollection.updateOne(
            { _id: new ObjectId(bookId) },
            {
              $inc: { quantity: 1 },
            }
          );
        }

        res.send(deleteResult);
      } catch (error) {
        console.error("Error in DELETE /borrowed/:id:", error);
        res.status(500).send({ message: "Something went wrong." });
      }
    });

    await client.db("admin").command({ ping: 1 });
    console.log(
      "Pinged your deployment. You successfully connected to MongoDB!"
    );
  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}
run().catch(console.dir);

app.get("/", (req, res) => {
  res.send("Library Management server is Running");
});

app.listen(port, () => {
  console.log(`Library Management Port ${port}`);
});
