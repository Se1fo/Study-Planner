import fs from "fs";
import { test, expect } from "@playwright/test";
import { setup } from "./helpers.js";

test("drag to reorder", async ({ browser, baseURL }) => {
  const { b, ok, SEED, AXE_SRC, PAGE, ORIGIN } = setup(browser, baseURL);
  const order=(p,sel)=>p.evaluate(s=>[...document.querySelectorAll(s)].map(e=>e.dataset.oid).join(","),sel);
  // ---- mouse, desktop ----
  {const p=await (await b.newContext({viewport:{width:1400,height:1400}})).newPage();const errs=[];p.on("pageerror",e=>errs.push(e.message));
  await p.goto(PAGE);await p.evaluate(SEED("seed.js"));await p.reload();await p.waitForTimeout(700);
  const drag=async(from,to,below)=>{const a=await p.locator(from).boundingBox(),c=await p.locator(to).boundingBox();
    await p.mouse.move(a.x+a.width/2,a.y+a.height/2);await p.mouse.down();await p.mouse.move(a.x+a.width/2,a.y+a.height/2+10,{steps:3});
    await p.mouse.move(c.x+c.width/2,c.y+(below?c.height*0.8:c.height*0.2),{steps:8});await p.mouse.up();await p.waitForTimeout(250)};
  const hw='.day.sel .dsec[data-oid=hw] li.tk';
  const before=await order(p,hw);await drag(hw+'[data-oid=h1] .tt b',hw+'[data-oid=h3]',false);
  ok("mouse: reorder homework ("+before+" -> "+await order(p,hw)+")",(await order(p,hw))==="h1,h3");
  const les='.day.sel .dsec[data-oid=les] li.tk';await p.click('.day.sel [data-showdone$=":les"]');await p.waitForTimeout(150);await drag(les+'[data-oid=t2] .tt b',les+'[data-oid=t1]',false);
  ok("mouse: reorder lessons -> "+await order(p,les),(await order(p,les))==="t2,t1");
  const sec='.day.sel .dsecs>.dsec';const s0=await order(p,sec);await drag('.day.sel .dsec[data-oid=ex]>h3','.day.sel .dsec[data-oid=les]>h3',false);
  ok("mouse: move Exams section to top ("+s0+" -> "+await order(p,sec)+")",(await order(p,sec)).startsWith("ex,"));
  await p.reload();await p.waitForTimeout(600);await p.click('.day.sel [data-showdone$=":les"]');await p.waitForTimeout(150);
  ok("order kept after reload",(await order(p,hw))==="h1,h3"&&(await order(p,les))==="t2,t1"&&(await order(p,sec)).startsWith("ex,"));
  ok("checkbox still ticks (not a drag)",await (async()=>{await p.click('.day.sel [data-hwtick=h3]');await p.waitForTimeout(150);return p.evaluate(()=>state.homework.find(h=>h.id==="h3").done)})());
  expect(errs,"page errors").toEqual([]);}
  // ---- touch, phone ----
  {const p=await (await b.newContext({viewport:{width:390,height:1600},hasTouch:true,isMobile:true})).newPage();const errs=[];p.on("pageerror",e=>errs.push(e.message));
  await p.goto(PAGE);await p.evaluate(SEED("seed.js"));await p.reload();await p.waitForTimeout(700);
  const tdrag=async(from,to,hold)=>{const a=await p.locator(from).boundingBox(),c=await p.locator(to).boundingBox();
    await p.evaluate(async([a,c,from,hold])=>{const el=document.querySelector(from);const mk=(x,y)=>new Touch({identifier:1,target:el,clientX:x,clientY:y});
      const fire=(type,x,y)=>el.dispatchEvent(new TouchEvent(type,{bubbles:true,cancelable:true,touches:type==="touchend"?[]:[mk(x,y)],changedTouches:[mk(x,y)]}));
      const x=a.x+a.width/2,y=a.y+a.height/2;fire("touchstart",x,y);await new Promise(r=>setTimeout(r,hold));
      for(let i=1;i<=8;i++)fire("touchmove",x,y+(c.y+c.height*0.2-y)*i/8);fire("touchend",x,c.y+c.height*0.2)},[a,c,from,hold]);await p.waitForTimeout(250)};
  const hw='.day.sel .dsec[data-oid=hw] li.tk';
  await tdrag(hw+'[data-oid=h1]',hw+'[data-oid=h3]',100);ok("touch: quick move does NOT reorder (scrolls)",(await order(p,hw))==="h3,h1");
  await tdrag(hw+'[data-oid=h1]',hw+'[data-oid=h3]',500);ok("touch: hold then drag reorders -> "+await order(p,hw),(await order(p,hw))==="h1,h3");
  await tdrag('.day.sel .dsec[data-oid=rem]>h3','.day.sel .dsec[data-oid=les]>h3',500);ok("touch: hold section title moves section -> "+await order(p,'.day.sel .dsecs>.dsec'),(await order(p,'.day.sel .dsecs>.dsec')).startsWith("rem,"));
  expect(errs,"page errors").toEqual([]);}
});
