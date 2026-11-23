
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
element.style.color=error?"#d62828":"#16803c";
}
}
async function initializeLogin(){
try{
await loadScript("../Database/sql-wasm.js");
await loadScript("../Database/database.js");
await initDatabase();
databaseReady=true;
if(getUsersCount()===0)showNewUserForm();
else showLoginForm();
}catch(error){
showMessage("Database initialization failed. Please check the database files.",true);
}
}
function showNewUserForm(){
const container=document.querySelector(".login-container");
container.innerHTML=`<h2>Create Administrator</h2><form id="newUserForm"><input id="newUsername" type="text" placeholder="Username" required><input id="newPassword" type="password" placeholder="Password" required><input id="confirmPassword" type="password" placeholder="Confirm Password" required><button type="submit">Create User</button><p id="loginMessage"></p></form>`;
document.getElementById("newUserForm").addEventListener("submit",async event=>{
event.preventDefault();
if(!databaseReady)return;
const username=document.getElementById("newUsername").value.trim();
const password=document.getElementById("newPassword").value;
const confirmPassword=document.getElementById("confirmPassword").value;
if(!username||!password)return showMessage("Enter username and password.",true);
if(password!==confirmPassword)return showMessage("Passwords do not match.",true);
try{
await createUser(username,password);
showLoginForm("User created successfully. Please login.");
}catch(error){
showMessage("Unable to create user. Username may already exist.",true);
}
});
}
function showLoginForm(message=""){
const container=document.querySelector(".login-container");
container.innerHTML=`<h2>PharmaPOS Login</h2><form id="loginForm"><input id="username" type="text" placeholder="Username" required><input id="password" type="password" placeholder="Password" required><button type="submit">Login</button><p id="loginMessage"></p></form>`;
if(message)showMessage(message);
document.getElementById("loginForm").addEventListener("submit",async event=>{
event.preventDefault();
const username=document.getElementById("username").value.trim();
const password=document.getElementById("password").value;
try{
const user=await checkUser(username,password);
if(!user)return showMessage("Invalid username or password.",true);
sessionStorage.setItem("currentUserId",user.userid);
sessionStorage.setItem("currentUsername",user.username);
window.location.replace("https://ghulamsafi85-cmd.github.io/PharmaPOS/Dashboard.html");
}catch(error){
showMessage("Login failed. Please try again.",true);
}
});
}
document.addEventListener("DOMContentLoaded",initializeLogin);
