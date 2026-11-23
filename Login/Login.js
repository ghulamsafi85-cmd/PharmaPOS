
const SQLJS_URL = "https://cdnjs.cloudflare.com/ajax/libs/sql.js/1.13.0/sql-wasm.js";
const SQLJS_WASM_URL = "https://cdnjs.cloudflare.com/ajax/libs/sql.js/1.13.0/";
const container = document.querySelector(".login-container");

function loadScript(src) {
    return new Promise((resolve, reject) => {
        const script = document.createElement("script");
        script.src = src;
        script.onload = resolve;
        script.onerror = () => reject(new Error("Unable to load: " + src));
        document.head.appendChild(script);
    });
}

async function startLogin() {
    try {
        await loadScript(SQLJS_URL);
        const originalInitSqlJs = window.initSqlJs;
        window.initSqlJs = options => originalInitSqlJs({...options, locateFile: file => SQLJS_WASM_URL + file});
        await loadScript("../Database/database.js");
        await initDatabase();
        showCorrectForm();
    } catch (error) {
        showMessage("Database initialization failed. Please check your internet connection.", true);
    }
}

function showMessage(message, error = false) {
    const element = document.getElementById("loginMessage");
    if (element) {
        element.textContent = message;
        element.style.color = error ? "#d62828" : "#16803c";
    }
}

function showCorrectForm() {
    if (getUsersCount() === 0) {
        showNewUserForm();
    } else {
        showLoginForm();
    }
}

function showNewUserForm() {
    container.innerHTML = `
        <h2>Create Administrator</h2>
        <form id="newUserForm">
            <input id="newUsername" type="text" placeholder="Username" required>
            <input id="newPassword" type="password" placeholder="Password" required>
            <input id="confirmPassword" type="password" placeholder="Confirm Password" required>
            <button type="submit">Create User</button>
            <p id="loginMessage"></p>
        </form>`;
    document.getElementById("newUserForm").addEventListener("submit", event => {
        event.preventDefault();
        const username = document.getElementById("newUsername").value.trim();
        const password = document.getElementById("newPassword").value;
        const confirmPassword = document.getElementById("confirmPassword").value;
        if (!username || !password) return showMessage("Please enter username and password.", true);
        if (password !== confirmPassword) return showMessage("Passwords do not match.", true);
        try {
            createUser(username, password);
            showMessage("User created successfully.");
            showLoginForm();
        } catch (error) {
            showMessage("Unable to create user. Username may already exist.", true);
        }
    });
}

function showLoginForm() {
    container.innerHTML = `
        <h2>Login</h2>
        <form id="loginForm">
            <input id="username" type="text" placeholder="Username" required>
            <input id="password" type="password" placeholder="Password" required>
            <button type="submit">Login</button>
            <p id="loginMessage"></p>
        </form>`;
    document.getElementById("loginForm").addEventListener("submit", event => {
        event.preventDefault();
        const username = document.getElementById("username").value.trim();
        const password = document.getElementById("password").value;
        const user = checkUser(username, password);
        if (user) {
            showMessage("Login successful.");
            sessionStorage.setItem("currentUserId", user.userid);
            sessionStorage.setItem("currentUsername", user.username);
        } else {
            showMessage("Invalid username or password.", true);
        }
    });
}

document.addEventListener("DOMContentLoaded", () => {
    if (!container) {
        document.body.innerHTML = "<p>Login container not found.</p>";
        return;
    }
    startLogin();
});
