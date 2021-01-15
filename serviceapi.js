//Written by Jeremy Larson
var express = require('express');
var router = express.Router();
const querystring = require('querystring');
var request = require('request-promise');
const fetch = require('node-fetch');
var sendgrid = require('../functions/maintenancenot');
var moment = require('moment-timezone');
var d3 = require("d3");

const cwoptions = {
    method: 'GET', 
    headers: {
        'authorization' : "connectwise auth token",
        'clientId' : 'connectwise-clientid',
        'Content-Type': 'application/json'
            }
    };

var combine = function(cwid,companyname,contactname,summary,notesresponse,configuration){
    return {'ticketId' : cwid,'companyname' : companyname,'contactname' : contactname,'summary' : summary, 'notes': notesresponse, 'configuration':configuration};
};





var createteamsmsg = async function (teamscontent)
{
    console.log(teamscontent)
    const configurationinfo = await fetch(teamscontent.configuration,cwoptions);
    var configjson = await configurationinfo.json(); 
    var url = 'teamschannel webhook url'
	var headers = {"Content-type": "application/json"}
	var ticketurl = "https://na.myconnectwise.net/companyname?company=companyname&goto="+ teamscontent.ticketId
	var pretext = "New Ticket from " + teamscontent.contactname + " at "+teamscontent.companyname
	var title =  "Ticket #"+ teamscontent.ticketId +": "+ teamscontent.summary
	var Ticket = pretext + " -  " + title + " - " + ticketurl
    var notes = teamscontent.notes
    //console.log(configjson[0]);
    console.log("Sending Teams MSG");
    if (typeof configjson[0] == "undefined")
    {var labtechurl = "https://labtech.companyname.com/Automate/browse/companies/computers"}
    else{var labtechurl = "https://labtech.companyname.com/automate/computer/"+configjson[0].deviceIdentifier+"/normal-tiles"}
    
    var data = {
        url : url,
        headers : headers,
        method : 'POST',
        json : { 
            "@type": "MessageCard",
            "@context": "http://schema.org/extensions",
            "themeColor": "0076D7",
            "summary": pretext,
            "sections": [
                {
                    "activityTitle": pretext,
                    "activityImage": "https://www.companyname.com/images/logo/cwowlsmall.png",
                    "facts": [
                        {
                            "name": "Ticket",
                            "value": title
                        },
                        {
                            "name": "Created",
                            "value": Date()
                        },
                        {
                            "name": "Status",
                            "value": "New"
                        },
                        {
                            "name": "Notes",
                            "value": notes,
							"wrap": false
                        }
                    ],
                    "markdown": true
                }
            ],
            "potentialAction": [
                {
                    "@type": "ActionCard",
                    "name": "Change status",
                    "inputs": [
                        {
                            "@type": "MultichoiceInput",
                            "id": "list",
                            "title": "Pick an option",
                            "style": "expanded",
                            "choices": [
                                {
                                    "display": "In Progress",
                                    "value": "1"
                                },
                                {
                                    "display": "Needs Dispatch",
                                    "value": "453"
                                },
                                {
                                    "display": "Waiting Parts",
                                    "value": "454"
                                },
                                {
                                    "display": "Closed",
                                    "value": "17"
                                },
                                {
                                    "display": "Closed-No Email",
                                    "value": "555"
                                }
                            ]
                        }
                        ],
                        "actions": [
                            {
                                "@type": "HttpPOST",
                                "name": "Submit",
                                "target": "https://company.com/api/actions/"+teamscontent.ticketId,
								"body": "{\"submit\":\"{{list.value}}\"}"
								
                            }
                        ]
                },
                {
                    "@type": "OpenUri",
                    "name": "View Ticket",
                    "targets": [
                        {
                            "os": "default",
                            "uri": "https://na.myconnectwise.net/v4_6_release/services/system_io/Service/fv_sr100_request.rails?service_recid="+teamscontent.ticketId+"&companyName=company"
                        }
                    ]
                },
                {
                    "@type": "OpenUri",
                    "name": "Open Config in LT",
                    "targets": [
                        {
                            "os": "default",
                            "uri": labtechurl
                        }
                    ]
                }
            ]
        }};
    var resp= await request(data).then(function(){return resp;}).catch(function(err){console.log(err)});
   

};

