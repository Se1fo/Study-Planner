import fs from "fs";
import { test, expect } from "@playwright/test";
import { setup } from "./helpers.js";

test("cloud sync (fake Firebase)", async ({ browser, baseURL }) => {
  const { b, ok, SEED, AXE_SRC, PAGE, ORIGIN } = setup(browser, baseURL);
  const seed=SEED("seed.js");
  const FAKE={
   app:`export function initializeApp(c){return {c}}`,
   auth:`let cb=null;const load=()=>{try{return JSON.parse(localStorage.getItem("__fbuser"))}catch(e){return null}};
    export function getAuth(){return {}} export class GoogleAuthProvider{}
    const set=u=>{localStorage.setItem("__fbuser",JSON.stringify(u));cb&&cb(u)};
    export async function signInWithPopup(){if(window.__popupHang)return new Promise(()=>{});if(window.__popupFail)throw Object.assign(new Error("x"),{code:window.__popupFail});set({uid:"u1",email:"me@test.com"})}
    export async function signInWithEmailAndPassword(a,e,p){if(p!=="secret1")throw Object.assign(new Error("x"),{code:"auth/invalid-credential"});set({uid:"u1",email:e})}
    export const createUserWithEmailAndPassword=signInWithEmailAndPassword;export async function sendPasswordResetEmail(){}
    export async function signOut(){localStorage.removeItem("__fbuser");cb&&cb(null)}
    export function onAuthStateChanged(a,f){cb=f;setTimeout(()=>f(load()),0);return()=>{}}`,
   firestore:`export function getFirestore(){return {}} export function doc(db,...p){return p.join("/")}
    const snap=d=>({exists:()=>!!d,data:()=>d,metadata:{hasPendingWrites:false}});
    export async function getDoc(ref){return snap(await window.__fbGet(ref))}
    export async function setDoc(ref,data){await window.__fbSet(ref,data)}
    export function onSnapshot(ref,next){window.__fbFire=d=>next(snap(d));return()=>{window.__fbFire=null}}`};
  let cloud=null;const pages=[];
  
  async function device(name,seedIt){const ctx=await b.newContext({viewport:{width:390,height:1400}});
    await ctx.route(/gstatic\.com\/firebasejs\/12\.19\.0\/firebase-(app|auth|firestore)\.js/,r=>{const m=r.request().url().match(/firebase-(\w+)\.js/)[1];r.fulfill({status:200,contentType:"application/javascript",headers:{"Access-Control-Allow-Origin":"*"},body:FAKE[m]})});
    await ctx.exposeBinding("__fbGet",async()=>cloud);
    await ctx.exposeBinding("__fbSet",async(src,ref,data)=>{cloud=data;for(const p of pages)if(p!==src.page)await p.evaluate(d=>window.__fbFire&&window.__fbFire(d),data).catch(()=>{})});
    const p=await ctx.newPage();p.errs=[];p.on("pageerror",e=>p.errs.push(e.message));p.on("dialog",d=>d.dismiss());pages.push(p);
    await p.goto(PAGE);await p.evaluate(()=>{state.settings.setupDone=true;save()});
    if(seedIt)await p.evaluate(seedIt);await p.reload();await p.waitForTimeout(600);return p}
  const st=p=>p.evaluate(()=>({user:sync.user&&sync.user.email,status:sync.status,conflict:!!sync.conflict,hw:state.homework.map(h=>h.text).join("|")}));
  const openSet=p=>p.evaluate(()=>{tab="set";setPage="account";render()});
  
  // phone with data signs in with Google -> cloud gets it
  const A=await device("A",seed);await openSet(A);
  ok("signed-out Settings shows Continue with Google",await A.isVisible('[data-sync=google]'));
  await A.click('[data-sync=google]');await A.waitForTimeout(800);
  let s=await st(A);ok("A signed in and synced: "+JSON.stringify(s),s.user==="me@test.com"&&s.status==="Synced");
  ok("header sync badge says Synced: "+await A.textContent('#syncPill'),await A.isVisible('#syncPill')&&(await A.textContent('#syncPill')).includes("Synced"));
  ok("cloud has A's planner",!!cloud&&JSON.parse(cloud.state).homework.length===3);
  // laptop (empty) signs in with email -> gets A's planner silently
  const B=await device("B",null);await openSet(B);await B.click('[data-sync=useemail]');await B.fill('#syEmail','me@test.com');await B.fill('#syPass','wrong');await B.click('[data-sync=email]');await B.waitForTimeout(400);
  ok("wrong password shows a clear message: "+(await st(B)).status,(await st(B)).status==="Wrong email or password.");
  await B.fill('#syPass','secret1');await B.click('[data-sync=email]');await B.waitForTimeout(800);
  s=await st(B);ok("empty device B downloads the planner: "+s.hw,s.hw.includes("Essay page 40")&&!s.conflict);
  // live: B adds homework -> A receives
  await B.evaluate(()=>change(()=>state.homework.push({id:"hB",text:"From laptop",s:"eng",due:todayIso,done:false})));await B.waitForTimeout(2000);
  ok("change on B appears on A live",(await st(A)).hw.includes("From laptop"));
  await A.evaluate(()=>change(()=>{state.homework=state.homework.filter(h=>h.id!=="h2")}));await A.waitForTimeout(2000);
  ok("delete on A appears on B live",!(await st(B)).hw.includes("Maths sheet"));
  // reload keeps you signed in
  await A.reload();await A.waitForTimeout(1500);s=await st(A);ok("A still signed in after reload: "+s.status,s.user&&s.status==="Synced");
  // third device with its own plans -> asked which to keep
  const C=await device("C",`state.homework=[{id:"c1",text:"Only on C",s:"eng",due:todayIso,done:false}];save();`);await openSet(C);
  await C.click('[data-sync=google]');await C.waitForTimeout(800);s=await st(C);
  ok("device with its own plans is asked which to keep",s.conflict&&await C.isVisible('[data-sync=keep-cloud]'));
  ok("nothing overwritten before choosing",s.hw==="Only on C"&&JSON.parse(cloud.state).homework.some(h=>h.text==="From laptop"));
  await C.click('[data-sync=keep-cloud]');await C.waitForTimeout(800);s=await st(C);
  ok("keep cloud copy -> C gets cloud planner",s.hw.includes("From laptop")&&!s.conflict);
  // sign out keeps local data
  await C.click('[data-sync=out]');await C.waitForTimeout(400);s=await st(C);ok("sign out keeps data on device",!s.user&&s.hw.includes("From laptop"));
  // blocked popup message
  await C.evaluate(()=>{window.__popupFail="auth/popup-blocked"});await C.click('[data-sync=google]');await C.waitForTimeout(400);
  ok("blocked pop-up explains what to do",(await st(C)).status.startsWith("The sign-in window was blocked"));
  await C.screenshot({path:"test-results/sync-out.png"});await A.evaluate(()=>{tab="set";render()});await A.screenshot({path:"test-results/sync-in.png",clip:{x:0,y:0,width:390,height:420}});
  for(const p of pages)expect(p.errs,"page errors").toEqual([]);
});
