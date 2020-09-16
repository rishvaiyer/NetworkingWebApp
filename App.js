'use strict';
var debug = require('debug');
var express = require('express');
var path = require('path');
var favicon = require('serve-favicon');
var logger = require('morgan');
var cookieParser = require('cookie-parser');
var bodyParser = require('body-parser');


const MongoClient = require('mongodb').MongoClient;
const uri = "mongodb+srv://dbUser:jxrD5DU0SnMCsPtt@tutorialcluster-l7xp4.mongodb.net/test?retryWrites=true&w=majority";
var mongoClient = new MongoClient(uri, { useNewUrlParser: true });



var app = require('express')();
var http = require('http').createServer(app);
var io = require('socket.io')(http);
app.use(bodyParser.urlencoded({ extended: false }));


app.use(bodyParser.json()); 
app.use(express.static('static')) 

http.listen(1337, function () {
    console.log('listening on *:1337');
});





//Socket IO

var clients = [];

io.on('connection', function (socket) {
    socket.emit('requestName');

    socket.on('SendingMessage', function (messageObj) {
        
        messageObj.senderID = socket.id; 
        messageObj.senddate = new Date();
        clients.forEach(function (client) {
            if (client.socketID == messageObj.recipient) { 
                messageObj.recipientuserid = client.userid;
            } else if (client.socketID == messageObj.senderID) {
                messageObj.senderuserid = client.userid;
            }
        });

        MongoClient.connect(uri, function (err, client) {
            console.log("Connected successfully to server");

            const db = client.db("tutorial");
            var collection = db.collection("chat");

            collection.insertOne(messageObj);
            client.close();
        });
        socket.to(messageObj.recipient).emit('ReceivingMessage', messageObj);

    });
    socket.on('sendName', function (identityObj) {
        var client = new Object();
        client.name = identityObj.name;
        client.type = identityObj.type;
        client.userid = identityObj.userid;
        client.socketID = socket.id;
      
        clients.push(client);
        console.log(clients);
       
        socket.broadcast.emit('newUser');

    });
    socket.on('startTyping', function (typingObj) {
        socket.to(typingObj.recipient).emit('startTyping', typingObj.name);
    });

    socket.on('stopTyping', function (typingObj) {
        socket.to(typingObj.recipient).emit('stopTyping', typingObj.name);
    });

    socket.on('disconnect', (reason) => {
        for (var i = 0; i < clients.length; i++) {
            if (clients[i].socketID == socket.id) {
                console.log("Removing: " + clients[i].name + " because of disconnect");
                clients.splice(i, 1);

            }
        }
    });

    socket.on('grabActive', function (clientType) {
        var activeUsers = [];
        clients.forEach(function (client) {
            if (client.type != clientType) { // making sure students only see employers online and vice versa
                activeUsers.push(client);
            }
        });
        socket.emit('receivingActiveUsers', activeUsers);
    });

    socket.on('getHistory', function (otherParty) {
        var identities = new Object();
        var history = new Object();
        
        clients.forEach(function (client) {
            if (client.socketID == socket.id) {
                identities.requestorid = client.userid;
            } else if (client.socketID == otherParty) {
                identities.otherParty = client.userid;
            }
        });
        MongoClient.connect(uri, function (err, client) {
            + identities.requestorid);

            const db = client.db("tutorial");
            var collection = db.collection("chat");
             
           collection.find({
                $and: [
                    { $or: [{ senderuserid: identities.requestorid }, { senderuserid: identities.otherParty }] },
                    { $or: [{ recipientuserid: identities.requestorid }, { recipientuserid: identities.otherParty }] }
                ]
           }).sort({date:1}).toArray(function (err, results) { //chronological order for history
                if (results.length > 0) {
                    results.forEach(function (message) { 

                      
                        if (message.senderuserid == identities.requestorid) {
                            message.direction = "out";
                        } else if(message.recipientuserid == identities.requestorid) {
                            message.direction = "in";
                        }

                    });
                    socket.emit('receivingHistory', results);

                }
            });
            client.close();
        });
    });
});

//App POST
app.post('/signupemployer', function (req, res) {

    MongoClient.connect(uri, function (err, client) {
        console.log("Connected successfully to server signing up employer");

        const db = client.db("tutorial");
        var collection = db.collection("companies");

        collection.insertOne(req.body);
        client.close();
    });

    res.send(req.body);
});

app.post('/signupstudent', function (req, res) {

    MongoClient.connect(uri, function (err, client) {
        console.log("Connected successfully to server signing up student");

        const db = client.db("tutorial");
        var collection = db.collection("students");

        collection.insertOne(req.body);
        client.close();
    });


    res.send(req.body);
});

app.post('/loginemployer', function (req, res) {

    MongoClient.connect(uri, function (err, client) {
        console.log("Connected successfully to server logging in employer");

        const db = client.db("tutorial");
        var collection = db.collection("companies");

        collection.findOne({ companyUsername: req.body.username, companyPassword: req.body.password },
            function (err, result) {
            if (err) throw err;
            if (result !== null) {
                res.send(result);
            } else {
                res.send("notfound");
            }
        });
        client.close();
    });




});

app.post('/loginstudent', function (req, res) {



    MongoClient.connect(uri, function (err, client) {
        console.log("Connected successfully to server logging in student");

        const db = client.db("tutorial");
        var collection = db.collection("students");

        collection.findOne({ studentUsername: req.body.username, studentPassword: req.body.password }, function (err, result) {
            if (err) throw err;
            if (result !== null) {

                res.send(result);
            } else {
                res.send("notfound");
            }
        });
        client.close();
    });


});



app.post('/addjob', function (req, res) {



    MongoClient.connect(uri, function (err, client) {
        console.log("Connected successfully to server to add a job");

        const db = client.db("tutorial");
        var collection = db.collection("jobs");

        collection.insertOne(req.body);
        client.close();
    });
    res.send(req.body);


});

app.post('/grabEmployerJobs', function (req, res) {

    MongoClient.connect(uri, function (err, client) {
        console.log("Connected successfully to server grabbing specific jobs");

        const db = client.db("tutorial");
        var collection = db.collection("jobs");
        collection.find({
            companyName : req.body.companyName
        }).toArray(function (err, results) {
            if (results.length > 0) {
               
                res.send(results);

            }
        });
        client.close();
    });


});

app.post('/grabAllJobs', function (req, res) {

    MongoClient.connect(uri, function (err, client) {
        console.log("Connected successfully to server to grab all jobs");

        const db = client.db("tutorial");
        var collection = db.collection("jobs");
        collection.find({ }).toArray(function (err, results) { //FIND ALL 
            if (results.length > 0) {

                res.send(results);

            }
        });
        client.close();
    });


});



app.post('/grabStudentInfo', function (req, res) {

    MongoClient.connect(uri, function (err, client) {
        console.log("Connected successfully to server ready to grab student info");

        const db = client.db("tutorial");
        var collection = db.collection("students");
        collection.find({
            studentName: req.body.studentName
        }).toArray(function (err, results) {
            if (results.length > 0) {

                res.send(results);

            }
        });
        client.close();
    });


});


