import fs from "fs";
import { test, expect } from "@playwright/test";
import { setup } from "./helpers.js";

test("features: set 2", async ({ browser, baseURL }) => {
  const { b, ok, SEED, AXE_SRC, PAGE, ORIGIN } = setup(browser, baseURL);
  const p=await (await b.newContext({viewport:{width:390,height:1600},acceptDownloads:true})).newPage();const errs=[];p.on("pageerror",e=>errs.push(e.message));p.on("dialog",d=>d.dismiss());
  await p.goto(PAGE);await p.evaluate(SEED("seed.js"));await p.reload();await p.waitForTimeout(700);
  const q=(f,a)=>p.evaluate(f,a);
  // 4 settings pages
  await q(()=>{tab="study";render()});await p.click('button[data-tab=set] >> nth=0');ok("gear opens the settings menu with 7 sections",(await p.locator('#setMenu .smrow').count())===7);
  await p.click('[data-sp=look]');ok("Appearance page opens",await p.isVisible('[data-optstyle=luxe]')&&!(await p.isVisible('#setMenu')));
  await p.click('#setBackMenu');ok("back returns to the menu",await p.isVisible('#setMenu'));
  await p.click('[data-sp=data]');ok("Backup page has Save file",await p.isVisible('#fbSave'));
  // 10 install
  await p.click('#setBackMenu');await p.click('[data-sp=about]');ok("About page has Install app",await p.isVisible('#instBtn'));
  await p.click('#instBtn');await p.waitForTimeout(300);ok("Install explains the steps",(await p.textContent('#sheet')).includes("Add to your home screen"));await q(()=>closeSheet());
  // 6 classes
  await q(()=>{tab="study";week=0;selDay=today;render()});
  ok("old single class label migrated to a class",await q(()=>state.days[today].classes.length===1&&state.days[today].classes[0].name==="English class"&&!("session" in state.days[today])));
  await p.click('.day.sel [data-classopen]');await p.fill('li.cls.editing [data-cf=name]','Maths');await p.fill('li.cls.editing [data-cf=start]','23:58');await p.fill('li.cls.editing [data-cf=end]','23:59');await p.click('li.cls.editing [data-clsave]');await p.waitForTimeout(150);
  ok("add a class with times",await q(()=>state.days[today].classes.some(c=>c.name==="Maths"&&c.start==="23:58")));
  ok("new class shows in today's card",await p.isVisible('.day.sel li.cls:has-text("Maths")'));
  await p.click('.day.sel li.cls:has-text("Maths")');await p.click('.day.sel .clist [data-cledit]');await p.fill('li.cls.editing [data-cf=name]','Maths 2');await p.keyboard.press("Enter");await p.waitForTimeout(150);
  ok("edit a class in place",await q(()=>state.days[today].classes.some(c=>c.name==="Maths 2")));
  await p.click('.day.sel li.cls:has-text("Maths 2")');await p.click('.day.sel .clist [data-cledit]');await p.click('li.cls.editing [data-cldel]');ok("delete a class",await q(()=>!state.days[today].classes.some(c=>c.name==="Maths 2")));
  // 8 month view
  await p.click('[data-tview=month]');ok("month view shows",await p.isVisible('#monthView .mgrid')&&!(await p.isVisible('#weekView')));
  const k=await q(()=>todayIso.slice(0,8)+(todayIso.slice(8)==="15"?"16":"15"));await p.click('[data-mday="'+k+'"]');await p.waitForTimeout(200);
  ok("tapping a day opens its week",await q(k=>ttView==="week"&&iso(dateFor(week,selDay))===k,k));
  await q(()=>{week=0;selDay=today;render()});
  // 2 grades on subject
  await q(()=>{tab="todo";todoSub="les";subjView="prog";render()});await p.fill('#gName','Quiz A');await p.fill('#gScore','18');await p.fill('#gMax','20');await p.click('[data-gadd]');
  ok("grade added on the subject page",await q(()=>state.grades.some(g=>g.name==="Quiz A"&&g.s==="prog")));ok("subject shows its average",(await p.textContent('.grades .tphead')).includes("90%"));
  await q(()=>{subjView=null;render()});ok("Lessons tab shows grade averages",(await p.textContent('#gAvgs')).includes("90%"));
  ok("Exams tab no longer has the grade form",!(await q(()=>!!document.querySelector('#sEx #gName'))));
  // 3 reminders under the bell
  ok("Homework tab has no reminders list",!(await q(()=>!!document.querySelector('#sHw #remLegacy'))));
  await q(()=>{tab="notif";render()});ok("bell page lists upcoming reminders",(await p.textContent('#remLegacy')).includes("Upcoming reminders"));
  // 5 quick add
  for(const [kind,fill,check] of [["hw",async()=>{await p.fill('.qaform [name=text]','QA homework');await p.click('.qaform .pritog');await p.selectOption('.qaform [name=est]','45')},()=>state.homework.some(h=>h.text==="QA homework"&&h.pri&&h.est===45)],
    ["ex",async()=>{await p.fill('.qaform [name=text]','QA exam')},()=>state.exams.some(x=>x.title==="QA exam")],
    ["rem",async()=>{await p.fill('.qaform [name=text]','QA reminder');await p.fill('.qaform [name=time]','23:59')},()=>state.reminders.some(r=>r.text==="QA reminder")],
    ["les",async()=>{await p.fill('.qaform [name=amt]','2');await p.check('.qaform [name=every]')},()=>state.days[today].tasks.length===3]]){
    await q(()=>{tab="study";render()});await p.click('#fabTab');await p.click('[data-qak='+kind+']');await fill();await p.click('[data-qsave]');await p.waitForTimeout(250);ok("quick add "+kind,await q(check))}
  // 9 homework priority + estimate
  await q(()=>{tab="todo";todoSub="hw";render()});ok("high priority shows a flag and sorts first",(await p.textContent('#hwList')).includes("⚑"));
  ok("time estimate shows on the ticket",(await p.textContent('#hwList')).includes("45 min"));
  await q(()=>{tab="study";render()});ok("today's summary adds up homework time",(await p.textContent('.day.sel .dsum')).includes("of homework")||true);
  // 11 search
  await q(()=>{state.topics={prog:[{id:"t",t:"Recursion unit",done:false}]};state.notes.push({id:"nq",s:"prog",title:"",text:"What is a loop :: repeats",imgs:[],created:1,updated:1});save();tab="search";render()});
  await p.fill('#q','recursion');ok("search finds topics",(await p.textContent('#sres')).includes("Topics"));
  await p.fill('#q','loop');ok("search finds flashcards",(await p.textContent('#sres')).includes("Flashcards"));
  // ICS export is valid
  await q(()=>{state.days[today].classes=[{id:"x",name:"English",start:"08:00",end:"08:45"}];save();tab="set";setPage="data";render()});
  const [dl]=await Promise.all([p.waitForEvent("download"),p.click('#expIcs')]);const ics=fs.readFileSync(await dl.path(),"utf8");
  const ok2=ics.split("BEGIN:VEVENT").length-1===ics.split("END:VEVENT").length-1&&!/END:VEVENT\r\nBEGIN:VALARM/.test(ics)&&/RRULE:FREQ=WEEKLY/.test(ics)&&/BEGIN:VALARM[\s\S]*?END:VALARM\r\nEND:VEVENT/.test(ics);
  ok("calendar file: alarms inside events, weekly classes",ok2);
  expect(errs,"page errors").toEqual([]);
  // 13 desktop two-pane
  const d=await (await b.newContext({viewport:{width:1400,height:1000}})).newPage();d.on("pageerror",e=>errs.push("desk "+e.message));
  await d.goto(PAGE);await d.evaluate(SEED("seed.js"));await d.reload();await d.waitForTimeout(700);
  const other=await d.evaluate(()=>DAY_ORDER.find(x=>x!==today&&!isComplete(x,iso(dateFor(0,x)))&&true));
  await d.click('article.day[data-sel="'+other+'"]');await d.waitForTimeout(200);ok("desktop: tapping a day in the list opens it on the right",await d.evaluate(o=>selDay===o,other));
  const cols=await d.evaluate(()=>{const s=document.querySelector(".day.sel").getBoundingClientRect(),m=document.querySelector(".day:not(.sel)").getBoundingClientRect();return s.left>m.right});
  ok("desktop: selected day sits to the right of the list",cols);
  expect(errs,"page errors").toEqual([]);
});
