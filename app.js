import { initializeApp } from "https://www.gstatic.com/firebasejs/11.1.0/firebase-app.js";
import {
    getFirestore,
    collection,
    addDoc,
    getDocs,
    updateDoc,
    deleteDoc,
    doc,
    query,
    where
} from "https://www.gstatic.com/firebasejs/11.1.0/firebase-firestore.js";

import { firebaseConfig } from "./firebase-config.js";

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

console.log("Firebase initialized");

// ==========================================
// ANTIGRAVITY BACKEND LOGIC LAYER
// ==========================================

// Load User ID from local storage or default to null
// Note: In a real app, you might force redirect to login if null.
let CURRENT_USER_ID = localStorage.getItem("student_user_id");

// Helper to ensure we have a user
function requireUser() {
    if (!CURRENT_USER_ID) {
        if (!window.location.pathname.includes('index.html')) {
            window.location.href = 'index.html';
        }
        throw new Error("User not authenticated");
    }
}

export const Backend = {
    // ==========================================
    // 0. USER LOGIC (Login / Create)
    // ==========================================
    async loginUser(email) {
        if (!email || !email.includes('@')) {
            throw new Error("Validation Failed: valid email required.");
        }

        console.log(`[Antigravity] Attempting login for ${email}...`);

        // Query users by email to avoid fetching all
        const q = query(collection(db, 'users'), where('email', '==', email));
        const querySnapshot = await getDocs(q);

        let user;

        if (querySnapshot.empty) {
            // Create User
            console.log("[Antigravity] New user detected. Creating account...");
            const userData = {
                email: email,
                createdAt: new Date().toISOString()
            };
            const docRef = await addDocument('users', userData);
            user = { id: docRef.id, ...userData };
        } else {
            // Found User
            const doc = querySnapshot.docs[0];
            user = { id: doc.id, ...doc.data() };
            console.log("[Antigravity] User found. Logging in...");
        }

        // Store Session
        localStorage.setItem("student_user_id", user.id);
        CURRENT_USER_ID = user.id;

        return user;
    },

    async logout() {
        localStorage.removeItem("student_user_id");
        window.location.href = 'index.html';
    },

    // ==========================================
    // 1. TASK LOGIC
    // ==========================================
    async createTask(title, subject, dueDate) {
        requireUser();

        if (!title || title.trim().length === 0) throw new Error("Validation Failed: Title required.");
        if (!subject || subject.trim().length === 0) throw new Error("Validation Failed: Subject required.");
        if (!dueDate) throw new Error("Validation Failed: Due date required.");

        const taskData = {
            userID: CURRENT_USER_ID,
            title: title.trim(),
            subject: subject.trim(),
            dueDate: dueDate,
            completed: false,
            createdAt: new Date().toISOString()
        };

        return await addDocument('tasks', taskData);
    },

    async toggleTaskCompletion(taskId, isCompleted) {
        requireUser();
        // Antigravity Rule: Can add logic here, e.g., "Cannot uncomplete tasks after 7 days"
        console.log(`[Antigravity] Marking task ${taskId} as ${isCompleted}`);
        await updateDoc(doc(db, 'tasks', taskId), { completed: isCompleted });
    },

    async deleteTask(taskId) {
        requireUser();
        console.log(`[Antigravity] Deleting task ${taskId}`);
        await deleteDoc(doc(db, 'tasks', taskId));
    },

    async getUserTasks() {
        requireUser();
        return await getDocumentsByUserId('tasks', CURRENT_USER_ID);
    },

    // ==========================================
    // 2. STUDY SESSION LOGIC
    // ==========================================
    async saveStudySession(subject, startTime, endTime) {
        requireUser();
        const start = new Date(startTime);
        const end = new Date(endTime);
        // Use Math.ceil so even 5 seconds counts as 1 minute of "attempted" study
        const durationMinutes = Math.ceil((end - start) / 1000 / 60);

        if (durationMinutes <= 0) throw new Error("Logic Error: Duration must be positive.");
        if (!subject) throw new Error("Validation Failed: Subject required.");

        const sessionData = {
            userID: CURRENT_USER_ID,
            subject: subject,
            startTime: startTime,
            endTime: endTime,
            durationMinutes: durationMinutes
        };

        return await addDocument('studySessions', sessionData);
    },

    async getUserStudySessions() {
        requireUser();
        return await getDocumentsByUserId('studySessions', CURRENT_USER_ID);
    },

    // ==========================================
    // 3. REFLECTION LOGIC
    // ==========================================
    async createReflection(text, sessionId = "daily_log") {
        requireUser();
        if (!text || text.trim().length < 10) throw new Error("Validation Failed: Text too short.");

        const reflectionData = {
            userID: CURRENT_USER_ID,
            sessionId: sessionId,
            text: text.trim(),
            createdAt: new Date().toISOString()
        };

        return await addDocument('reflections', reflectionData);
    },

    async getUserReflections() {
        requireUser();
        return await getDocumentsByUserId('reflections', CURRENT_USER_ID);
    },

    // ==========================================
    // 4. DASHBOARD AGGREGATION LOGIC
    // ==========================================
    /**
     * Aggregates data for the dashboard.
     * "Backend Logic" responsibility: Perform calculations server-side (conceptually).
     */
    async getDashboardStats() {
        requireUser();
        console.log("[Antigravity] Aggregating dashboard stats...");

        // Parallel Fetch
        const [tasks, sessions, reflections] = await Promise.all([
            this.getUserTasks(),
            this.getUserStudySessions(),
            this.getUserReflections()
        ]);

        // 1. Calculate Pending Tasks
        const pendingTasksCount = tasks.filter(t => !t.completed).length;

        // 2. Calculate Total Study Time
        // Aggregation: sum(durationMinutes)
        const totalStudyMinutes = sessions.reduce((sum, session) => sum + (session.durationMinutes || 0), 0);

        // 3. Recent Activity (Count)
        const reflectionCount = reflections.length;

        return {
            pendingTasks: pendingTasksCount,
            totalStudyTime: totalStudyMinutes,
            reflectionCount: reflectionCount,
            recentReflections: reflections.slice(0, 3) // Return only top 3
        };
    }
};

