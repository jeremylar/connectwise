var cron = require('node-cron');
const querystring = require('querystring');
var bodyparser = require('body-parser');
const fetch = require('node-fetch');
var moment = require('moment');
const schedids=[1,2,5,6,7,8,9,13,15,16,17];
var scheduletypes={1:"Outlook Entry",2:"Personal",5:"Training",6:"Vacation",7:"Misc. Service",8:"Holiday",9:"Meeting",13:"Schedule Hold",15:"Late",16:"In House Support",17:"School"}
const nodemailer = require('nodemailer');

var transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: "username@gmail.com", 
        pass: "userpassword" 
    }
});

function returnscheduletypename(scheduletype)
{
    return scheduletypes[scheduletype]        
}

async function asyncTask (datetorun) {
    
    console.log(datetorun)
    if (datetorun == 'today')
    { 
        let today = moment(new Date()).format();
        var urlstart = moment(new Date()).format('YYYY-MM-DDT00:00:00');
        var urlend = moment(new Date()).add(1,'days').format('YYYY-MM-DDT00:00:00');
        var emailcontenttime = moment(new Date()).format('dddd, MMMM Do YYYY');
        /*
        let tomorrow  = moment(new Date()).add(1,'days').format('YYYY-MM-DDT00:00:00');
        let tomorrownice = moment(new Date()).add(1,'days').format('dddd, MMMM Do YYYY');
        let tomorrowdateonly = moment(new Date()).add(1,'days').format('YYYY-MM-DD');
        let dayafter = moment(new Date()).add(2,'days').format('YYYY-MM-DDT00:00:00');
        */
    }
    else {
    var urlstart = moment(new Date()).add(1,'days').format('YYYY-MM-DDT00:00:00');
    var urlend = moment(new Date()).add(2,'days').format('YYYY-MM-DDT00:00:00');
    var emailcontenttime = moment(new Date()).add(1,'days').format('dddd, MMMM Do YYYY');  
    /*  
    let today = moment(new Date()).format();
    let tomorrow  = moment(new Date()).add(1,'days').format('YYYY-MM-DDT00:00:00');
    let tomorrownice = moment(new Date()).add(1,'days').format('dddd, MMMM Do YYYY');
    let tomorrowdateonly = moment(new Date()).add(1,'days').format('YYYY-MM-DD');
    let dayafter = moment(new Date()).add(2,'days').format('YYYY-MM-DDT00:00:00');
    
    */
    }
    const cwoptions = {
        method: 'GET', 
        headers: 
            {
                'authorization' : "basic key",
                'clientId' : '<client id>',
            'Content-Type': 'application/json'
        }
    };

    var urlscheduleddispatch = 'https://api-na.myconnectwise.net/v4_6_release/apis/3.0/schedule/entries?conditions=dateStart>[' + urlstart + '] and dateStart<['+urlend+'] and doneFlag=False';
    // var urlscheduleddispatch = 'https://api-na.myconnectwise.net/v4_6_release/apis/3.0/schedule/entries?conditions=dateStart>[2018-11-04T00:00:00] and dateStart<[2018-11-06T00:00:00] and doneFlag=False'
    //Get List of schedule ID's and members
    const dispatchresponse = await fetch(urlscheduleddispatch, cwoptions);
    const schedules = await dispatchresponse.json();
    var len = schedules.length;
    var emailtable ='';
    var employees =[];
    for (var i = 0; i<len; i++)
    {
        //console.log(schedules[i].objectId+", "+ schedules[i].id +", "+schedules[i].type.id)
        
        var employee ={};
        if(schedules[i].objectId == 0)
        {   
            var title = returnscheduletypename(schedules[i].type.id);
            var employee = {"objectid":schedules[i].objectId,"schedid":schedules[i].id,"employeeName":schedules[i].member.name, "datestart":schedules[i].dateStart, "dateend":schedules[i].dateEnd, "title":title+" - "+schedules[i].name , "ticketID" : "N/A", "CompanyName": "CompanyName"}
            employees.push(employee);
            var tablerow = '<tr><td align="center"  bgcolor="#CCFFFF">'+schedules[i].member.name+'</td><td align="center" >'+moment(schedules[i].dateStart).format('MMMM Do YYYY, h:mm:ss a')+'</td><td align="center" >CompanyName</td><td align="center" >'+employee.title+'</td></tr>'
        }
        else if (schedules[i].type.id in scheduletypes)
        {
            var title = returnscheduletypename(schedules[i].type.id);
            var employee = {"objectid":schedules[i].objectId,"schedid":schedules[i].id,"employeeName":schedules[i].member.name, "datestart":schedules[i].dateStart, "dateend":schedules[i].dateEnd, "title":title+" - "+schedules[i].name , "ticketID" : "N/A", "CompanyName": "CompanyName"}
            employees.push(employee);
            var tablerow = '<tr><td align="center"  bgcolor="#CCFFFF">'+schedules[i].member.name+'</td><td align="center" >'+moment(schedules[i].dateStart).format('MMMM Do YYYY, h:mm:ss a')+'</td><td align="center" >CompanyName</td><td align="center" >'+employee.title+'</td></tr>'
        }
        else if (schedules[i].type.id == 4)
        {
        var companyid;
        var companyname;
        const responseticket = await fetch('https://api-na.myconnectwise.net/v4_6_release/apis/3.0/service/tickets/'+schedules[i].objectId, cwoptions);
        const ticket = await responseticket.json();
        
        if (ticket.code =="NotFound"){
            const responseticket = await fetch('https://api-na.myconnectwise.net/v4_6_release/apis/3.0/project/tickets/'+schedules[i].objectId, cwoptions);
            const ticket = await responseticket.json();
            companyid = ticket.company.id;
            companyname = ticket.company.name;
        }
        else 
        {
            companyid = ticket.company.id;
            companyname = ticket.company.name;
        }
        
        var employee = {"objectid":schedules[i].objectId,"schedid":schedules[i].id,"employeeName":schedules[i].member.name, "datestart":schedules[i].dateStart, "dateend":schedules[i].dateEnd, "title":schedules[i].name, "ticketID" : ticket.id, "CompanyName": companyid}
        employees.push(employee);
        var tablerow = '<tr><td align="center"  bgcolor="#CCFFFF">'+schedules[i].member.name+'</td><td align="center" >'+moment(schedules[i].dateStart).format('MMMM Do YYYY, h:mm:ss a')+'</td><td align="center" >'+companyname+'</td><td align="center" >'+schedules[i].name+'</td></tr>'
        }

        else if (schedules[i].type.id == 3)
        {
        var companyid;    
        var companyname;
        const responseticket = await fetch('https://api-na.myconnectwise.net/v4_6_release/apis/3.0/project/tickets/'+schedules[i].objectId, cwoptions);
        const ticket = await responseticket.json();
        if (ticket.code =="NotFound"){companyid = "No Company";companyname = "No Company Name"}
        else {companyid = ticket.company.id;companyname = ticket.company.name} 
        var employee = {"objectid":schedules[i].objectId,"schedid":schedules[i].id,"employeeName":schedules[i].member.name, "datestart":schedules[i].dateStart, "dateend":schedules[i].dateEnd, "title":schedules[i].name, "ticketID" : ticket.id, "CompanyName": companyid}
        employees.push(employee);
        var tablerow = '<tr><td align="center"  bgcolor="#CCFFFF">'+schedules[i].member.name+'</td><td align="center" >'+moment(schedules[i].dateStart).format('MMMM Do YYYY, h:mm:ss a')+'</td><td align="center" >'+companyname+'</td><td align="center" >'+schedules[i].name+'</td></tr>'
        }

        
        emailtable = emailtable + tablerow;
    };
    var top = '<table border="0" cellpadding="0" cellspacing="0" height="100%" width="100%" id="bodyTable"> <tr> <td align="center" > <table border="0" cellpadding="20" cellspacing="0" width="700" id="emailContainer"> <tr> <td align="center" > <table border="0" cellpadding="10" cellspacing="0" width="100%" id="emailHeader"> <tr> <td align="center" >Schedule for: '+emailcontenttime+'</td> </tr><tr><td><h1>THIS SCHEDULE CAN CHANGE AT ANY TIME.  PLEASE CHECK WITH SERVICE MANAGER WITH QUESTIONS</h1></td></tr> </table> </td> </tr> <tr> <td align="center" > <table  border="1" cellspacing="0" cellpadding="10" BORDERCOLOR="#e2e1e2" style="border-collapse:collapse;"width="100%">'
    var firstrow = '<tr bgcolor="#4eb9d7" style="font-family: Verdana;   font-size: 11px; COLOR: white;   TEXT-DECORATION: none"><b><td align="center" >Staff Name</td><td align="center" >Scheduled Start time</td><td align="center" >Company</td><td align="center" >Title</td></b></tr>'
    //console.log(employees)
    var bottom = '</table> </td> </tr><tr><tr> <td align="center" > <table border="0" cellpadding="20" cellspacing="0" width="100%" id="emailFooter"> <tr> <td align="center" >CompanyName </td> </tr> </table> </td></tr></table></td></tr></table>'
    var mailOptions = {
        from: '"Name" <name@gmail.com>', // sender address
        to: 'support@domain.com', // list of receivers
        subject: 'Daily Schedule for: '+ emailcontenttime, // Subject line
        text: 'Hi Team,', // plain text body
        html: top+firstrow+emailtable+bottom
        };// html body
//console.log(JSON.stringify(emailtable));
//console.log(response[0].employee.email);

    transporter.sendMail(mailOptions, (error, info) => {
    console.log("Email sent to Staff")
    if (error) { return console.log(error); } });
}

 //const result = asyncTask("today");


console.log("Running Managed Schedule Cron");
const crontoday = cron.schedule('0 7 * * *', function(){
    var n = moment().format('MMMM Do YYYY, h:mm:ss a'); 
    const result = asyncTask("today");
    console.log("Emailed Today's Daily Schedule "+n); 
});
const crontomorrow = cron.schedule('0 19 * * *', function(){
    var n = moment().format('MMMM Do YYYY, h:mm:ss a'); 
    const result = asyncTask("tomorrow");
    console.log("Emailed Tomorrow's Daily Schedule "+n);
});
