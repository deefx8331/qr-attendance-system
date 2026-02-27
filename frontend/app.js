// ============================================================
// QR ATTENDANCE SYSTEM - FRONTEND APPLICATION
// Bayero University Kano
// ============================================================

const API_URL = (typeof window !== 'undefined' && window.location)
    ? `${window.location.origin}/api`
    : 'http://localhost:3000/api';
let currentUser = null;
let authToken = null;
let html5QrCode = null;

// ==================== INITIALIZATION ====================
document.addEventListener('DOMContentLoaded', () => {
    const savedToken = localStorage.getItem('authToken');
    const savedUser = localStorage.getItem('currentUser');
    
    if (savedToken && savedUser) {
        authToken = savedToken;
        currentUser = JSON.parse(savedUser);
        showMainApp();
    }
    
    document.getElementById('loginForm').addEventListener('submit', handleLogin);
    document.getElementById('registerForm').addEventListener('submit', handleRegister);
    document.getElementById('generateQRForm').addEventListener('submit', handleGenerateQR);
});

// ==================== AUTHENTICATION ====================
async function handleLogin(e) {
    e.preventDefault();
    
    const email = document.getElementById('loginEmail').value;
    const password = document.getElementById('loginPassword').value;
    
    try {
        const response = await fetch(`${API_URL}/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password })
        });
        
        const data = await response.json();
        
        if (response.ok) {
            authToken = data.token;
            currentUser = data.user;
            localStorage.setItem('authToken', authToken);
            localStorage.setItem('currentUser', JSON.stringify(currentUser));
            showAlert('Login successful!', 'success');
            showMainApp();
        } else {
            showAlert(data.error || 'Login failed', 'danger');
        }
    } catch (error) {
        console.error('Login error:', error);
        showAlert('Connection error. Please try again.', 'danger');
    }
}

async function handleRegister(e) {
    e.preventDefault();
    
    const userData = {
        email: document.getElementById('regEmail').value,
        password: document.getElementById('regPassword').value,
        full_name: document.getElementById('regFullName').value,
        role: document.getElementById('regRole').value,
        faculty: document.getElementById('regFaculty').value,
        department: document.getElementById('regDepartment').value
    };
    
    if (userData.role === 'student') {
        userData.reg_number = document.getElementById('regNumber').value;
        userData.level = document.getElementById('regLevel').value;
    }
    
    try {
        const response = await fetch(`${API_URL}/auth/register`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(userData)
        });
        
        const data = await response.json();
        
        if (response.ok) {
            showAlert('Registration successful! Please login.', 'success');
            showLogin();
        } else {
            showAlert(data.error || 'Registration failed', 'danger');
        }
    } catch (error) {
        console.error('Registration error:', error);
        showAlert('Connection error. Please try again.', 'danger');
    }
}

function logout() {
    localStorage.removeItem('authToken');
    localStorage.removeItem('currentUser');
    authToken = null;
    currentUser = null;
    
    if (html5QrCode) {
        html5QrCode.stop().catch(err => console.log(err));
    }
    
    document.getElementById('mainApp').style.display = 'none';
    document.getElementById('loginPage').style.display = 'flex';
}

// ==================== PAGE NAVIGATION ====================
function showLogin() {
    document.getElementById('registerPage').style.display = 'none';
    document.getElementById('loginPage').style.display = 'flex';
}

function showRegister() {
    document.getElementById('loginPage').style.display = 'none';
    document.getElementById('registerPage').style.display = 'flex';
}

function toggleStudentFields() {
    const role = document.getElementById('regRole').value;
    document.getElementById('studentFields').style.display = role === 'student' ? 'block' : 'none';
}

function showMainApp() {
    document.getElementById('loginPage').style.display = 'none';
    document.getElementById('registerPage').style.display = 'none';
    document.getElementById('mainApp').style.display = 'block';
    
    document.getElementById('navUserName').textContent = currentUser.full_name;
    
    document.getElementById('studentMenu').style.display = currentUser.role === 'student' ? 'block' : 'none';
    document.getElementById('lecturerMenu').style.display = ['lecturer', 'admin'].includes(currentUser.role) ? 'block' : 'none';
    document.getElementById('adminMenu').style.display = currentUser.role === 'admin' ? 'block' : 'none';
    
    showPage('dashboard');
}

function showPage(pageId) {
    document.querySelectorAll('.page').forEach(page => page.classList.remove('active'));
    document.getElementById(pageId + 'Page').classList.add('active');
    
    document.querySelectorAll('.sidebar-link').forEach(link => link.classList.remove('active'));
    if (event && event.target) {
        event.target.closest('.sidebar-link')?.classList.add('active');
    }
    
    switch(pageId) {
        case 'dashboard': loadDashboard(); break;
        case 'myAttendance': loadAttendanceHistory(); break;
        case 'myCourses': loadEnrolledCourses(); break;
        case 'manageCourses': loadLecturerCourses(); break;
        case 'generateQR': loadCourseSelectOptions(); break;
        case 'viewAttendance': loadAttendanceFilters(); break;
        case 'reports': loadReportCourses(); break;
        case 'profile': loadProfile(); break;
        case 'manageUsers': loadAllUsers(); break;
        case 'allCourses': loadAllCourses(); break;
    }
    
    if (window.innerWidth < 992) {
        document.getElementById('sidebar').classList.remove('show');
    }
}

function toggleSidebar() {
    document.getElementById('sidebar').classList.toggle('show');
}

// ==================== DASHBOARD ====================
async function loadDashboard() {
    const statsContainer = document.getElementById('statsCards');
    const activityContainer = document.getElementById('recentActivity');
    
    if (currentUser.role === 'student') {
        try {
            const [coursesRes, attendanceRes] = await Promise.all([
                fetch(`${API_URL}/courses`, { headers: { 'Authorization': `Bearer ${authToken}` }}),
                fetch(`${API_URL}/attendance/history`, { headers: { 'Authorization': `Bearer ${authToken}` }})
            ]);
            
            const courses = await coursesRes.json();
            const attendance = await attendanceRes.json();
            
            statsContainer.innerHTML = `
                <div class="col-md-4 mb-4">
                    <div class="stat-card">
                        <div class="icon bg-primary"><i class="fas fa-book"></i></div>
                        <h3>${Array.isArray(courses) ? courses.length : 0}</h3>
                        <p>Enrolled Courses</p>
                    </div>
                </div>
                <div class="col-md-4 mb-4">
                    <div class="stat-card">
                        <div class="icon bg-success"><i class="fas fa-check-circle"></i></div>
                        <h3>${Array.isArray(attendance) ? attendance.length : 0}</h3>
                        <p>Classes Attended</p>
                    </div>
                </div>
                <div class="col-md-4 mb-4">
                    <div class="stat-card">
                        <div class="icon bg-info"><i class="fas fa-calendar-check"></i></div>
                        <h3>${new Date().toLocaleDateString()}</h3>
                        <p>Today's Date</p>
                    </div>
                </div>
            `;
            
            if (Array.isArray(attendance) && attendance.length > 0) {
                activityContainer.innerHTML = attendance.slice(0, 5).map(a => `
                    <div class="d-flex justify-content-between align-items-center border-bottom py-2">
                        <div><strong>${a.course_code}</strong> - ${a.session_title}</div>
                        <small class="text-muted">${new Date(a.marked_at).toLocaleString()}</small>
                    </div>
                `).join('');
            } else {
                activityContainer.innerHTML = '<p class="text-muted">No recent attendance records.</p>';
            }
        } catch (error) {
            console.error('Dashboard error:', error);
            statsContainer.innerHTML = '<div class="col-12"><p class="text-danger">Error loading dashboard</p></div>';
        }
    } else if (currentUser.role === 'lecturer' || currentUser.role === 'admin') {
        try {
            const coursesRes = await fetch(`${API_URL}/courses`, { headers: { 'Authorization': `Bearer ${authToken}` }});
            const courses = await coursesRes.json();
            
            let totalStudents = 0;
            let totalSessions = 0;
            
            statsContainer.innerHTML = `
                <div class="col-md-3 mb-4">
                    <div class="stat-card">
                        <div class="icon bg-primary"><i class="fas fa-book"></i></div>
                        <h3>${Array.isArray(courses) ? courses.length : 0}</h3>
                        <p>My Courses</p>
                    </div>
                </div>
                <div class="col-md-3 mb-4">
                    <div class="stat-card">
                        <div class="icon bg-success"><i class="fas fa-users"></i></div>
                        <h3 id="totalStudentsCount">...</h3>
                        <p>Total Students</p>
                    </div>
                </div>
                <div class="col-md-3 mb-4">
                    <div class="stat-card">
                        <div class="icon bg-warning"><i class="fas fa-qrcode"></i></div>
                        <h3 id="totalSessionsCount">...</h3>
                        <p>Sessions Created</p>
                    </div>
                </div>
                <div class="col-md-3 mb-4">
                    <div class="stat-card">
                        <div class="icon bg-info"><i class="fas fa-calendar"></i></div>
                        <h3>${new Date().toLocaleDateString()}</h3>
                        <p>Today</p>
                    </div>
                </div>
            `;
            
            // Load counts asynchronously
            for (let course of (Array.isArray(courses) ? courses : [])) {
                try {
                    const [sessionsRes, studentsRes] = await Promise.all([
                        fetch(`${API_URL}/courses/${course.id}/sessions`, { headers: { 'Authorization': `Bearer ${authToken}` }}),
                        fetch(`${API_URL}/courses/${course.id}/students`, { headers: { 'Authorization': `Bearer ${authToken}` }})
                    ]);
                    const sessions = await sessionsRes.json();
                    const students = await studentsRes.json();
                    totalSessions += Array.isArray(sessions) ? sessions.length : 0;
                    totalStudents += Array.isArray(students) ? students.length : 0;
                } catch (e) {}
            }
            
            document.getElementById('totalStudentsCount').textContent = totalStudents;
            document.getElementById('totalSessionsCount').textContent = totalSessions;
            
            activityContainer.innerHTML = '<p class="text-muted">Welcome! Use the sidebar to manage courses and attendance.</p>';
        } catch (error) {
            console.error('Dashboard error:', error);
        }
    }
}

// ==================== STUDENT FUNCTIONS ====================
async function loadAttendanceHistory() {
    const tableBody = document.getElementById('attendanceHistoryTable');
    
    try {
        const response = await fetch(`${API_URL}/attendance/history`, {
            headers: { 'Authorization': `Bearer ${authToken}` }
        });
        const records = await response.json();
        
        if (Array.isArray(records) && records.length > 0) {
            tableBody.innerHTML = records.map(r => `
                <tr>
                    <td><strong>${r.course_code}</strong> - ${r.course_title}</td>
                    <td>${r.session_title}</td>
                    <td>${new Date(r.marked_at).toLocaleString()}</td>
                    <td><span class="badge-status badge-present">Present</span></td>
                </tr>
            `).join('');
        } else {
            tableBody.innerHTML = '<tr><td colspan="4" class="text-center text-muted">No attendance records found</td></tr>';
        }
    } catch (error) {
        console.error('Load attendance error:', error);
        tableBody.innerHTML = '<tr><td colspan="4" class="text-center text-danger">Error loading records</td></tr>';
    }
}

async function loadEnrolledCourses() {
    const container = document.getElementById('enrolledCoursesList');
    
    try {
        const response = await fetch(`${API_URL}/courses`, {
            headers: { 'Authorization': `Bearer ${authToken}` }
        });
        const courses = await response.json();
        
        if (Array.isArray(courses) && courses.length > 0) {
            container.innerHTML = courses.map(c => `
                <div class="col-md-4 mb-4">
                    <div class="page-card h-100">
                        <div class="page-card-body">
                            <h5 class="text-primary">${c.course_code}</h5>
                            <p class="mb-2">${c.course_title}</p>
                            <small class="text-muted">
                                <i class="fas fa-user me-1"></i>${c.lecturer_name}<br>
                                <i class="fas fa-building me-1"></i>${c.department || 'N/A'}
                            </small>
                        </div>
                    </div>
                </div>
            `).join('');
        } else {
            container.innerHTML = '<div class="col-12"><p class="text-muted text-center">You are not enrolled in any courses yet.</p></div>';
        }
    } catch (error) {
        console.error('Load courses error:', error);
        container.innerHTML = '<div class="col-12"><p class="text-danger text-center">Error loading courses</p></div>';
    }
}

// ==================== QR SCANNER ====================
function startScanner() {
    const scanResult = document.getElementById('scanResult');
    scanResult.style.display = 'none';
    
    document.getElementById('stopScanBtn').style.display = 'inline-block';
    
    html5QrCode = new Html5Qrcode("qr-reader");
    
    html5QrCode.start(
        { facingMode: "environment" },
        { fps: 10, qrbox: { width: 250, height: 250 } },
        onScanSuccess,
        onScanFailure
    ).catch(err => {
        console.error('Scanner error:', err);
        showAlert('Could not start camera. Please check permissions.', 'danger');
    });
}

function stopScanner() {
    if (html5QrCode) {
        html5QrCode.stop().then(() => {
            document.getElementById('stopScanBtn').style.display = 'none';
        }).catch(err => console.log(err));
    }
}

async function onScanSuccess(decodedText) {
    stopScanner();
    
    const scanResult = document.getElementById('scanResult');
    const scanAlert = document.getElementById('scanAlert');
    
    try {
        const qrData = JSON.parse(decodedText);
        
        const response = await fetch(`${API_URL}/attendance/mark`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${authToken}`
            },
            body: JSON.stringify({
                session_id: qrData.session_id,
                session_code: qrData.session_code
            })
        });
        
        const data = await response.json();
        
        scanResult.style.display = 'block';
        
        if (response.ok) {
            scanAlert.className = 'alert alert-success';
            scanAlert.innerHTML = `<i class="fas fa-check-circle me-2"></i>${data.message}`;
            showAlert('Attendance marked successfully!', 'success');
        } else {
            scanAlert.className = 'alert alert-danger';
            scanAlert.innerHTML = `<i class="fas fa-times-circle me-2"></i>${data.error}`;
        }
    } catch (error) {
        console.error('Scan process error:', error);
        scanResult.style.display = 'block';
        scanAlert.className = 'alert alert-danger';
        scanAlert.innerHTML = '<i class="fas fa-times-circle me-2"></i>Invalid QR code format';
    }
}

