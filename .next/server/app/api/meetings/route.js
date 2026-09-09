"use strict";(()=>{var e={};e.id=643,e.ids=[643],e.modules={11185:e=>{e.exports=require("mongoose")},72934:e=>{e.exports=require("next/dist/client/components/action-async-storage.external.js")},54580:e=>{e.exports=require("next/dist/client/components/request-async-storage.external.js")},45869:e=>{e.exports=require("next/dist/client/components/static-generation-async-storage.external.js")},20399:e=>{e.exports=require("next/dist/compiled/next-server/app-page.runtime.prod.js")},30517:e=>{e.exports=require("next/dist/compiled/next-server/app-route.runtime.prod.js")},61282:e=>{e.exports=require("child_process")},84770:e=>{e.exports=require("crypto")},80665:e=>{e.exports=require("dns")},17702:e=>{e.exports=require("events")},92048:e=>{e.exports=require("fs")},32615:e=>{e.exports=require("http")},35240:e=>{e.exports=require("https")},98216:e=>{e.exports=require("net")},19801:e=>{e.exports=require("os")},55315:e=>{e.exports=require("path")},76162:e=>{e.exports=require("stream")},82452:e=>{e.exports=require("tls")},17360:e=>{e.exports=require("url")},21764:e=>{e.exports=require("util")},71568:e=>{e.exports=require("zlib")},67691:(e,t,o)=>{o.r(t),o.d(t,{originalPathname:()=>E,patchFetch:()=>A,requestAsyncStorage:()=>T,routeModule:()=>S,serverHooks:()=>I,staticGenerationAsyncStorage:()=>v});var a={};o.r(a),o.d(a,{GET:()=>h,POST:()=>b});var i=o(49303),n=o(88716),s=o(60670),r=o(87070),l=o(15143),d=o(2021),c=o(87545),p=o(47014),m=o(71732),u=o(82941),g=o(41905),f=o(81401),y=o(25502),x=o(80156);async function h(){let e=await (0,l.I8)();if(!e?.user)return r.NextResponse.json({message:"Unauthorized"},{status:401});let t=e.user.role,o=e.user.employeeId;try{await (0,d.v)();let e=(await c.Z.find("ADMIN"===t?{}:{assignedEmployeeId:o}).sort({date:1,time:1}).lean()).map(e=>({id:e._id.toString(),date:e.date,time:e.time,clientName:e.clientName,clientType:e.clientType,phone:e.phone,businessAddress:e.businessAddress||"",mapsLink:e.mapsLink||"",assignedEmployeeId:e.assignedEmployeeId,createdByEmployeeId:e.createdByEmployeeId,leadId:e.leadId,notes:e.notes||"",status:e.status||"scheduled",convertedToClient:e.convertedToClient||!1,dealAmount:e.dealAmount,contractDuration:e.contractDuration,acquisitionExpense:e.acquisitionExpense,nextFollowUp:e.nextFollowUp,createdAt:e.createdAt?.toISOString?.()||new Date().toISOString(),updatedAt:e.updatedAt?.toISOString?.()||new Date().toISOString()}));return r.NextResponse.json({meetings:e})}catch(a){console.warn("[API MEETINGS] Fallback to in-memory store:",a.message);let e="ADMIN"===t?x.l.meetings:x.l.meetings.filter(e=>e.assignedEmployeeId===o);return r.NextResponse.json({meetings:e})}}async function b(e){let t;let o=await (0,l.I8)();if(!o?.user)return r.NextResponse.json({message:"Unauthorized"},{status:401});let a=o.user.role,i=o.user.employeeId,n=await e.json();if(!n.date||!n.time||!n.clientName||!n.phone)return r.NextResponse.json({message:"Missing required fields: Date, Time, Client Name, and Phone Number."},{status:400});await (0,d.v)();let s="ADMIN"===a?n.assignedEmployeeId??i:i;try{await (0,d.v)();let e=(await c.Z.find({status:{$ne:"cancelled"}}).lean()).map(e=>({id:e._id.toString(),date:e.date,time:e.time,clientName:e.clientName,clientType:e.clientType,phone:e.phone,assignedEmployeeId:e.assignedEmployeeId,status:e.status,convertedToClient:e.convertedToClient,createdAt:e.createdAt?.toISOString?.()||"",updatedAt:e.updatedAt?.toISOString?.()||""})),a=(0,f.Sn)(e,n.date,n.time);if(!a.valid)return r.NextResponse.json({message:a.message},{status:400});let l=await c.Z.create({date:n.date,time:n.time,clientName:n.clientName,clientType:n.clientType??"Clinic / Hospital",phone:n.phone,businessAddress:n.businessAddress??"",mapsLink:n.mapsLink??"",assignedEmployeeId:s,createdByEmployeeId:i,leadId:n.leadId,notes:n.notes??"",status:n.status??"scheduled",convertedToClient:n.convertedToClient??!1,dealAmount:n.dealAmount,contractDuration:n.contractDuration,acquisitionExpense:n.acquisitionExpense,nextFollowUp:n.nextFollowUp});if(t={id:l._id.toString(),date:l.date,time:l.time,clientName:l.clientName,clientType:l.clientType,phone:l.phone,businessAddress:l.businessAddress||"",mapsLink:l.mapsLink||"",assignedEmployeeId:l.assignedEmployeeId,createdByEmployeeId:l.createdByEmployeeId,leadId:l.leadId,notes:l.notes||"",status:l.status,convertedToClient:l.convertedToClient,dealAmount:l.dealAmount,contractDuration:l.contractDuration,acquisitionExpense:l.acquisitionExpense,nextFollowUp:l.nextFollowUp,createdAt:l.createdAt.toISOString(),updatedAt:l.updatedAt.toISOString()},n.leadId)try{await p.Z.findByIdAndUpdate(n.leadId,{status:"MEETING_BOOKED",updatedAt:new Date})}catch(e){console.error("Failed to update linked lead status:",e)}try{await u.Z.create({employeeId:i,employeeName:o.user.name??"Staff",actionType:"CREATE_MEETING",entityType:"meeting",entityId:t.id,details:`Booked meeting with ${t.clientName} (${t.clientType}) on ${t.date} at ${(0,f.s8)(t.time)}`})}catch(e){console.error("Failed to save audit log:",e)}}catch(o){console.warn("[API MEETINGS POST] DB error, using fallback in-memory store:",o.message);let e=(0,f.Sn)(x.l.meetings,n.date,n.time);if(!e.valid)return r.NextResponse.json({message:e.message},{status:400});if(t={id:`MEET-${Date.now()}`,date:n.date,time:n.time,clientName:n.clientName,clientType:n.clientType??"Clinic / Hospital",phone:n.phone,businessAddress:n.businessAddress||"",mapsLink:n.mapsLink||"",assignedEmployeeId:s,createdByEmployeeId:i,leadId:n.leadId,notes:n.notes||"",status:n.status??"scheduled",convertedToClient:n.convertedToClient??!1,dealAmount:n.dealAmount,contractDuration:n.contractDuration,acquisitionExpense:n.acquisitionExpense,nextFollowUp:n.nextFollowUp,createdAt:new Date().toISOString(),updatedAt:new Date().toISOString()},x.l.meetings.unshift(t),n.leadId){let e=x.l.leads.find(e=>e.id===n.leadId);e&&(e.status="MEETING_BOOKED",e.updatedAt=new Date().toISOString())}}let h=await m.Z.findOne({employeeId:s}),b=[t.phone,h?.phone].filter(Boolean),S=(0,f.s8)(t.time);return await (0,g.zC)({numbers:b,clientName:t.clientName,date:t.date,time:S,repName:"Abhishek Kumar",notes:t.notes}),await (0,g.Mx)({numbers:b,message:`Vyapar Wallah: Meeting confirmed with ${t.clientName} on ${t.date} at ${S}.${t.mapsLink?` Maps: ${t.mapsLink}`:""}`,route:"q"}),await (0,y.B)({meeting:t,bookedByName:o.user.name??"Staff",bookedByRole:a}),r.NextResponse.json({meeting:t},{status:201})}let S=new i.AppRouteRouteModule({definition:{kind:n.x.APP_ROUTE,page:"/api/meetings/route",pathname:"/api/meetings",filename:"route",bundlePath:"app/api/meetings/route"},resolvedPagePath:"C:\\Users\\avina\\OneDrive\\Desktop\\Meeting schduler\\app\\api\\meetings\\route.ts",nextConfigOutput:"",userland:a}),{requestAsyncStorage:T,staticGenerationAsyncStorage:v,serverHooks:I}=S,E="/api/meetings/route";function A(){return(0,s.patchFetch)({serverHooks:I,staticGenerationAsyncStorage:v})}},25502:(e,t,o)=>{o.d(t,{B:()=>s,N:()=>r});var a=o(55245),i=o(81401);function n(){let e=process.env.SMTP_HOST?.trim(),t=Number(process.env.SMTP_PORT)||587,o=process.env.SMTP_USER?.trim(),i=process.env.SMTP_PASS?.trim(),n="true"===process.env.SMTP_SECURE||465===t;return e&&o&&i?(e.includes("gmail.com")&&i.includes(" ")&&(i=i.replace(/\s+/g,"")),a.createTransport({host:e,port:t,secure:n,auth:{user:o,pass:i},tls:{rejectUnauthorized:!1}})):null}async function s({meeting:e,bookedByName:t,bookedByRole:o}){let a=process.env.ADMIN_NOTIFICATION_EMAIL||"avinashjhacode@gmail.com",s=process.env.EMAIL_FROM||'"Vyapar Wallah Alert" <no-reply@vyaparwallah.com>',r=(0,i.s8)(e.time),l=`🚀 New Meeting Fixed: ${e.clientName} (${e.clientType}) - ${e.date} at ${r}`,d=`
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f8fafc; margin: 0; padding: 20px; color: #1e293b; }
    .card { max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 16px; border: 1px solid #e2e8f0; overflow: hidden; box-shadow: 0 4px 15px rgba(0,0,0,0.05); }
    .header { background: linear-gradient(135deg, #1e293b 0%, #0f172a 100%); padding: 24px; color: #ffffff; }
    .badge { display: inline-block; background-color: #ff6a00; color: #ffffff; font-size: 11px; font-weight: 700; padding: 4px 10px; border-radius: 20px; text-transform: uppercase; letter-spacing: 0.5px; }
    .title { font-size: 20px; font-weight: 800; margin-top: 10px; color: #ffffff; }
    .content { padding: 24px; }
    .info-table { width: 100%; border-collapse: collapse; margin-top: 15px; }
    .info-table td { padding: 10px 12px; border-bottom: 1px solid #f1f5f9; font-size: 14px; }
    .info-table td.label { font-weight: 700; color: #64748b; width: 38%; }
    .info-table td.value { font-weight: 600; color: #0f172a; }
    .highlight { background-color: #fff7ed; border-left: 4px solid #ff6a00; padding: 12px 16px; border-radius: 0 8px 8px 0; margin-top: 20px; font-size: 13px; color: #9a3412; }
    .button-wrap { text-align: center; margin-top: 25px; margin-bottom: 10px; }
    .button { display: inline-block; background-color: #ff6a00; color: #ffffff !important; font-weight: 700; font-size: 14px; padding: 12px 28px; border-radius: 10px; text-decoration: none; }
    .footer { background-color: #f8fafc; padding: 16px; text-align: center; font-size: 12px; color: #94a3b8; border-top: 1px solid #e2e8f0; }
  </style>
</head>
<body>
  <div class="card">
    <div class="header">
      <span class="badge">Vyapar Wallah CRM</span>
      <div class="title">🎉 New Client Meeting Booked!</div>
      <p style="margin: 6px 0 0 0; font-size: 13px; color: #cbd5e1;">A telecaller has fixed a new appointment.</p>
    </div>

    <div class="content">
      <table class="info-table">
        <tr>
          <td class="label">Client / Doctor:</td>
          <td class="value" style="font-size: 15px; color: #ff6a00;">${e.clientName}</td>
        </tr>
        <tr>
          <td class="label">Category:</td>
          <td class="value">
            <span style="background: ${"Clinic / Hospital"===e.clientType?"#ecfdf5":"#eff6ff"}; color: ${"Clinic / Hospital"===e.clientType?"#047857":"#1d4ed8"}; padding: 3px 8px; border-radius: 6px; font-size: 12px; font-weight: 700;">
              ${e.clientType}
            </span>
          </td>
        </tr>
        <tr>
          <td class="label">Meeting Date:</td>
          <td class="value">📅 <strong>${e.date}</strong></td>
        </tr>
        <tr>
          <td class="label">Meeting Time:</td>
          <td class="value">⏰ <strong>${r} (IST)</strong></td>
        </tr>
        <tr>
          <td class="label">Phone Number:</td>
          <td class="value">📞 <a href="tel:${e.phone}" style="color: #0f172a; text-decoration: none; font-weight: 700;">${e.phone}</a></td>
        </tr>
        <tr>
          <td class="label">Booked By:</td>
          <td class="value">👤 ${t} (${o})</td>
        </tr>
        ${e.notes?`<tr>
                <td class="label">Initial Notes:</td>
                <td class="value" style="color: #475569; font-style: italic;">${e.notes}</td>
              </tr>`:""}
      </table>

      <div class="highlight">
        💡 <strong>Reminder:</strong> Please ensure the sales team or representative is prepared with demo materials for this slot.
      </div>

      <div class="button-wrap">
        <a href="${process.env.NEXTAUTH_URL||"http://localhost:3000"}/dashboard" class="button">
          Open Admin Portal & Calendar
        </a>
      </div>
    </div>

    <div class="footer">
      Vyapar Wallah Meeting Scheduler & CRM • Automated Notification
    </div>
  </div>
</body>
</html>
  `,c=n();if(!c)return console.log("\n================== [ADMIN EMAIL NOTIFICATION] =================="),console.log(`To: ${a}`),console.log(`Subject: ${l}`),console.log(`Client: ${e.clientName} (${e.clientType})`),console.log(`Date & Time: ${e.date} at ${r}`),console.log(`Phone: ${e.phone}`),console.log(`Booked By: ${t} (${o})`),console.log("----------------------------------------------------------------"),console.log("NOTE: To send live emails, configure SMTP_HOST, SMTP_USER, and SMTP_PASS in .env.local."),console.log("================================================================\n"),{success:!0,message:"Email preview generated in server console (SMTP credentials not configured)."};try{let e=await c.sendMail({from:s,to:a,subject:l,html:d});return console.log(`[EMAIL SENT] Notification delivered to Admin (${a}): Message ID ${e.messageId}`),{success:!0,message:`Email notification sent successfully to ${a}`}}catch(e){return console.error("[EMAIL ERROR] Failed to send email via SMTP:",e),{success:!1,message:e?.message||"Failed to send email via SMTP."}}}async function r({email:e,name:t,otp:o,role:a}){let i=process.env.EMAIL_FROM||'"Vyapar Wallah Security" <no-reply@vyaparwallah.com>',s=`🔐 [Security Code: ${o}] Login Verification - Vyapar Wallah`,r=`
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f1f5f9; margin: 0; padding: 24px; color: #0f172a; }
    .card { max-width: 520px; margin: 0 auto; background: #ffffff; border-radius: 18px; border: 1px solid #e2e8f0; overflow: hidden; box-shadow: 0 10px 25px rgba(0,0,0,0.06); }
    .header { background: linear-gradient(135deg, #0f172a 0%, #1e293b 100%); padding: 28px 24px; text-align: center; color: #ffffff; }
    .logo-badge { display: inline-block; background-color: #ff6a00; color: #ffffff; font-size: 11px; font-weight: 800; padding: 4px 12px; border-radius: 20px; text-transform: uppercase; letter-spacing: 0.8px; }
    .title { font-size: 22px; font-weight: 900; margin-top: 12px; color: #ffffff; letter-spacing: -0.5px; }
    .content { padding: 28px 24px; text-align: center; }
    .greeting { font-size: 15px; font-weight: 600; color: #334155; margin-bottom: 8px; }
    .instructions { font-size: 13px; color: #64748b; line-height: 1.6; margin-bottom: 24px; }
    .otp-box { background: #f8fafc; border: 2px dashed #ff6a00; border-radius: 14px; padding: 18px; margin: 20px 0; text-align: center; }
    .otp-code { font-family: 'Courier New', Courier, monospace; font-size: 36px; font-weight: 900; letter-spacing: 8px; color: #0f172a; margin: 4px 0; }
    .otp-expiry { font-size: 12px; font-weight: 700; color: #ff6a00; text-transform: uppercase; margin-top: 4px; }
    .warning-box { background-color: #fff7ed; border-radius: 10px; border-left: 4px solid #ea580c; padding: 12px 14px; text-align: left; font-size: 12px; color: #9a3412; line-height: 1.5; margin-top: 24px; }
    .footer { background-color: #f8fafc; padding: 18px; text-align: center; font-size: 11px; color: #94a3b8; border-top: 1px solid #e2e8f0; }
  </style>
</head>
<body>
  <div class="card">
    <div class="header">
      <span class="logo-badge">Vyapar Wallah Portal</span>
      <div class="title">Two-Factor Authentication</div>
    </div>

    <div class="content">
      <div class="greeting">Hello, ${t} (${a}) 👋</div>
      <div class="instructions">
        A login attempt was initiated for your Vyapar Wallah account. Use the one-time security code below to complete sign in.
      </div>

      <div class="otp-box">
        <div style="font-size: 11px; font-weight: 700; color: #64748b; text-transform: uppercase; letter-spacing: 1px;">Your 6-Digit OTP</div>
        <div class="otp-code">${o}</div>
        <div class="otp-expiry">⏱️ Valid for 5 minutes only</div>
      </div>

      <div class="warning-box">
        🔒 <strong>Security Notice:</strong> Never share this OTP with anyone, including staff. If you did not request this code, please reset your password immediately.
      </div>
    </div>

    <div class="footer">
      Vyapar Wallah Meeting Scheduler & CRM • Automated Security System
    </div>
  </div>
</body>
</html>
  `,l=n();if(!l)return console.log("\n================== [LOGIN 2FA OTP EMAIL] =================="),console.log(`To: ${e} (${t} - ${a})`),console.log(`Subject: ${s}`),console.log(`🔐 OTP SECURITY CODE: >>> ${o} <<<`),console.log("Validity: 5 Minutes"),console.log("-----------------------------------------------------------"),console.log("NOTE: To send live emails to inbox, configure SMTP_HOST, SMTP_USER, and SMTP_PASS in .env.local."),console.log("===========================================================\n"),{success:!0,message:"OTP preview generated in server console (SMTP credentials not configured)."};try{let t=await l.sendMail({from:i,to:e,subject:s,html:r});return console.log(`[OTP SENT] Security verification code delivered to ${e}: Message ID ${t.messageId}`),{success:!0,message:`OTP delivered to ${e}`}}catch(e){return console.error("[OTP ERROR] Failed to send OTP email via SMTP:",e),{success:!1,message:e?.message||"Failed to send OTP email via SMTP."}}}},80156:(e,t,o)=>{o.d(t,{l:()=>i});let a=globalThis.memoryStoreCache||{meetings:[],leads:[],clients:[],auditLogs:[{id:"LOG-1",employeeId:"EMP-1001",employeeName:"Vyapar Admin",actionType:"SYSTEM_INIT",entityType:"system",details:"Meeting & Calling CRM System initialized successfully",createdAt:new Date().toLocaleTimeString([],{hour:"2-digit",minute:"2-digit"})+", Today"},{id:"LOG-2",employeeId:"EMP-1002",employeeName:"Rohit Sharma",actionType:"UPDATE_LEAD",entityType:"lead",details:"Called Dr. R. K. Verma Clinic • Disposition: Connected & Interested",createdAt:"10:15 AM, Today"},{id:"LOG-3",employeeId:"EMP-1003",employeeName:"Neha Gupta",actionType:"BOOK_MEETING",entityType:"meeting",details:"Confirmed demo meeting with Apex Public School for 01:00 PM",createdAt:"11:30 AM, Today"}],users:[{id:"EMP-1001",employeeId:"EMP-1001",name:"Avinash Jha",email:"avinashjhacode@gmail.com",passwordHash:"",role:"ADMIN",phone:"+91 98000 10001",active:!0}]};globalThis.memoryStoreCache||(globalThis.memoryStoreCache=a);let i=a},47014:(e,t,o)=>{o.d(t,{Z:()=>s});var a=o(11185),i=o.n(a);let n=new a.Schema({clientName:{type:String,required:!0,trim:!0},doctorName:{type:String,default:"",trim:!0},clientType:{type:String,enum:["School / Coaching","Clinic / Hospital"],default:"Clinic / Hospital",required:!0},phone:{type:String,required:!0,trim:!0,index:!0},city:{type:String,default:"Indore",trim:!0},assignedEmployeeId:{type:String,required:!0,index:!0},status:{type:String,enum:["NEW","CONNECTED","CALLBACK","MEETING_BOOKED","BUSY","CALL_CUT","NOT_INTERESTED"],default:"NEW",index:!0},notes:{type:String,default:""},callbackTime:{type:String}},{timestamps:!0}),s=i().models.CallingLead||i().model("CallingLead",n)},87545:(e,t,o)=>{o.d(t,{Z:()=>s});var a=o(11185),i=o.n(a);let n=new a.Schema({date:{type:String,required:!0,index:!0},time:{type:String,required:!0},clientName:{type:String,required:!0,trim:!0},clientType:{type:String,enum:["School / Coaching","Clinic / Hospital"],default:"Clinic / Hospital",required:!0},phone:{type:String,required:!0,trim:!0,index:!0},businessAddress:{type:String,default:""},mapsLink:{type:String,default:""},assignedEmployeeId:{type:String,required:!0,index:!0},createdByEmployeeId:{type:String},leadId:{type:String},notes:{type:String,default:""},status:{type:String,enum:["scheduled","completed","cancelled"],default:"scheduled"},convertedToClient:{type:Boolean,default:!1},dealAmount:{type:Number},contractDuration:{type:String},acquisitionExpense:{type:Number},nextFollowUp:{type:String}},{timestamps:!0});n.index({date:1,time:1});let s=i().models.Meeting||i().model("Meeting",n)}};var t=require("../../../webpack-runtime.js");t.C(e);var o=e=>t(t.s=e),a=t.X(0,[19,923,489,245,951],()=>o(67691));module.exports=a})();