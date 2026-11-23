
let databaseReady=false;
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
function showNewUserForm(){
document.getElementById("loginForm").classList.add("hidden");
document.getElementById("newUserForm").classList.remove("hidden");
document.getElementById("formTitle").textContent="Create Administrator";
document.getElementById("formSubtitle").textContent="Create your first administrator account";
showMessage("");
}
function showLoginForm(message=""){
document.getElementById("newUserForm").classList.add("hidden");
document.getElementById("loginForm").classList.remove("hidden");
document.getElementById("formTitle").textContent="Login";
document.getElementById("formSubtitle").textContent="Welcome back, please sign in";
showMessage(message);
}
async function initializeLogin(){
try{
await loadScript("../Database/sql-wasm.js");
await loadScript("../Database/database.js");
await initDatabase("../Database/");
databaseReady=true;
if(getUsersCount()===0)showNewUserForm();
else showLoginForm();
}catch(error){
showMessage("Database initialization failed. Please check the database files.",true);
}
}
document.addEventListener("DOMContentLoaded",()=>{
initializeLogin();
document.getElementById("loginForm").addEventListener("submit",async event=>{
event.preventDefault();
if(!databaseReady)return showMessage("Database is not ready.",true);
const username=document.getElementById("username").value.trim();
const userpassword=document.getElementById("userpassword").value;
if(!username||!userpassword)return showMessage("Enter username and userpassword.",true);
try{
const user=await checkUser(username,userpassword);
if(!user)return showMessage("Invalid username or userpassword.",true);
sessionStorage.setItem("currentUserId",user.userid);
sessionStorage.setItem("currentUsername",user.username);
window.location.replace("../Dashboard.html");
}catch(error){
showMessage("Login failed. Please try again.",true);
}
});
document.getElementById("newUserForm").addEventListener("submit",async event=>{
event.preventDefault();
if(!databaseReady)return showMessage("Database is not ready.",true);
const username=document.getElementById("newUsername").value.trim();
const userpassword=document.getElementById("newPassword").value;
const confirmPassword=document.getElementById("confirmPassword").value;
if(!username||!userpassword)return showMessage("Enter username and userpassword.",true);
if(userpassword!==confirmPassword)return showMessage("Passwords do not match.",true);
try{
await createUser(username,userpassword);
document.getElementById("loginForm").reset();
document.getElementById("newUserForm").reset();
showLoginForm("User created successfully. Please login.");
}catch(error){
showMessage("Unable to create user. Username may already exist.",true);
}
});
});