function onScanFailure(error) {
    // Silently ignore scan failures (no QR in frame)
}

// ==================== LECTURER FUNCTIONS ====================
async function loadLecturerCourses() {
    const container = document.getElementById('lecturerCoursesList');
    
    try {
        const response = await fetch(`${API_URL}/courses`, {
            headers: { 'Authorization': `Bearer ${authToken}` }
        });
        const courses = await response.json();
        
        if (Array.isArray(courses) && courses.length > 0) {
            container.innerHTML = courses.map(c => `
                <div class="col-md-4 mb-4">
                    <div class="page-card h-100">
                        <div class="page-card-body">
                            <h5 class="text-primary">${c.course_code}</h5>
                            <p class="mb-2">${c.course_title}</p>
                            <small class="text-muted">
                                <i class="fas fa-layer-group me-1"></i>${c.level || 'N/A'} Level<br>
                                <i class="fas fa-calendar me-1"></i>${c.semester || 'N/A'} Semester
                            </small>
                        </div>
                    </div>
                </div>
            `).join('');
        } else {
            container.innerHTML = '<div class="col-12"><p class="text-muted text-center">No courses found. Click "Add Course" to create one.</p></div>';
        }
    } catch (error) {
        console.error('Load courses error:', error);
        container.innerHTML = '<div class="col-12"><p class="text-danger text-center">Error loading courses</p></div>';
    }
}

