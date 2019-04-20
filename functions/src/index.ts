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
    if(req.body.action === "get2"){
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
    else if(req.body.action === "get"){
        const doc_id = req.body.payload.id;

        const docRef = db.collection('docs').doc(doc_id);
        docRef.get()
            .then((doc_inf:any) => {
                if (!doc_inf.exists) {
                    res.status(200).send(JSON.stringify({ status: "not exists", payload: req.body.payload }));
                } 
                else {

                    res.status(200).send(JSON.stringify({ doc: doc_inf.data() }));
                }
            })
            .catch((err:any) => {
                res.status(200).send(JSON.stringify({ err: err, payload: req.body.payload }));
            });
    }
    else if(req.body.action === "put"){
        const doc = req.body.payload;

        const docRef = db.collection('docs').doc(doc.id);
        docRef.set({
            id  : doc.id,
            name: doc.name,
            blocks_str: doc.blocks_str
        });

        res.status(200).send(JSON.stringify({ action:"put", status: "ok", doc: doc}));
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



