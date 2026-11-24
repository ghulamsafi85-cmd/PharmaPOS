const REMEMBER_KEY="PharmaPOS_RememberedUsername";
const ATTEMPT_KEY="PharmaPOS_LoginAttempts";
const LOCK_TIME=5*60*1000;
const ATTEMPT_WINDOW=5*60*1000;
const WORKER_URL="https://young-river-e88c.ghulam-safi85.workers.dev/login";
const FIRESTORE_URL="https://firestore.googleapis.com/v1/projects/pharmapos-896c2/databases/(default)/documents/users/";
const REQUEST_TIMEOUT=15000;
function showMessage(message,error=false){
const element=document.getElementById("loginMessage");
if(element){element.textContent=message;element.style.color=error?"#ffb3b3":"#ffffff";}
}
function togglePassword(id){
const input=document.getElementById(id);
if(input)input.type=input.type==="password"?"text":"password";
}
function focusUsername(){
const input=document.getElementById("username");
if(input)input.focus();
}
function showNewUserForm(){
showMessage("Administrator account already exists. Please login.",true);
showLoginForm();
}
function showLoginForm(message=""){
const newForm=document.getElementById("newUserForm");
const loginForm=document.getElementById("loginForm");
if(newForm)newForm.classList.add("hidden");
if(loginForm)loginForm.classList.remove("hidden");
const title=document.getElementById("formTitle");
const subtitle=document.getElementById("formSubtitle");
if(title)title.textContent="Login";
if(subtitle)subtitle.textContent="Welcome back, please sign in";
showMessage(message);
focusUsername();
}
function getAttemptData(){
try{return JSON.parse(localStorage.getItem(ATTEMPT_KEY))||{attempts:[],lockUntil:0};}
catch(e){return{attempts:[],lockUntil:0};}
}
function getRemainingLockTime(){
return Math.max(0,getAttemptData().lockUntil-Date.now());
}
function checkLoginLock(){
const remaining=getRemainingLockTime();
if(remaining>0){showMessage("Login locked. Try again in "+Math.ceil(remaining/1000)+" seconds.",true);return true;}
return false;
}
function recordFailedAttempt(){
const now=Date.now();
const data=getAttemptData();
data.attempts=(data.attempts||[]).filter(time=>now-time<ATTEMPT_WINDOW);
data.attempts.push(now);
if(data.attempts.length>=3){
data.attempts=[];
data.lockUntil=now+LOCK_TIME;
localStorage.setItem(ATTEMPT_KEY,JSON.stringify(data));
showMessage("Three failed attempts. Login is locked for 5 minutes.",true);
return;
}
localStorage.setItem(ATTEMPT_KEY,JSON.stringify(data));
showMessage("Invalid username or password. Remaining attempts: "+(3-data.attempts.length),true);
}
function clearFailedAttempts(){
localStorage.removeItem(ATTEMPT_KEY);
}
function loadRememberedUsername(){
const saved=localStorage.getItem(REMEMBER_KEY);
const input=document.getElementById("username");
const remember=document.getElementById("rememberMe");
if(saved&&input&&remember){input.value=saved;remember.checked=true;}
}
async function fetchJSON(url,options){
const controller=new AbortController();
const timer=setTimeout(()=>controller.abort(),REQUEST_TIMEOUT);
try{
const response=await fetch(url,{...options,signal:controller.signal,cache:"no-store"});
const data=await response.json();
return{response,data};
}catch(error){
if(error.name==="AbortError")throw new Error("Connection timed out. Please try again.");
throw new Error("Network connection failed. Please try again.");
}finally{
clearTimeout(timer);
}
}
async function firebaseLogin(username,password){
const result=await fetchJSON(WORKER_URL,{
method:"POST",
headers:{"Content-Type":"application/json"},
body:JSON.stringify({username,password})
});
if(!result.response.ok||!result.data.success)throw new Error(result.data.message||"Invalid username or password");
return result.data;
}
async function getCloudUser(uid,idToken){
const result=await fetchJSON(FIRESTORE_URL+encodeURIComponent(uid),{
method:"GET",
headers:{"Authorization":"Bearer "+idToken}
});
if(!result.response.ok)throw new Error("Unable to read user profile from Firestore");
const fields=result.data.fields||{};
return{
userid:Number(fields.userid?.integerValue||fields.userid?.doubleValue||0),
username:fields.username?.stringValue||"",
email:fields.email?.stringValue||"",
role:fields.role?.stringValue||""
};
}
async function initializeLogin(){
loadRememberedUsername();
showLoginForm();
}
document.addEventListener("DOMContentLoaded",()=>{
const loginForm=document.getElementById("loginForm");
const newUserForm=document.getElementById("newUserForm");
const usernameInput=document.getElementById("username");
const rememberMe=document.getElementById("rememberMe");
if(rememberMe)rememberMe.addEventListener("change",()=>{
if(!rememberMe.checked)localStorage.removeItem(REMEMBER_KEY);
});
const forgotPassword=document.getElementById("forgotPassword");
if(forgotPassword)forgotPassword.addEventListener("click",event=>{
event.preventDefault();
showMessage("Please contact your system administrator to reset your password.",true);
});
if(loginForm)loginForm.addEventListener("submit",async event=>{
event.preventDefault();
if(checkLoginLock())return;
const username=usernameInput?.value.trim()||"";
const password=document.getElementById("userpassword")?.value||"";
if(!username||!password)return showMessage("Enter username and password.",true);
const submitButton=loginForm.querySelector('[type="submit"]');
if(submitButton)submitButton.disabled=true;
showMessage("Signing in...");
try{
const auth=await firebaseLogin(username,password);
const user=await getCloudUser(auth.localId,auth.idToken);
if(!user.userid||!user.username)throw new Error("User profile is incomplete");
if(user.role!=="admin")throw new Error("Your account does not have administrator permission");
clearFailedAttempts();
if(rememberMe?.checked)localStorage.setItem(REMEMBER_KEY,username);
else localStorage.removeItem(REMEMBER_KEY);
sessionStorage.setItem("currentUserId",String(user.userid));
sessionStorage.setItem("currentUsername",user.username);
sessionStorage.setItem("firebaseUid",auth.localId);
sessionStorage.setItem("firebaseIdToken",auth.idToken);
sessionStorage.setItem("firebaseRefreshToken",auth.refreshToken);
sessionStorage.setItem("firebaseTokenExpiry",String(Date.now()+Number(auth.expiresIn)*1000));
window.location.replace("../Dashboard.html");
}catch(error){
if(error.message==="Invalid username or password")recordFailedAttempt();
else showMessage(error.message||"Login failed. Please try again.",true);
}finally{
if(submitButton)submitButton.disabled=false;
}
});
if(newUserForm)newUserForm.addEventListener("submit",event=>{
event.preventDefault();
showMessage("Administrator already exists. Please login.",true);
});
initializeLogin();
});