async function addCourse() {
    const courseData = {
        course_code: document.getElementById('newCourseCode').value,
        course_title: document.getElementById('newCourseTitle').value,
        department: document.getElementById('newCourseDept').value,
        faculty: document.getElementById('newCourseFaculty').value,
        level: document.getElementById('newCourseLevel').value,
        semester: document.getElementById('newCourseSemester').value
    };
    
    try {
        const response = await fetch(`${API_URL}/courses`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${authToken}`
            },
            body: JSON.stringify(courseData)
        });
        
        const data = await response.json();
        
        if (response.ok) {
            showAlert('Course added successfully!', 'success');
            bootstrap.Modal.getInstance(document.getElementById('addCourseModal')).hide();
            document.getElementById('addCourseForm').reset();
            loadLecturerCourses();
            loadCourseSelectOptions();
        } else {
            showAlert(data.error || 'Failed to add course', 'danger');
        }
    } catch (error) {
        console.error('Add course error:', error);
        showAlert('Error adding course', 'danger');
    }
}

async function loadCourseSelectOptions() {
    const select = document.getElementById('qrCourseSelect');
    
    try {
        const response = await fetch(`${API_URL}/courses`, {
            headers: { 'Authorization': `Bearer ${authToken}` }
        });
        const courses = await response.json();
        
        select.innerHTML = '<option value="">-- Select Course --</option>';
        
        if (Array.isArray(courses)) {
            courses.forEach(c => {
                select.innerHTML += `<option value="${c.id}">${c.course_code} - ${c.course_title}</option>`;
            });
        }
    } catch (error) {
        console.error('Load course options error:', error);
    }
}

async function handleGenerateQR(e) {
    e.preventDefault();
    
    const courseId = document.getElementById('qrCourseSelect').value;
    const sessionTitle = document.getElementById('sessionTitle').value;
    const duration = document.getElementById('qrDuration').value;
    
    if (!courseId) {
        showAlert('Please select a course', 'warning');
        return;
    }
    
    const displayContainer = document.getElementById('qrCodeDisplay');
    displayContainer.innerHTML = '<div class="text-center"><i class="fas fa-spinner fa-spin fa-3x"></i><p class="mt-2">Generating QR Code...</p></div>';
    
    try {
        const response = await fetch(`${API_URL}/sessions`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${authToken}`
            },
            body: JSON.stringify({
                course_id: courseId,
                session_title: sessionTitle || `Session ${new Date().toLocaleDateString()}`,
                duration_minutes: parseInt(duration)
            })
        });
        
        const data = await response.json();
        
        if (response.ok) {
            const expiresAt = new Date(data.session.expires_at);
            
            displayContainer.innerHTML = `
                <img src="${data.session.qr_code}" alt="QR Code" class="mb-3">
                <div class="qr-timer" id="qrTimer">--:--</div>
                <p class="text-muted">QR Code expires at: ${expiresAt.toLocaleTimeString()}</p>
                <button class="btn btn-outline-primary mt-2" onclick="window.print()">
                    <i class="fas fa-print me-2"></i>Print QR Code
                </button>
            `;
            
            // Start countdown timer
            startQRTimer(expiresAt);
            
            showAlert('QR Code generated successfully!', 'success');
        } else {
            displayContainer.innerHTML = `<div class="text-danger"><i class="fas fa-times-circle fa-3x mb-2"></i><p>${data.error}</p></div>`;
        }
    } catch (error) {
        console.error('Generate QR error:', error);
        displayContainer.innerHTML = '<div class="text-danger"><i class="fas fa-times-circle fa-3x mb-2"></i><p>Error generating QR code</p></div>';
    }
}