async function executeAsyncTask (cwid) {
    const cwserviceurl = await fetch('https://api-na.myconnectwise.net/v4_6_release/apis/3.0/service/tickets/'+cwid,cwoptions);
    const valueA = await cwserviceurl.json();
    const cwnotesurl = await fetch('https://api-na.myconnectwise.net/v4_6_release/apis/3.0/service/tickets/'+cwid+"/notes",cwoptions);
    const valueB = await cwnotesurl.json();
	
    return ({'Serviceticket' : valueA,'Ticket_notes' : valueB})
}
async function groupBy(array){
    return(
        d3.nest()
        .key(function(d) { return d.name; })
        
        .rollup(function(v) { return {
                count: v.length,
                hours: d3.sum(v, function(d) { return d.hours; })
            }; })
        .entries(array)
    )
}


router.get('/service/timeentries', async function(req,res){
    var timeentriesarr =[];
    var finalarr=[];
    var Startdate = (req.query.Startdate);
    var Enddate = (req.query.Enddate);
    if (Enddate)
    {
        var timeentries = 'https://api-na.myconnectwise.net/v4_6_release/apis/3.0/time/entries?conditions=dateEntered>['+Startdate+'] and dateEntered < ['+Enddate+']&pageSize=200';
    }
    else
    { 
        var timeentries = 'https://api-na.myconnectwise.net/v4_6_release/apis/3.0/time/entries?conditions=dateEntered>['+Startdate+']&pageSize=200';
    }
    const entriesresponse = await fetch(timeentries, cwoptions);
    const timeentriesjson = await entriesresponse.json();
    var entrieslen = timeentriesjson.length;
    console.log(entrieslen);
    for (var i = 0; i<entrieslen; i++)
    {
        //console.log(schedules[i].objectId+", "+ schedules[i].id +", "+schedules[i].type.id)
        var entries ={};
        var entries = {"name":timeentriesjson[i].member.name, "hours":timeentriesjson[i].actualHours, "enteredby":timeentriesjson[i].enteredBy,"timestart": moment(timeentriesjson[i].timeStart).tz("America/New_York").format(), "ticketid":timeentriesjson[i].chargeToId, "ticketurl" : "https://na.myconnectwise.net/v4_6_release/services/system_io/Service/fv_sr100_request.rails?service_recid="+timeentriesjson[i].chargeToId+"&companyName=company"}
        timeentriesarr.push(entries);
    }
    finalarr.push(timeentriesarr);
    finalarr.push(await groupBy(timeentriesarr))
    
    res.json(finalarr);

    
});

router.post('/servicesingle/:cwid',async function(req,res){
    var response = querystring.parse(req.params.cwid);
    var cwid = Object.keys(response)[0];
    var now = new Date();
	var ClientIPAddress = (req.headers['x-forwarded-for'] || '').split(',')[0] || req.connection.remoteAddress;
    console.log("Timestamp: "+now+" Client IP: "+ ClientIPAddress)
    
    var fullticket = (await executeAsyncTask(cwid));
    if (fullticket.Serviceticket.hasOwnProperty("contact"))
    {
        var contactname = fullticket.Serviceticket.contact.name;
    }
    else
    {
        var contactname = "No Contact"
    }
    var startticketinfo = await combine(cwid,fullticket.Serviceticket.company.name,contactname,fullticket.Serviceticket.summary,fullticket.Ticket_notes[0].text,fullticket.Serviceticket._info.configurations_href);
    res.json(startticketinfo)
    
    });


	
router.post('/actions/:ticketid', function(req,res){
	var now = new Date();
	var ticketid = req.params.ticketid
    var statusid = req.body.submit;
    var ClientIPAddress = (req.headers['x-forwarded-for'] || '').split(',')[0] || req.connection.remoteAddress;
    console.log("Timestamp: "+now+" Client IP: "+ ClientIPAddress);
	const cwpostoptions = {
    method: 'PATCH', 
    headers: {
        'authorization' : "connectwise auth token",
        'clientId' : 'connectwise client id',
        'Content-Type': 'application/json'
            },
	body: JSON.stringify([{
    "op": "replace",
    "path": "/status/id",
    "value": statusid
}])
    };
const fetchresult = fetch('https://api-na.myconnectwise.net/v4_6_release/apis/3.0/service/tickets/'+ticketid,cwpostoptions);
console.log("Submitted Ticket Status Change from Teams HttpPost at "+ now)
res.status(200).send('POST to company A OK').end();
    
});	
	
	
	
