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

// New app using express module
const app = express();
app.use(
    urlencoded({
        extended: true
    })
);

app.get("/index.html",
    function (req, res) {
        res.sendFile(
            __dirname + "/www/index.html"
        );
    });

app.post("/setup_schedule",
    function (req, res) {
        let login = req.body.login;
        let password = req.body.password;
        let day_of_the_week = req.body.day_of_the_week;
        let hour_of_the_day = req.body.hour_of_the_day;        

        console.log(`login: ${nextDayOfTheWeek}`)
        console.log(`password: ${password}`)
        console.log(`day_of_the_week: ${day_of_the_week}`)
        console.log(`hour_of_the_day: ${hour_of_the_day}`)

        day = (day_of_the_week+1)%6
        let job = scheduleJob(`0 8 * * ${day}`, function(){
            console.log('Initiating reservation');
            _bookTennis(True, login, password, hour_of_the_day, day_of_the_week)
          });
        
        const jobSchedule =  {"id": uuidv4(),"job": job,"login": login,"password": password,"cron": `0 8 * * ${day}`}
        jobList.push()
        res.send(jobSchedule.id)
    });

app.post("/delete_job",
    function (req, res) {
        let id = req.body.id;     
        
        jobList = jobList.filter(j => j.id != id)
        res.send(id)
    });    

app.get("/list_job",
    function (req, res) {
        const list = jobList.map(job => ({"id": job.id, "login": job.login, "cron": job.cron}))
        res.send(list)
    });    
    

app.listen(8080, function () {
    console.log(
        "server is running on port 8080"
    );
})