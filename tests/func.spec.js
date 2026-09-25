import fs from "fs";
import { test, expect } from "@playwright/test";
import { setup } from "./helpers.js";

test("core flows", async ({ browser, baseURL }) => {
  const { b, ok, SEED, AXE_SRC, PAGE, ORIGIN } = setup(browser, baseURL);
  const ctx=await b.newContext({viewport:{width:390,height:844}});const p=await ctx.newPage();const errs=[];p.on("pageerror",e=>errs.push(e.message));p.on("dialog",d=>d.accept());
  await p.goto(PAGE);await p.evaluate(SEED("seed.js"));await p.reload();await p.waitForTimeout(800);
  
  // tick a lesson in today's card
  await p.click('.day.sel [data-tick^="'+await p.evaluate(()=>todayIso)+':t2"]');await p.waitForTimeout(200);
  ok("tick lesson in day card",await p.evaluate(()=>"t2" in state.dates[todayIso].done));
  // tick homework in day card
  await p.click('.day.sel [data-hwtick="h1"]');await p.waitForTimeout(200);
  ok("tick homework in day card",await p.evaluate(()=>state.homework.find(h=>h.id==="h1").done));
  // add a task via form
  await p.click('#fabTab');await p.selectOption('.qaform select[name=s]','eng');await p.fill('.qaform input[name=amt]','2');await p.click('.qaform [data-qsave]');await p.waitForTimeout(400);
  ok("add lesson task",await p.evaluate(()=>tasksOn(today,todayIso).some(k=>k.s==="eng"&&k.amt===2)));
  // focus timer
  await p.click('#focusStart');await p.waitForTimeout(300);ok("focus timer opens",await p.evaluate(()=>!document.getElementById("focus").hidden));
  await p.evaluate(()=>{document.getElementById("focus").hidden=true});
  // +1 lesson from class shortcut
  const before=await p.evaluate(()=>state.remaining.eng);await p.click('.day.sel li.cls:has-text("English")');await p.click('.day.sel .clist [data-newl="eng"]');await p.waitForTimeout(200);
  ok("+1 lesson class shortcut",await p.evaluate(b=>state.remaining.eng===b+1,before));
  // lessons strip goes to Tasks > Lessons subject page
  await p.evaluate(()=>{tab="todo";todoSub="les";subjView=null;render()});await p.click('.subj[data-subj="prog"] .snm');await p.waitForTimeout(300);
  ok("lessons chip opens Lessons tab",await p.evaluate(()=>tab==="todo"&&todoSub==="les"&&subjView==="prog"&&!document.getElementById("subjDetail").hidden));
  await p.click('[data-notenew]');await p.waitForTimeout(200);ok("new note",await p.evaluate(()=>!!noteOpen));
  await p.click('[data-noteclose]');await p.click('[data-subjback]');await p.waitForTimeout(200);ok("back to subject list",await p.evaluate(()=>subjView===null&&!document.getElementById("subjList").hidden));
  // settings subject colors -> lessons
  // search subject result
  await p.evaluate(()=>{tab="search";render()});await p.fill("#q","arab");await p.waitForTimeout(200);await p.click('#sres [data-go="subj:arab"]');await p.waitForTimeout(200);
  ok("search subject result opens Lessons",await p.evaluate(()=>tab==="todo"&&todoSub==="les"&&subjView==="arab"));
  // old saved tab "subj" still works
  await p.evaluate(()=>{localStorage.setItem("sp-tab","subj")});await p.reload();await p.waitForTimeout(600);ok("old 'subj' tab maps to Lessons",await p.evaluate(()=>tab==="todo"&&todoSub==="les"));
  // copy week (was a crash on const list)
  await p.evaluate(()=>{tab="study";week=1;selDay=today;render()});ok("next week renders",await p.evaluate(()=>document.querySelectorAll(".day").length===7));
  
  // add homework and exam from the day card
  await p.evaluate(()=>{document.getElementById("focus").hidden=true;tab="study";week=0;selDay=today;openForm=null;render()});
  await p.click('#fabTab');await p.click('#sheet [data-qak="hw"]');await p.fill('.qaform [name=text]','Worksheet 5');await p.fill('.qaform [name=date]',await p.evaluate(()=>todayIso));await p.click('.qaform [data-qsave]');await p.waitForTimeout(400);
  ok("add homework from day card",await p.evaluate(()=>state.homework.some(h=>h.text==="Worksheet 5"&&h.due===todayIso)));
  await p.click('#fabTab');await p.click('#sheet [data-qak="ex"]');await p.fill('.qaform [name=text]','Maths test');await p.fill('.qaform [name=date]',await p.evaluate(()=>todayIso));await p.click('.qaform [data-qsave]');await p.waitForTimeout(400);
  ok("add exam from day card",await p.evaluate(()=>state.exams.some(x=>x.title==="Maths test"&&x.date===todayIso)));
  ok("both show in today's card",await p.evaluate(()=>{const t=document.querySelector(".day.sel").textContent;return t.includes("Worksheet 5")&&t.includes("Maths test")}));
  ok("ticked lesson folds into a 'done' row",!(await p.isVisible('.day.sel li.tk.les[data-oid=t2]'))&&(await p.textContent('.day.sel [data-showdone$=":les"]')).includes("done"));
  await p.click('.day.sel [data-showdone$=":les"]');await p.waitForTimeout(150);ok("Show brings it back",await p.isVisible('.day.sel li.tk.les[data-oid=t2]'));
  ok("lesson amount shows as a pill, no inputs",await p.isVisible('.day.sel li.tk.les[data-oid=t2] .amtpill')&&!(await p.isVisible('.day.sel li.tk.les[data-oid=t2] [data-amt]')));
  await p.click('.day.sel li.tk.les[data-oid=t2] .amtpill');await p.fill('.day.sel [data-amt^="'+await p.evaluate(()=>todayIso)+':t2"]','3');await p.press('.day.sel [data-amt^="'+await p.evaluate(()=>todayIso)+':t2"]','Tab');await p.waitForTimeout(200);
  await p.fill('.day.sel [data-pg^="'+await p.evaluate(()=>todayIso)+':t2"]','12');await p.press('.day.sel [data-pg^="'+await p.evaluate(()=>todayIso)+':t2"]','Tab');await p.waitForTimeout(200);
  await p.click('.day.sel [data-amtdone]');await p.waitForTimeout(150);
  ok("edit lessons and pages from the pill -> "+await p.textContent('.day.sel li.tk.les[data-oid=t2] .amtpill'),(await p.textContent('.day.sel li.tk.les[data-oid=t2] .amtpill')).includes("3 lessons · 12 p"));
  ok("tab renamed",await p.evaluate(()=>document.querySelector('.tabbar [data-tab=study]').textContent.includes("Timetable")));
  expect(errs,"page errors").toEqual([]);
});
