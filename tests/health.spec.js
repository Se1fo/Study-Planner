import fs from "fs";
import { test, expect } from "@playwright/test";
import { setup } from "./helpers.js";

test("layout has no overflow at any width", async ({ browser, baseURL }) => {
  const { b, ok, SEED, AXE_SRC, PAGE, ORIGIN } = setup(browser, baseURL);
  let problems=0;
  const views=[["timetable","tab='study';ttView='week';render()"],["month","ttView='month';render()"],["lessons","ttView='week';tab='todo';todoSub='les';subjView=null;render()"],["subject","subjView='x0';render()"],
   ["homework","subjView=null;todoSub='hw';render()"],["exams","todoSub='ex';render()"],["school","tab='school';render()"],["settings","tab='set';setPage=null;render()"],["set-look","setPage='look';render()"],
   ["set-planner","setPage='planner';render()"],["notif","tab='notif';render()"],["search","tab='search';render();document.getElementById('q').value='sub';renderSearch()"],
   ["quickadd","tab='study';render();qaKind='hw';openSheet()"],["review","closeSheet();reviewOff=-1;openSheet('review')"],["quiz","closeSheet();tab='todo';todoSub='les';subjView='x0';render();startQuiz('x0')"],["focus","quiz=null;renderQuiz();startFocus(null,25)"]];
  for(const w of [320,390,768,1400])for(const [scheme,style] of [["light",""],["dark",""],["dark","luxe"]]){
    if(w!==390&&style)continue;
    const p=await (await b.newContext({viewport:{width:w,height:900},colorScheme:scheme})).newPage();const errs=[];p.on("pageerror",e=>errs.push(e.message));
    await p.goto(PAGE);await p.evaluate(SEED("stress.js"));
    if(style)await p.evaluate(s=>{state.settings.style=s;save()},style);await p.reload();await p.waitForTimeout(700);
    for(const [n,js] of views){await p.evaluate(js).catch(e=>errs.push(n+": "+e.message));await p.waitForTimeout(650);
      const o=await p.evaluate(W=>{const out=[];const dw=document.documentElement.scrollWidth;if(dw>W+1)out.push("page "+dw+"px wide");
        document.querySelectorAll("body *").forEach(el=>{if(el.closest(".lstrip,.strip,.gavgs,.qgrid,svg")||!el.getClientRects().length)return;const r=el.getBoundingClientRect(),cs=getComputedStyle(el);
          if(cs.position==="fixed"||el.closest("[hidden]"))return;let clip=false;for(let a=el.parentElement;a&&a!==document.body;a=a.parentElement){const ac=getComputedStyle(a);if(/hidden|clip|auto|scroll/.test(ac.overflowX)&&a.getBoundingClientRect().right<=W+1){clip=true;break}}
          if(!clip&&r.right>W+1&&r.width>0)out.push((el.id?"#"+el.id:el.tagName.toLowerCase()+"."+[...el.classList].join("."))+" right="+Math.round(r.right))});return [...new Set(out)].slice(0,4)},w);
      if(o.length){problems++;console.log(w,scheme,style||"classic",n,"OVERFLOW",JSON.stringify(o))}}
    if(errs.length){problems++;console.log(w,scheme,style,"ERRORS",errs)}
    if(w===320&&scheme==="dark"&&!style){for(const [n,js] of [["timetable","focusAction('close');tab='study';ttView='week';render()"],["quickadd","qaKind='hw';openSheet()"],["subject","closeSheet();tab='todo';todoSub='les';subjView='x0';render()"],["month","tab='study';ttView='month';render()"]]){await p.evaluate(js);await p.waitForTimeout(250);await p.screenshot({path:"test-results/health-"+n+".png"})}}
    await p.context().close()}
  expect(problems,"layout problems").toBe(0);
});