// Make Backend available globally
window.Backend = Backend;

// ==========================================
// DATABASE HELPERS
// ==========================================

export async function addDocument(collectionName, data) {
    try {
        const docRef = await addDoc(collection(db, collectionName), data);
        console.log(`[Database] Created ${collectionName} ${docRef.id}`);
        return docRef;
    } catch (e) {
        console.error("[Database] Error add:", e);
        throw e;
    }
}

export async function getDocumentsByUserId(collectionName, userId) {
    try {
        const q = query(collection(db, collectionName), where("userID", "==", userId));
        const querySnapshot = await getDocs(q);
        const docs = [];
        querySnapshot.forEach((doc) => {
            docs.push({ id: doc.id, ...doc.data() });
        });
        return docs;
    } catch (e) {
        console.error("[Database] Error get:", e);
        throw e;
    }
}

// Simple mock login function (exposed to window for HTML access)
window.handleLogin = async (e) => {
    e.preventDefault();
    const btn = e.target.querySelector('button');
    const emailInput = e.target.querySelector('input[type="email"]');
    const originalText = btn.textContent;

    btn.textContent = 'Logging in...';
    btn.disabled = true;

    try {
        await Backend.loginUser(emailInput.value);
        window.location.href = 'dashboard.html';
    } catch (err) {
        console.error(err);
        alert("Login Failed: " + err.message);
        btn.textContent = originalText;
        btn.disabled = false;
    }
};

// Auto-run navigation logic
document.addEventListener('DOMContentLoaded', () => {
    const path = window.location.pathname;
    const navLinks = document.querySelectorAll('.nav-links a');

    navLinks.forEach(link => {
        if (path.includes(link.getAttribute('href'))) {
            link.classList.add('active');
        }
    });
});
