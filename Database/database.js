
let sqlite=null;
let db=null;
const DB_FILE="PharmaPOS.db";
const PBKDF2_ITERATIONS=210000;
function bytesToBase64(bytes){
let binary="";
for(let i=0;i<bytes.length;i++)binary+=String.fromCharCode(bytes[i]);
return btoa(binary);
}
function base64ToBytes(value){
return Uint8Array.from(atob(value),c=>c.charCodeAt(0));
}
async function hashPassword(password){
const salt=crypto.getRandomValues(new Uint8Array(16));
const key=await crypto.subtle.importKey("raw",new TextEncoder().encode(password),"PBKDF2",false,["deriveBits"]);
const bits=await crypto.subtle.deriveBits({name:"PBKDF2",salt,iterations:PBKDF2_ITERATIONS,hash:"SHA-256"},key,256);
return "pbkdf2$"+PBKDF2_ITERATIONS+"$"+bytesToBase64(salt)+"$"+bytesToBase64(new Uint8Array(bits));
}
async function verifyPassword(password,stored){
try{
const parts=stored.split("$");
if(parts.length!==4||parts[0]!=="pbkdf2")return false;
const iterations=Number(parts[1]);
if(!Number.isInteger(iterations)||iterations<10000||iterations>1000000)return false;
const salt=base64ToBytes(parts[2]);
const expected=base64ToBytes(parts[3]);
const key=await crypto.subtle.importKey("raw",new TextEncoder().encode(password),"PBKDF2",false,["deriveBits"]);
const bits=await crypto.subtle.deriveBits({name:"PBKDF2",salt,iterations,hash:"SHA-256"},key,256);
const actual=new Uint8Array(bits);
if(actual.length!==expected.length)return false;
let difference=0;
for(let i=0;i<actual.length;i++)difference|=actual[i]^expected[i];
return difference===0;
}catch(e){return false}
}
async function initDatabase(wasmPath="../Database/"){
if(db)return db;
if(!window.initSqlJs)throw new Error("SQL.js library is not loaded.");
sqlite=await window.initSqlJs({locateFile:file=>wasmPath+file});
const savedData=localStorage.getItem(DB_FILE);
db=savedData?new sqlite.Database(base64ToBytes(savedData)):new sqlite.Database();
db.run("CREATE TABLE IF NOT EXISTS users (userid INTEGER PRIMARY KEY AUTOINCREMENT, username TEXT NOT NULL UNIQUE, userpassword TEXT NOT NULL)");
saveDatabase();
return db;
}
function saveDatabase(){
if(!db)return;
localStorage.setItem(DB_FILE,bytesToBase64(db.export()));
}
function getUsersCount(){
const result=db.exec("SELECT COUNT(*) AS total FROM users");
return result[0].values[0][0];
}
async function createUser(username,password){
const hashedPassword=await hashPassword(password);
const statement=db.prepare("INSERT INTO users (username,userpassword) VALUES (?,?)");
try{
statement.run([username,hashedPassword]);
saveDatabase();
return true;
}finally{statement.free()}
}
async function checkUser(username,password){
const statement=db.prepare("SELECT userid,username,userpassword FROM users WHERE username=?");
let user=null;
try{
statement.bind([username]);
if(statement.step())user=statement.getAsObject();
}finally{statement.free()}
if(!user)return null;
const stored=user.userpassword;
let valid=false;
if(typeof stored==="string"&&stored.startsWith("pbkdf2$"))valid=await verifyPassword(password,stored);
else if(stored===password){
valid=true;
const newHash=await hashPassword(password);
const update=db.prepare("UPDATE users SET userpassword=? WHERE userid=?");
try{update.run([newHash,user.userid]);saveDatabase()}finally{update.free()}
}
return valid?{userid:user.userid,username:user.username}:null;
}
