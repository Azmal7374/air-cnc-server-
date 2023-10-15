const express = require('express');
const app = express();
const cors = require('cors');
require('dotenv').config()
const jwt = require('jsonwebtoken');
const  morgan = require('morgan')
const port = process.env.PORT || 5000


//middleware

const corsOptions = {
    origin: '*',
    credentials: true,
    optionSuccessStatus: 200,
  }
app.use(cors());
app.use(express.json());
app.use (morgan('dev'))






const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const uri = `mongodb+srv://${process.env.DB_USERNAME}:${process.env.DB_PASSWORD}@cluster0.wlub5y3.mongodb.net/?retryWrites=true&w=majority`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  }
});

//Validate jwt
const verifyJWT = (req, res, next) => {
  const authorization = req.headers.authorization
  if(!authorization){
    return res.status(401).send({error:true, message:'Unauthorized Access'})
  }
  // console.log(authorization)
  const token= authorization.split(' ')[1]
 
  console.log(token)
  //token verify
  jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, decoded) => {
    if(err){
      return res.status(401).send({error:true, message:'Unauthorized Access'})
    }
    req.decoded = decoded
    next()
  })

}

async function run() {
  try {
    const usersCollection = client.db('aircnc').collection('users')
    const roomsCollection = client.db('aircnc').collection('rooms')
    const bookingsCollection = client.db('aircnc').collection('bookings')

    // Connect the client to the server	(optional starting in v4.7)
    await client.connect();
    // Send a ping to confirm a successful connection


    // Generate Jwt token
        app.post('/jwt', async (req, res) => {
      const email = req.body
      const token = jwt.sign(email, process.env.ACCESS_TOKEN_SECRET,{expiresIn: '1h',
    })
    
      res.send({token});
    })


   // Save users
    app.put('/users/:email', async (req, res) => {
      const email = req.params.email;
      console.log(email)
      const user = req.body;
      console.log(user)
      const query ={email: email};
      const options = {upsert: true};
      const updateDoc = {
        $set: user,
      }
      const result = await usersCollection.updateOne(query, updateDoc, options)
      console.log(result)
      res.send(result)
    })


     //get user
     app.get('/users/:email', async (req, res) => {
      const email= req.params.email;
      const query = {email: email}
      const result = await usersCollection.findOne(query);
      res.send(result);
     })

   
    //get all rooms
    app.get('/rooms', async (req, res) => {
      const  result = await roomsCollection.find().toArray();
      res.send(result);
    })

    //delete room
    app.delete('/rooms/:id', async (req, res) => {
      const id=req.params.id;
      const query ={ _id: new ObjectId(id)}
      const result = await roomsCollection.deleteOne(query)
      res.send(result);
    })

    //get filtered rooms for host
    app.get('/rooms/:email',verifyJWT, async (req, res) => {
      const decodedEmail = req.decoded.email
      console.log(decodedEmail)
      const email= req.params.email;
      if(email !==decodedEmail){
          return res.status(403).send({error:true, message:'Forbidden Access'})
      }
      const query = { 'host.email' : email };
      const result = await roomsCollection.find(query).toArray();
      res.send(result);
     })
 


    //Get a single rooms
    app.get('/room/:id', async (req, res) => {
     const id= req.params.id;
     const query = {_id: new ObjectId(id)}
     const result = await roomsCollection.findOne(query);
     res.send(result);
    })

 //saved a room in database
 app.post('/rooms', async (req, res) => {
  const room = req.body;
  console.log(room)
  const result = await roomsCollection.insertOne(room);
  res.send(result);
})


//update room booking status
app.patch('/rooms/status/:id', async (req, res) => {
  const id = req.params.id;
  const status = req.body.status;
  const query = {_id: new ObjectId(id)}
  const updateDoc={
    $set: {
      booked: status,
    },
  }
  const update = await  roomsCollection.updateOne(query, updateDoc)
  res.send(update);
})


//get bookings for guest
app.get('/bookings', async (req, res) => {
  const email = req.query.email;
  if(!email) {
    res.send([])
  }
  const query ={'guest.email': email}
  const result = await bookingsCollection.find(query).toArray();
  res.send(result)
})


//get bookings for host
app.get('/bookings/host', async (req, res) => {
  const email = req.query.email;
  if(!email) {
    res.send([])
  }
  const query ={host: email}
  const result = await bookingsCollection.find(query).toArray();
  res.send(result)
})


//saved a booking in database
app.post('/bookings', async (req, res) => {
  const booking = req.body;
  console.log(booking)
  const result = await bookingsCollection.insertOne(booking);
  res.send(result);
})


//delete bookings
app.delete('/bookings/:id', async (req, res) => {
  const id = req.params.id;
  const query= {_id: new ObjectId(id)}
  const result = await bookingsCollection.deleteOne(query);
  res.send(result);
})


    await client.db("admin").command({ ping: 1 });
    console.log("Pinged your deployment. You successfully connected to MongoDB!");
  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}
run().catch(console.dir);

app.get('/', (req, res) => {
    res.send('Air-Cnc Running On Air Jamela...')
})

app.listen(port, ()=>{
    console.log(`Air Cnc running on ${port}`)
})