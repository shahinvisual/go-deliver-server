const express = require("express");
const app = express();
const cors = require("cors");
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
require("dotenv").config();
const stripe = require('stripe')(process.env.Payment_secret);
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
        // ==================Parcel Data get by Id==============================================
        app.get('/parcels/:id', async (req, res) => {
            try {
                const id = req.params.id;
                const parcels = await parcelCollection.findOne({ _id: new ObjectId(id) });
                if (!parcels) {
                    return res.status(404).send({ message: 'parcels not found' });
                };
                res.send(parcels)
            } catch (error) {
                console.error('Error parcel fetching', error);
                res.status(500).send({ message: 'Failed to fetch parcels' })
            }
        })


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

        // =================Create Payment Intent=========================
        app.post('/create-payment-intent', async (req, res) => {
            try {
                const amountInCents = req.body.amountCents;
                const paymentIntent = await stripe.paymentIntents.create({
                    amount: amountInCents,
                    currency: 'usd',
                    payment_method_types: ['card']
                });
                res.json({ clientSecret: paymentIntent.client_secret })
            } catch {
                res.status(500).json({ error: error.message })
            }
        });

        // ==========Post: Record Payment and update Parcels status=====================
        app.post('/payments', async (req, res) => {
            try {
                const { id, email, amount, paymentMethod, transactionId } = req.body;

                // 1: update parcel's payment status
                const updateResult = await parcelCollection.updateOne(
                    { _id: new ObjectId(id) },
                    {
                        $set: {
                            payment_status: 'paid'
                        }
                    }
                );

                if (updateResult.modifiedCount === 0) {
                    return res.status(404).send({ message: 'parcels not found or already paid' });
                };

                // Insert Payment Record==============
                const paymentDoc = {
                    id,
                    email,
                    amount,
                    paymentMethod,
                    transactionId,
                    paid_at_string: new Date().toISOString(),
                    paid_at: new Date()
                };
                const paymentResult = await paymentsCollection.insertOne(paymentDoc);
                res.status(201).send({
                    message: 'Payment Recorded and Parcel marked as paid',
                    insertedId: paymentResult.insertedId;
                });
            } catch (error) {
                console.error('payment processing error:', error);
                res.status(500).send({ message: 'Failed to record paymentF' })
            }
        })

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
