var app = require('express')();
var http = require('http').Server(app);
var io = require('socket.io')(http);
var bodyParser = require('body-parser');
var config = require('./config');
var mysql = require('mysql');
var path = require('path');

app.use(bodyParser.json()); // support json encoded bodies
app.use(bodyParser.urlencoded({extended: true})); // support encoded bodies
var connection = mysql.createConnection({
    host: config.sql.host,
    user: config.sql.user,
    password: config.sql.password,
    database: config.sql.database
});
connection.connect(function (err) {
    if (err) {
        console.error('error connecting: ' + err.stack);
        return;
    }
    console.log('connected as id ' + connection.threadId);
});

app.get('/', function (req, res) {
    res.sendFile(__dirname + '/form.html');
});

var testApp = {};
app.post('/', function (req, res) {
    testApp._saveRecord(res, req.body, function (err, r) {
        if (err) {
            console.log(err)
        }
        console.log('Inserted Id', r);
        var record = testApp._showRecord(res, function (err, r1) {
            if (err) {
                console.log(err)
            }
            return r1;
            //console.log("Test", res);
        });
    });
});

testApp._saveRecord = function (res, data, callback) {
    connection.query('INSERT INTO users_profile SET ?', data, function (err, res1) {
        if (err)
            throw err;
        callback(null, res1);
    });
}

testApp._showRecord = function (res, callback) {
    connection.query('Select * from users_profile', function (err, rows, fields) {
        if (err)
            throw err;
        callback(null, rows);
    });
}

testApp._showUserRecord = function (res, callback) {
    connection.query('Select * from users_profile where id=' + res.id, function (err, rows, fields) {
        if (err)
            throw err;
        callback(null, rows);
    });
}

testApp._updateUserRecord = function (res, callback) {
    var update_data = 'firstname = "' + res.firstname + '", lastname = "' + res.lastname + '", country ="' + res.country + '", subject = "' + res.subject + '"';
    var sql = 'Update users_profile set ' + update_data + ' where id = ' + res.id;
    connection.query(sql, function (err, result) {
        if (err)
            throw err;
        callback(null, result.affectedRows);
    });
}

testApp._deleteUserRecord = function (res, callback) {
    var sql = 'delete from users_profile where id = ' + res.id;
    connection.query(sql, function (err, result) {
        if (err)
            throw err;
        callback(null, result.affectedRows);
    });
}

io.on('connection', function (socket) {
    var action = '';
    socket.on('user_data', function (data) {
        testApp._saveRecord('', data, function (err, r) {
            if (err) {
                console.log(err)
            }
            if (r.affectedRows) {
                io.emit('user_notification1', "User profile added successfully!");
            } else {
                io.emit('user_notification1', "User profile save failed!");
            }

//            io.emit('show_data', r);
        });
        //io.emit('chat message', msg);
        testApp._showRecord('', function (err, r1) {
            if (err) {
                console.log(err)
            }
            var record = testApp._prepareHTML(r1, function (err, r) {
                if (err) {
                    console.log(err)
                }
                io.emit('user_list', r);
            });
        });
    });

    socket.on('edit_user', function (id) {
        testApp._showUserRecord({'id': id}, function (err, r1) {
            if (err) {
                console.log(err)
            }
            io.emit('user_detail', r1);
        });
    })

    socket.on('delete_user', function (id) {
        data = {'id': id}
        testApp._deleteUserRecord(data, function (err, r1) {
            if (err) {
                console.log(err)
            }
            if (r1 == 1) {
                testApp._showRecord('', function (err, r1) {
                    if (err) {
                        console.log(err)
                    }
                    var record = testApp._prepareHTML(r1, function (err, r) {
                        if (err) {
                            console.log(err)
                        }
                        io.emit('user_list', r);
                    });
                });
                io.emit('user_notification', "User profile deleted successfully!");
            } else {
                io.emit('user_notification', "User profile delete failed!");
            }
        });
    })

    socket.on('update_user_data', function (data) {
        testApp._updateUserRecord(data, function (err, r1) {
            if (err) {
                console.log(err)
            }
            if (r1 == 1) {
                testApp._showRecord('', function (err, r1) {
                    if (err) {
                        console.log(err)
                    }
                    var record = testApp._prepareHTML(r1, function (err, r) {
                        if (err) {
                            console.log(err)
                        }
                        io.emit('user_list', r);
                    });
                });
                io.emit('user_notification', "User profile updated successfully!");
            } else {
                io.emit('user_notification', "User profile updated failed!");
            }
        });
    })

    testApp._showRecord('', function (err, r1) {
        var record = testApp._prepareHTML(r1, function (err, r) {
            if (err) {
                console.log(err)
            }
            io.emit('user_list', r);
        });
    });
});

testApp._prepareHTML = function (data, callback) {
    var html = '';
    html += "<table>";
    html += "<tbody>";
    html += "<th>First name</th><th>Last Name</th><th>Country</th><th>Subject</th><th>Action</th>";
    html += "</tbody>";
    data.forEach(function (item) {
        action = "<a href='javascript:void(0);' class='edit' data-id='" + item.id + "'><span class='glyphicon glyphicon-pencil'></span></a> <a href='javascript:void(0);' class='delete' data-id='" + item.id + "'><span class='glyphicon glyphicon-trash'></span></a>";
        html += "<tr><td>" + item.firstname + "</td><td>" + item.lastname + "</td><td>" + item.country + "</td><td>" + item.subject + "</td><td>" + action + "</td></tr>";
    });
    html += "</table>";
    callback('', html);
}

http.listen(3000, function () {
    console.log('listening on *:3000');
});