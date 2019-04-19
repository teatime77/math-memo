import * as functions from 'firebase-functions';

const cors = require('cors')({origin: true});

// // Start writing Firebase Functions
// // https://firebase.google.com/docs/functions/typescript
//
export const helloWorld = functions.region('asia-northeast1').https
.onRequest((req, res) => {
    cors(req, res, () => {
        // res.status(500).send({test: 'Testing functions'});
        res.status(200).send("cors Hello from Firebase [" + req.body["id"] + "]" );
        // res.status(200).send("cors Hello from Firebase [" );
    });
    // res.send("Hello from Firebase!");
});
