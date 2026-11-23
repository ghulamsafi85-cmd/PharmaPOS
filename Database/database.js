
let sqlite = null;
let db = null;

const DB_FILE = "PharmaPOS.db";

async function initDatabase() {
    if (db) return db;
    if (!window.initSqlJs) throw new Error("SQL.js library is not loaded.");
    sqlite = await window.initSqlJs({
        locateFile: file => "../Database/" + file
    });
    const savedData = localStorage.getItem(DB_FILE);
    db = savedData ? new sqlite.Database(Uint8Array.from(atob(savedData), c => c.charCodeAt(0))) : new sqlite.Database();
    db.run("CREATE TABLE IF NOT EXISTS users (userid INTEGER PRIMARY KEY AUTOINCREMENT, username TEXT NOT NULL UNIQUE, userpassword TEXT NOT NULL)");
    saveDatabase();
    return db;
}

function saveDatabase() {
    if (!db) return;
    const data = db.export();
    let binary = "";
    for (let i = 0; i < data.length; i++) binary += String.fromCharCode(data[i]);
    localStorage.setItem(DB_FILE, btoa(binary));
}

function getUsersCount() {
    const result = db.exec("SELECT COUNT(*) AS total FROM users");
    return result[0].values[0][0];
}

function createUser(username, password) {
    const statement = db.prepare("INSERT INTO users (username, userpassword) VALUES (?, ?)");
    try {
        statement.run([username, password]);
        saveDatabase();
        return true;
    } finally {
        statement.free();
    }
}

function checkUser(username, password) {
    const statement = db.prepare("SELECT userid, username FROM users WHERE username = ? AND userpassword = ?");
    try {
        statement.bind([username, password]);
        return statement.step() ? statement.getAsObject() : null;
    } finally {
        statement.free();
    }
}
