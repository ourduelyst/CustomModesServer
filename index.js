var express = require('express');
var Pool = require('pg-pool');
var url = require('url');
var cors = require('cors');

var app = express();
app.use(cors);

//Grabbed from https://github.com/brianc/node-pg-pool
//Helpful init when using heroku
const params = url.parse(process.env.DATABASE_URL);
const auth = params.auth.split(':');

const config = {
  user: auth[0],
  password: auth[1],
  host: params.hostname,
  port: params.port,
  database: params.pathname.split('/')[1],
  ssl: true
};

const pool = new Pool(config);
const port = 5000;

//Make our table if they aren't already
pool.connect().then(function(client) {
    //Queue queries
    client.query(`CREATE TABLE IF NOT EXISTS games_in_play(
        p1_id   char(20) PRIMARY KEY,
        p2_id   char(20) PRIMARY KEY,
        plug_id varchar(20) NOT NULL
    )`).on('end',
        function() {console.log('games_in_play created')});
    client.query(`CREATE TABLE IF NOT EXISTS plugin_installed(
        p1_id   char(20) NOT NULL,
        plug_id varchar(20) NOT NULL
    )`).on('end',
        function() {console.log('plugin_installed created')});
    client.query(`CREATE TABLE IF NOT EXISTS plugin_setup_data(
            plug_id varchar(20) PRIMARY KEY,
            game_setup_data json
    )`).on('end',
        function() {console.log('plugin_setup_data created')});
    client.on('drain', function() {
        client.release();
    });
});

app.get('/game/:p1ID/:p2ID', function(req, res) {
    pool.connect().then(function(client) {
        client.query(`SELECT game_json where p1ID=$1 AND p2ID=$2 from
        games_in_play JOIN plugin_setup_data USING (plug_id)`,
            [req.params.p1ID, req.params.p2ID]).on('end', function() {
                console.log('Retrieved game between' + req.params.p1ID + ' and ' + req.params.p2ID);
            });
        client.on('drain', function() {
            client.release();
        });
    });
});

app.put('/game/:plugID/:p1ID/:p2ID', function(req, res) {
    pool.connect().then(function(client) {
        client.query('INSERT INTO games_in_play VALUES ($1, $2, $3)',
        [req.params.p1ID, req.params.p2ID, req.params.plugID]).on('end', function() {
                console.log('Created new game between' + req.params.p1ID + ' and ' + req.params.p2ID);
            });
    });
});

app.listen(port, function () {
    console.log('Example app listening on port' + port + '!')
});

pool.on('error', function(err, client) {
    console.error('idle client error', err.message, err.stack)
});