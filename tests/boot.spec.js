import fs from "fs";
import { test, expect } from "@playwright/test";
import { setup } from "./helpers.js";

test("app starts without errors on every tab", async ({ browser, baseURL }) => {
  const { b, ok, SEED, AXE_SRC, PAGE, ORIGIN } = setup(browser, baseURL);
  let bad=0;
  for(const [w,seed] of [[390,false],[390,true],[1400,true]]){const p=await (await b.newContext({viewport:{width:w,height:900}})).newPage();const errs=[];p.on("pageerror",e=>errs.push(e.message));
    await p.goto(PAGE);await p.waitForTimeout(600);
    if(seed){await p.evaluate(SEED("seedall.js"));await p.reload();await p.waitForTimeout(900)}
    for(const t of ["study","todo","school","set","notif","search","stats"])await p.evaluate(t=>{tab=t;render()},t).catch(e=>errs.push(String(e)));
    console.log(w,seed?"seeded":"fresh",errs.length?"ERRORS "+JSON.stringify(errs):"clean");bad+=errs.length}
  expect(bad,"page errors").toBe(0);
});
