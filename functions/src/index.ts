const functions = require('firebase-functions');

const admin = require('firebase-admin');

admin.initializeApp(functions.config().firebase);

const db = admin.firestore();


const express = require("express");
const cors = require('cors');

const app = express();

app.use(cors({ origin: true }));

app.post('/users', (req:any, res:any) => {
    if(req.body.action === "get-all-docs"){
        db.collection('docs').get()
        .then((snapshot:any) => {
            const docs: any[] = [];
            snapshot.forEach((doc:any) => {
                docs.push(doc.data());
            });

            res.status(200).send(JSON.stringify({ status: "ok", docs: docs }));
        })
        .catch((err:any) => {
            res.status(200).send(JSON.stringify({ status: "err", err: err, payload: req.body.payload }));
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

                    res.status(200).send(JSON.stringify({ status: "ok", doc: doc_inf.data() }));
                }
            })
            .catch((err:any) => {
                res.status(200).send(JSON.stringify({ status: "err", err: err, payload: req.body.payload }));
            });
    }
    else if(req.body.action === "put"){
        const doc = req.body.payload;

        const docRef = db.collection('docs').doc(doc.id);
        docRef.set({
            id  : doc.id,
            name: doc.name,
            blocks_str: doc.blocks_str
        }).then((writeResult:any) => {

            // https://cloud.google.com/nodejs/docs/reference/firestore/1.2.x/WriteResult
            res.status(200).send(JSON.stringify({ action:"put", status: "ok", doc: doc}));
        });

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



