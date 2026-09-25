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
  ok("header has 3 buttons, + floats",(await p.locator("header .hbtns button").count())===3&&await p.isVisible("#fabTab"));
  await p.click("#fabTab");ok("floating + opens quick add",await p.isVisible("#sheet"));await q(()=>closeSheet());await p.waitForTimeout(300);
  ok("⋯ sits before the week, no arrows on phones",await q(()=>document.querySelector(".ttbar").firstElementChild.matches("[data-ttmenu]"))&&!(await p.isVisible('.ttbar [data-wk="1"]')));
  ok("strip shows exactly this week",await q(()=>{const s=document.getElementById("strip");return [...s.querySelectorAll("button")].filter(b=>{const r=b.getBoundingClientRect(),o=s.getBoundingClientRect();return r.left>=o.left-1&&r.right<=o.right+1}).map(b=>b.dataset.selk).join()===DAY_ORDER.map(d=>iso(dateFor(0,d))).join()}));
  await q(()=>{const s=document.getElementById("strip");s.scrollTo({left:s.scrollLeft+stripPage(s)})});await p.waitForTimeout(600);
  ok("swiping the strip -> Next week",(await p.textContent(".ttlabel b"))==="Next week"&&await q(()=>week===1));
  const k2=await q(()=>iso(dateFor(1,DAY_ORDER[2])));await p.click('#strip [data-selk="'+k2+'"]');ok("tap a day in that week",await q(k=>iso(dateFor(week,selDay))===k,k2));
  await p.click(".ttlabel");ok("tapping the label goes back to this week",await q(()=>week===0));
  await p.click('.ttbar [data-tview=month]');ok("month view from the bar",await p.isVisible("#monthView .mgrid")&&!(await p.isVisible("#weekView")));
  const m0=await p.textContent(".ttlabel b");await p.click('.ttbar [data-mnav="1"]');ok("month arrows change month",(await p.textContent(".ttlabel b"))!==m0);
  await p.click('.ttbar [data-tview=week]');ok("back to week view",await p.isVisible("#weekView"));
  await p.click("[data-ttmenu]");ok("menu has plan and review",await p.isVisible(".ttmenu [data-plan]")&&await p.isVisible(".ttmenu [data-review]"));
  await p.click(".day.sel .dayhead h2");await p.waitForTimeout(100);ok("menu closes on an outside tap",!(await p.isVisible(".ttmenu")));

  // lesson menu: title first, then lessons & pages; no focus or tomorrow
  await p.click('.day.sel li.tk.les[data-oid=t2] [data-menu]');
  ok("lesson menu order",await q(()=>[...document.querySelectorAll(".day.sel li.tmenu button")].slice(0,2).map(b=>b.textContent.trim()).join("|")==="✎ Add title|✎ Lessons & pages"));
  ok("no focus or tomorrow in the lesson menu",(await p.locator(".day.sel li.tmenu [data-focus],.day.sel li.tmenu [data-move]").count())===0);
  await q(()=>{openMenu=null;render()});
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
  // Homework/Exams tabs: one-line tickets, no add box, extras in ⋯
  await q(()=>{tab="todo";todoSub="hw";render()});
  ok("no add box on the Homework tab",!(await p.isVisible("#hwText"))&&!(await p.isVisible("#sHw .addbar")));
  ok("homework tickets are one line",!(await p.isVisible("#hwList li.tk .itrow")));
  await p.click('#hwList li.tk[data-oid=h2] [data-menu]');ok("reminder and next day in the menu",await p.isVisible('#hwList .tmenu [data-addrem="hw:h2"]')&&await p.isVisible('#hwList .tmenu [data-hwpost=h2]'));
  await q(()=>{openMenu=null;todoSub="ex";render()});ok("no add box on the Exams tab",!(await p.isVisible("#exText")));
  await p.click("#fabTab");ok("+ on the Exams tab opens the exam form",await q(()=>qaKind==="ex")&&await p.isVisible(".qaform"));
  ok("no focus link in the add sheet",(await p.locator("#sheet [data-qa=focus]").count())===0);await q(()=>closeSheet());await p.waitForTimeout(300);
  // notifications: tap the whole alert; homework alerts combined
  await q(()=>{tab="notif";render()});
  ok("one homework alert",(await p.locator('#notifList .ncell[data-nid^="hw:"]').count())===1);
  ok("no Open/View buttons on plain alerts",(await p.locator("#notifList .ncell.ntap .nacts2 .lnk").count())===0);
  await p.click('#notifList .ncell[data-nid^="hw:"] .bt');ok("tapping it opens Homework",await q(()=>tab==="todo"&&todoSub==="hw"));
  // stats: empty attendance says so
  await q(()=>{state.att={};save();tab="stats";render()});ok("empty attendance chart explains itself",(await p.textContent("#statsBody")).includes("Mark days on the Attendance tab"));
  // focus: pick what you're studying
  await q(()=>{tab="study";render();startFocus(null,25)});await p.waitForTimeout(200);
  ok("focus asks what you're studying",await p.isVisible("#focus .fpick"));
  const pick=await p.getAttribute("#focus .fpick button","data-fx");await p.click("#focus .fpick button");await p.waitForTimeout(100);
  ok("picking sets the subject",await q(id=>!!focus.task&&focus.task.id===id,pick.slice(5))&&!(await p.isVisible("#focus .fpick")));
  await q(()=>{focus.end=Date.now()-1000;saveFocus()});await p.waitForTimeout(800);
  ok("time counts for that subject",await q(()=>Object.values((state.focusSub||{})[todayIso]||{}).some(v=>v>=25)));
  await q(()=>{focus=null;saveFocus();showFocus()});
  // floating + slides away while scrolling down
  await p.setViewportSize({width:390,height:600});await q(()=>{tab="todo";todoSub="les";subjView="prog";render();scrollTo(0,0)});await p.waitForTimeout(100);
  await p.mouse.wheel(0,250);await p.waitForTimeout(300);ok("+ hides while scrolling down",await q(()=>document.body.classList.contains("fabhide")));
  await p.mouse.wheel(0,-120);await p.waitForTimeout(300);ok("and comes back scrolling up",await q(()=>!document.body.classList.contains("fabhide")));
  // + adds to the day you're viewing, remembers the subject; the card has no "+ Add"
  await p.setViewportSize({width:390,height:1400});await q(()=>{tab="study";ttView="week";week=0;selDay=DAY_ORDER[(DAY_ORDER.indexOf(today)+2)%7];if(iso(dateFor(0,selDay))<todayIso)week=1;render()});
  const vk=await q(()=>iso(dateFor(week,selDay)));ok("no + Add in the day card",(await p.locator(".day.sel .dayadds [data-open]").count())===0&&await p.isVisible(".day.sel [data-classopen]"));
  await p.click("#fabTab");ok("lesson date = the viewed day",(await p.inputValue(".qaform [name=date]"))===vk&&(await p.textContent("#sheet .shh b")).includes("·"));
  await p.click('#sheet [data-qak="hw"]');ok("homework due = the viewed day",(await p.inputValue(".qaform [name=date]"))===vk);
  await p.fill(".qaform [name=text]","Poem");await p.selectOption(".qaform [name=s]","hist");await p.click(".qaform [data-qsave]");await p.waitForTimeout(400);
  ok("homework added for that day",await q(k=>state.homework.some(h=>h.text==="Poem"&&h.due===k),vk));
  await p.click("#fabTab");await p.click('#sheet [data-qak="hw"]');ok("remembers the last subject",(await p.inputValue(".qaform [name=s]"))==="hist");await q(()=>closeSheet());await p.waitForTimeout(300);
  // settings: share & export under Share & backup, no Clear ticks, colours in Appearance
  await q(()=>{tab="set";setPage="planner";render()});ok("planner page has no share/export/clear",!(await p.isVisible("#shareTT"))&&!(await p.isVisible("#expIcs"))&&(await p.locator("#reset").count())===0);
  await q(()=>{setPage="data";render()});ok("share & export under Share & backup",await p.isVisible("#shareTT")&&await p.isVisible("#expIcs")&&(await p.textContent("#setTitle"))==="Share & backup");
  await q(()=>{setPage="look";render()});ok("subject colours listed in Appearance",(await p.locator("#subjColors .scol").count())===4);
  await p.click('#subjColors [data-color=prog]');await p.click('#subjColors .cpal button >> nth=3');await p.waitForTimeout(150);
  ok("change a colour in place",await q(()=>tab==="set"&&setPage==="look"&&state.subjects.find(x=>x.id==="prog").c===SWATCHES[3]));
  // bigger tap areas, pinned strip, one date, Add & next, class menu homework
  await q(()=>{tab="study";ttView="week";week=0;selDay=today;render();scrollTo(0,0)});await p.waitForTimeout(200);
  ok("tick circles have a 40px+ tap area",await q(()=>{const c=document.querySelector(".day.sel li.tk .chk"),r=c.getBoundingClientRect(),b=getComputedStyle(c,"::before");return r.width+2*Math.abs(parseFloat(b.left))>=40}));
  ok("no date under the greeting on Timetable",(await p.textContent("#sub")).trim()==="");
  await p.setViewportSize({width:390,height:640});await q(()=>scrollTo(0,400));await p.waitForTimeout(500);
  ok("week strip stays pinned while scrolling",await q(()=>{const s=document.getElementById("strip").getBoundingClientRect(),h=document.querySelector("header").getBoundingClientRect();return s.top>=h.bottom-2&&s.top<h.bottom+30}));
  await p.setViewportSize({width:390,height:1400});await q(()=>scrollTo(0,0));await p.click("#fabTab");await p.click('#sheet [data-qak="hw"]');
  await p.fill(".qaform [name=text]","Ex 1");await p.click('.qaform [data-qnext]');await p.waitForTimeout(300);
  ok("Add & next keeps the sheet open",await p.isVisible(".qaform")&&(await p.inputValue(".qaform [name=text]"))===""&&await q(()=>qaKind==="hw"));
  await p.fill(".qaform [name=text]","Ex 2");await p.click(".qaform [data-qsave]");await p.waitForTimeout(400);
  ok("both added",await q(()=>state.homework.some(h=>h.text==="Ex 1")&&state.homework.some(h=>h.text==="Ex 2")));
  await p.click('.day.sel li.cls:has-text("English")');await p.click('.day.sel .clist [data-hwfor=eng]');await p.waitForTimeout(300);
  ok("class menu homework opens the add sheet for that subject",await q(()=>qaKind==="hw")&&(await p.inputValue(".qaform [name=s]"))==="eng");await q(()=>closeSheet());
  // tap the current tab again -> back to today
  await q(()=>{tab="study";ttView="week";week=2;selDay=DAY_ORDER[1];render()});await p.click(".tabbar [data-tab=study]");await p.waitForTimeout(200);
  ok("re-tapping Timetable goes back to today",await q(()=>week===0&&selDay===today));
  // due-date shortcuts and subject from the text
  await p.click("#fabTab");await p.click('#sheet [data-qak="hw"]');await p.fill(".qaform [name=text]","history essay");await p.waitForTimeout(100);
  ok("subject picked from the text",(await p.inputValue(".qaform [name=s]"))==="hist");
  await p.selectOption(".qaform [name=s]","eng");await p.fill(".qaform [name=text]","history essay on poems");await p.waitForTimeout(100);
  ok("a subject you chose yourself isn't overridden",(await p.inputValue(".qaform [name=s]"))==="eng");
  const nx=await q(()=>nextClassDay("eng"));ok("next-class chip for the subject",nx&&(await p.textContent(".qaform .duechips")).includes("English class"));
  await p.click('.qaform [data-qdue="'+nx+'"]');ok("chip sets the due date",(await p.inputValue(".qaform [name=date]"))===nx);
  await p.click('.qaform [data-qdue="'+await q(()=>todayIso)+'"]');ok("Today chip",(await p.inputValue(".qaform [name=date]"))===await q(()=>todayIso));
  await q(()=>closeSheet());await p.waitForTimeout(300);
  expect(errs,"page errors").toEqual([]);
});