function startQRTimer(expiresAt) {
    const timerElement = document.getElementById('qrTimer');
    
    const updateTimer = () => {
        const now = new Date();
        const diff = expiresAt - now;
        
        if (diff <= 0) {
            timerElement.textContent = 'EXPIRED';
            timerElement.classList.add('expired');
            return;
        }
        
        const minutes = Math.floor(diff / 60000);
        const seconds = Math.floor((diff % 60000) / 1000);
        timerElement.textContent = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
        
        setTimeout(updateTimer, 1000);
    };
    
    updateTimer();
}

// ==================== ATTENDANCE VIEWING ====================
async function loadAttendanceFilters() {
    const courseSelect = document.getElementById('attendanceCourseFilter');
    
    try {
        const response = await fetch(`${API_URL}/courses`, {
            headers: { 'Authorization': `Bearer ${authToken}` }
        });
        const courses = await response.json();
        
        courseSelect.innerHTML = '<option value="">-- Select Course --</option>';
        
        if (Array.isArray(courses)) {
            courses.forEach(c => {
                courseSelect.innerHTML += `<option value="${c.id}">${c.course_code} - ${c.course_title}</option>`;
            });
        }
    } catch (error) {
        console.error('Load filters error:', error);
    }
}

async function loadCourseSessions() {
    const courseId = document.getElementById('attendanceCourseFilter').value;
    const sessionSelect = document.getElementById('attendanceSessionFilter');
    
    sessionSelect.innerHTML = '<option value="">-- Select Session --</option>';
    
    if (!courseId) return;
    
    try {
        const response = await fetch(`${API_URL}/courses/${courseId}/sessions`, {
            headers: { 'Authorization': `Bearer ${authToken}` }
        });
        const sessions = await response.json();
        
        if (Array.isArray(sessions)) {
            sessions.forEach(s => {
                const date = new Date(s.created_at).toLocaleDateString();
                sessionSelect.innerHTML += `<option value="${s.id}">${s.session_title} (${date})</option>`;
            });
        }
    } catch (error) {
        console.error('Load sessions error:', error);
    }
}

