(()=>{const L="Extraordinarily long subject name that keeps going";state.settings.setupDone=true;
 for(let i=0;i<20;i++){state.subjects.push({id:"x"+i,name:(i%3?"Subject "+i:L+" "+i).slice(0,24),c:PALETTE[i%8]});state.remaining["x"+i]=i}
 SUBJECTS=[...state.subjects,OTHER];
 DAY_ORDER.forEach(d=>{state.days[d].tasks=Array.from({length:6},(_,i)=>({id:"t"+d+i,s:"x"+i,title:i%2?"A very long lesson title here":undefined}));
   state.days[d].classes=Array.from({length:5},(_,i)=>({id:"c"+d+i,name:(i?"Class "+i:L),start:String(8+i).padStart(2,"0")+":00",end:String(8+i).padStart(2,"0")+":45"}))});
 for(let i=0;i<40;i++)state.homework.push({id:"h"+i,text:(i%4?"Homework "+i:L+" "+L),s:"x"+(i%20),due:addDays(i%9-3),done:i%5===0,pri:i%3===0,est:[15,30,60,90][i%4]});
 for(let i=0;i<12;i++)state.exams.push({id:"e"+i,title:(i%2?"Exam "+i:L),s:"x"+i,date:addDays(i*2)});
 for(let i=0;i<10;i++)state.reminders.push({id:"r"+i,text:(i%2?"Reminder "+i:L+" "+L),date:addDays(i%4),time:"23:5"+i%10});
 for(let i=0;i<365;i++){const k=addDays(-i);const x=dayData(state,k);x.done["q"+i]=1;state.att[k]=i%7?"p":"a";state.focusLog[k]=i%60}
 state.grades=Array.from({length:30},(_,i)=>({id:"g"+i,s:"x"+(i%5),name:(i%3?"Quiz "+i:L),score:i%20,max:20,date:addDays(-i)}));
 state.topics={x0:Array.from({length:15},(_,i)=>({id:"tp"+i,t:(i%2?"Topic "+i:L+" "+L),done:i%3===0}))};
 state.notes.push({id:"nn",s:"x0",title:L+L,text:Array.from({length:30},(_,i)=>"Q"+i+" "+L+" :: A"+i+" "+L).join("\n"),imgs:[],created:Date.now(),updated:Date.now()});
 state.holidays=[{id:"hh",name:L,from:addDays(3),to:addDays(10)}];save()})();
