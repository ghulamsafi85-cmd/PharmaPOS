
let databaseReady=false;
const REMEMBER_KEY="PharmaPOS_RememberedUsername";
const ATTEMPT_KEY="PharmaPOS_LoginAttempts";
const LOCK_TIME=5*60*1000;
const ATTEMPT_WINDOW=5*60*1000;
function loadScript(src){
return new Promise((resolve,reject)=>{
const script=document.createElement("script");
script.src=src;
script.onload=resolve;
script.onerror=()=>reject(new Error("Failed to load "+src));
document.head.appendChild(script);
});
}
function showMessage(message,error=false){
const element=document.getElementById("loginMessage");
if(element){
element.textContent=message;
element.style.color=error?"#ffb3b3":"#ffffff";
}
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
document.getElementById("loginForm").classList.add("hidden");
document.getElementById("newUserForm").classList.remove("hidden");
document.getElementById("formTitle").textContent="Create Administrator";
document.getElementById("formSubtitle").textContent="Create your first administrator account";
showMessage("");
document.getElementById("newUsername").focus();
}
function showLoginForm(message=""){
document.getElementById("newUserForm").classList.add("hidden");
document.getElementById("loginForm").classList.remove("hidden");
document.getElementById("formTitle").textContent="Login";
document.getElementById("formSubtitle").textContent="Welcome back, please sign in";
showMessage(message);
focusUsername();
}
function getAttemptData(){
try{return JSON.parse(localStorage.getItem(ATTEMPT_KEY))||{attempts:[],lockUntil:0}}
catch(e){return{attempts:[],lockUntil:0}}
}
function getRemainingLockTime(){
const data=getAttemptData();
return Math.max(0,data.lockUntil-Date.now());
}
function checkLoginLock(){
const remaining=getRemainingLockTime();
if(remaining>0){
showMessage("Login locked. Try again in "+Math.ceil(remaining/1000)+" seconds.",true);
return true;
}
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
if(saved){
document.getElementById("username").value=saved;
document.getElementById("rememberMe").checked=true;
}
}
async function initializeLogin(){
try{
await loadScript("../Database/sql-wasm.js");
await loadScript("../Database/database.js");
await initDatabase("../Database/");
databaseReady=true;
if(getUsersCount()===0)showNewUserForm();
else{
loadRememberedUsername();
showLoginForm();
}
}catch(error){
showMessage("Database initialization failed. Please check the database files.",true);
}
}
document.addEventListener("DOMContentLoaded",()=>{
const loginForm=document.getElementById("loginForm");
const newUserForm=document.getElementById("newUserForm");
const usernameInput=document.getElementById("username");
const rememberMe=document.getElementById("rememberMe");
rememberMe.addEventListener("change",()=>{
if(!rememberMe.checked)localStorage.removeItem(REMEMBER_KEY);
});
document.getElementById("forgotPassword").addEventListener("click",event=>{
event.preventDefault();
showMessage("Please contact your system administrator to reset your password.",true);
});
loginForm.addEventListener("submit",async event=>{
event.preventDefault();
if(!databaseReady)return showMessage("Database is not ready.",true);
if(checkLoginLock())return;
const username=usernameInput.value.trim();
const userpassword=document.getElementById("userpassword").value;
if(!username||!userpassword)return showMessage("Enter username and password.",true);
try{
const user=await checkUser(username,userpassword);
if(!user){
recordFailedAttempt();
return;
}
clearFailedAttempts();
if(rememberMe.checked)localStorage.setItem(REMEMBER_KEY,username);
else localStorage.removeItem(REMEMBER_KEY);
sessionStorage.setItem("currentUserId",user.userid);
sessionStorage.setItem("currentUsername",user.username);
window.location.replace("../Dashboard.html");
}catch(error){
showMessage("Login failed. Please try again.",true);
}
});
newUserForm.addEventListener("submit",async event=>{
event.preventDefault();
if(!databaseReady)return showMessage("Database is not ready.",true);
const username=document.getElementById("newUsername").value.trim();
const userpassword=document.getElementById("newPassword").value;
const confirmPassword=document.getElementById("confirmPassword").value;
if(!username||!userpassword)return showMessage("Enter username and password.",true);
if(userpassword!==confirmPassword)return showMessage("Passwords do not match.",true);
try{
await createUser(username,userpassword);
newUserForm.reset();
loginForm.reset();
showLoginForm("Administrator created successfully. Please login.");
}catch(error){
showMessage("Unable to create user. Username may already exist.",true);
}
});
initializeLogin();
});