async function loadSessionAttendance() {
    const sessionId = document.getElementById('attendanceSessionFilter').value;
    const tableBody = document.getElementById('sessionAttendanceTable');
    const countBadge = document.getElementById('attendanceCount');
    
    if (!sessionId) {
        tableBody.innerHTML = '<tr><td colspan="5" class="text-center text-muted">Select a session to view attendance</td></tr>';
        countBadge.textContent = '0 students';
        return;
    }
    
    try {
        const response = await fetch(`${API_URL}/sessions/${sessionId}/attendance`, {
            headers: { 'Authorization': `Bearer ${authToken}` }
        });
        const records = await response.json();
        
        if (Array.isArray(records) && records.length > 0) {
            countBadge.textContent = `${records.length} students`;
            tableBody.innerHTML = records.map((r, i) => `
                <tr>
                    <td>${i + 1}</td>
                    <td>${r.reg_number || 'N/A'}</td>
                    <td>${r.full_name}</td>
                    <td>${new Date(r.marked_at).toLocaleTimeString()}</td>
                    <td><span class="badge-status badge-present">Present</span></td>
                </tr>
            `).join('');
        } else {
            countBadge.textContent = '0 students';
            tableBody.innerHTML = '<tr><td colspan="5" class="text-center text-muted">No attendance records for this session</td></tr>';
        }
    } catch (error) {
        console.error('Load attendance error:', error);
        tableBody.innerHTML = '<tr><td colspan="5" class="text-center text-danger">Error loading attendance</td></tr>';
    }
}