router.post('/service/',async function(req,res){
    var response = req.query;
	var cwid = Object.keys(response)[0];
    var now = new Date();
	var ClientIPAddress = (req.headers['x-forwarded-for'] || '').split(',')[0] || req.connection.remoteAddress;
	var excludeclients = ['Growing Up Green Charter School'];
    console.log("Timestamp: "+now+" Client IP: "+ ClientIPAddress);
	
    if (response.action === "added" & response.memberId != "labtech") 
    {
        var fullticket = (await executeAsyncTask(cwid));
        //console.log(fullticket);
        
        if (fullticket.Serviceticket.code == "NotFound")
        {
            //console.log('Teams MSG 1')
            res.status(202).send('Thanks for POSTing').end();
        }
        else if (typeof fullticket.Serviceticket.company.name == "undefined")
        {
            //console.log('Teams MSG 2')
            res.status(202).send('Thanks for POSTing').end();
        }
		else if (fullticket.Serviceticket.company.name == 'client to be excluded name')
		{
            //console.log('Teams MSG 3')
            res.status(202).send('Thanks for POSTing').end();
        }
		else{
            if (fullticket.Serviceticket.hasOwnProperty("contact"))
            {
                //console.log('Teams MSG 4')
                var contactname = fullticket.Serviceticket.contact.name;
            }
            else
            {
                //console.log('Teams MSG 5')
                var contactname = "No Contact"
            }
            var startticketinfo = await combine(cwid,fullticket.Serviceticket.company.name,contactname,fullticket.Serviceticket.summary,fullticket.Ticket_notes[0].text,fullticket.Serviceticket._info.configurations_href);
            //console.log(startticketinfo);
            var teamsmsgcreated = await createteamsmsg(startticketinfo);
            console.log("Teams Message Creation Output: "+teamsmsgcreated);
            
            
            res.status(200).send('POST to company OK').end();  
        }
    }
    else
	{
		res.status(202).send('Thanks for POSTing').end();
		//res.send(cwid)
		//ticketinfo = getcwticket(cwid);
		//console.log(ticketinfo);
		//res.send(newinfo);
		//res.send(ticketinfo);
	}
});

router.post('/servicecallback/',async function(req,res){
    var response = req.query;
	var cwid = Object.keys(response)[0];
    var now = new Date();
	var ClientIPAddress = (req.headers['x-forwarded-for'] || '').split(',')[0] || req.connection.remoteAddress;
	var excludeclients = ['clientname'];
    console.log("Timestamp: "+now+" Client IP: "+ ClientIPAddress);
    console.log(response);
    if (response.action === "added") 
    {
        var fullticket = (await executeAsyncTask(cwid));
        //console.log(fullticket);
        
        if (fullticket.Serviceticket.code == "NotFound")
        {
            //console.log('Teams MSG 1')
            res.status(202).send('Thanks for POSTing').end();
        }
        else if (typeof fullticket.Serviceticket.company.name == "undefined")
        {
            //console.log('Teams MSG 2')
            res.status(202).send('Thanks for POSTing').end();
        }
		else if (fullticket.Serviceticket.company.name == 'client to be excluded')
		{
            //console.log('Teams MSG 3')
            res.status(202).send('Thanks for POSTing').end();
        }
		else{
            if (fullticket.Serviceticket.hasOwnProperty("contact"))
            {
                //console.log('Teams MSG 4')
                var contactname = fullticket.Serviceticket.contact.name;
            }
            else
            {
                //console.log('Teams MSG 5')
                var contactname = "No Contact"
            }
            var startticketinfo = await combine(cwid,fullticket.Serviceticket.company.name,contactname,fullticket.Serviceticket.summary,fullticket.Ticket_notes[0].text,fullticket.Serviceticket._info.configurations_href);
            //console.log(startticketinfo);
            var teamsmsgcreated = await createteamsmsg(startticketinfo);
            console.log("Teams Message Creation Output: "+teamsmsgcreated);
            
            
            res.status(200).send('POST to company OK').end();  
        }
    }
    else
	{
		res.status(202).send('Thanks for POSTing').end();
		//res.send(cwid)
		//ticketinfo = getcwticket(cwid);
		//console.log(ticketinfo);
		//res.send(newinfo);
		//res.send(ticketinfo);
	}
});

module.exports = router;
