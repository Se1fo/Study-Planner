import fs from "fs";
import { test, expect } from "@playwright/test";
import { setup } from "./helpers.js";

test("no accessibility violations (axe)", async ({ browser, baseURL }) => {
  const { b, ok, SEED, AXE_SRC, PAGE, ORIGIN } = setup(browser, baseURL);
  const AXE=AXE_SRC;
  const views=[["timetable","tab='study';ttView='week';render()"],["month","ttView='month';render()"],["lessons","ttView='week';tab='todo';todoSub='les';subjView=null;render()"],["subject","subjView='prog';render()"],["note","noteOpen='nv';noteMode='view';render()"],
   ["homework","noteOpen=null;subjView=null;todoSub='hw';render()"],["exams","todoSub='ex';render()"],["school","tab='school';render()"],["settings","tab='set';setPage=null;render()"],["set-look","setPage='look';render()"],["set-alerts","setPage='alerts';render()"],["stats","tab='stats';render()"],["notif","tab='notif';render()"],["quickadd","tab='study';render();openSheet()"]];
  const agg={};
  for(const scheme of ["light","dark"]){const p=await (await b.newContext({viewport:{width:390,height:900},colorScheme:scheme})).newPage();
    await p.goto(PAGE);await p.evaluate(SEED("seed5.js"));await p.evaluate(()=>{state.reminders=state.reminders.filter(r=>r.id!=="rnow");save()});await p.reload();await p.waitForTimeout(700);
    await p.addScriptTag({content:AXE});
    for(const [n,js] of views){await p.evaluate(js);await p.waitForTimeout(400);
      const r=await p.evaluate(async()=>{const res=await axe.run(document,{resultTypes:["violations"],runOnly:{type:"tag",values:["wcag2a","wcag2aa","best-practice"]}});return res.violations.map(v=>({id:v.id,impact:v.impact,help:v.help,n:v.nodes.length,ex:v.nodes.slice(0,2).map(x=>x.target.join(" ")+" | "+(x.failureSummary||"").split("\n").slice(1,2).join("").slice(0,110))}))});
      r.forEach(v=>{const k=v.id;agg[k]=agg[k]||{impact:v.impact,help:v.help,views:new Set(),n:0,ex:v.ex};agg[k].views.add(scheme+":"+n);agg[k].n+=v.n})}}
  for(const [k,v] of Object.entries(agg).sort((a,b)=>({critical:0,serious:1,moderate:2,minor:3}[a[1].impact]-({critical:0,serious:1,moderate:2,minor:3}[b[1].impact]))))console.log(v.impact.toUpperCase(),k,"x"+v.n,"|",v.help,"|",[...v.views].slice(0,4).join(","),"\n   e.g.",v.ex.join("  //  "));
  
  
  expect(Object.keys(agg),"axe violations").toEqual([]);
});
