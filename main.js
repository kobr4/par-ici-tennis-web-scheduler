import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename)

import express from "express";

import pkg from 'body-parser';
const { urlencoded } = pkg;

import { scheduleJob } from 'node-schedule';
import { v4 as uuidv4 } from 'uuid';
import { bookTennis as _bookTennis } from "./par-ici-tennis.js";


var jobList = []

const app = express();
app.use(
    urlencoded({
        extended: true
    }),
    express.static('www')
);

app.use(express.static('img'))

app.get("/index.html",
    function (req, res) {
        res.sendFile(
            __dirname + "/www/index.html"
        );
    });

app.get("/bootstap.min.css",
    function (req, res) {
        res.sendFile(
            __dirname + "/www/bootstrap.min.css"
        );
    });

app.post("/setup_schedule",
    function (req, res) {
        let login = req.body.login;
        let password = req.body.password;
        let day_of_the_week = req.body.day_of_the_week;
        let hour_of_the_day = req.body.hour_of_the_day;        
        let player1firstname = req.body.player1firstname;
        let player1lastname = req.body.player1lastname;
        let player2firstname = req.body.player2firstname;
        let player2lastname = req.body.player2lastname;  
        let location = req.body.location;
        let court = req.body.court
        let pricetype = req.body.pricetype;

        const scheduleHour = 7;
        const cron = `0 ${scheduleHour} * * *`
        const jobSchedule =  {
            "id": uuidv4(),
            "job": null,
            "login": login,
            "password": password,
            "cron": cron, 
            "hour": hour_of_the_day, 
            "day_of_the_week": day_of_the_week, 
            "last_execution_log": "",
            "player1firstname": player1firstname,
            "player1lastname": player1lastname,
            "player2firstname": player2firstname,
            "player2lastname": player2lastname,
            "location": location,
            "court": court,
            "pricetype": pricetype
        }
        
        let job = scheduleJob(cron, function(){
            console.log(`Initiating reservation for ${login}`);
            _bookTennis(false, login, password, hour_of_the_day, day_of_the_week, player1firstname, player1lastname, player2firstname, player2lastname, location, court, pricetype).then(log => jobSchedule.last_execution_log = log)
          });
        
        jobSchedule.job = job;
        jobList.push(jobSchedule)
        res.send(jobSchedule.id)
    });

app.post("/delete_job",
    function (req, res) {
        let id = req.body.id;     
        jobList.filter(j => j.id == id).map(j => j.job.cancel())
        jobList = jobList.filter(j => j.id != id)
        res.send(id)
    });    

    app.post("/perform_dryrun",
        function (req, res) {
            let id = req.body.id;     
            
            jobList.filter(j => j.id == id).map(j => _bookTennis(true, j.login, j.password, j.hour, j.day_of_the_week, j.player1firstname, j.player1lastname, j.player2firstname, j.player2lastname, j.location, j.court, j.pricetype)
                .then(log => {
                    j.last_execution_log = log;
                }))
            res.send(id)
        });        

app.get("/list_job",
    function (req, res) {
        const list = jobList.map(job => ({"id": job.id, "login": job.login, "cron": job.cron, "day_of_the_week": job.day_of_the_week, "hour": job.hour, "location": job.location, "court": job.court, "pricetype": job.pricetype}))
        res.send(list)
    });    
    

app.listen(8080, function () {
    console.log(
        "server is running on port 8080"
    );
})

app.get("/last_execution_log",
    function (req, res) {        
        res.type('txt')
        jobList.filter(j => j.id == req.query.id).map(j => res.send(j.last_execution_log));
    }  
)