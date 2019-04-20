const functions = require('firebase-functions');
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
    
      // データを返却
      res.status(200).send(`id: ${req.body.id} lines:${req.body.lines}` + JSON.stringify(users));
});

const api = functions.region('asia-northeast1').https.onRequest(app);
module.exports = { api };