// ==================== REPORTS ====================
async function loadReportCourses() {
    const select = document.getElementById('reportCourseSelect');
    
    try {
        const response = await fetch(`${API_URL}/courses`, {
            headers: { 'Authorization': `Bearer ${authToken}` }
        });
        const courses = await response.json();
        
        select.innerHTML = '<option value="">-- Select Course --</option>';
        
        if (Array.isArray(courses)) {
            courses.forEach(c => {
                select.innerHTML += `<option value="${c.id}">${c.course_code} - ${c.course_title}</option>`;
            });
        }
    } catch (error) {
        console.error('Load report courses error:', error);
    }
}

async function loadCourseReport() {
    const courseId = document.getElementById('reportCourseSelect').value;
    const reportCard = document.getElementById('reportCard');
    const tableBody = document.getElementById('reportTableBody');
    
    if (!courseId) {
        reportCard.style.display = 'none';
        return;
    }
    
    try {
        const response = await fetch(`${API_URL}/courses/${courseId}/attendance-report`, {
            headers: { 'Authorization': `Bearer ${authToken}` }
        });
        const report = await response.json();
        
        reportCard.style.display = 'block';
        
        if (report.students && report.students.length > 0) {
            tableBody.innerHTML = report.students.map((s, i) => {
                const absent = s.total_sessions - s.total_present;
                const remark = s.percentage >= 75 ? 'Good' : s.percentage >= 50 ? 'Warning' : 'Poor';
                const remarkClass = s.percentage >= 75 ? 'text-success' : s.percentage >= 50 ? 'text-warning' : 'text-danger';
                
                return `
                    <tr>
                        <td>${i + 1}</td>
                        <td>${s.reg_number || 'N/A'}</td>
                        <td>${s.full_name}</td>
                        <td>${s.total_present}</td>
                        <td>${absent}</td>
                        <td><strong>${s.percentage}%</strong></td>
                        <td class="${remarkClass}"><strong>${remark}</strong></td>
                    </tr>
                `;
            }).join('');
        } else {
            tableBody.innerHTML = '<tr><td colspan="7" class="text-center text-muted">No data available</td></tr>';
        }
    } catch (error) {
        console.error('Load report error:', error);
        tableBody.innerHTML = '<tr><td colspan="7" class="text-center text-danger">Error loading report</td></tr>';
    }
}

