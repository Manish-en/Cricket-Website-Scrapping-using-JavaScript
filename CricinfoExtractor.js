/*the purpose of this project is to extract information of worldcup 2019 from cricinfo and present
in the form of excel and pdf scoreboards*/
//the real purpose is to learn how to extract information and get experience with javascript
//A very good reason is to have good fun

//npm init -y
//npm install minimist
//npm install axios
//npm install jsdom
//npm install excel4node
//npm install pdf-lib

//node CricinfoExtractor.js --excel=Worldcup.csv --datafolder=data --source="https://www.espncricinfo.com/series/icc-cricket-world-cup-2019-1144415/match-results"

let minimist=require("minimist");
let axios=require("axios");
let jsdom=require("jsdom");
let excel=require("excel4node");
let pdf=require("pdf-lib");
let fs=require("fs");
let path=require("path");

let args=minimist(process.argv);

//download using axios
//read using jsdom
//make excel using excel4node
//make pdf using pdf-lib

let downloadPromise=axios.get(args.source);
downloadPromise.then(function(response)
{
    let html=response.data;
    let dom=new jsdom.JSDOM(html);
    let document = dom.window.document;

    let matches=[];
    let matchScoreDivs=document.querySelectorAll("div.match-score-block");
    for(let i=0;i<matchScoreDivs.length;i++)
    {
        let match={};

        let namePs=matchScoreDivs[i].querySelectorAll("p.name");
        match.t1=namePs[0].textContent;
        match.t2=namePs[1].textContent;

        let scoreSpans =matchScoreDivs[i].querySelectorAll("span.score");
        
        if(scoreSpans.length ==2)
        {
            match.t1s= scoreSpans[0].textContent;
            match.t2s= scoreSpans[1].textContent;
        }else if(scoreSpans.length ==1)
        {
            match.t1s= scoreSpans[0].textContent;
            match.t2s="";
        }else{
            match.t1s="";
            match.t2s="";
        }

        let spanResult=matchScoreDivs[i].querySelector("div.status-text > span");
        match.result=spanResult.textContent;

        matches.push(match);

    }
    let matchesJSON= JSON.stringify(matches);
    fs.writeFileSync("matches.json", matchesJSON,"utf-8");

    
    
    let teams =[];
    for(let i=0;i<matches.length;i++)
    {
        putTeamInTeamsArrayIfMissing(teams,matches[i]);
    }
    for(let i=0;i<matches.length;i++)
    {
        putMatchInAppropriateTeam(teams,matches[i]);
    }

    let teamsJSON= JSON.stringify(teams);
    fs.writeFileSync("teams.json", teamsJSON,"utf-8");

    //Creatng Excel Files
    createExcelFile(teams);
    
    //Creating Folders
    createfolders(teams);

})


function putTeamInTeamsArrayIfMissing(teams,match){
    let t1idx=-1;
    for(let i=0;i<teams.length;i++)
    {
        if(teams[i].name == match.t1)
        {
            t1idx=i;
            break;
        }
    }
    if(t1idx == -1)
    {
        teams.push({
            name: match.t1,
            matches: []
        })
    }


    let t2idx=-1;
    for(let i=0;i<teams.length;i++)
    {
        if(teams[i].name == match.t2)
        {
            t2idx=i;
            break;
        }
    }
    if(t2idx == -1)
    {
        teams.push({
            name: match.t2,
            matches: []
        })
    }

}

function putMatchInAppropriateTeam(teams,match){
    let t1idx = -1;
    for(let i=0;i<teams.length;i++)
    {
        if(teams[i].name == match.t1)
        {
            t1idx=i;
            break;
        }
    }

    let team1=teams[t1idx];
    team1.matches.push({
        vs:match.t2,
        selfScore: match.t1s,
        oppScore: match.t2s,
        result: match.result
    });


    let t2idx = -1;
    for(let i=0;i<teams.length;i++)
    {
        if(teams[i].name == match.t2)
        {
            t2idx=i;
            break;
        }
    }

    let team2=teams[t2idx];
    team2.matches.push({
        vs:match.t1,
        selfScore: match.t2s,
        oppScore: match.t1s,
        result: match.result
    });

}

function createExcelFile(teams){
    let wb = new excel.Workbook();
    
    for(let i=0; i<teams.length; i++)
    {
        let sheet = wb.addWorksheet(teams[i].name);

        sheet.cell(1,1).string("VS");
        sheet.cell(1,2).string("Self Score");
        sheet.cell(1,3).string("Opponent Score");
        sheet.cell(1,4).string("Result");

        for(let j=0; j< teams[i].matches.length;j++)
        {
            sheet.cell(2+j,1).string(teams[i].matches[j].vs);
            sheet.cell(2+j,2).string(teams[i].matches[j].selfScore);
            sheet.cell(2+j,3).string(teams[i].matches[j].oppScore);
            sheet.cell(2+j,4).string(teams[i].matches[j].result);
        }
    }

    wb.write(args.excel);
}

function createfolders(teams)
{
    fs.mkdirSync(args.datafolder);
    for(let i=0; i< teams.length;i++)
    {
        let teamFN =path.join(args.datafolder ,teams[i].name);
        fs.mkdirSync(teamFN);

        for(let j=0; j< teams[i].matches.length;j++)
        {
            let matchFileName =path.join(teamFN, teams[i].matches[j].vs);
            createScoreCard(teams[i].name, teams[i].matches[j] , matchFileName);
        }
    }
}

function createScoreCard(teamName,match,matchFileName)
{
    let t1 =teamName;
    let t2= match.vs;
    let t1s=match.selfScore;
    let t2s=match.oppScore;
    let result=match.result;

    let bytesOfPDFTemplate = fs.readFileSync("Template.pdf");
    let pdfPromise = pdf.PDFDocument.load(bytesOfPDFTemplate);
    pdfPromise.then(function(pdfdoc){
        let page = pdfdoc.getPage(0);

        page.drawText(t1,{
            x:320,
            y: 640,
            size: 25
        });
        page.drawText(t2,{
            x:320,
            y: 585,
            size: 25
        });
        page.drawText(t1s,{
            x:320,
            y: 535,
            size: 20
        });
        page.drawText(t2s,{
            x:320,
            y: 485,
            size: 20
        });
        page.drawText(result,{
            x:305,
            y: 430,
            size: 10
        });

        let finalPDFBytesPromise = pdfdoc.save();
        finalPDFBytesPromise.then(function(finalPDFBytes){
            if(fs.existsSync(matchFileName + ".pdf")==true)
            {
                fs.writeFileSync(matchFileName + "1.pdf" , finalPDFBytes);
            }else{
            fs.writeFileSync(matchFileName +".pdf", finalPDFBytes);
            }
        })
    })
}

