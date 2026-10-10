import { initializeApp, getApps, getApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
import { getFirestore, doc, setDoc, getDoc, collection, addDoc, onSnapshot } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";
import { translations } from "./lang.js";

const ADMIN_EMAIL = "mmohaned203@gmail.com";

const firebaseConfig = {
    apiKey: "AIzaSyDg1kenaycheoYljIPQM2wbhqkBxwKgiqg",
    authDomain: "mohaned-lotfy.firebaseapp.com",
    projectId: "mohaned-lotfy",
    storageBucket: "mohaned-lotfy.firebasestorage.app",
    messagingSenderId: "691579836806",
    appId: "1:691579836806:web:d5391acb6f2329adb2b407",
    measurementId: "G-3JB4FZVJZZ"
};

// تهيئة Firebase والـ CDN بأمان
const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
const auth = getAuth(app);
const db = getFirestore(app);

let currentLang = localStorage.getItem('appLang') || 'en';

window.updateLanguage = function(lang) {
    currentLang = lang;
    localStorage.setItem('appLang', lang);
    document.documentElement.lang = lang;
    document.documentElement.dir = (lang === 'ar') ? 'rtl' : 'ltr';
    const langSelect = document.getElementById('langSelect');
    if(langSelect) langSelect.value = lang;
    
    const t = translations[lang];
    document.querySelectorAll('[data-i18n]').forEach(el => {
        const key = el.getAttribute('data-i18n');
        if (t && t[key]) el.textContent = t[key];
    });
    renderPortfolio('all');
};

document.addEventListener("DOMContentLoaded", () => {
    const langSelect = document.getElementById('langSelect');
    if(langSelect) {
        langSelect.addEventListener('change', (e) => updateLanguage(e.target.value));
    }
});

onAuthStateChanged(auth, async (user) => {
    const loadingScreen = document.getElementById('loadingScreen');
    if(loadingScreen) loadingScreen.classList.add('hidden');

    if (user) {
        const authOverlay = document.getElementById('authOverlay');
        const mainWebsite = document.getElementById('mainWebsite');
        if(authOverlay) authOverlay.classList.add('hidden');
        if(mainWebsite) mainWebsite.style.display = 'block';

        if (user.email === ADMIN_EMAIL || user.email.includes("mohaned")) {
            const adminNav = document.getElementById('adminNav');
            if(adminNav) adminNav.classList.remove('hidden');
            listenLiveAdmin();
        }

        try {
            const snap = await getDoc(doc(db, "users", user.uid));
            const welcomeUser = document.getElementById('welcomeUser');
            if (snap.exists() && welcomeUser) {
                welcomeUser.textContent = (currentLang === 'ar' ? 'أهلاً، ' : 'WELCOME, ') + (snap.data().fullName || user.email);
            }
        } catch(e){}
    } else {
        const mainWebsite = document.getElementById('mainWebsite');
        const authOverlay = document.getElementById('authOverlay');
        if(mainWebsite) mainWebsite.style.display = 'none';
        if(authOverlay) authOverlay.classList.remove('hidden');
    }
});

// تسجيل حساب جديد
const btnSignUp = document.getElementById('btnSignUp');
if(btnSignUp) {
    btnSignUp.addEventListener('click', async () => {
        const email = document.getElementById('email').value.trim();
        const password = document.getElementById('password').value.trim();
        const fullName = document.getElementById('fullName').value.trim();
        const phone = document.getElementById('phone').value.trim();

        if (!email || !password || !fullName) return alert('يرجى ملء الحقول الأساسية');

        try {
            const res = await createUserWithEmailAndPassword(auth, email, password);
            await setDoc(doc(db, "users", res.user.uid), { fullName, phone, email, createdAt: new Date().toISOString() });
        } catch (err) { alert(err.message); }
    });
}

// تسجيل دخول
const btnSignIn = document.getElementById('btnSignIn');
if(btnSignIn) {
    btnSignIn.addEventListener('click', async () => {
        try {
            await signInWithEmailAndPassword(auth, document.getElementById('email').value.trim(), document.getElementById('password').value.trim());
        } catch (err) { alert('خطأ في البيانات المدخلة'); }
    });
}

// تسجيل خروج
const btnSignOut = document.getElementById('btnSignOut');
if(btnSignOut) {
    btnSignOut.addEventListener('click', () => signOut(auth));
}

// إرسال استفسار تواصل
const btnSendContact = document.getElementById('btnSendContact');
if(btnSendContact) {
    btnSendContact.addEventListener('click', async () => {
        const name = document.getElementById('cName').value.trim();
        const email = document.getElementById('cEmail').value.trim();
        const subject = document.getElementById('cSubject').value.trim();
        const message = document.getElementById('cMessage').value.trim();

        if(!name || !email || !message) return alert('يرجى كتابة الاسم والإيميل والرسالة');

        try {
            await addDoc(collection(db, "inquiries"), { name, email, subject, message, date: new Date().toISOString() });
            const status = document.getElementById('cMsgStatus');
            if(status) {
                status.style.color = '#A8936B';
                status.textContent = currentLang === 'ar' ? 'تم إرسال استفسارك بنجاح وسيتم الرد قريباً!' : 'Your inquiry was sent successfully!';
            }
            document.getElementById('cName').value = ''; 
            document.getElementById('cEmail').value = ''; 
            document.getElementById('cSubject').value = ''; 
            document.getElementById('cMessage').value = '';
        } catch(e) { alert('حدث خطأ أثناء الإرسال'); }
    });
}

function listenLiveAdmin() {
    onSnapshot(collection(db, "users"), (snap) => {
        let html = '';
        snap.forEach(d => {
            const u = d.data();
            html += `<tr><td>${u.fullName||'-'}</td><td>${u.phone||'-'}</td><td>${u.email||'-'}</td><td>${u.createdAt ? new Date(u.createdAt).toLocaleDateString() : '-'}</td></tr>`;
        });
        const usersTable = document.getElementById('usersTableBody');
        if(usersTable) usersTable.innerHTML = html;
    });

    onSnapshot(collection(db, "inquiries"), (snap) => {
        let html = '';
        snap.forEach(d => {
            const m = d.data();
            html += `<tr><td>${m.name}</td><td>${m.email}</td><td>${m.subject||'-'}</td><td>${m.message}</td></tr>`;
        });
        const msgsTable = document.getElementById('msgsTableBody');
        if(msgsTable) msgsTable.innerHTML = html;
    });
}

window.showPage = function(pageId) {
    ['work', 'cv', 'adminPanel', 'stills', 'contact'].forEach(id => {
        const el = document.getElementById(id);
        if(el) el.classList.add('hidden');
    });

    const target = document.getElementById(pageId);
    if(target) {
        target.classList.remove('hidden');
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }

    const hero = document.getElementById('heroSection');
    const awards = document.getElementById('awardsBar');
    if(pageId === 'work') {
        if(hero) hero.style.display = 'flex';
        if(awards) awards.style.display = 'flex';
    } else {
        if(hero) hero.style.display = 'none';
        if(awards) awards.style.display = 'none';
    }
};

// بيانات أعمالك وحسابات الفيسبوك والجوائز المدمجة
const projects = [
    {
        id: 1, type: "short", title: "ما لم يسمع (WHAT WAS UNHEARD)", category: "AWARD WINNING SHORT FILM", role: "Director / Mohaned Lotfy",
        thumb: "https://images.unsplash.com/photo-1536440136628-849c177e76a1?auto=format&fit=crop&w=800&q=80",
        videoUrl: "https://www.facebook.com/share/v/14szCGTxNqf/",
        desc: "الفيلم الحاصل على جائزة أفضل فيلم قصير (المركز الأول) في مهرجان الفيمتو آرت الدولي - الدورة الرابعة برعاية وزارة الثقافة وأكاديمية الفنون."
    },
    {
        id: 2, type: "short", title: "CONFESSION", category: "PSYCHOLOGICAL DRAMA", role: "DoP / Mohaned Lotfy",
        thumb: "https://images.unsplash.com/photo-1518173946687-a4c8a383392e?auto=format&fit=crop&w=800&q=80",
        videoUrl: "https://www.facebook.com/share/v/192kjAZqK2/",
        desc: "إدارة تصوير (DoP) لفيلم الاعتراف - دراما نفسية سينمائية بالتعاون مع Casha Films وStandby Production."
    },
    {
        id: 3, type: "short", title: "ADGHATH (أدغَاث)", category: "PSYCHOLOGICAL HORROR ANTHOLOGY", role: "Director / Casha Films",
        thumb: "https://images.unsplash.com/photo-1485846234645-a62644f84728?auto=format&fit=crop&w=800&q=80",
        videoUrl: "https://www.facebook.com/share/v/1C1fVkMEXZ/",
        desc: "سلسلة من 5 أفلام قصيرة تتناول الرعب النفسي وتداخل الأحلام مع الواقع."
    },
    {
        id: 4, type: "commercial", title: "BAJDH TRAVEL — SAUDI ARABIA", category: "AI INTEGRATED COMMERCIAL", role: "Director / Editor / Producer",
        thumb: "https://images.unsplash.com/photo-1574717024653-61fd2cf4d44d?auto=format&fit=crop&w=800&q=80",
        videoUrl: "https://www.facebook.com/share/v/18ozrnHHGT/",
        desc: "إعلان تجاري لشركة SWARM Bajdh بالسعودية باستخدام تقنيات الذكاء الاصطناعي البصري الحديثة."
    },
    {
        id: 5, type: "short", title: "THE SMELL OF DEATH", category: "THEATRE & CINEMATIC ADAPTATION", role: "Co-Director & Adaptation",
        thumb: "https://images.unsplash.com/photo-1509198397868-475647b2a1e5?auto=format&fit=crop&w=800&q=80",
        videoUrl: "https://www.facebook.com/share/v/1hRuAagcyK/",
        desc: "عرض مسرحي وسينمائي لقسم المسرح بكلية الآداب - جامعة الإسكندرية."
    }
];

const stills = [
    { thumb: "https://images.unsplash.com/photo-1574717024653-61fd2cf4d44d?auto=format&fit=crop&w=800&q=80", title: "MOHANED LOTFY ON SET WITH CASHA FILMS CLAPPER" },
    { thumb: "https://images.unsplash.com/photo-1518173946687-a4c8a383392e?auto=format&fit=crop&w=800&q=80", title: "WHAT WAS UNHEARD — OFFICIAL MOVIE STILL" },
    { thumb: "https://images.unsplash.com/photo-1536440136628-849c177e76a1?auto=format&fit=crop&w=800&q=80", title: "CONFESSION — CINEMATOGRAPHY FRAME" }
];

function renderPortfolio(filter) {
    const grid = document.getElementById('portfolioGrid');
    if(!grid) return;
    grid.innerHTML = '';
    projects.filter(p => filter === 'all' || p.type === filter).forEach(p => {
        grid.innerHTML += `
            <div class="work-card" onclick="openModal('${p.title}', '${p.category}', '${p.videoUrl}', '${p.desc}')">
                <div class="work-thumb" style="background-image: url('${p.thumb}');">
                    <div class="work-overlay"><div class="play-icon">▶</div></div>
                </div>
                <div class="work-info">
                    <p class="work-category">${p.category}</p>
                    <h3 class="work-title">${p.title}</h3>
                    <p class="work-role">${p.role}</p>
                </div>
            </div>
        `;
    });

    const stillsGrid = document.getElementById('stillsGrid');
    if(!stillsGrid) return;
    stillsGrid.innerHTML = '';
    stills.forEach(s => {
        stillsGrid.innerHTML += `
            <div class="work-card">
                <div class="work-thumb" style="background-image: url('${s.thumb}');"></div>
                <div class="work-info"><h3 class="work-title" style="font-size:0.9rem;">${s.title}</h3></div>
            </div>
        `;
    });
}

window.filterPortfolio = function(type) {
    document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
    if(event && event.target) event.target.classList.add('active');
    renderPortfolio(type);
};
window.openModal = function(title, cat, videoUrl, desc) {
    document.getElementById('modalTitle').textContent = title;
    document.getElementById('modalCategory').textContent = cat;
    document.getElementById('modalDesc').textContent = desc;
    
    // تحويل رابط الفيسبوك إلى مشغل مدمج يفتح داخل الموقع
    const encodedUrl = encodeURIComponent(videoUrl);
    const fbEmbedIframe = `https://www.facebook.com/plugins/video.php?href=${encodedUrl}&show_text=false&width=560`;

    document.getElementById('modalVideoBox').innerHTML = `
        <iframe 
            src="${fbEmbedIframe}" 
            width="100%" 
            height="100%" 
            style="border:none;overflow:hidden;border-radius:8px;" 
            scrolling="no" 
            frameborder="0" 
            allowfullscreen="true" 
            allow="autoplay; clipboard-write; encrypted-media; picture-in-picture; web-share">
        </iframe>`;
        
    document.getElementById('videoModal').classList.remove('hidden');
};

window.closeModal = function() {
    document.getElementById('videoModal').classList.add('hidden');
    // إيقاف تشغيل الفيديو فور إغلاق النافذة
    document.getElementById('modalVideoBox').innerHTML = '';
};


window.toggleAIChat = function() { 
    const chat = document.getElementById('aiChatBox');
    if(chat) chat.classList.toggle('hidden'); 
};

window.sendAIMessage = async function() {
    const input = document.getElementById('aiChatInput');
    const txt = input.value.trim();
    if(!txt) return;
    const body = document.getElementById('aiChatBody');

    body.innerHTML += `<div class="msg-user">${txt}</div>`;
    input.value = '';

    const loadingId = 'ai-loading-' + Date.now();
    body.innerHTML += `<div class="msg-ai" id="${loadingId}">جاري التفكير برؤية إخراجية...</div>`;
    body.scrollTop = body.scrollHeight;

    try {
        const response = await fetch("https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=YOUR_GEMINI_API_KEY", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                contents: [{
                    parts: [{
                        text: `أنت المساعد الذكي للمخرج ومدير التصوير السينمائي مهند لطفي (Mohaned Lotfy) من الإسكندرية، الحاصل على جائزة أفضل فيلم قصير "ما لم يسمع" بمهرجان الفيمتو آرت برعاية وزارة الثقافة، وصاحب أعمال مثل Confession وAdghath وإعلان Bajdh Travel بالسعودية. أجب بطلاقة واحترافية وبشكل سينمائي راقٍ على سؤال الزائر: ${txt}`
                    }]
                }]
            })
        });

        const data = await response.json();
        const reply = data.candidates?.[0]?.content?.parts?.[0]?.text || "يمكنك حجز المخرج مهند لطفي لمشروعك القادم عبر قسم التواصل بالموقع.";
        document.getElementById(loadingId).innerText = reply;
    } catch(e) {
        let fallback = "المخرج مهند لطفي حاصل على المركز الأول كأفضل فيلم قصير بمهرجان الفيمتو آرت الدولي عن فيلم 'ما لم يسمع'، ويتميز برؤية بصرية تجمع بين الحداثة المصرية والتصوير السينمائي الاحترافي.";
        document.getElementById(loadingId).innerText = fallback;
    }
    body.scrollTop = body.scrollHeight;
};

updateLanguage(currentLang);
renderPortfolio('all');