function printReport() {
    window.print();
}

function exportAttendance() {
    showAlert('Export feature coming soon!', 'info');
}

// ==================== PROFILE ====================
async function loadProfile() {
    try {
        const response = await fetch(`${API_URL}/auth/profile`, {
            headers: { 'Authorization': `Bearer ${authToken}` }
        });
        const profile = await response.json();
        
        document.getElementById('profileName').textContent = profile.full_name;
        document.getElementById('profileRole').textContent = profile.role.charAt(0).toUpperCase() + profile.role.slice(1);
        document.getElementById('profileEmail').textContent = profile.email;
        document.getElementById('profileRegNumber').textContent = profile.reg_number || 'N/A';
        document.getElementById('profileFaculty').textContent = profile.faculty || 'N/A';
        document.getElementById('profileDepartment').textContent = profile.department || 'N/A';
        document.getElementById('profileLevel').textContent = profile.level ? profile.level + ' Level' : 'N/A';
        document.getElementById('profileJoined').textContent = new Date(profile.created_at).toLocaleDateString();
    } catch (error) {
        console.error('Load profile error:', error);
    }
}

// ==================== ADMIN FUNCTIONS ====================
async function loadAllUsers() {
    const tableBody = document.getElementById('usersTable');
    
    try {
        const response = await fetch(`${API_URL}/admin/users`, {
            headers: { 'Authorization': `Bearer ${authToken}` }
        });
        const users = await response.json();
        
        if (Array.isArray(users) && users.length > 0) {
            tableBody.innerHTML = users.map(u => `
                <tr>
                    <td>${u.full_name}</td>
                    <td>${u.email}</td>
                    <td>${u.reg_number || 'N/A'}</td>
                    <td><span class="badge bg-${u.role === 'admin' ? 'danger' : u.role === 'lecturer' ? 'primary' : 'success'}">${u.role}</span></td>
                    <td>${u.department || 'N/A'}</td>
                    <td>${new Date(u.created_at).toLocaleDateString()}</td>
                </tr>
            `).join('');
        } else {
            tableBody.innerHTML = '<tr><td colspan="6" class="text-center text-muted">No users found</td></tr>';
        }
    } catch (error) {
        console.error('Load users error:', error);
        tableBody.innerHTML = '<tr><td colspan="6" class="text-center text-danger">Error loading users</td></tr>';
    }
}

