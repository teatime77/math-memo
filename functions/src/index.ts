const functions = require('firebase-functions');

const admin = require('firebase-admin');

admin.initializeApp(functions.config().firebase);

const db = admin.firestore();


const express = require("express");
const cors = require('cors');

const app = express();

app.use(cors({ origin: true }));

app.post('/users', (req:any, res:any) => {

    const users = [
        { "id": 1, "name": "イリヤ" },
        { "id": 2, "name": "美遊" },
        { "id": 3, "name": "クロエ" },
        { "id": 4, "name": "オルタ" },
        { "id": 5, "name": "マシュ" }
    ];

    let dt = "";
    if(req.body.action === "get"){
        dt = "start";
        db.collection('users').get()
        .then((snapshot:any) => {
            snapshot.forEach((doc:any) => {
                dt += "[" + doc.id + '=>' + doc.data() + "]\n";
            });
    
            // データを返却
            res.status(200).send(`db:[${dt}] id: ${req.body.id} lines:${req.body.lines}` + JSON.stringify(users));
        })
        .catch((err:any) => {
            dt = 'Error getting documents:' + err;
    
            // データを返却
            res.status(200).send(`db:[${dt}] id: ${req.body.id} lines:${req.body.lines}` + JSON.stringify(users));
        });        
    }
    else if(req.body.action === "put"){
        // for(const block of req.body.payload){
        // }

        // payload = { id: block.id, from: block.from, lines: block.lines2 }
        const payload = req.body.payload;
        const docRef = db.collection('users').doc(payload.id);

        if(payload.from === undefined){

            docRef.set({
                // from : payload.from,
                lines: payload.lines
              // from : "FROM",
                // lines: "LINES"
              });
              }
        else{

            docRef.set({
                from : payload.from,
                lines: payload.lines
              // from : "FROM",
                // lines: "LINES"
              });
        }

        res.status(200).send("put end:" + JSON.stringify(payload));
    }
    else if(req.body.action === "test") {      

        const docRef = db.collection('users').doc('alovelace');

        docRef.set({
          first: 'Ada',
          last: 'Lovelace',
          born: 1815
        });
    
        const aTuringRef = db.collection('users').doc('aturing');
    
        aTuringRef.set({
          'first': 'Alan',
          'middle': 'Mathison',
          'last': 'Turing',
          'born': 1912
        });
    }
});

const api = functions.region('asia-northeast1').https.onRequest(app);
module.exports = { api };



