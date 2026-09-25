import fs from "fs";
import { test, expect } from "@playwright/test";
import { setup } from "./helpers.js";

test("features: set 1", async ({ browser, baseURL }) => {
  const { b, ok, SEED, AXE_SRC, PAGE, ORIGIN } = setup(browser, baseURL);
  const ctx=await b.newContext({viewport:{width:390,height:1600}});const p=await ctx.newPage();const errs=[];p.on("pageerror",e=>errs.push(e.message));p.on("dialog",d=>d.dismiss());
  await p.goto(PAGE);await p.evaluate(SEED("seed.js"));await p.reload();await p.waitForTimeout(700);
  const q=(f,a)=>p.evaluate(f,a);
  // 1 flashcards
  await q(()=>{state.notes.push({id:"n1",s:"prog",title:"Vocab",text:"What is HTML :: Markup language\nloop :: repeats code\nplain line",imgs:[],created:Date.now(),updated:Date.now()});tab="todo";todoSub="les";subjView="prog";render()});
  ok("subject page offers 2 flashcards",(await p.textContent('[data-quiz=prog]')).includes("2 flashcards"));
  await p.click('[data-quiz=prog]');ok("quiz opens",await p.isVisible('#quiz .qcard'));
  await p.click('#quiz .qcard');ok("tap shows answer",await p.isVisible('#quiz .qa'));
  await p.click('[data-qz=miss]');await p.click('#quiz .qcard');await p.click('[data-qz=got]');
  ok("missed card comes back in the session",await q(()=>quiz.deck.length===3&&quiz.i===2));
  await p.click('#quiz .qcard');await p.click('[data-qz=got]');
  ok("summary: 1 of 2 right first time -> "+await p.textContent('.qdone b'),(await p.textContent('.qdone b')).trim()==="1 / 2");
  ok("card stats saved",await q(()=>Object.values(state.cards).some(r=>r.m>=0&&r.s>=1)));
  await p.click('[data-qz=close]');
  // 4 topics
  await p.fill('#tpNew','Unit 1');await p.keyboard.press("Enter");await p.fill('#tpNew','Unit 2');await p.click('[data-tpadd]');
  await p.check('[data-tptick^="prog:"] >> nth=0');ok("topics add + tick -> "+await p.textContent('.tphead span'),(await p.textContent('.tphead span')).includes("1 of 2"));
  await q(()=>{subjView=null;render()});ok("subject card shows topic progress",(await p.textContent('.subj[data-subj=prog] .tpmini')).includes("1/2 topics"));
  // 2 auto revision
  await q(()=>{tab="todo";todoSub="ex";render()});await p.click('#fabTab');await p.fill('.qaform [name=text]','Big test');await p.selectOption('.qaform [name=s]','hist');await p.fill('.qaform [name=date]',await q(()=>addDays(10)));await p.click('.qaform [data-qsave]');await p.waitForTimeout(150);
  const rev=await q(()=>{const x=state.exams.find(e=>e.title==="Big test");return Object.entries(state.dates).filter(([k,v])=>v.extra.some(t=>t.rev===x.id)).map(([k])=>k).sort()});
  ok("exam 10 days out gets 4 spread revision sessions: "+rev.join(","),rev.length===4&&rev[3]===await q(()=>addDays(9))&&rev[0]===await q(()=>addDays(0)));
  await q(()=>{const x=state.exams.find(e=>e.title==="Big test");const li=document.querySelector('#exList li.tk[data-oid="'+x.id+'"]');openMenu="ex:"+x.id+":list";render()});await p.click('#exList li.tmenu [data-exdel]');
  ok("deleting the exam removes its revision sessions",await q(()=>!Object.values(state.dates).some(v=>v.extra.some(t=>t.label==="Revise: Big test"))));
  // 3 pomodoro set
  await q(()=>{startFocus(null,25);focusAction("set")});const fe=()=>q(()=>{focus.end=Date.now()-1});
  await fe();await p.waitForTimeout(700);ok("session 1 ends -> 5 min break",await q(()=>focus.phase==="break"&&focus.dur===300000&&focus.set.n===1));
  await fe();await p.waitForTimeout(700);ok("break ends -> session 2 starts itself",await q(()=>focus.phase==="study"&&focus.set.n===2&&focus.dur===25*60000));
  await q(()=>{focus.set.n=4});await fe();await p.waitForTimeout(700);ok("after session 4 -> 15 min long break",await q(()=>focus.phase==="break"&&focus.dur===900000&&focus.set.long));
  await fe();await p.waitForTimeout(700);ok("set complete message",(await p.textContent('#focus .fmsg')).includes("Set of 4 done"));
  await q(()=>{focusAction("close")});
  // 9 streak
  await q(()=>{const y=addDays(-1),x=dayData(state,y);x.done.z1=1;save();render()});
  ok("streak shows on today's card: "+(await q(()=>streakDays())),await q(()=>streakDays())===2&&(await p.textContent('.day.sel .dsum')).includes("2-day streak"));
  await q(()=>{const k=addDays(-2),x=dayData(state,k);x.done.z2=1;x.auto={z2:1};save()});ok("auto-ticked days don't count (streak stays 2)",await q(()=>streakDays())===2);
  // 8 holidays
  await q(()=>{tab="set";setPage="school";render()});await p.fill('#holName','Test break');await p.fill('#holFrom',await q(()=>todayIso));await p.fill('#holTo',await q(()=>addDays(2)));await p.click('[data-holadd]');
  ok("holiday added and listed",(await p.textContent('#holBox')).includes("Test break"));
  ok("today is no longer a school day (no 'At school today?')",await q(()=>!isSchoolDay(todayIso))&&!(await p.isVisible('.attq')));
  await q(()=>{tab="study";week=0;selDay=today;render()});ok("day card shows the holiday",(await p.textContent('.day.sel')).includes("Test break"));
  await q(()=>{state.holidays=[];save()});
  // 7 weekly review
  await q(()=>{const wk=iso(weekStart(-1)),wd=new Date(wk+"T12:00:00").getDay();state.days[wd].tasks.push({id:"lw1",s:"eng",title:"Old"});save();week=-1;render()});
  await p.click('[data-ttmenu]');await p.click('.ttmenu [data-review]');ok("review sheet opens for last week",await p.isVisible('#sheet .rvstats'));
  ok("slipped lesson listed",(await p.textContent('#sheet')).includes("English · Old"));
  await p.click('[data-rvmove]');ok("moved into this week",await q(()=>Object.entries(state.dates).some(([k,v])=>k>=todayIso&&v.extra.some(t=>t.s==="eng"&&t.title==="Old"))));
  // 13 accent + font
  await q(()=>{tab="set";setPage="look";week=0;render()});await p.click('[data-optaccent="#ec4899"]');
  ok("accent applies to buttons",await q(()=>{setPage="data";render();return getComputedStyle(document.querySelector("#fbSave")).backgroundColor==="rgb(236, 72, 153)"}));await q(()=>{setPage="look";render()});
  await p.click('[data-optfont=rounded]');ok("font switches",await q(()=>getComputedStyle(document.body).fontFamily.startsWith("Nunito")));
  await p.click('[data-optaccent=""]');ok("default accent restores",await q(()=>!document.documentElement.dataset.accent));
  // 14 sounds
  ok("tick & chime play without errors",await q(()=>{tickSound();doneChime();return true}));
  // 16 share timetable
  const url=await q(()=>location.pathname+"#tt="+encodeURIComponent(b64enc(JSON.stringify(ttPayload()))));
  const p2=await (await b.newContext({viewport:{width:390,height:1200}})).newPage();p2.on("pageerror",e=>errs.push("p2 "+e.message));
  await p2.goto(ORIGIN+url.split("#")[0]);await p2.evaluate(()=>{state.settings.setupDone=true;save()});await p2.goto("about:blank");await p2.goto(ORIGIN+url);await p2.waitForTimeout(900);
  ok("friend sees the import sheet",(await p2.textContent('#sheet')).includes("Copy this timetable?"));
  await p2.click('[data-ttimport=yes]');await p2.waitForTimeout(200);
  const got=await p2.evaluate(()=>DAY_ORDER.map(d=>state.days[d].tasks.map(k=>subj(k.s).name).join("+")).join("|"));const want=await q(()=>DAY_ORDER.map(d=>state.days[d].tasks.map(k=>subj(k.s).name).join("+")).join("|"));
  ok("timetable copied: "+got,got===want);
  ok("friend's homework untouched",await p2.evaluate(()=>state.homework.length===0));
  expect(errs,"page errors").toEqual([]);
});
