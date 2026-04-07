/* ============================================
   MedVault – Application Logic
   Personal Health Management App
   ============================================ */

(function () {
    'use strict';

    // ==================== DATA LAYER ====================
    const STORAGE_KEYS = {
        documents: 'medvault_documents',
        medicines: 'medvault_medicines',
        checkups: 'medvault_checkups'
    };

    function loadData(key) {
        try {
            return JSON.parse(localStorage.getItem(key)) || [];
        } catch {
            return [];
        }
    }

    function saveData(key, data) {
        localStorage.setItem(key, JSON.stringify(data));
    }

    function generateId() {
        return Date.now().toString(36) + Math.random().toString(36).substr(2, 6);
    }

    // ==================== TOAST SYSTEM ====================
    function showToast(type, title, message) {
        const container = document.getElementById('toastContainer');
        const icons = { success: 'fa-check', warning: 'fa-triangle-exclamation', error: 'fa-xmark', info: 'fa-info' };
        const toast = document.createElement('div');
        toast.className = `toast ${type}`;
        toast.innerHTML = `
            <div class="toast-icon"><i class="fas ${icons[type]}"></i></div>
            <div class="toast-content">
                <div class="toast-title">${title}</div>
                <div class="toast-message">${message}</div>
            </div>
            <button class="toast-close" aria-label="Close"><i class="fas fa-xmark"></i></button>
        `;
        container.appendChild(toast);
        toast.querySelector('.toast-close').addEventListener('click', () => removeToast(toast));
        setTimeout(() => removeToast(toast), 4000);
    }

    function removeToast(toast) {
        if (!toast.parentNode) return;
        toast.classList.add('removing');
        setTimeout(() => toast.remove(), 300);
    }

    // ==================== NAVIGATION ====================
    const navLinks = document.querySelectorAll('.nav-link');
    const pages = document.querySelectorAll('.page');

    function navigateTo(pageId) {
        pages.forEach(p => p.classList.remove('active'));
        navLinks.forEach(l => l.classList.remove('active'));
        const target = document.getElementById('page-' + pageId);
        const link = document.querySelector(`[data-page="${pageId}"]`);
        if (target) target.classList.add('active');
        if (link) link.classList.add('active');
        // Close mobile sidebar
        document.getElementById('sidebar').classList.remove('open');
        document.getElementById('overlay').classList.remove('active');
        // Re-render page data
        if (pageId === 'dashboard') renderDashboard();
        if (pageId === 'stock') renderStock();
    }

    navLinks.forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            navigateTo(link.dataset.page);
        });
    });

    // data-goto navigation links
    document.addEventListener('click', (e) => {
        const gotoBtn = e.target.closest('[data-goto]');
        if (gotoBtn) {
            e.preventDefault();
            navigateTo(gotoBtn.dataset.goto);
        }
    });

    // Mobile sidebar
    const mobileMenuBtn = document.getElementById('mobileMenuBtn');
    const overlay = document.getElementById('overlay');
    const sidebar = document.getElementById('sidebar');

    mobileMenuBtn.addEventListener('click', () => {
        sidebar.classList.toggle('open');
        overlay.classList.toggle('active');
    });
    overlay.addEventListener('click', () => {
        sidebar.classList.remove('open');
        overlay.classList.remove('active');
    });

    // ==================== DASHBOARD ====================
    function renderDashboard() {
        const docs = loadData(STORAGE_KEYS.documents);
        const meds = loadData(STORAGE_KEYS.medicines);
        const checkups = loadData(STORAGE_KEYS.checkups);

        // Stats
        document.getElementById('dashDocCount').textContent = docs.length;
        document.getElementById('dashMedCount').textContent = meds.length;

        // Low stock count
        const lowStockMeds = meds.filter(m => {
            const remaining = m.totalQuantity - m.dosesTaken;
            return remaining / m.totalQuantity <= 0.2;
        });
        document.getElementById('dashAlertCount').textContent = lowStockMeds.length;

        // Update nav badge for stock alerts
        const stockNav = document.getElementById('nav-stock');
        const existingBadge = stockNav.querySelector('.badge');
        if (existingBadge) existingBadge.remove();
        if (lowStockMeds.length > 0) {
            const badge = document.createElement('span');
            badge.className = 'badge';
            badge.textContent = lowStockMeds.length;
            stockNav.appendChild(badge);
        }

        // Checkups due
        const dueCheckups = checkups.filter(c => {
            const nextDate = new Date(c.lastDate);
            nextDate.setDate(nextDate.getDate() + parseInt(c.interval));
            const daysUntil = Math.ceil((nextDate - new Date()) / (1000 * 60 * 60 * 24));
            return daysUntil <= 14;
        });
        document.getElementById('dashCheckupCount').textContent = dueCheckups.length;

        // Upcoming meds
        const upcomingContainer = document.getElementById('dashUpcomingMeds');
        if (meds.length === 0) {
            upcomingContainer.innerHTML = '<div class="empty-state small"><i class="fas fa-pills"></i><p>No medicines scheduled</p></div>';
        } else {
            const now = new Date();
            const currentMinutes = now.getHours() * 60 + now.getMinutes();
            let upcoming = [];
            meds.forEach(med => {
                (med.times || []).forEach(time => {
                    const [h, m] = time.split(':').map(Number);
                    const timeMinutes = h * 60 + m;
                    upcoming.push({ name: med.name, dosage: med.dosage, time, timeMinutes, instruction: med.instruction });
                });
            });
            upcoming.sort((a, b) => {
                const aNext = a.timeMinutes >= currentMinutes ? a.timeMinutes : a.timeMinutes + 1440;
                const bNext = b.timeMinutes >= currentMinutes ? b.timeMinutes : b.timeMinutes + 1440;
                return aNext - bNext;
            });
            upcoming = upcoming.slice(0, 5);
            upcomingContainer.innerHTML = upcoming.map(m => `
                <div class="dash-item">
                    <div class="dash-item-icon med"><i class="fas fa-pills"></i></div>
                    <div class="dash-item-info">
                        <div class="dash-item-title">${escHtml(m.name)}</div>
                        <div class="dash-item-sub">${escHtml(m.dosage)} · ${formatInstruction(m.instruction)}</div>
                    </div>
                    <div class="dash-item-time">${formatTime12(m.time)}</div>
                </div>
            `).join('');
        }

        // Low stock dashboard
        const lowStockContainer = document.getElementById('dashLowStock');
        if (lowStockMeds.length === 0) {
            lowStockContainer.innerHTML = '<div class="empty-state small"><i class="fas fa-boxes-stacked"></i><p>All medicines well-stocked</p></div>';
        } else {
            lowStockContainer.innerHTML = lowStockMeds.slice(0, 4).map(m => {
                const remaining = m.totalQuantity - m.dosesTaken;
                return `
                <div class="dash-item">
                    <div class="dash-item-icon alert"><i class="fas fa-triangle-exclamation"></i></div>
                    <div class="dash-item-info">
                        <div class="dash-item-title">${escHtml(m.name)}</div>
                        <div class="dash-item-sub">${remaining} remaining of ${m.totalQuantity}</div>
                    </div>
                    <div class="dash-item-time" style="color: var(--danger)">${remaining} left</div>
                </div>`;
            }).join('');
        }

        // Checkup suggestions dashboard
        const checkupContainer = document.getElementById('dashCheckups');
        if (dueCheckups.length === 0) {
            checkupContainer.innerHTML = '<div class="empty-state small"><i class="fas fa-calendar-check"></i><p>No checkups due soon</p></div>';
        } else {
            checkupContainer.innerHTML = dueCheckups.slice(0, 4).map(c => {
                const nextDate = new Date(c.lastDate);
                nextDate.setDate(nextDate.getDate() + parseInt(c.interval));
                const daysUntil = Math.ceil((nextDate - new Date()) / (1000 * 60 * 60 * 24));
                const label = daysUntil <= 0 ? 'Overdue' : `${daysUntil}d left`;
                const color = daysUntil <= 0 ? 'var(--danger)' : 'var(--warning)';
                return `
                <div class="dash-item">
                    <div class="dash-item-icon check"><i class="fas fa-calendar-day"></i></div>
                    <div class="dash-item-info">
                        <div class="dash-item-title">${getCheckupLabel(c.type)}</div>
                        <div class="dash-item-sub">${c.doctor ? 'Dr. ' + escHtml(c.doctor) : 'No doctor specified'}</div>
                    </div>
                    <div class="dash-item-time" style="color: ${color}">${label}</div>
                </div>`;
            }).join('');
        }

        // Recent documents
        const recentDocsContainer = document.getElementById('dashRecentDocs');
        if (docs.length === 0) {
            recentDocsContainer.innerHTML = '<div class="empty-state small"><i class="fas fa-folder-open"></i><p>No documents uploaded yet</p></div>';
        } else {
            const recent = [...docs].sort((a, b) => new Date(b.uploadDate) - new Date(a.uploadDate)).slice(0, 4);
            recentDocsContainer.innerHTML = recent.map(d => `
                <div class="dash-item">
                    <div class="dash-item-icon doc"><i class="fas fa-file-medical"></i></div>
                    <div class="dash-item-info">
                        <div class="dash-item-title">${escHtml(d.name)}</div>
                        <div class="dash-item-sub">${getCategoryLabel(d.category)} · ${formatDate(d.date)}</div>
                    </div>
                </div>
            `).join('');
        }

        // Date display
        document.getElementById('currentDate').textContent = new Date().toLocaleDateString('en-IN', {
            weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
        });
    }

    // ==================== DOCUMENT VAULT ====================
    let selectedFile = null;

    const btnUploadDoc = document.getElementById('btnUploadDoc');
    const btnUploadDocEmpty = document.getElementById('btnUploadDocEmpty');
    const modalUploadDoc = document.getElementById('modalUploadDoc');
    const closeUploadModal = document.getElementById('closeUploadModal');
    const cancelUploadDoc = document.getElementById('cancelUploadDoc');
    const formUploadDoc = document.getElementById('formUploadDoc');
    const fileUploadArea = document.getElementById('fileUploadArea');
    const docFileInput = document.getElementById('docFile');
    const fileSelectedEl = document.getElementById('fileSelected');
    const fileNameEl = document.getElementById('fileName');
    const removeFileBtn = document.getElementById('removeFile');

    function openUploadModal() {
        modalUploadDoc.classList.add('active');
        formUploadDoc.reset();
        selectedFile = null;
        fileSelectedEl.style.display = 'none';
        fileUploadArea.style.display = '';
        document.getElementById('docDate').valueAsDate = new Date();
    }

    function closeUploadModalFn() {
        modalUploadDoc.classList.remove('active');
    }

    btnUploadDoc.addEventListener('click', openUploadModal);
    btnUploadDocEmpty.addEventListener('click', openUploadModal);
    closeUploadModal.addEventListener('click', closeUploadModalFn);
    cancelUploadDoc.addEventListener('click', closeUploadModalFn);
    modalUploadDoc.addEventListener('click', (e) => { if (e.target === modalUploadDoc) closeUploadModalFn(); });

    fileUploadArea.addEventListener('click', () => docFileInput.click());
    fileUploadArea.addEventListener('dragover', (e) => { e.preventDefault(); fileUploadArea.style.borderColor = 'var(--accent-1)'; });
    fileUploadArea.addEventListener('dragleave', () => { fileUploadArea.style.borderColor = ''; });
    fileUploadArea.addEventListener('drop', (e) => {
        e.preventDefault();
        fileUploadArea.style.borderColor = '';
        if (e.dataTransfer.files.length > 0) handleFileSelect(e.dataTransfer.files[0]);
    });

    docFileInput.addEventListener('change', () => {
        if (docFileInput.files.length > 0) handleFileSelect(docFileInput.files[0]);
    });

    function handleFileSelect(file) {
        if (file.size > 5 * 1024 * 1024) {
            showToast('error', 'File Too Large', 'Maximum file size is 5MB.');
            return;
        }
        selectedFile = file;
        fileNameEl.textContent = file.name;
        fileSelectedEl.style.display = '';
        fileUploadArea.style.display = 'none';
    }

    removeFileBtn.addEventListener('click', () => {
        selectedFile = null;
        docFileInput.value = '';
        fileSelectedEl.style.display = 'none';
        fileUploadArea.style.display = '';
    });

    formUploadDoc.addEventListener('submit', (e) => {
        e.preventDefault();
        const name = document.getElementById('docName').value.trim();
        const category = document.getElementById('docCategory').value;
        const date = document.getElementById('docDate').value;
        const notes = document.getElementById('docNotes').value.trim();

        if (!name || !category || !date) return;

        const saveDoc = (fileData, fileName) => {
            const docs = loadData(STORAGE_KEYS.documents);
            docs.push({
                id: generateId(),
                name,
                category,
                date,
                notes,
                fileName: fileName || '',
                fileData: fileData || '',
                uploadDate: new Date().toISOString()
            });
            saveData(STORAGE_KEYS.documents, docs);
            closeUploadModalFn();
            renderDocuments();
            renderDashboard();
            showToast('success', 'Document Saved', `"${name}" has been securely stored.`);
        };

        if (selectedFile) {
            const reader = new FileReader();
            reader.onload = () => saveDoc(reader.result, selectedFile.name);
            reader.readAsDataURL(selectedFile);
        } else {
            saveDoc('', '');
        }
    });

    // Document filters
    const docFilterChips = document.querySelectorAll('[data-filter]');
    let activeDocFilter = 'all';
    let docSearchQuery = '';

    docFilterChips.forEach(chip => {
        chip.addEventListener('click', () => {
            docFilterChips.forEach(c => c.classList.remove('active'));
            chip.classList.add('active');
            activeDocFilter = chip.dataset.filter;
            renderDocuments();
        });
    });

    document.getElementById('docSearch').addEventListener('input', (e) => {
        docSearchQuery = e.target.value.toLowerCase();
        renderDocuments();
    });

    function renderDocuments() {
        const docs = loadData(STORAGE_KEYS.documents);
        const grid = document.getElementById('documentsGrid');
        const empty = document.getElementById('emptyDocs');

        let filtered = docs;
        if (activeDocFilter !== 'all') {
            filtered = filtered.filter(d => d.category === activeDocFilter);
        }
        if (docSearchQuery) {
            filtered = filtered.filter(d => d.name.toLowerCase().includes(docSearchQuery) || (d.notes && d.notes.toLowerCase().includes(docSearchQuery)));
        }

        if (docs.length === 0) {
            grid.innerHTML = '';
            grid.appendChild(empty);
            empty.style.display = '';
            return;
        }

        if (filtered.length === 0) {
            grid.innerHTML = '<div class="empty-state"><i class="fas fa-search"></i><h3>No Matching Documents</h3><p>Try a different search or filter.</p></div>';
            return;
        }

        empty.style.display = 'none';
        grid.innerHTML = filtered.sort((a, b) => new Date(b.uploadDate) - new Date(a.uploadDate)).map(doc => `
            <div class="doc-card" data-id="${doc.id}">
                <div class="doc-card-top">
                    <span class="doc-type-badge ${doc.category}">${getCategoryLabel(doc.category)}</span>
                    <div class="doc-card-actions">
                        ${doc.fileData ? `<button class="btn-icon" title="View file" onclick="window.MedVault.viewDoc('${doc.id}')"><i class="fas fa-eye"></i></button>` : ''}
                        <button class="btn-icon" title="Delete" onclick="window.MedVault.deleteDoc('${doc.id}')"><i class="fas fa-trash-can"></i></button>
                    </div>
                </div>
                <h4>${escHtml(doc.name)}</h4>
                <div class="doc-meta">
                    <span><i class="fas fa-calendar"></i> ${formatDate(doc.date)}</span>
                    ${doc.fileName ? `<span><i class="fas fa-paperclip"></i> ${escHtml(doc.fileName)}</span>` : ''}
                </div>
                ${doc.notes ? `<div class="doc-notes">${escHtml(doc.notes)}</div>` : ''}
            </div>
        `).join('');
    }

    window.MedVault = window.MedVault || {};
    window.MedVault.viewDoc = function (id) {
        const docs = loadData(STORAGE_KEYS.documents);
        const doc = docs.find(d => d.id === id);
        if (doc && doc.fileData) {
            const win = window.open();
            if (doc.fileData.startsWith('data:application/pdf')) {
                win.document.write(`<iframe src="${doc.fileData}" style="width:100%;height:100vh;border:none;"></iframe>`);
            } else {
                win.document.write(`<img src="${doc.fileData}" style="max-width:100%;height:auto;">`);
            }
        }
    };

    window.MedVault.deleteDoc = function (id) {
        if (!confirm('Delete this document? This action cannot be undone.')) return;
        let docs = loadData(STORAGE_KEYS.documents);
        docs = docs.filter(d => d.id !== id);
        saveData(STORAGE_KEYS.documents, docs);
        renderDocuments();
        renderDashboard();
        showToast('info', 'Document Deleted', 'The document has been removed.');
    };

    // ==================== MEDICINE TIMER ====================
    const btnAddMed = document.getElementById('btnAddMed');
    const btnAddMedEmpty = document.getElementById('btnAddMedEmpty');
    const modalAddMed = document.getElementById('modalAddMed');
    const closeAddMedModal = document.getElementById('closeAddMedModal');
    const cancelAddMed = document.getElementById('cancelAddMed');
    const formAddMed = document.getElementById('formAddMed');
    const medFrequency = document.getElementById('medFrequency');
    const scheduleTimes = document.getElementById('scheduleTimes');

    function openMedModal() {
        modalAddMed.classList.add('active');
        formAddMed.reset();
        scheduleTimes.innerHTML = '';
    }

    function closeMedModalFn() {
        modalAddMed.classList.remove('active');
    }

    btnAddMed.addEventListener('click', openMedModal);
    btnAddMedEmpty.addEventListener('click', openMedModal);
    closeAddMedModal.addEventListener('click', closeMedModalFn);
    cancelAddMed.addEventListener('click', closeMedModalFn);
    modalAddMed.addEventListener('click', (e) => { if (e.target === modalAddMed) closeMedModalFn(); });

    medFrequency.addEventListener('change', () => {
        const count = parseInt(medFrequency.value) || 0;
        const defaultTimes = ['08:00', '14:00', '20:00', '23:00'];
        scheduleTimes.innerHTML = '';
        for (let i = 0; i < count; i++) {
            const input = document.createElement('input');
            input.type = 'time';
            input.required = true;
            input.value = defaultTimes[i] || '08:00';
            scheduleTimes.appendChild(input);
        }
    });

    formAddMed.addEventListener('submit', (e) => {
        e.preventDefault();
        const name = document.getElementById('medName').value.trim();
        const dosage = document.getElementById('medDosage').value.trim();
        const frequency = document.getElementById('medFrequency').value;
        const quantity = parseInt(document.getElementById('medQuantity').value);
        const instruction = document.getElementById('medInstruction').value;
        const sideEffects = document.getElementById('medSideEffects').value.trim();
        const times = Array.from(scheduleTimes.querySelectorAll('input[type="time"]')).map(i => i.value);

        if (!name || !dosage || !frequency || !quantity || times.length === 0) return;

        const meds = loadData(STORAGE_KEYS.medicines);
        meds.push({
            id: generateId(),
            name,
            dosage,
            frequency: parseInt(frequency),
            totalQuantity: quantity,
            dosesTaken: 0,
            instruction,
            sideEffects,
            times,
            createdAt: new Date().toISOString()
        });
        saveData(STORAGE_KEYS.medicines, meds);
        closeMedModalFn();
        renderMedicines();
        renderDashboard();
        showToast('success', 'Medicine Added', `"${name}" added with ${times.length} reminder(s).`);
        requestNotificationPermission();
    });

    function renderMedicines() {
        const meds = loadData(STORAGE_KEYS.medicines);
        const list = document.getElementById('medicinesList');
        const empty = document.getElementById('emptyMeds');

        if (meds.length === 0) {
            list.innerHTML = '';
            list.appendChild(empty);
            empty.style.display = '';
            return;
        }

        empty.style.display = 'none';
        list.innerHTML = meds.map(med => `
            <div class="med-card" data-id="${med.id}">
                <div class="med-card-header">
                    <h4><i class="fas fa-capsules"></i> ${escHtml(med.name)}</h4>
                    <div>
                        <button class="btn-icon" title="Delete" onclick="window.MedVault.deleteMed('${med.id}')"><i class="fas fa-trash-can"></i></button>
                    </div>
                </div>
                <div class="med-details">
                    <span class="med-tag"><i class="fas fa-prescription"></i> ${escHtml(med.dosage)}</span>
                    <span class="med-tag"><i class="fas fa-repeat"></i> ${med.frequency}x daily</span>
                    <span class="med-tag"><i class="fas fa-utensils"></i> ${formatInstruction(med.instruction)}</span>
                    <span class="med-tag"><i class="fas fa-boxes-stacked"></i> ${med.totalQuantity - med.dosesTaken} remaining</span>
                </div>
                <div class="med-schedule">
                    ${(med.times || []).map(t => `<span class="schedule-time"><i class="fas fa-bell"></i> ${formatTime12(t)}</span>`).join('')}
                </div>
                ${med.sideEffects ? `<div class="med-side-effects"><i class="fas fa-triangle-exclamation"></i> <span>${escHtml(med.sideEffects)}</span></div>` : ''}
            </div>
        `).join('');
    }

    window.MedVault.deleteMed = function (id) {
        if (!confirm('Remove this medicine and its reminders?')) return;
        let meds = loadData(STORAGE_KEYS.medicines);
        meds = meds.filter(m => m.id !== id);
        saveData(STORAGE_KEYS.medicines, meds);
        renderMedicines();
        renderDashboard();
        showToast('info', 'Medicine Removed', 'The medicine has been removed from your list.');
    };

    // ==================== STOCK ALERT ====================
    function renderStock() {
        const meds = loadData(STORAGE_KEYS.medicines);
        const list = document.getElementById('stockList');
        const empty = document.getElementById('emptyStock');

        if (meds.length === 0) {
            list.innerHTML = '';
            list.appendChild(empty);
            empty.style.display = '';
            return;
        }

        empty.style.display = 'none';
        list.innerHTML = meds.map(med => {
            const remaining = med.totalQuantity - med.dosesTaken;
            const percent = Math.max(0, (remaining / med.totalQuantity) * 100);
            let statusClass, statusLabel, fillClass;
            if (percent <= 10) {
                statusClass = 'critical'; statusLabel = '⚠️ Critical'; fillClass = 'critical';
            } else if (percent <= 20) {
                statusClass = 'warning'; statusLabel = '⚡ Low Stock'; fillClass = 'warning';
            } else {
                statusClass = 'ok'; statusLabel = '✅ In Stock'; fillClass = '';
            }
            const cardClass = percent <= 20 ? 'low-stock' : '';

            return `
            <div class="stock-card ${cardClass}" data-id="${med.id}">
                <div class="stock-card-header">
                    <h4><i class="fas fa-capsules" style="color: var(--accent-1);"></i> ${escHtml(med.name)}</h4>
                    <span class="stock-status ${statusClass}">${statusLabel}</span>
                </div>
                <div class="stock-progress">
                    <div class="progress-bar">
                        <div class="progress-fill ${fillClass}" style="width: ${percent}%"></div>
                    </div>
                    <div class="stock-info">
                        <span>${remaining} of ${med.totalQuantity} remaining</span>
                        <span>${Math.round(percent)}%</span>
                    </div>
                </div>
                <div class="stock-actions">
                    <button class="btn btn-sm btn-success" onclick="window.MedVault.takeDose('${med.id}')">
                        <i class="fas fa-check"></i> Take Dose
                    </button>
                    <button class="btn btn-sm btn-warning" onclick="window.MedVault.restockMed('${med.id}')">
                        <i class="fas fa-plus"></i> Restock
                    </button>
                </div>
            </div>`;
        }).join('');
    }

    window.MedVault.takeDose = function (id) {
        const meds = loadData(STORAGE_KEYS.medicines);
        const med = meds.find(m => m.id === id);
        if (!med) return;

        const remaining = med.totalQuantity - med.dosesTaken;
        if (remaining <= 0) {
            showToast('error', 'Out of Stock', `${med.name} is out of stock. Please restock.`);
            return;
        }

        med.dosesTaken++;
        saveData(STORAGE_KEYS.medicines, meds);
        renderStock();
        renderMedicines();
        renderDashboard();

        const newRemaining = med.totalQuantity - med.dosesTaken;
        const percent = (newRemaining / med.totalQuantity) * 100;
        if (percent <= 20 && percent > 10) {
            showToast('warning', 'Low Stock Alert', `${med.name}: only ${newRemaining} doses remaining.`);
        } else if (percent <= 10) {
            showToast('error', 'Critical Stock', `${med.name}: only ${newRemaining} doses left! Restock soon.`);
        } else {
            showToast('success', 'Dose Taken', `${med.name}: ${newRemaining} doses remaining.`);
        }
    };

    window.MedVault.restockMed = function (id) {
        const amount = prompt('How many units are you restocking?');
        if (!amount || isNaN(amount) || parseInt(amount) <= 0) return;
        const meds = loadData(STORAGE_KEYS.medicines);
        const med = meds.find(m => m.id === id);
        if (!med) return;
        med.totalQuantity += parseInt(amount);
        saveData(STORAGE_KEYS.medicines, meds);
        renderStock();
        renderMedicines();
        renderDashboard();
        showToast('success', 'Restocked', `${med.name}: added ${amount} units.`);
    };

    // ==================== CHECKUP SUGGESTIONS ====================
    const btnAddCheckup = document.getElementById('btnAddCheckup');
    const btnAddCheckupEmpty = document.getElementById('btnAddCheckupEmpty');
    const modalAddCheckup = document.getElementById('modalAddCheckup');
    const closeCheckupModal = document.getElementById('closeCheckupModal');
    const cancelCheckup = document.getElementById('cancelCheckup');
    const formAddCheckup = document.getElementById('formAddCheckup');

    function openCheckupModal() {
        modalAddCheckup.classList.add('active');
        formAddCheckup.reset();
    }

    function closeCheckupModalFn() {
        modalAddCheckup.classList.remove('active');
    }

    btnAddCheckup.addEventListener('click', openCheckupModal);
    btnAddCheckupEmpty.addEventListener('click', openCheckupModal);
    closeCheckupModal.addEventListener('click', closeCheckupModalFn);
    cancelCheckup.addEventListener('click', closeCheckupModalFn);
    modalAddCheckup.addEventListener('click', (e) => { if (e.target === modalAddCheckup) closeCheckupModalFn(); });

    formAddCheckup.addEventListener('submit', (e) => {
        e.preventDefault();
        const type = document.getElementById('checkupType').value;
        const doctor = document.getElementById('checkupDoctor').value.trim();
        const lastDate = document.getElementById('checkupDate').value;
        const interval = document.getElementById('checkupInterval').value;
        const notes = document.getElementById('checkupNotes').value.trim();

        if (!type || !lastDate) return;

        const checkups = loadData(STORAGE_KEYS.checkups);
        checkups.push({
            id: generateId(),
            type,
            doctor,
            lastDate,
            interval: parseInt(interval),
            notes,
            createdAt: new Date().toISOString()
        });
        saveData(STORAGE_KEYS.checkups, checkups);
        closeCheckupModalFn();
        renderCheckups();
        renderDashboard();
        showToast('success', 'Checkup Recorded', `${getCheckupLabel(type)} visit recorded.`);
    });

    function renderCheckups() {
        const checkups = loadData(STORAGE_KEYS.checkups);
        const list = document.getElementById('checkupsList');
        const empty = document.getElementById('emptyCheckups');

        if (checkups.length === 0) {
            list.innerHTML = '';
            list.appendChild(empty);
            empty.style.display = '';
            return;
        }

        empty.style.display = 'none';
        list.innerHTML = checkups.map(c => {
            const nextDate = new Date(c.lastDate);
            nextDate.setDate(nextDate.getDate() + c.interval);
            const daysUntil = Math.ceil((nextDate - new Date()) / (1000 * 60 * 60 * 24));
            let dueClass, dueLabel, suggestion;
            if (daysUntil <= 0) {
                dueClass = 'overdue'; dueLabel = 'Overdue';
                suggestion = `This checkup was due ${Math.abs(daysUntil)} days ago. Consider scheduling a visit.`;
            } else if (daysUntil <= 14) {
                dueClass = 'soon'; dueLabel = `Due in ${daysUntil} days`;
                suggestion = `Your ${getCheckupLabel(c.type).toLowerCase()} is coming up soon. You might want to book an appointment.`;
            } else {
                dueClass = 'ok'; dueLabel = `${daysUntil} days away`;
                suggestion = '';
            }

            const cardClass = daysUntil <= 0 ? 'overdue' : (daysUntil <= 14 ? 'due-soon' : '');

            return `
            <div class="checkup-card ${cardClass}" data-id="${c.id}">
                <div class="checkup-card-header">
                    <h4>${getCheckupEmoji(c.type)} ${getCheckupLabel(c.type)}</h4>
                    <div style="display:flex; gap:8px; align-items:center;">
                        <span class="checkup-due ${dueClass}">${dueLabel}</span>
                        <button class="btn-icon" title="Delete" onclick="window.MedVault.deleteCheckup('${c.id}')"><i class="fas fa-trash-can"></i></button>
                    </div>
                </div>
                <div class="checkup-meta">
                    ${c.doctor ? `<span><i class="fas fa-user-doctor"></i> ${escHtml(c.doctor)}</span>` : ''}
                    <span><i class="fas fa-calendar"></i> Last: ${formatDate(c.lastDate)}</span>
                    <span><i class="fas fa-clock-rotate-left"></i> Every ${c.interval} days</span>
                    <span><i class="fas fa-calendar-day"></i> Next: ${formatDate(nextDate.toISOString().split('T')[0])}</span>
                </div>
                ${suggestion ? `<div class="checkup-suggestion"><i class="fas fa-lightbulb"></i> ${suggestion}</div>` : ''}
                ${c.notes ? `<div class="doc-notes" style="margin-top:10px;">${escHtml(c.notes)}</div>` : ''}
            </div>`;
        }).join('');
    }

    window.MedVault.deleteCheckup = function (id) {
        if (!confirm('Remove this checkup record?')) return;
        let checkups = loadData(STORAGE_KEYS.checkups);
        checkups = checkups.filter(c => c.id !== id);
        saveData(STORAGE_KEYS.checkups, checkups);
        renderCheckups();
        renderDashboard();
        showToast('info', 'Checkup Removed', 'The checkup record has been removed.');
    };

    // ==================== NEARBY HOSPITALS (LIVE) ====================
    let userLocation = null;
    let liveHospitalData = [];
    let activeHospitalFilter = 'all';
    let hospitalSearchQuery = '';

    const locationStatusBar = document.getElementById('locationStatusBar');
    const locationStatusText = document.getElementById('locationStatusText');
    const btnDetectLocation = document.getElementById('btnDetectLocation');
    const hospitalMap = document.getElementById('hospitalMap');
    const mapPlaceholder = document.getElementById('mapPlaceholder');
    const searchRadiusSelect = document.getElementById('searchRadius');

    btnDetectLocation.addEventListener('click', detectLocation);

    searchRadiusSelect.addEventListener('change', () => {
        if (userLocation) {
            fetchNearbyHospitals(userLocation.lat, userLocation.lng, searchRadiusSelect.value);
        }
    });

    const hospitalFilterChips = document.querySelectorAll('[data-hospital-filter]');
    hospitalFilterChips.forEach(chip => {
        chip.addEventListener('click', () => {
            hospitalFilterChips.forEach(c => c.classList.remove('active'));
            chip.classList.add('active');
            activeHospitalFilter = chip.dataset.hospitalFilter;
            renderHospitals();
        });
    });

    document.getElementById('hospitalSearch').addEventListener('input', (e) => {
        hospitalSearchQuery = e.target.value.toLowerCase();
        renderHospitals();
    });

    function detectLocation() {
        if (!('geolocation' in navigator)) {
            setLocationStatus('error', 'Geolocation is not supported by your browser.');
            showToast('error', 'Not Supported', 'Your browser does not support geolocation.');
            return;
        }

        setLocationStatus('detecting', 'Detecting your location...');
        btnDetectLocation.disabled = true;
        btnDetectLocation.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Detecting...';

        navigator.geolocation.getCurrentPosition(
            (position) => {
                const lat = position.coords.latitude;
                const lng = position.coords.longitude;
                userLocation = { lat, lng };

                setLocationStatus('located', `Location found: ${lat.toFixed(4)}°N, ${lng.toFixed(4)}°E`);
                btnDetectLocation.disabled = false;
                btnDetectLocation.innerHTML = '<i class="fas fa-location-crosshairs"></i> Refresh Location';

                // Show map
                showMap(lat, lng);

                // Fetch hospitals
                fetchNearbyHospitals(lat, lng, searchRadiusSelect.value);

                showToast('success', 'Location Detected', 'Searching for nearby hospitals...');
            },
            (error) => {
                let msg = 'Unable to detect location.';
                if (error.code === 1) msg = 'Location access denied. Please allow location permission.';
                if (error.code === 2) msg = 'Location unavailable. Please try again.';
                if (error.code === 3) msg = 'Location request timed out. Please try again.';

                setLocationStatus('error', msg);
                btnDetectLocation.disabled = false;
                btnDetectLocation.innerHTML = '<i class="fas fa-location-crosshairs"></i> Detect My Location';
                showToast('error', 'Location Error', msg);
            },
            { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }
        );
    }

    function setLocationStatus(state, text) {
        locationStatusBar.className = 'location-status-bar ' + state;
        locationStatusText.textContent = text;
        const icon = locationStatusBar.querySelector('.location-status-icon i');
        if (state === 'detecting') icon.className = 'fas fa-spinner';
        else if (state === 'located') icon.className = 'fas fa-check-circle';
        else if (state === 'error') icon.className = 'fas fa-exclamation-circle';
        else icon.className = 'fas fa-location-dot';
    }

    function showMap(lat, lng) {
        mapPlaceholder.style.display = 'none';
        hospitalMap.style.display = 'block';
        // OpenStreetMap embed with hospital overlay
        hospitalMap.src = `https://www.openstreetmap.org/export/embed.html?bbox=${lng - 0.05}%2C${lat - 0.04}%2C${lng + 0.05}%2C${lat + 0.04}&layer=mapnik&marker=${lat}%2C${lng}`;
    }

    async function fetchNearbyHospitals(lat, lng, radius) {
        const grid = document.getElementById('hospitalsGrid');
        const resultCount = document.getElementById('hospitalResultCount');

        grid.innerHTML = '<div class="hospital-loading"><i class="fas fa-spinner"></i><p>Searching nearby hospitals, clinics & pharmacies...</p></div>';
        resultCount.textContent = '';

        // Overpass API query for hospitals, clinics, pharmacies, doctors
        const query = `
            [out:json][timeout:25];
            (
                nwr["amenity"="hospital"](around:${radius},${lat},${lng});
                nwr["amenity"="clinic"](around:${radius},${lat},${lng});
                nwr["amenity"="pharmacy"](around:${radius},${lat},${lng});
                nwr["amenity"="doctors"](around:${radius},${lat},${lng});
            );
            out center body;
        `;

        try {
            const response = await fetch('https://overpass-api.de/api/interpreter', {
                method: 'POST',
                headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
                body: 'data=' + encodeURIComponent(query)
            });

            if (!response.ok) throw new Error('API request failed');

            const data = await response.json();
            const elements = data.elements || [];

            // Process results
            liveHospitalData = elements
                .filter(el => el.tags && el.tags.name)
                .map(el => {
                    const elLat = el.lat || el.center?.lat;
                    const elLng = el.lon || el.center?.lon;
                    const distance = elLat && elLng ? haversineDistance(lat, lng, elLat, elLng) : null;

                    return {
                        name: el.tags.name,
                        type: el.tags.amenity || 'hospital',
                        address: buildAddress(el.tags),
                        phone: el.tags.phone || el.tags['contact:phone'] || '',
                        website: el.tags.website || el.tags['contact:website'] || '',
                        emergency: el.tags.emergency === 'yes',
                        openingHours: el.tags.opening_hours || '',
                        lat: elLat,
                        lng: elLng,
                        distance: distance,
                        distanceText: distance ? formatDistance(distance) : ''
                    };
                })
                .sort((a, b) => (a.distance || Infinity) - (b.distance || Infinity));

            if (liveHospitalData.length === 0) {
                grid.innerHTML = '<div class="empty-state"><i class="fas fa-hospital"></i><h3>No Results Found</h3><p>Try increasing the search radius.</p></div>';
                resultCount.textContent = '0 results found';
            } else {
                resultCount.textContent = `Found ${liveHospitalData.length} health facilities within ${parseInt(radius) / 1000} km`;
                renderHospitals();
            }

            showToast('success', 'Search Complete', `Found ${liveHospitalData.length} nearby health facilities.`);
        } catch (err) {
            console.error('Overpass API error:', err);
            grid.innerHTML = '<div class="empty-state"><i class="fas fa-exclamation-triangle"></i><h3>Search Failed</h3><p>Could not connect to the map service. Please try again.</p></div>';
            resultCount.textContent = '';
            showToast('error', 'Search Failed', 'Could not fetch hospitals. Please try again.');
        }
    }

    function renderHospitals() {
        const grid = document.getElementById('hospitalsGrid');
        const resultCount = document.getElementById('hospitalResultCount');

        if (liveHospitalData.length === 0) {
            const emptyEl = document.getElementById('emptyHospitals');
            if (emptyEl) {
                grid.innerHTML = '';
                grid.appendChild(emptyEl);
                emptyEl.style.display = '';
            }
            return;
        }

        let filtered = liveHospitalData;
        if (activeHospitalFilter !== 'all') {
            filtered = filtered.filter(h => h.type === activeHospitalFilter);
        }
        if (hospitalSearchQuery) {
            filtered = filtered.filter(h =>
                h.name.toLowerCase().includes(hospitalSearchQuery) ||
                h.address.toLowerCase().includes(hospitalSearchQuery) ||
                h.type.toLowerCase().includes(hospitalSearchQuery)
            );
        }

        resultCount.textContent = `Showing ${filtered.length} of ${liveHospitalData.length} results`;

        if (filtered.length === 0) {
            grid.innerHTML = '<div class="empty-state"><i class="fas fa-search"></i><h3>No Matching Results</h3><p>Try different filters or search terms.</p></div>';
            return;
        }

        grid.innerHTML = filtered.map(h => {
            const typeLabel = { hospital: '🏥 Hospital', clinic: '🩺 Clinic', pharmacy: '💊 Pharmacy', doctors: '👨‍⚕️ Doctor' };
            const typeTag = typeLabel[h.type] || '🏥 Health Facility';
            const phoneClean = h.phone ? h.phone.replace(/[^+\d]/g, '') : '';
            const hasPhone = !!h.phone;
            const hasHours = !!h.openingHours;
            const hasCoords = h.lat && h.lng;
            const gmapsUrl = hasCoords
                ? `https://www.google.com/maps/search/?api=1&query=${h.lat},${h.lng}`
                : (h.name ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(h.name + ' ' + h.address)}` : '#');
            const gmapsDirUrl = hasCoords
                ? `https://www.google.com/maps/dir/?api=1&destination=${h.lat},${h.lng}`
                : '#';

            return `
            <div class="hospital-card">
                <div class="hospital-card-header">
                    <h4>${escHtml(h.name)}</h4>
                    <div style="display:flex; gap:6px; align-items:center;">
                        ${h.emergency ? '<span class="hospital-emergency"><i class="fas fa-truck-medical"></i> 24/7 ER</span>' : ''}
                        ${h.distanceText ? `<span class="hospital-distance"><i class="fas fa-route"></i> ${h.distanceText}</span>` : ''}
                    </div>
                </div>
                <div class="hospital-meta">
                    <span class="hospital-specialty">${typeTag}</span>
                    <a href="${gmapsUrl}" target="_blank" class="gmaps-logo-link" title="View on Google Maps">
                        <svg class="gmaps-logo" viewBox="0 0 92.3 132.3" xmlns="http://www.w3.org/2000/svg"><path fill="#1a73e8" d="M60.2 2.2C55.8.8 51 0 46.1 0 32 0 19.3 6.4 10.8 16.5l21.8 18.3L60.2 2.2z"/><path fill="#ea4335" d="M10.8 16.5C4.1 24.5 0 34.9 0 46.1c0 8.7 1.7 15.7 4.6 22l28-33.3-21.8-18.3z"/><path fill="#4285f4" d="M46.1 28.5c9.8 0 17.7 7.9 17.7 17.7 0 4.3-1.6 8.3-4.2 11.4 0 0 13.9-16.6 27.5-32.7-5.6-10.8-15.3-19-27-22.7L32.6 34.8c3.3-3.8 8.1-6.3 13.5-6.3z"/><path fill="#fbbc04" d="M46.1 63.5c-9.8 0-17.7-7.9-17.7-17.7 0-4.3 1.6-8.3 4.2-11.4L4.6 68.1C7.4 74.4 12.1 82 18.8 91.4l23.4-27.9h3.9z"/><path fill="#34a853" d="M59.6 57.7c-2.3 3.4-6.4 7.8-13.5 7.8h-3.9L18.8 91.4c7 9.8 16.4 22.4 24.5 37.1.7 1.3 1.3 2.5 2 3.8.5-1 1.1-2.1 1.7-3.2 5.3-9.3 12.3-20 20.8-32.2 10.4-14.9 17-25.4 20.3-33.4 2.1-5 3.3-10.5 3.9-16.2L59.6 57.7z"/></svg>
                    </a>
                </div>
                <div class="hospital-info">
                    ${h.address ? `<span><i class="fas fa-location-dot"></i> ${escHtml(h.address)}</span>` : '<span class="info-missing"><i class="fas fa-location-dot"></i> Address not available</span>'}
                    <span class="${hasPhone ? 'info-available' : 'info-missing'}">
                        <i class="fas fa-phone"></i> ${hasPhone ? escHtml(h.phone) : 'Phone not available'}
                    </span>
                    <span class="${hasHours ? 'info-available' : 'info-missing'}">
                        <i class="fas fa-clock"></i> ${hasHours ? escHtml(h.openingHours) : 'Hours not available'}
                    </span>
                </div>
                <div class="hospital-actions">
                    ${hasPhone
                    ? `<a href="tel:${phoneClean}" class="btn btn-sm btn-primary"><i class="fas fa-phone"></i> Call</a>`
                    : `<span class="btn btn-sm btn-disabled"><i class="fas fa-phone-slash"></i> No Phone</span>`
                }
                    ${hasCoords
                    ? `<a href="${gmapsDirUrl}" target="_blank" class="btn btn-sm btn-secondary"><i class="fas fa-diamond-turn-right"></i> Directions</a>`
                    : `<span class="btn btn-sm btn-disabled"><i class="fas fa-diamond-turn-right"></i> No Directions</span>`
                }
                    <a href="${gmapsUrl}" target="_blank" class="btn btn-sm btn-gmaps" title="Open in Google Maps">
                        <svg class="gmaps-btn-icon" viewBox="0 0 92.3 132.3" xmlns="http://www.w3.org/2000/svg"><path fill="#fff" d="M60.2 2.2C55.8.8 51 0 46.1 0 32 0 19.3 6.4 10.8 16.5l21.8 18.3L60.2 2.2z"/><path fill="#fff" d="M10.8 16.5C4.1 24.5 0 34.9 0 46.1c0 8.7 1.7 15.7 4.6 22l28-33.3-21.8-18.3z"/><path fill="#fff" d="M46.1 28.5c9.8 0 17.7 7.9 17.7 17.7 0 4.3-1.6 8.3-4.2 11.4 0 0 13.9-16.6 27.5-32.7-5.6-10.8-15.3-19-27-22.7L32.6 34.8c3.3-3.8 8.1-6.3 13.5-6.3z"/><path fill="#fff" d="M46.1 63.5c-9.8 0-17.7-7.9-17.7-17.7 0-4.3 1.6-8.3 4.2-11.4L4.6 68.1C7.4 74.4 12.1 82 18.8 91.4l23.4-27.9h3.9z"/><path fill="#fff" d="M59.6 57.7c-2.3 3.4-6.4 7.8-13.5 7.8h-3.9L18.8 91.4c7 9.8 16.4 22.4 24.5 37.1.7 1.3 1.3 2.5 2 3.8.5-1 1.1-2.1 1.7-3.2 5.3-9.3 12.3-20 20.8-32.2 10.4-14.9 17-25.4 20.3-33.4 2.1-5 3.3-10.5 3.9-16.2L59.6 57.7z"/></svg> Maps
                    </a>
                    ${h.website ? `<a href="${h.website}" target="_blank" class="btn btn-sm btn-secondary"><i class="fas fa-globe"></i> Web</a>` : ''}
                </div>
            </div>`;
        }).join('');
    }

    // Haversine distance in meters
    function haversineDistance(lat1, lon1, lat2, lon2) {
        const R = 6371000;
        const dLat = (lat2 - lat1) * Math.PI / 180;
        const dLon = (lon2 - lon1) * Math.PI / 180;
        const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
            Math.sin(dLon / 2) * Math.sin(dLon / 2);
        return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    }

    function formatDistance(meters) {
        if (meters < 1000) return Math.round(meters) + ' m';
        return (meters / 1000).toFixed(1) + ' km';
    }

    function buildAddress(tags) {
        const parts = [];
        if (tags['addr:housenumber']) parts.push(tags['addr:housenumber']);
        if (tags['addr:street']) parts.push(tags['addr:street']);
        if (tags['addr:city']) parts.push(tags['addr:city']);
        if (tags['addr:postcode']) parts.push(tags['addr:postcode']);
        return parts.join(', ');
    }

    // ==================== NOTIFICATION SYSTEM ====================
    function requestNotificationPermission() {
        if ('Notification' in window && Notification.permission === 'default') {
            Notification.requestPermission();
        }
    }

    function checkMedicineReminders() {
        const meds = loadData(STORAGE_KEYS.medicines);
        if (meds.length === 0) return;

        const now = new Date();
        const currentTime = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

        meds.forEach(med => {
            (med.times || []).forEach(time => {
                if (time === currentTime) {
                    const remaining = med.totalQuantity - med.dosesTaken;
                    if (remaining <= 0) return;

                    showToast('info', '💊 Medicine Reminder', `Time to take ${med.name} (${med.dosage}) — ${formatInstruction(med.instruction)}`);

                    if ('Notification' in window && Notification.permission === 'granted') {
                        new Notification('💊 MedVault Reminder', {
                            body: `Time to take ${med.name} (${med.dosage})\n${formatInstruction(med.instruction)}`,
                            icon: 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><text y=".9em" font-size="90">💊</text></svg>'
                        });
                    }
                }
            });
        });
    }

    // Check every minute
    setInterval(checkMedicineReminders, 60000);

    // ==================== HELPERS ====================
    function escHtml(str) {
        const div = document.createElement('div');
        div.textContent = str;
        return div.innerHTML;
    }

    function formatDate(dateStr) {
        const d = new Date(dateStr + 'T00:00:00');
        return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
    }

    function formatTime12(time) {
        const [h, m] = time.split(':').map(Number);
        const period = h >= 12 ? 'PM' : 'AM';
        const hour = h % 12 || 12;
        return `${hour}:${String(m).padStart(2, '0')} ${period}`;
    }

    function formatInstruction(inst) {
        const map = { 'after-food': 'After Food', 'before-food': 'Before Food', 'with-food': 'With Food', 'anytime': 'Anytime' };
        return map[inst] || inst;
    }

    function getCategoryLabel(cat) {
        const map = { 'prescription': 'Prescription', 'lab-report': 'Lab Report', 'discharge': 'Discharge', 'imaging': 'Imaging', 'insurance': 'Insurance', 'other': 'Other' };
        return map[cat] || cat;
    }

    function getCheckupLabel(type) {
        const map = { 'general': 'General Checkup', 'dental': 'Dental Checkup', 'eye': 'Eye Checkup', 'blood-test': 'Blood Test', 'cardio': 'Cardiology', 'derma': 'Dermatology', 'ortho': 'Orthopedic', 'other': 'Other Checkup' };
        return map[type] || type;
    }

    function getCheckupEmoji(type) {
        const map = { 'general': '🩺', 'dental': '🦷', 'eye': '👁️', 'blood-test': '🩸', 'cardio': '❤️', 'derma': '🧴', 'ortho': '🦴', 'other': '📋' };
        return map[type] || '📋';
    }

    function capitalise(str) {
        return str.charAt(0).toUpperCase() + str.slice(1);
    }

    // ==================== MEDBOT – SMART TEXT PARSER ====================
    const medbotFab = document.getElementById('medbotFab');
    const medbotPanel = document.getElementById('medbotPanel');
    const medbotClose = document.getElementById('medbotClose');
    const medbotBody = document.getElementById('medbotBody');
    const medbotInput = document.getElementById('medbotInput');
    const medbotSend = document.getElementById('medbotSend');
    const medbotPreview = document.getElementById('medbotPreview');
    const medbotPreviewItems = document.getElementById('medbotPreviewItems');
    const medbotConfirm = document.getElementById('medbotConfirm');
    const medbotCancel = document.getElementById('medbotCancel');
    const medbotEditBack = document.getElementById('medbotEditBack');
    const medbotInputArea = document.getElementById('medbotInputArea');

    let parsedItems = [];

    medbotFab.addEventListener('click', () => {
        const isOpen = medbotPanel.classList.toggle('open');
        medbotFab.classList.toggle('open', isOpen);
        if (isOpen) medbotInput.focus();
    });

    medbotClose.addEventListener('click', () => {
        medbotPanel.classList.remove('open');
        medbotFab.classList.remove('open');
    });

    medbotSend.addEventListener('click', handleMedbotSend);
    medbotInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleMedbotSend(); }
    });

    function handleMedbotSend() {
        const text = medbotInput.value.trim();
        if (!text) return;

        // Show user message
        addBotMessage(text, 'user');
        medbotInput.value = '';

        // Parse the text
        setTimeout(() => {
            parsedItems = parseText(text);
            if (parsedItems.length === 0) {
                addBotMessage("😕 I couldn't find any medicines or appointments in your text. Try something like:\n\n\"Paracetamol 500mg twice daily at 8am and 8pm after food, 30 tablets\" or \"Eye checkup Dr. Kumar March 20\"", 'bot');
            } else {
                const medCount = parsedItems.filter(i => i.type === 'medicine').length;
                const checkCount = parsedItems.filter(i => i.type === 'checkup').length;
                let summary = '✅ I found ';
                const parts = [];
                if (medCount) parts.push(`**${medCount} medicine${medCount > 1 ? 's' : ''}**`);
                if (checkCount) parts.push(`**${checkCount} appointment${checkCount > 1 ? 's' : ''}**`);
                summary += parts.join(' and ') + '. Review below and click <strong>Add All</strong> to save them!';
                addBotMessage(summary, 'bot');
                showPreview(parsedItems);
            }
        }, 400);
    }

    function addBotMessage(text, sender) {
        const div = document.createElement('div');
        div.className = `medbot-msg ${sender}`;
        const icon = sender === 'bot' ? 'fa-robot' : 'fa-user';
        div.innerHTML = `
            <div class="medbot-msg-avatar"><i class="fas ${icon}"></i></div>
            <div class="medbot-msg-bubble">${sender === 'bot' ? text.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>').replace(/\n/g, '<br>') : escHtml(text)}</div>
        `;
        medbotBody.appendChild(div);
        medbotBody.scrollTop = medbotBody.scrollHeight;
    }

    function showPreview(items) {
        medbotPreview.style.display = '';
        medbotInputArea.style.display = 'none';
        medbotPreviewItems.innerHTML = items.map((item, i) => {
            if (item.type === 'medicine') {
                return `
                <div class="medbot-preview-card medicine">
                    <span class="preview-type"><i class="fas fa-pills"></i> Medicine</span>
                    <h5>💊 ${escHtml(item.name)}</h5>
                    <div class="preview-detail"><i class="fas fa-prescription"></i> ${escHtml(item.dosage)}</div>
                    <div class="preview-detail"><i class="fas fa-repeat"></i> ${item.frequency}x daily</div>
                    <div class="preview-detail"><i class="fas fa-clock"></i> ${item.times.map(t => formatTime12(t)).join(', ')}</div>
                    <div class="preview-detail"><i class="fas fa-utensils"></i> ${formatInstruction(item.instruction)}</div>
                    <div class="preview-detail"><i class="fas fa-boxes-stacked"></i> Qty: ${item.quantity}</div>
                </div>`;
            } else {
                return `
                <div class="medbot-preview-card checkup">
                    <span class="preview-type"><i class="fas fa-calendar-check"></i> Appointment</span>
                    <h5>${getCheckupEmoji(item.checkupType)} ${getCheckupLabel(item.checkupType)}</h5>
                    ${item.doctor ? `<div class="preview-detail"><i class="fas fa-user-doctor"></i> ${escHtml(item.doctor)}</div>` : ''}
                    <div class="preview-detail"><i class="fas fa-calendar"></i> ${formatDate(item.date)}</div>
                </div>`;
            }
        }).join('');
    }

    medbotEditBack.addEventListener('click', () => {
        medbotPreview.style.display = 'none';
        medbotInputArea.style.display = '';
        medbotInput.focus();
    });

    medbotCancel.addEventListener('click', () => {
        medbotPreview.style.display = 'none';
        medbotInputArea.style.display = '';
        parsedItems = [];
        addBotMessage('❌ Cancelled. You can try again or modify your text.', 'bot');
    });

    medbotConfirm.addEventListener('click', () => {
        let medsAdded = 0, checkupsAdded = 0;

        parsedItems.forEach(item => {
            if (item.type === 'medicine') {
                const meds = loadData(STORAGE_KEYS.medicines);
                meds.push({
                    id: generateId(),
                    name: item.name,
                    dosage: item.dosage,
                    frequency: item.frequency,
                    totalQuantity: item.quantity,
                    dosesTaken: 0,
                    instruction: item.instruction,
                    sideEffects: '',
                    times: item.times,
                    createdAt: new Date().toISOString()
                });
                saveData(STORAGE_KEYS.medicines, meds);
                medsAdded++;
            } else if (item.type === 'checkup') {
                const checkups = loadData(STORAGE_KEYS.checkups);
                checkups.push({
                    id: generateId(),
                    type: item.checkupType,
                    doctor: item.doctor,
                    lastDate: item.date,
                    interval: item.interval || 180,
                    notes: 'Added via MedBot',
                    createdAt: new Date().toISOString()
                });
                saveData(STORAGE_KEYS.checkups, checkups);
                checkupsAdded++;
            }
        });

        // Refresh views
        renderMedicines();
        renderStock();
        renderCheckups();
        renderDashboard();

        medbotPreview.style.display = 'none';
        medbotInputArea.style.display = '';
        parsedItems = [];

        let msg = '🎉 Done! Added ';
        const parts = [];
        if (medsAdded) parts.push(`${medsAdded} medicine${medsAdded > 1 ? 's' : ''}`);
        if (checkupsAdded) parts.push(`${checkupsAdded} appointment${checkupsAdded > 1 ? 's' : ''}`);
        msg += parts.join(' and ') + ' successfully!';
        addBotMessage(msg, 'bot');
        showToast('success', 'MedBot', msg.replace(/🎉 /, ''));
    });

    // ==================== TEXT PARSER ENGINE ====================
    function parseText(text) {
        const items = [];
        const normalized = text.replace(/\s+/g, ' ').trim();

        // Extract medicines
        const medItems = parseMedicines(normalized);
        items.push(...medItems);

        // Extract checkups/appointments
        const checkupItems = parseCheckups(normalized);
        items.push(...checkupItems);

        return items;
    }

    function parseMedicines(text) {
        const medicines = [];
        // Common medicine name patterns — look for words followed by dosage
        // Pattern: medicine_name dosage_amount frequency [times] [instruction]
        const dosagePattern = /(\d+\s*(?:mg|mcg|ml|g|iu|units|%|tablet|tab|capsule|cap|drops|puff)s?)/gi;

        // Try to split text into segments per medicine
        // Split by comma, period, semicolons, "and also", line breaks
        const segments = text.split(/(?:,\s*(?:and\s+)?|;\s*|\.\s+|(?:\band\b\s+(?=\w+\s+\d+\s*(?:mg|mcg|ml|g)\b)))/i);

        for (const seg of segments) {
            const trimmed = seg.trim();
            if (!trimmed || trimmed.length < 5) continue;

            // Check if this segment contains a dosage
            const dosageMatch = trimmed.match(dosagePattern);
            if (!dosageMatch) continue;

            const med = extractMedicineDetails(trimmed, dosageMatch[0]);
            if (med && med.name) {
                medicines.push(med);
            }
        }

        // If no splitting worked, try the whole text as a single medicine
        if (medicines.length === 0) {
            const dosageMatch = text.match(dosagePattern);
            if (dosageMatch) {
                const med = extractMedicineDetails(text, dosageMatch[0]);
                if (med && med.name) medicines.push(med);
            }
        }

        return medicines;
    }

    function extractMedicineDetails(text, dosage) {
        const lower = text.toLowerCase();

        // Extract name: words before the dosage
        const dosageIdx = lower.indexOf(dosage.toLowerCase());
        let name = text.substring(0, dosageIdx).trim();
        // Clean up common prefixes
        name = name.replace(/^(?:take|have|consume|use|apply|start)\s+/i, '').trim();
        // Remove trailing dash, comma
        name = name.replace(/[-,\s]+$/, '').trim();
        if (!name || name.length < 2) return null;

        // Capitalise name
        name = name.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(' ');

        // Extract frequency
        let frequency = 1;
        if (/\b(?:twice|two\s*times|2\s*times|bd|bid|b\.?i\.?d)\b/i.test(lower)) frequency = 2;
        else if (/\b(?:three\s*times|thrice|3\s*times|tds|tid|t\.?i\.?d)\b/i.test(lower)) frequency = 3;
        else if (/\b(?:four\s*times|4\s*times|qds|qid|q\.?i\.?d)\b/i.test(lower)) frequency = 4;
        else if (/\b(?:once|one\s*time|1\s*time|od|o\.?d)\b/i.test(lower)) frequency = 1;

        // Extract times
        const times = extractTimes(text, frequency);

        // Extract instruction (before/after/with food)
        let instruction = 'anytime';
        if (/\b(?:after\s*(?:food|meal|eating|lunch|dinner|breakfast))\b/i.test(lower)) instruction = 'after-food';
        else if (/\b(?:before\s*(?:food|meal|eating|lunch|dinner|breakfast))\b/i.test(lower)) instruction = 'before-food';
        else if (/\b(?:with\s*(?:food|meal|eating|lunch|dinner|breakfast))\b/i.test(lower)) instruction = 'with-food';
        else if (/\b(?:empty\s*stomach)\b/i.test(lower)) instruction = 'before-food';

        // Extract quantity
        let quantity = 30; // default
        const qtyMatch = text.match(/(\d+)\s*(?:tablet|tab|capsule|cap|pill|strip|unit|piece|bottle)s?/i);
        if (qtyMatch) quantity = parseInt(qtyMatch[1]);
        // Also try "qty X" or "quantity X"
        const qtyMatch2 = text.match(/(?:qty|quantity|total)\s*[:\-]?\s*(\d+)/i);
        if (qtyMatch2) quantity = parseInt(qtyMatch2[1]);

        return {
            type: 'medicine',
            name,
            dosage: dosage.trim(),
            frequency,
            times,
            instruction,
            quantity
        };
    }

    function extractTimes(text, frequency) {
        const times = [];

        // Look for explicit time patterns: 8am, 8:00pm, 08:00, etc.
        const timeRegex = /\b(\d{1,2})\s*(?::(\d{2}))?\s*(am|pm|AM|PM)\b/g;
        let match;
        while ((match = timeRegex.exec(text)) !== null) {
            let h = parseInt(match[1]);
            const m = match[2] ? parseInt(match[2]) : 0;
            const period = match[3].toLowerCase();
            if (period === 'pm' && h !== 12) h += 12;
            if (period === 'am' && h === 12) h = 0;
            times.push(`${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`);
        }

        // Also try 24h format: "at 08:00"
        const time24Regex = /\bat\s+(\d{1,2}):(\d{2})\b/g;
        while ((match = time24Regex.exec(text)) !== null) {
            const h = parseInt(match[1]);
            const m = parseInt(match[2]);
            if (h >= 0 && h <= 23 && m >= 0 && m <= 59) {
                const t = `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
                if (!times.includes(t)) times.push(t);
            }
        }

        // Also check word-based times
        if (/\b(?:morning)\b/i.test(text) && !times.some(t => { const h = parseInt(t); return h >= 6 && h <= 10; })) {
            times.push('08:00');
        }
        if (/\b(?:afternoon|noon)\b/i.test(text) && !times.some(t => { const h = parseInt(t); return h >= 12 && h <= 14; })) {
            times.push('14:00');
        }
        if (/\b(?:evening)\b/i.test(text) && !times.some(t => { const h = parseInt(t); return h >= 17 && h <= 19; })) {
            times.push('18:00');
        }
        if (/\b(?:night|bedtime)\b/i.test(text) && !times.some(t => { const h = parseInt(t); return h >= 20 && h <= 23; })) {
            times.push('21:00');
        }

        // If no times found, generate defaults based on frequency
        if (times.length === 0) {
            const defaults = {
                1: ['08:00'],
                2: ['08:00', '20:00'],
                3: ['08:00', '14:00', '20:00'],
                4: ['08:00', '12:00', '17:00', '22:00']
            };
            return defaults[frequency] || ['08:00'];
        }

        return times.slice(0, frequency || times.length);
    }

    function parseCheckups(text) {
        const checkups = [];
        const lower = text.toLowerCase();

        // Type mapping
        const typeMap = {
            'dent': 'dental', 'tooth': 'dental', 'teeth': 'dental',
            'eye': 'eye', 'vision': 'eye', 'ophthal': 'eye', 'optom': 'eye',
            'blood': 'blood-test', 'lab': 'blood-test', 'cbc': 'blood-test',
            'heart': 'cardio', 'cardio': 'cardio', 'cardiac': 'cardio', 'ecg': 'cardio', 'echo': 'cardio',
            'skin': 'derma', 'derma': 'derma',
            'bone': 'ortho', 'ortho': 'ortho', 'joint': 'ortho', 'spine': 'ortho',
            'general': 'general', 'checkup': 'general', 'check-up': 'general', 'physical': 'general',
            'follow': 'general', 'appointment': 'general', 'visit': 'general', 'consultation': 'general'
        };

        // Look for checkup/appointment patterns
        const checkupPattern = /(?:(?:appointment|checkup|check-up|visit|consultation|follow[\s-]?up|scheduled|book)\s+)?(?:(?:for|of)\s+)?(?:(?:a\s+)?(\w[\w\s]*?)\s+)?(?:(?:appointment|checkup|check-up|visit|consultation)?\s*)?(?:with\s+)?(?:(?:dr\.?|doctor)\s+([\w\s]+?))?\s*(?:on|at|for|date|scheduled|is|:)\s*(\d{1,2}[\s/\-]\w+[\s/\-]?\d{0,4}|\w+\s+\d{1,2}(?:st|nd|rd|th)?(?:\s*,?\s*\d{4})?)/gi;

        let match;
        while ((match = checkupPattern.exec(text)) !== null) {
            const fullMatch = match[0];
            const typePart = (match[1] || '').trim().toLowerCase();
            const doctorPart = (match[2] || '').trim();
            const datePart = (match[3] || '').trim();

            if (!datePart) continue;

            // Determine checkup type
            let checkupType = 'general';
            for (const [keyword, type] of Object.entries(typeMap)) {
                if (typePart.includes(keyword) || fullMatch.toLowerCase().includes(keyword)) {
                    checkupType = type;
                    break;
                }
            }

            // Parse date
            const parsedDate = parseNaturalDate(datePart);
            if (!parsedDate) continue;

            // Extract doctor name — also look for "Dr." pattern anywhere near this segment
            let doctor = doctorPart;
            if (!doctor) {
                const docMatch = fullMatch.match(/(?:dr\.?|doctor)\s+([\w\s]+?)(?:\s+on|\s+at|\s+for|$)/i);
                if (docMatch) doctor = docMatch[1].trim();
            }

            checkups.push({
                type: 'checkup',
                checkupType,
                doctor: doctor ? 'Dr. ' + doctor.replace(/^dr\.?\s*/i, '') : '',
                date: parsedDate,
                interval: 180
            });
        }

        // Fallback: look for simpler patterns like "Dr. Name on Date"
        if (checkups.length === 0) {
            const simplePattern = /(?:dr\.?|doctor)\s+([\w\s]+?)\s+(?:on|at|for|date)\s+(\d{1,2}[\s/\-]\w+[\s/\-]?\d{0,4}|\w+\s+\d{1,2}(?:st|nd|rd|th)?(?:\s*,?\s*\d{4})?)/gi;
            while ((match = simplePattern.exec(text)) !== null) {
                const doctor = match[1].trim();
                const datePart = match[2].trim();
                const parsedDate = parseNaturalDate(datePart);
                if (!parsedDate) continue;

                let checkupType = 'general';
                for (const [keyword, type] of Object.entries(typeMap)) {
                    if (lower.includes(keyword)) { checkupType = type; break; }
                }

                checkups.push({
                    type: 'checkup',
                    checkupType,
                    doctor: 'Dr. ' + doctor.replace(/^dr\.?\s*/i, ''),
                    date: parsedDate,
                    interval: 180
                });
            }
        }

        return checkups;
    }

    function parseNaturalDate(dateStr) {
        const months = { jan: 0, january: 0, feb: 1, february: 1, mar: 2, march: 2, apr: 3, april: 3, may: 4, jun: 5, june: 5, jul: 6, july: 6, aug: 7, august: 7, sep: 8, september: 8, oct: 9, october: 9, nov: 10, november: 10, dec: 11, december: 11 };

        const cleaned = dateStr.replace(/(st|nd|rd|th)/gi, '').trim();

        // Try "Month Day Year" or "Month Day"
        let match = cleaned.match(/(\w+)\s+(\d{1,2})(?:\s*,?\s*(\d{4}))?/i);
        if (match) {
            const monthStr = match[1].toLowerCase();
            if (months[monthStr] !== undefined) {
                const year = match[3] ? parseInt(match[3]) : new Date().getFullYear();
                const day = parseInt(match[2]);
                if (day >= 1 && day <= 31) {
                    const d = new Date(year, months[monthStr], day);
                    return d.toISOString().split('T')[0];
                }
            }
        }

        // Try "Day Month Year" or "Day/Month/Year"
        match = cleaned.match(/(\d{1,2})[\s/\-](\w+)[\s/\-]?(\d{4})?/i);
        if (match) {
            const day = parseInt(match[1]);
            const monthStr = match[2].toLowerCase();
            if (months[monthStr] !== undefined && day >= 1 && day <= 31) {
                const year = match[3] ? parseInt(match[3]) : new Date().getFullYear();
                const d = new Date(year, months[monthStr], day);
                return d.toISOString().split('T')[0];
            }
            // Try numeric month
            const monthNum = parseInt(match[2]);
            if (monthNum >= 1 && monthNum <= 12 && day >= 1 && day <= 31) {
                const year = match[3] ? parseInt(match[3]) : new Date().getFullYear();
                const d = new Date(year, monthNum - 1, day);
                return d.toISOString().split('T')[0];
            }
        }

        // Try standard date parse
        const parsed = new Date(dateStr);
        if (!isNaN(parsed.getTime())) {
            return parsed.toISOString().split('T')[0];
        }

        return null;
    }

    // ==================== INIT ====================
    renderDashboard();
    renderDocuments();
    renderMedicines();
    renderCheckups();
    requestNotificationPermission();

})();
