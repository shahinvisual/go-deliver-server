const express = require("express");
const app = express();
const cors = require("cors");
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
require("dotenv").config();
const PORT = process.env.PORT || 5000;


/* ========= MIDDLEWARE ========= */
app.use(cors());
app.use(express.json());



const uri = `mongodb+srv://${process.env.USER_DB}:${process.env.USER_PASS}@cluster0.3l8ftnx.mongodb.net/?appName=Cluster0`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
    serverApi: {
        version: ServerApiVersion.v1,
        strict: true,
        deprecationErrors: true,
    }
});

async function run() {
    try {
        // Connect the client to the server	(optional starting in v4.7)
        await client.connect();
        const parcelCollection = client.db('parcelDB').collection('parcels');
        app.get('/parcels', async (req, res) => {
            const parcels = await parcelCollection.find().toArray();
            res.send(parcels)
        });


        // =================Parcel User Data get and show in dashboard UI===========================
        app.get('/parcels', async (req, res) => {
            try {
                const userEmail = req.query.email;
                const query = userEmail ? { createdBy: userEmail } : {};
                const options = {
                    sort: { createdAt: -1 }
                };
                const result = await parcelCollection.find(query, options).toArray();
                res.send(result)
            } catch (error) {
                console.error('error fetching parcels', error);
                res.status(500).send({ message: 'Failed to get parcels' })
            }
        });


        // ==================Parcel Data Save in DB==============================================
        app.post('/parcels', async (req, res) => {
            try {
                const parcels = req.body;
                const result = await parcelCollection.insertOne(parcels);
                res.status(201).send(result)
            } catch (error) {
                console.error('error inserting parcel', error);
                res.status(500).send({ message: 'Failed to create message' })
            }
        });

        // =================Parcel Delete Data in mongoBD=========================
        app.delete('/parcels/:id', async (req, res) => {
            try {
                const deleteId = req.params.id;
                const result = await parcelCollection.deleteOne({ _id: new ObjectId(deleteId) });
                res.send(result);
            } catch (error) {
                console.error('Error deleting parcels', error);
                res.status(500).send({ message: 'Failed to delete parcels' })
            }
        });


        // Send a ping to confirm a successful connection
        await client.db("admin").command({ ping: 1 });
        console.log("Pinged your deployment. You successfully connected to MongoDB!");
    } finally {
        // Ensures that the client will close when you finish/error
        // await client.close();
    }
}
run().catch(console.dir);


/* ========= ROUTES ========= */
// app.use("/api/parcels", parcelRoutes);

/* ========= ROOT ========= */
app.get("/", (req, res) => {
    res.send("🚚 Parcel Server Running");
});

/* ========= START ========= */
app.listen(PORT, () => {
    console.log(`🚀 Server running on port ${PORT}`);
});
