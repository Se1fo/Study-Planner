import fs from "fs";
import { test, expect } from "@playwright/test";
import { setup } from "./helpers.js";

test("tickets, menus and swipe", async ({ browser, baseURL }) => {
  const { b, ok, SEED, AXE_SRC, PAGE, ORIGIN } = setup(browser, baseURL);
  const p=await (await b.newContext({viewport:{width:390,height:1800},hasTouch:true})).newPage();const errs=[];p.on("pageerror",e=>errs.push(e.message));
  await p.goto(PAGE);await p.evaluate(SEED("seed.js"));await p.reload();await p.waitForTimeout(700);
  const T=await p.evaluate(()=>todayIso);const q=(s,a)=>p.evaluate(s,a);
  // menus
  await p.click('.day.sel [data-menu="hw:h1:'+T+'"]');ok("hw menu opens on day card",await p.isVisible('.day.sel li.tmenu [data-edit="hw:h1"]'));
  const o1=await q(()=>[...document.querySelectorAll('.day.sel .dsec[data-oid=hw] li.tk')].map(e=>e.dataset.oid).join());
  await p.click('.day.sel li.tmenu [data-tmove]');await p.waitForTimeout(150);
  const o2=await q(()=>[...document.querySelectorAll('.day.sel .dsec[data-oid=hw] li.tk')].map(e=>e.dataset.oid).join());ok("menu Move up/down ("+o1+" -> "+o2+")",o1!==o2);
  // edit via menu
  await p.click('.day.sel li.tmenu [data-edit="hw:h1"]');await p.fill('li.tk.editing [data-ef=text]','Essay page 41');await p.selectOption('li.tk.editing [data-ef=s]','hist');await p.click('li.tk.editing [data-editsave]');await p.waitForTimeout(150);
  ok("edit homework (text + subject)",await q(()=>{const h=state.homework.find(h=>h.id==="h1");return h.text==="Essay page 41"&&h.s==="hist"}));
  // tap title to edit exam, change date
  await p.click('.day.sel [data-edit="ex:e2"]');await p.fill('li.tk.editing [data-ef=date]',await q(()=>addDays(2)));await p.keyboard.press("Enter");await p.waitForTimeout(150);
  ok("tap exam title, edit date, Enter saves",await q(()=>state.exams.find(x=>x.id==="e2").date===addDays(2)));
  // edit reminder
  await p.click('.day.sel [data-edit="rem:r1"]');await p.fill('li.tk.editing [data-ef=time]','21:15');await p.click('li.tk.editing [data-editsave]');await p.waitForTimeout(150);
  ok("edit reminder time",await q(()=>state.reminders.find(r=>r.id==="r1").time==="21:15"));
  // delete via menu + undo
  await p.click('.day.sel [data-menu="rem:r1:'+T+'"]');await p.click('.day.sel li.tmenu [data-remdel]');ok("delete from menu",await q(()=>!state.reminders.some(r=>r.id==="r1")));
  await p.click('#undoBtn');await p.waitForTimeout(150);ok("undo restores",await q(()=>state.reminders.some(r=>r.id==="r1")));
  // swipes
  const swipe=async(sel,dx)=>{const bx=await p.locator(sel).boundingBox();await p.evaluate(([sel,bx,dx])=>{const el=document.querySelector(sel);const mk=(x,y)=>new Touch({identifier:2,target:el,clientX:x,clientY:y});
    const f=(t,x,y)=>el.dispatchEvent(new TouchEvent(t,{bubbles:true,cancelable:true,touches:t==="touchend"?[]:[mk(x,y)],changedTouches:[mk(x,y)]}));
    const x=bx.x+bx.width/2,y=bx.y+bx.height/2;f("touchstart",x,y);for(let i=1;i<=6;i++)f("touchmove",x+dx*i/6,y);f("touchend",x+dx,y)},[sel,bx,dx]);await p.waitForTimeout(200)};
  await swipe('.day.sel li.tk.les[data-oid=t2] .tt',110);ok("swipe right ticks a lesson",await q(()=>"t2" in state.dates[todayIso].done));
  await swipe('.day.sel li.tk.les[data-oid=t2] .tt',-110);ok("swipe left opens the lesson's options, removes nothing",await p.isVisible('.day.sel li.tmenu [data-skip]')&&await q(()=>!state.dates[todayIso].skip.includes("t2")));await q(()=>{openMenu=null;render()});
  await swipe('.day.sel li.tk.rem[data-oid=r1] .tt',110);ok("swipe right completes a reminder",await q(()=>!state.reminders.some(r=>r.id==="r1")));
  await p.evaluate(()=>{tab="todo";todoSub="ex";render()});
  const nEx=await q(()=>state.exams.length);await swipe('#exList li.tk.exam[data-oid=e2] .tt',110);ok("swipe right on exam does nothing",await q(n=>state.exams.length===n,nEx));await swipe('#exList li.tk.exam[data-oid=e1] .tt',-110);ok("swipe left opens the exam's options",await p.isVisible('#exList li.tmenu [data-exdel=e1]')&&await q(()=>state.exams.some(x=>x.id==="e1")));
  await p.click('#exList li.tmenu [data-exdel=e1]');ok("delete from there",await q(()=>!state.exams.some(x=>x.id==="e1")));
  // 9: quick-add reminder
  await p.evaluate(()=>{tab="study";render()});await p.click('#fabTab');await p.click('#sheet [data-qak="rem"]');await p.waitForTimeout(400);ok("quick-add reminder opens its form",await p.isVisible('.qaform [name=time]'));
  expect(errs,"page errors").toEqual([]);
});
