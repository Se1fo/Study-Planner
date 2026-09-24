import fs from "fs";
import { test, expect } from "@playwright/test";
import { setup } from "./helpers.js";

test("bin, reminders, notes, plan, stats", async ({ browser, baseURL }) => {
  const { b, ok, SEED, AXE_SRC, PAGE, ORIGIN } = setup(browser, baseURL);
  const p=await (await b.newContext({viewport:{width:390,height:1400}})).newPage();const errs=[];p.on("pageerror",e=>errs.push(e.message));p.on("dialog",d=>d.dismiss());
  await p.goto(PAGE);await p.evaluate(SEED("seed.js"));await p.reload();await p.waitForTimeout(700);
  const q=(f,a)=>p.evaluate(f,a);
  // 6 bin: delete things several ways, restore them
  await q(()=>{tab="todo";todoSub="hw";render();openMenu="hw:h1:list";render()});await p.click('#hwList li.tmenu [data-hwdel]');
  await q(()=>{const x=state.exams.find(e=>e.id==="e1");delExam("e1");save();render()});
  await q(()=>{state.notes.push({id:"n9",s:"prog",title:"Temp",text:"x",imgs:[],created:1,updated:1});save();tab="todo";todoSub="les";subjView="prog";noteOpen="n9";noteMode="view";render()});await p.click('[data-notedel]');
  ok("3 deletions are in the bin",await q(()=>state.trash.length===3&&state.trash.map(t=>t.kind).sort().join()==="ex,hw,note"));
  await q(()=>{tab="set";setPage="data";render()});await p.click('[data-sp=trash]');ok("bin page lists them",(await p.locator('.trlist li').count())===3);
  await p.click('.trlist li:has-text("Essay page 40") [data-trrestore]');ok("restore homework",await q(()=>state.homework.some(h=>h.id==="h1")&&state.trash.length===2));
  await p.click('.trlist li:has-text("Arabic midterm") [data-trrestore]');ok("restore exam",await q(()=>state.exams.some(x=>x.id==="e1")));
  await p.click('[data-trempty]');await p.click('[data-trempty]');ok("empty the bin (two taps)",await q(()=>state.trash.length===0));
  // 1 reminder pop-up
  await q(()=>{const d=new Date(Date.now()-60000);state.reminders.push({id:"rp",text:"Call grandma",date:iso(d),time:String(d.getHours()).padStart(2,"0")+":"+String(d.getMinutes()).padStart(2,"0")});save();tab="study";render();checkDueReminders()});
  await p.waitForTimeout(400);ok("due reminder pops up",await p.isVisible('#rempop')&&(await p.textContent('#rempop')).includes("Call grandma"));
  await p.click('[data-rp=snooze]');await p.waitForTimeout(300);ok("snooze moves it 10 minutes on",await q(()=>{const r=state.reminders.find(x=>x.id==="rp");return (r.date+"T"+r.time)>nowStamp()&&!r.popped}));
  await q(()=>{const r=state.reminders.find(x=>x.id==="rp"),d=new Date(Date.now()-60000);r.date=iso(d);r.time=String(d.getHours()).padStart(2,"0")+":"+String(d.getMinutes()).padStart(2,"0");save();checkDueReminders()});
  await p.waitForTimeout(400);await p.click('[data-rp=done]');await p.waitForTimeout(300);ok("done marks it seen and closes",await q(()=>state.reminders.find(x=>x.id==="rp").seen)&&!(await p.isVisible('#rempop')));
  // 7 notes
  await q(()=>{tab="todo";todoSub="les";subjView="prog";noteOpen=null;render()});await p.click('[data-notenew]');await p.fill('.ntitle','Plan');
  await p.click('[data-nfmt=chk]');await p.keyboard.type("Revise loops");await p.click('[data-nmode=view]');
  ok("checklist renders in view mode",await p.isVisible('.nview .nchk input[type=checkbox]'));
  await p.check('.nview .nchk input');ok("ticking a checklist item saves it",await q(()=>state.notes.find(n=>n.title==="Plan").text.includes("- [x] Revise loops")));
  await p.click('[data-npin]');ok("pin a note",await q(()=>state.notes.find(n=>n.title==="Plan").pinned));
  await p.click('[data-noteclose]');ok("pinned note listed first",(await p.textContent('.nlist .ncard >> nth=0')).includes("📌"));
  // 2 plan my week
  await q(()=>{state.remaining.hist=6;state.remaining.eng=4;state.exams.push({id:"ep",title:"History final",s:"hist",date:addDays(5)});save();tab="study";week=0;render()});
  await p.click('[data-plan]');await p.waitForTimeout(200);const has=await p.isVisible('[data-planapply]');ok("plan suggests lessons",has);
  const before=await q(()=>Object.values(state.dates).reduce((a,x)=>a+x.extra.filter(t=>t.label==="Planned").length,0));
  if(has)await p.click('[data-planapply]');const plan=await q(()=>Object.entries(state.dates).filter(([k,x])=>x.extra.some(t=>t.label==="Planned")).map(([k,x])=>[k,x.extra.filter(t=>t.label==="Planned").map(t=>t.s+"x"+t.amt)]));
  ok("plan applied: "+JSON.stringify(plan),plan.length>0);
  ok("history lessons are before the history exam",await q(()=>Object.entries(state.dates).every(([k,x])=>!x.extra.some(t=>t.label==="Planned"&&t.s==="hist")||k<addDays(5))));
  ok("no day gets more than 4 lessons",await q(()=>DAY_ORDER.every(d=>{const k=iso(dateFor(0,d));return k<todayIso||tasksOn(d,k).filter(t=>!t.skipped&&!t.done).length<=4})));
  // 5 stats
  await q(()=>{tab="stats";render()});
  ok("stats page shows 3 charts and tiles",(await p.locator('#statsBody .stcard').count())>=3&&(await p.locator('.sttiles div').count())===4);
  await p.click('[data-srange="12m"]');ok("12-month range has 12 bars",(await p.locator('#statsBody .stcard >> nth=0').locator('.stbar').count())===12);
  expect(errs,"page errors").toEqual([]);
});
