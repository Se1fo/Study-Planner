import { test, expect } from "@playwright/test";
import { setup } from "./helpers.js";

// v3.4: slim header, timetable bar, cleaner day card, compact Lessons tab, attendance settings, smarter search.
test("clean layout and smart search", async ({ browser, baseURL }) => {
  const { b, ok, SEED, PAGE } = setup(browser, baseURL);
  const p=await (await b.newContext({viewport:{width:390,height:1400}})).newPage();const errs=[];p.on("pageerror",e=>errs.push(e.message));p.on("dialog",d=>d.dismiss());
  await p.goto(PAGE);await p.evaluate(SEED("seed.js"));await p.reload();await p.waitForTimeout(700);
  const q=(f,a)=>p.evaluate(f,a);

  // header
  ok("no big search bar",(await p.locator(".searchbar").count())===0);
  await p.click('header [data-tab=search]');ok("search icon opens search",await q(()=>tab==="search"));
  await q(()=>{tab="todo";render()});ok("other tabs show their name",(await p.textContent("#greet"))==="Tasks");
  await q(()=>{tab="study";render()});ok("timetable shows the greeting",(await p.textContent("#greet")).startsWith("Good"));

  // timetable bar
  ok("bar says This week",(await p.textContent(".ttlabel b"))==="This week");
  await p.click('.ttbar [data-wk="1"]');ok("next arrow -> Next week",(await p.textContent(".ttlabel b"))==="Next week");
  await p.click(".ttlabel");ok("tapping the label goes back to this week",await q(()=>week===0));
  await p.click('.ttbar [data-tview=month]');ok("month view from the bar",await p.isVisible("#monthView .mgrid")&&!(await p.isVisible("#weekView")));
  const m0=await p.textContent(".ttlabel b");await p.click('.ttbar [data-mnav="1"]');ok("month arrows change month",(await p.textContent(".ttlabel b"))!==m0);
  await p.click('.ttbar [data-tview=week]');ok("back to week view",await p.isVisible("#weekView"));
  await p.click("[data-ttmenu]");ok("menu has plan and review",await p.isVisible(".ttmenu [data-plan]")&&await p.isVisible(".ttmenu [data-review]"));
  await p.click(".day.sel .dayhead h2");await p.waitForTimeout(100);ok("menu closes on an outside tap",!(await p.isVisible(".ttmenu")));

  // day card
  ok("no shortcut row or next-up card",(await p.locator(".newl,#lStrip").count())===0);
  await p.click('.day.sel li.cls:has-text("English")');ok("tap a class -> its menu",await p.isVisible('.day.sel .clist [data-newl=eng]')&&await p.isVisible('.day.sel .clist [data-hwfor=eng]')&&await p.isVisible('.day.sel .clist [data-cledit]'));
  const r0=await q(()=>state.remaining.eng);await p.click('.day.sel .clist [data-newl=eng]');await p.waitForTimeout(150);
  ok("+1 lesson from the class menu, menu closes",await q(r=>state.remaining.eng===r+1,r0)&&!(await p.isVisible('.day.sel .clist [data-newl]')));
  await q(()=>{state.days[today].classes.push({id:"early",name:"Assembly",start:"00:00",end:"00:01"});save();render()});
  if(await q(()=>hmNow()>"00:01")){ok("finished classes fold away",!(await p.isVisible('.day.sel li.cls:has-text("Assembly")'))&&(await p.textContent('.day.sel [data-pastcls]')).includes("1 earlier class"));
    await p.click(".day.sel [data-pastcls]");ok("and can be shown",await p.isVisible('.day.sel li.cls:has-text("Assembly")'))}
  ok("homework tickets are one line in the day card",!(await p.isVisible('.day.sel li.tk.hw[data-oid=h1] .itrow')));
  await p.click('.day.sel li.tk.hw[data-oid=h1] [data-menu]');await p.click('.day.sel .tmenu [data-addrem="hw:h1"]');await p.waitForTimeout(200);
  ok("reminder from the ticket menu",await q(()=>state.reminders.some(r=>r.link&&r.link.id==="h1")));
  ok("homework time in the section title",(await p.textContent('.day.sel .dsec[data-oid=hw] h3')).includes("left"));
  await p.click('.day.sel [data-hwtick=h1]');await p.waitForTimeout(150);ok("just-ticked homework stays visible",await p.isVisible('.day.sel li.tk.hw[data-oid=h1]'));
  await q(()=>{tab="todo";render()});await q(()=>{tab="study";render()});ok("then folds away",!(await p.isVisible('.day.sel li.tk.hw[data-oid=h1]'))&&await p.isVisible('.day.sel [data-showdone$=":hw"]'));

  // Lessons tab
  await q(()=>{tab="todo";todoSub="les";subjView=null;render()});
  ok("one row per subject (no pages row)",(await p.locator("#subjects .pgrow").count())===0&&(await p.locator('#subjects .subj[data-subj=prog] [data-left]').count())===1);
  const box=async s=>p.locator(s).boundingBox();const a=await box(".stats .allstats"),t=await box("#stTotal");
  ok("All stats link no longer covers the total",a&&t&&(a.y>=t.y+t.height||a.x>=t.x+t.width));
  await p.click('.subj[data-subj=prog] .snm');await p.fill('#subjDetail [data-pages=prog]','40');await p.press('#subjDetail [data-pages=prog]','Tab');await p.waitForTimeout(150);
  ok("pages left set on the subject page",await q(()=>pagesLeft("prog")===40));
  await q(()=>{subjView=null;render()});ok("and shown on the card",(await p.textContent('.subj[data-subj=prog] .smeta')).includes("40 pages left"));

  // attendance settings moved
  await q(()=>{tab="school";render()});ok("attendance tab has no settings rows",!(await p.isVisible("#absLim")));
  await p.click(".attset");ok("link opens Settings › Attendance",await q(()=>tab==="set"&&setPage==="school")&&await p.isVisible("#absLim")&&(await p.textContent("#setTitle"))==="Attendance");
  await p.click("#setBackMain");ok("back returns to the Attendance tab",await q(()=>tab==="school"));

  // search: quick views, date words and add commands
  await q(()=>{tab="search";render()});ok("quick views when empty",(await p.locator('#sres [data-recent="overdue"]').count())===1);
  await p.click('#sres [data-recent="overdue"]');await p.waitForTimeout(100);ok("overdue view lists late homework",(await p.textContent("#sres")).includes("Read chapter 2"));
  const P=s=>q(s=>{const c=parseAdd(s);return c&&{...c}},s);
  const fri=await q(()=>{let n=(5-today+7)%7;if(n===0)n=7;return addDays(n)});
  let c=await P("add essay english friday");ok("parse: homework, subject, weekday",c.kind==="hw"&&c.text==="Essay"&&c.s==="eng"&&c.date===fri);
  c=await P("add exam history 12 oct");ok("parse: exam with a date",c.kind==="ex"&&c.s==="hist"&&c.date.endsWith("-10-12")&&c.text==="History exam");
  c=await P("remind me to call mum at 5pm tomorrow");ok("parse: reminder with time",c.kind==="rem"&&c.text==="Call mum"&&c.time==="17:00"&&c.date===await q(()=>addDays(1)));
  c=await P("add worksheet 3 prog in 3 days");ok("parse: subject prefix and 'in N days'",c.s==="prog"&&c.text==="Worksheet 3"&&c.date===await q(()=>addDays(3)));
  ok("plain searches aren't commands",(await P("essay"))===null);
  await p.fill("#q","add essay english friday");await p.waitForTimeout(100);ok("command preview shows",(await p.textContent("#sres .scmd")).includes("Add homework"));
  await p.press("#q","Enter");await p.waitForTimeout(200);ok("Enter adds it",await q(f=>state.homework.some(h=>h.text==="Essay"&&h.s==="eng"&&h.due===f),fri));
  await p.fill("#q","exam history 12 oct");await p.waitForTimeout(100);await p.click("#sres .scmd");await p.waitForTimeout(200);
  ok("'exam …' without add also works",await q(()=>state.exams.some(x=>x.s==="hist"&&x.date.endsWith("-10-12"))));
  expect(errs,"page errors").toEqual([]);
});