async function loadAllCourses() {
    const tableBody = document.getElementById('allCoursesTable');
    
    try {
        const response = await fetch(`${API_URL}/admin/courses`, {
            headers: { 'Authorization': `Bearer ${authToken}` }
        });
        const courses = await response.json();
        
        if (Array.isArray(courses) && courses.length > 0) {
            tableBody.innerHTML = courses.map(c => `
                <tr>
                    <td><strong>${c.course_code}</strong></td>
                    <td>${c.course_title}</td>
                    <td>${c.lecturer_name}</td>
                    <td>${c.department || 'N/A'}</td>
                    <td><span class="badge bg-primary">${c.student_count || 0}</span></td>
                </tr>
            `).join('');
        } else {
            tableBody.innerHTML = '<tr><td colspan="5" class="text-center text-muted">No courses found</td></tr>';
        }
    } catch (error) {
        console.error('Load all courses error:', error);
        tableBody.innerHTML = '<tr><td colspan="5" class="text-center text-danger">Error loading courses</td></tr>';
    }
}

// ==================== UTILITY FUNCTIONS ====================
function showAlert(message, type = 'info') {
    const alertDiv = document.createElement('div');
    alertDiv.className = `alert alert-${type} alert-dismissible fade show custom-alert`;
    alertDiv.innerHTML = `
        ${message}
        <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
    `;
    document.body.appendChild(alertDiv);
    
    setTimeout(() => {
        alertDiv.remove();
    }, 5000);
}

async function searchCourses() {
    const searchInput = document.getElementById('courseSearchInput').value.trim();
    const resultsDiv = document.getElementById('courseSearchResults');
    resultsDiv.innerHTML = '<p class="text-muted"><i class="fas fa-spinner fa-spin me-2"></i>Searching...</p>';

    try {
        const url = `${API_URL}/courses/available${searchInput ? `?search=${encodeURIComponent(searchInput)}` : ''}`;
        const response = await fetch(url, {
            headers: { 'Authorization': `Bearer ${authToken}` }
        });
        const courses = await response.json();

        if (!response.ok) {
            resultsDiv.innerHTML = `<p class="text-danger">${courses.error || 'Failed to load courses'}</p>`;
            return;
        }

        if (Array.isArray(courses) && courses.length > 0) {
            resultsDiv.innerHTML = courses.map(c => `
                <div class="card mb-2">
                    <div class="card-body d-flex justify-content-between align-items-center flex-wrap gap-2">
                        <div>
                            <h6 class="mb-1 text-primary">${c.course_code} – ${c.course_title}</h6>
                            <small class="text-muted">
                                <i class="fas fa-user me-1"></i>${c.lecturer_name}
                                ${c.department ? ` &bull; ${c.department}` : ''}
                            </small>
                        </div>
                        <button class="btn btn-success btn-sm" onclick="enrollInCourse(${c.id}, this)">
                            <i class="fas fa-plus me-1"></i>Enroll
                        </button>
                    </div>
                </div>
            `).join('');
        } else {
            resultsDiv.innerHTML = '<p class="text-muted">No courses found. Try a different search or you may already be enrolled in all available courses.</p>';
        }
    } catch (error) {
        console.error('Search courses error:', error);
        resultsDiv.innerHTML = '<p class="text-danger">Error loading courses. Please try again.</p>';
    }
}

async function enrollInCourse(courseId, btnEl) {
    if (!btnEl) return;
    const originalText = btnEl.innerHTML;
    btnEl.disabled = true;
    btnEl.innerHTML = '<i class="fas fa-spinner fa-spin me-1"></i>Enrolling...';

    try {
        const response = await fetch(`${API_URL}/courses/${courseId}/enroll`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${authToken}`,
                'Content-Type': 'application/json'
            }
        });
        const data = await response.json();

        if (response.ok) {
            showAlert('Enrolled successfully!', 'success');
            loadEnrolledCourses();
            searchCourses();
        } else {
            showAlert(data.error || 'Enrollment failed', 'danger');
        }
    } catch (error) {
        console.error('Enroll error:', error);
        showAlert('Error enrolling. Please try again.', 'danger');
    } finally {
        btnEl.disabled = false;
        btnEl.innerHTML = originalText;
    }
}
