const API = "/api";
let token = localStorage.getItem("ct_token") || "";
let currentUser = JSON.parse(localStorage.getItem("ct_user") || "null");
let applications = [];
let chart = null;
let registerMode = false;
const $ = id => document.getElementById(id);
const authView = $("authView"), appView = $("appView");
const statuses = ["Saved","Applied","Assessment","Interview","Offered","Rejected","Withdrawn"];

function toast(message) { const el=$("toast"); el.textContent=message; el.classList.add("show"); setTimeout(()=>el.classList.remove("show"),2600); }
function escapeHTML(value="") { return String(value).replace(/[&<>"']/g, c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c])); }
function dateOnly(value) { if(!value) return ""; const d=new Date(value); return Number.isNaN(d.getTime())?"":d.toLocaleDateString(undefined,{day:"2-digit",month:"short",year:"numeric"}); }
function localDateInput(value) { if(!value)return ""; const d=new Date(value); if(Number.isNaN(d.getTime()))return ""; return new Date(d.getTime()-d.getTimezoneOffset()*60000).toISOString().slice(0,10); }
function setAuthMode(register) {
  registerMode=register; $("authTitle").textContent=register?"Create your account":"Welcome back";
  $("authSubtitle").textContent=register?"Start organizing your career opportunities.":"Sign in to manage your career journey.";
  $("nameField").classList.toggle("hidden",!register); $("authName").required=register;
  $("authSubmit").textContent=register?"Create account":"Sign in";
  $("switchText").textContent=register?"Already have an account?":"New to CareerTrack?";
  $("switchAuth").textContent=register?"Sign in":"Create account";
}
$("switchAuth").addEventListener("click",()=>setAuthMode(!registerMode));
$("authForm").addEventListener("submit",async e=>{
  e.preventDefault();
  const payload={email:$("authEmail").value,password:$("authPassword").value};
  if(registerMode) payload.name=$("authName").value;
  try {
    const data=await request(`/auth/${registerMode?"register":"login"}`,{method:"POST",body:JSON.stringify(payload)},false);
    token=data.token;currentUser=data.user;localStorage.setItem("ct_token",token);localStorage.setItem("ct_user",JSON.stringify(currentUser));
    showApp();
  } catch(err){toast(err.message);}
});

async function request(path, options = {}, auth = true) {
    const headers = {
        "Content-Type": "application/json",
        ...(options.headers || {})
    };

    if (auth && token) {
        headers.Authorization = `Bearer ${token}`;
    }

    const response = await fetch(API + path, {
        ...options,
        headers
    });

    const text = await response.text();

    console.log("API URL:", API + path);
    console.log("HTTP Status:", response.status);
    console.log("Raw API Response:", text);

    let data;

    try {
        data = text ? JSON.parse(text) : {};
    } catch (error) {
        throw new Error("Server returned invalid JSON.");
    }

    if (!response.ok) {
        throw new Error(data.message || "Request failed.");
    }

    return data;
}

function showAuth(){authView.classList.remove("hidden");appView.classList.add("hidden");}
function showApp(){
  if(!token||!currentUser){showAuth();return;}
  authView.classList.add("hidden");appView.classList.remove("hidden");
  $("profileName").textContent=currentUser.name;$("avatar").textContent=(currentUser.name||"U").charAt(0).toUpperCase();
  $("todayLabel").textContent=new Date().toLocaleDateString(undefined,{weekday:"short",month:"short",day:"numeric",year:"numeric"});
  const theme=localStorage.getItem("ct_theme")||"light";document.documentElement.dataset.theme=theme;$("themeToggle").textContent=theme==="dark"?"☀":"☾";
  loadAll();
}
$("themeToggle").addEventListener("click",()=>{
  const next=document.documentElement.dataset.theme==="dark"?"light":"dark";
  document.documentElement.dataset.theme=next;localStorage.setItem("ct_theme",next);$("themeToggle").textContent=next==="dark"?"☀":"☾";
  if(chart)renderChart();
});
$("logoutBtn").addEventListener("click",()=>{token="";currentUser=null;localStorage.removeItem("ct_token");localStorage.removeItem("ct_user");showAuth();});
document.querySelectorAll(".nav-item").forEach(btn=>btn.addEventListener("click",()=>navigate(btn.dataset.section)));
document.querySelectorAll("[data-goto]").forEach(btn=>btn.addEventListener("click",()=>navigate(btn.dataset.goto)));
function navigate(section){
  ["overview","applications","calendar"].forEach(s=>$(`${s}Section`).classList.toggle("hidden",s!==section));
  document.querySelectorAll(".nav-item").forEach(b=>b.classList.toggle("active",b.dataset.section===section));
  $("pageTitle").textContent=section==="overview"?"Overview":section==="applications"?"Applications":"Interviews & deadlines";
  if(section==="applications")renderApplications();
  if(section==="calendar")renderSchedules();
}

async function loadAll() {
    try {
        console.log("Loading applications...");

        const result = await request("/applications");

        console.log("Applications response:", result);

        if (!Array.isArray(result)) {
            throw new Error("Applications response is not an array.");
        }

        applications = result;

        const stats = await request("/applications/stats");

        console.log("Statistics response:", stats);

        renderStats(stats);
        renderApplications();
        renderRecent();
        renderUpcoming();
        renderSchedules();

        if (stats && Array.isArray(stats.byStatus)) {
            renderChart(stats);
        }

    } catch (err) {
        console.error("Dashboard loading error:", err);
        toast(err.message);
    }
}

function renderStats(s){$("totalStat").textContent=s.total;$("interviewStat").textContent=s.interviews;$("offerStat").textContent=s.offers;$("responseStat").textContent=s.responseRate+"%";}
function renderChart(stats){
  const canvas=$("statusChart"),empty=$("emptyChart");empty.style.display=stats.total?"none":"grid";
  if(chart)chart.destroy();
  const dark=document.documentElement.dataset.theme==="dark";
  chart=new Chart(canvas,{type:"doughnut",data:{labels:stats.byStatus.map(x=>x.status),datasets:[{data:stats.byStatus.map(x=>x.count),backgroundColor:["#b6a9ff","#6559e9","#4e9fe6","#25a77a","#3dba91","#e56b79","#e7a34d"],borderWidth:0,hoverOffset:5}]},options:{responsive:true,maintainAspectRatio:false,cutout:"68%",plugins:{legend:{position:"right",labels:{color:dark?"#c4c8d8":"#73788e",usePointStyle:true,boxWidth:8,padding:13,font:{size:10}}}}}});
}
function statusBadge(status){return `<span class="badge">${escapeHTML(status)}</span>`;}
function renderApplications(){
  const q=$("searchInput").value.toLowerCase(),st=$("statusFilter").value,ty=$("typeFilter").value;
  const list=applications.filter(a=>(!st||a.status===st)&&(!ty||a.type===ty)&&[a.company,a.role,a.location].join(" ").toLowerCase().includes(q));
  $("applicationRows").innerHTML=list.map(a=>`<tr><td><div class="company-name">${escapeHTML(a.company)}</div><div class="company-role">${escapeHTML(a.role)}</div></td><td>${escapeHTML(a.type)}</td><td>${statusBadge(a.status)}</td><td>${dateOnly(a.appliedDate)||"—"}</td><td>${escapeHTML(a.location||"—")}</td><td class="row-actions"><button data-edit="${a._id}">Edit</button><button class="delete" data-delete="${a._id}">Delete</button></td></tr>`).join("");
  $("emptyApplications").classList.toggle("hidden",list.length>0);
  document.querySelectorAll("[data-edit]").forEach(b=>b.addEventListener("click",()=>openEdit(b.dataset.edit)));
  document.querySelectorAll("[data-delete]").forEach(b=>b.addEventListener("click",()=>deleteApplication(b.dataset.delete)));
}
["searchInput","statusFilter","typeFilter"].forEach(id=>$(id).addEventListener("input",renderApplications));
function renderRecent(){
  const list=[...applications].sort((a,b)=>new Date(b.updatedAt)-new Date(a.updatedAt)).slice(0,5);
  $("recentList").innerHTML=list.length?list.map(a=>`<div class="recent-row"><div><div class="company-name">${escapeHTML(a.company)}</div><div class="company-role">${escapeHTML(a.role)}</div></div><div>${statusBadge(a.status)}</div><div class="muted">${dateOnly(a.appliedDate)}</div></div>`).join(""):`<p class="empty-state">Your recent applications will appear here.</p>`;
}
function dateEvents(){return applications.flatMap(a=>[{kind:"Interview",date:a.interviewDate,a},{kind:"Deadline",date:a.deadline,a}]).filter(x=>x.date&&new Date(x.date)>=new Date(new Date().setHours(0,0,0,0))).sort((x,y)=>new Date(x.date)-new Date(y.date));}
function eventMarkup(x){const d=new Date(x.date);return `<div class="upcoming-item"><div class="date-box"><b>${d.getDate()}</b><small>${d.toLocaleDateString(undefined,{month:"short"})}</small></div><div><strong>${escapeHTML(x.a.company)} · ${x.kind}</strong><small>${escapeHTML(x.a.role)} · ${dateOnly(x.date)}</small></div></div>`;}
function renderUpcoming(){const items=dateEvents().slice(0,4);$("upcomingList").innerHTML=items.length?items.map(eventMarkup).join(""):`<p class="empty-state">Nothing scheduled yet.</p>`;}
function renderSchedules(){
  const events=dateEvents();const interviews=events.filter(x=>x.kind==="Interview"),deadlines=events.filter(x=>x.kind==="Deadline");
  $("interviewSchedule").innerHTML=interviews.length?interviews.map(eventMarkup).join(""):`<p class="empty-state">No upcoming interviews.</p>`;
  $("deadlineSchedule").innerHTML=deadlines.length?deadlines.map(eventMarkup).join(""):`<p class="empty-state">No upcoming deadlines.</p>`;
}
function openNew(){ $("applicationForm").reset();$("applicationId").value="";$("modalTitle").textContent="Add application";$("appliedDate").value=localDateInput(new Date());$("applicationDialog").showModal();}
function openEdit(id){
  const a=applications.find(x=>x._id===id);if(!a)return;
  $("applicationId").value=a._id;$("modalTitle").textContent="Edit application";
  ["company","role","type","status","location","workMode","salary","jobUrl","notes"].forEach(k=>$(k).value=a[k]||"");
  $("appliedDate").value=localDateInput(a.appliedDate);$("deadline").value=localDateInput(a.deadline);
  $("interviewDate").value=a.interviewDate?new Date(new Date(a.interviewDate).getTime()-new Date(a.interviewDate).getTimezoneOffset()*60000).toISOString().slice(0,16):"";
  $("applicationDialog").showModal();
}
["addTop","addMain"].forEach(id=>$(id).addEventListener("click",openNew));
["closeModal","cancelModal"].forEach(id=>$(id).addEventListener("click",()=>$("applicationDialog").close()));
$("applicationForm").addEventListener("submit",async e=>{
  e.preventDefault();
  const payload={};["company","role","type","status","location","workMode","salary","jobUrl","notes"].forEach(k=>payload[k]=$(k).value);
  payload.appliedDate=$("appliedDate").value||new Date().toISOString();
  payload.deadline=$("deadline").value||null;payload.interviewDate=$("interviewDate").value||null;
  const id=$("applicationId").value;
  try{await request(`/applications${id?"/"+id:""}`,{method:id?"PUT":"POST",body:JSON.stringify(payload)});$("applicationDialog").close();toast(id?"Application updated.":"Application added.");await loadAll();}
  catch(err){
    console.error("Application error:", err);
    toast(err.message);
}
});
async function deleteApplication(id){if(!confirm("Delete this application? This cannot be undone."))return;try{await request(`/applications/${id}`,{method:"DELETE"});toast("Application deleted.");await loadAll();}catch(err){toast(err.message);}}
if(token&&currentUser)showApp();else showAuth();
