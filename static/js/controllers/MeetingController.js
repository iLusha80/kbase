import API from '../api.js';
import { renderMeetings, STATUS_LABELS } from '../components/MeetingList.js';
import { closeModal } from '../components/Modal.js';
import { switchView, navigateBack } from '../utils/router.js';
import { validateForm, clearFormErrors, MEETING_RULES } from '../utils/formValidator.js';

let meetingsData = [];
let meetingTypesData = [];
let currentMeetingId = null;
let currentMeetingData = null;
let selectedParticipantIds = [];
let meetingTimerInterval = null;
let summaryExpanded = false;

// Speech recognition state
let speechRecognition = null;
let isRecording = false;

export const MeetingController = {
    init() {
        const form = document.getElementById('meeting-form');
        if (form) {
            form.addEventListener('submit', this.handleFormSubmit.bind(this));
        }

        // Type change -> auto-fill agenda
        const typeSelect = document.getElementById('meeting-type-select');
        if (typeSelect) {
            typeSelect.addEventListener('change', () => {
                const typeId = parseInt(typeSelect.value);
                const type = meetingTypesData.find(t => t.id === typeId);
                const agendaField = document.getElementById('meeting-agenda-textarea');
                if (type && type.default_agenda && agendaField && !agendaField.value.trim()) {
                    agendaField.value = type.default_agenda;
                }
            });
        }

        // Participants multi-select
        const participantSelect = document.getElementById('meeting-participants-select');
        if (participantSelect) {
            participantSelect.addEventListener('change', () => {
                const contactId = parseInt(participantSelect.value);
                if (contactId && !selectedParticipantIds.includes(contactId)) {
                    selectedParticipantIds.push(contactId);
                    this.renderParticipantTags();
                }
                participantSelect.value = '';
            });
        }

        // Register global functions
        window.openMeetingModal = this.openModal.bind(this);
        window.closeMeetingModal = () => closeModal('meeting-modal');
        window.editMeeting = this.editMeeting.bind(this);
        window.deleteMeeting = this.deleteMeeting.bind(this);
        window.openMeetingDetail = this.openMeetingDetail.bind(this);

        // New: Note operations
        window.addMeetingNote = this.addNote.bind(this);
        window.deleteMeetingNote = this.deleteNote.bind(this);
        window.convertNoteToTask = this.convertNoteToTask.bind(this);
        window.editMeetingNote = this.editNote.bind(this);
        window.saveEditedNote = this.saveEditedNote.bind(this);
        window.cancelEditNote = this.cancelEditNote.bind(this);

        // New: Meeting lifecycle
        window.startMeeting = this.startMeeting.bind(this);
        window.endMeeting = this.endMeeting.bind(this);
        window.saveMeetingTitle = this.saveTitle.bind(this);
        window.saveMeetingSummary = this.saveSummary.bind(this);
        window.toggleMeetingSummary = this.toggleSummary.bind(this);

        // New: Quick start (create + open)
        window.quickStartMeeting = this.quickStartMeeting.bind(this);

        // New: Speech recognition
        window.toggleSpeechRecognition = this.toggleSpeech.bind(this);

        // New: AI analysis
        window.analyzeMeetingAI = this.analyzeAI.bind(this);
        window.closeAIModal = () => {
            document.getElementById('m-ai-modal')?.classList.add('hidden');
        };
        window.applySummaryFromAI = this.applySummaryFromAI.bind(this);
        window.createTaskFromAI = this.createTaskFromAI.bind(this);

        // Type button select in modal
        window.selectMeetingType = this.selectMeetingType.bind(this);

        // Legacy compat
        window.addMeetingActionItem = this.addActionItem.bind(this);
        window.toggleMeetingActionItem = this.toggleActionItem.bind(this);
        window.convertActionToTask = this.convertToTask.bind(this);
        window.deleteActionItem = this.deleteActionItem.bind(this);
        window.saveMeetingNotes = this.saveNotes.bind(this);
    },

    async loadAll() {
        meetingsData = await API.getMeetings();
        renderMeetings(meetingsData, meetingTypesData);
        return meetingsData;
    },

    async loadMeetingTypes() {
        meetingTypesData = await API.getMeetingTypes();
        this.populateTypeSelects();
        return meetingTypesData;
    },

    getData() { return meetingsData; },
    getTypes() { return meetingTypesData; },

    populateTypeSelects() {
        const select = document.getElementById('meeting-type-select');
        if (!select) return;
        const current = select.value;
        select.innerHTML = '<option value="">-- Выберите тип --</option>';
        meetingTypesData.forEach(t => {
            select.innerHTML += `<option value="${t.id}">${t.name}</option>`;
        });
        if (current) select.value = current;

        // Visual type buttons
        this.renderTypeButtons();
    },

    renderTypeButtons() {
        const container = document.getElementById('meeting-type-buttons');
        if (!container || meetingTypesData.length === 0) return;

        const typeIcons = { '1-1': 'user', 'Дейлик': 'sun', 'Еженедельник': 'calendar-days', 'Другое': 'more-horizontal' };

        container.innerHTML = meetingTypesData.map(t => {
            const icon = typeIcons[t.name] || 'calendar';
            return `
            <button type="button" data-type-id="${t.id}"
                class="meeting-type-btn flex flex-col items-center gap-1.5 p-2.5 rounded-xl border-2 border-slate-200 dark:border-slate-600 text-slate-500 dark:text-slate-400 hover:border-slate-300 dark:hover:border-slate-500 transition-all text-center"
                onclick="window.selectMeetingType(${t.id})">
                <div class="w-8 h-8 rounded-lg flex items-center justify-center" style="background-color: ${t.color}15; color: ${t.color}">
                    <i data-lucide="${icon}" class="w-4 h-4"></i>
                </div>
                <span class="text-[11px] font-medium leading-tight">${t.name}</span>
            </button>`;
        }).join('');

        if (window.lucide) lucide.createIcons();
    },

    selectMeetingType(typeId) {
        const select = document.getElementById('meeting-type-select');
        if (select) select.value = typeId;

        // Update button styles
        document.querySelectorAll('.meeting-type-btn').forEach(btn => {
            const btnTypeId = parseInt(btn.dataset.typeId);
            if (btnTypeId === typeId) {
                const type = meetingTypesData.find(t => t.id === typeId);
                const color = type?.color || '#6366f1';
                btn.style.borderColor = color;
                btn.style.backgroundColor = color + '10';
                btn.classList.add('ring-1');
                btn.style.setProperty('--tw-ring-color', color + '40');
            } else {
                btn.style.borderColor = '';
                btn.style.backgroundColor = '';
                btn.classList.remove('ring-1');
            }
        });

        // Auto-fill agenda
        const type = meetingTypesData.find(t => t.id === typeId);
        const agendaField = document.getElementById('meeting-agenda-textarea');
        if (type && type.default_agenda && agendaField && !agendaField.value.trim()) {
            agendaField.value = type.default_agenda;
        }
    },

    populateParticipantSelect(contacts) {
        const select = document.getElementById('meeting-participants-select');
        if (!select) return;
        select.innerHTML = '<option value="">+ Добавить участника</option>';
        contacts.forEach(c => {
            select.innerHTML += `<option value="${c.id}">${c.last_name} ${c.first_name || ''}</option>`;
        });
    },

    renderParticipantTags() {
        const container = document.getElementById('meeting-participants-tags');
        if (!container) return;
        const select = document.getElementById('meeting-participants-select');

        container.innerHTML = selectedParticipantIds.map(id => {
            const option = select.querySelector(`option[value="${id}"]`);
            const name = option ? option.textContent : `ID ${id}`;
            return `<span class="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs bg-primary-50 text-primary-700 border border-primary-200 dark:bg-primary-900/30 dark:text-primary-300 dark:border-primary-800">
                ${name}
                <button type="button" onclick="window.removeMeetingParticipant(${id})" class="ml-0.5 text-primary-400 hover:text-red-500">&times;</button>
            </span>`;
        }).join('');

        window.removeMeetingParticipant = (id) => {
            selectedParticipantIds = selectedParticipantIds.filter(pid => pid !== id);
            this.renderParticipantTags();
        };
    },

    openModal() {
        const form = document.getElementById('meeting-form');
        if (form) {
            form.reset();
            form.querySelector('[name="id"]').value = '';
        }
        selectedParticipantIds = [];
        this.renderParticipantTags();
        this.renderTypeButtons();
        document.getElementById('meeting-modal-title-text').innerText = 'Новая встреча';
        const dateInput = form.querySelector('[name="date"]');
        if (dateInput && !dateInput.value) {
            dateInput.value = new Date().toISOString().split('T')[0];
        }
        document.getElementById('meeting-modal').classList.remove('hidden');
        if (window.lucide) lucide.createIcons();
    },

    async editMeeting(id) {
        const meeting = meetingsData.find(m => m.id === id);
        if (!meeting) {
            const data = await API.getMeeting(id);
            if (data) this.populateModal(data);
            return;
        }
        this.populateModal(meeting);
    },

    populateModal(meeting) {
        this.openModal();
        const form = document.getElementById('meeting-form');
        form.querySelector('[name="id"]').value = meeting.id;
        form.querySelector('[name="title"]').value = meeting.title || '';
        form.querySelector('[name="date"]').value = meeting.date || '';
        form.querySelector('[name="time"]').value = meeting.time || '';
        form.querySelector('[name="duration_minutes"]').value = meeting.duration_minutes || '';
        if (meeting.type_id) form.querySelector('[name="type_id"]').value = meeting.type_id;
        form.querySelector('[name="project_id"]').value = meeting.project_id || '';
        form.querySelector('[name="agenda"]').value = meeting.agenda || '';
        document.getElementById('meeting-modal-title-text').innerText = 'Редактировать встречу';

        selectedParticipantIds = meeting.participants ? meeting.participants.map(p => p.id) : [];
        this.renderParticipantTags();

        // Highlight type button
        if (meeting.type_id) {
            this.selectMeetingType(meeting.type_id);
        }
    },

    async handleFormSubmit(e) {
        e.preventDefault();
        const form = e.target;

        if (!validateForm(form, MEETING_RULES)) return;

        const formData = new FormData(form);
        const data = Object.fromEntries(formData.entries());
        data.participant_ids = selectedParticipantIds;
        data.duration_minutes = data.duration_minutes ? parseInt(data.duration_minutes) : null;
        data.type_id = data.type_id ? parseInt(data.type_id) : null;
        data.project_id = data.project_id || null;

        const id = data.id;
        delete data.id;

        let result;
        if (id) {
            result = await API.updateMeeting(parseInt(id), data);
        } else {
            result = await API.createMeeting(data);
        }

        if (result) {
            closeModal('meeting-modal');
            e.target.reset();
            selectedParticipantIds = [];
            await this.loadAll();
            // If editing and detail view is open, refresh it
            if (id && !document.getElementById('view-meeting-detail').classList.contains('hidden')) {
                this.openMeetingDetail(parseInt(id));
            }
        } else {
            alert('Ошибка при сохранении встречи');
        }
    },

    // --- Quick Start: create meeting with defaults and open detail ---
    async quickStartMeeting() {
        const meeting = await API.createMeeting({});
        if (meeting) {
            await this.loadAll();
            this.openMeetingDetail(meeting.id);
        }
    },

    async deleteMeeting(id) {
        if (confirm('Удалить встречу?')) {
            if (await API.deleteMeeting(id)) {
                await this.loadAll();
                navigateBack('meetings', '/meetings');
                return true;
            }
        }
        return false;
    },

    // ==========================================
    // MEETING DETAIL — Live meeting page
    // ==========================================
    async openMeetingDetail(id) {
        currentMeetingId = id;
        const m = await API.getMeeting(id);
        if (!m) return;
        currentMeetingData = m;

        const typeColor = m.type?.color || '#94a3b8';

        // Color accent bar
        const colorBar = document.getElementById('m-detail-color-bar');
        if (colorBar) colorBar.style.background = `linear-gradient(90deg, ${typeColor}, ${typeColor}40)`;

        // Title (inline editable)
        const titleInput = document.getElementById('m-detail-title-input');
        titleInput.value = m.title || '';

        // Status badge
        const statusBadge = document.getElementById('m-detail-status-badge');
        const statusInfo = STATUS_LABELS[m.status] || STATUS_LABELS['planned'];
        statusBadge.innerText = statusInfo.label;
        statusBadge.style.color = statusInfo.color;
        statusBadge.style.backgroundColor = statusInfo.bg;

        // Start/End buttons
        const startBtn = document.getElementById('m-detail-start-btn');
        const endBtn = document.getElementById('m-detail-end-btn');
        startBtn.classList.add('hidden');
        endBtn.classList.add('hidden');

        if (m.status === 'planned') {
            startBtn.classList.remove('hidden');
        } else if (m.status === 'in_progress') {
            endBtn.classList.remove('hidden');
        }

        // Timer
        this.updateTimer(m);

        // Action buttons
        document.getElementById('m-detail-edit-btn').onclick = () => this.editMeeting(m.id);
        document.getElementById('m-detail-delete-btn').onclick = async () => {
            if (await this.deleteMeeting(m.id)) {
                navigateBack('meetings', '/meetings');
            }
        };

        // Sub-header info
        const dateStr = m.date
            ? new Date(m.date + 'T00:00:00').toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' })
            : '-';
        document.getElementById('m-detail-date').innerHTML = `<i data-lucide="calendar" class="w-3.5 h-3.5"></i> ${dateStr}`;

        const typeDot = document.getElementById('m-detail-type-dot');
        if (typeDot) typeDot.style.backgroundColor = typeColor;
        const typeLabelEl = document.getElementById('m-detail-type-label');
        typeLabelEl.querySelector('span:last-child').innerText = m.type ? m.type.name : 'Без типа';

        const projLabel = document.getElementById('m-detail-project-label');
        if (m.project_id) {
            projLabel.innerHTML = `<i data-lucide="briefcase" class="w-3.5 h-3.5"></i> <span>${m.project_title}</span>`;
            projLabel.onclick = () => window.openProjectDetail && window.openProjectDetail(m.project_id);
        } else {
            projLabel.innerHTML = `<i data-lucide="briefcase" class="w-3.5 h-3.5"></i> <span>Без проекта</span>`;
            projLabel.onclick = null;
        }

        const partCount = m.participants_count || 0;
        document.getElementById('m-detail-participants-count').innerHTML =
            `<i data-lucide="users" class="w-3.5 h-3.5"></i> <span>${partCount}</span>`;

        // Notes list
        this.renderNotes(m.meeting_notes || []);

        // Summary
        document.getElementById('m-detail-summary').value = m.summary || '';

        // Sidebar
        this.renderSidebar(m);

        if (window.lucide) lucide.createIcons();
        switchView('meeting-detail', true, `/meetings/${id}`);

        // Focus note input
        setTimeout(() => {
            const input = document.getElementById('m-note-input');
            if (input && m.status === 'in_progress') input.focus();
        }, 100);
    },

    // --- Notes rendering (chat-like, polished) ---
    renderNotes(notes) {
        const list = document.getElementById('m-detail-notes-list');
        const empty = document.getElementById('m-notes-empty');

        if (!notes || notes.length === 0) {
            list.innerHTML = '';
            list.appendChild(empty);
            empty.classList.remove('hidden');
            if (window.lucide) lucide.createIcons();
            return;
        }

        empty.classList.add('hidden');

        const sourceConfig = {
            'voice': { icon: 'mic', color: 'text-red-400', bg: 'bg-red-50 dark:bg-red-900/20', label: 'Голос' },
            'ai': { icon: 'sparkles', color: 'text-purple-400', bg: 'bg-purple-50 dark:bg-purple-900/20', label: 'AI' },
            'manual': { icon: 'pencil-line', color: 'text-slate-400', bg: 'bg-slate-50 dark:bg-slate-800', label: '' },
        };

        list.innerHTML = notes.map((note, idx) => {
            const time = note.created_at ? note.created_at.split(' ')[1] || '' : '';
            const isConverted = !!note.task_id;
            const src = sourceConfig[note.source] || sourceConfig['manual'];
            const isNew = idx === notes.length - 1;

            return `
            <div class="group flex items-start gap-2.5 py-2 px-3 rounded-xl transition-all hover:bg-slate-50 dark:hover:bg-slate-800/50 ${isConverted ? 'opacity-50' : ''} ${isNew ? 'note-slide-in' : ''}" data-note-id="${note.id}">
                <!-- Source icon -->
                <div class="w-7 h-7 rounded-lg ${src.bg} flex items-center justify-center flex-shrink-0 mt-0.5">
                    <i data-lucide="${src.icon}" class="w-3.5 h-3.5 ${src.color}"></i>
                </div>

                <!-- Content -->
                <div class="flex-1 min-w-0">
                    <span id="note-text-${note.id}" class="text-sm text-slate-800 dark:text-slate-200 leading-relaxed ${isConverted ? 'line-through text-slate-500' : ''}">${this.escapeHtml(note.text)}</span>
                    <div class="flex items-center gap-2 mt-0.5">
                        <span class="text-[10px] text-slate-400">${time}</span>
                        ${isConverted ? `<span class="text-[10px] text-primary-500 cursor-pointer hover:underline flex items-center gap-0.5" onclick="window.openTaskDetail && window.openTaskDetail(${note.task_id})"><i data-lucide="external-link" class="w-2.5 h-2.5"></i>задача</span>` : ''}
                    </div>
                </div>

                <!-- Actions (hover only) -->
                <div class="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0 mt-0.5">
                    ${!isConverted ? `
                        <button onclick="window.convertNoteToTask(${note.id})" class="p-1.5 text-slate-300 hover:text-primary-600 hover:bg-primary-50 dark:hover:bg-primary-900/20 rounded-lg transition-all" title="Создать задачу">
                            <i data-lucide="square-check" class="w-3.5 h-3.5"></i>
                        </button>` : ''}
                    <button onclick="window.editMeetingNote(${note.id}, '${this.escapeAttr(note.text)}')" class="p-1.5 text-slate-300 hover:text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-all" title="Редактировать">
                        <i data-lucide="pencil" class="w-3.5 h-3.5"></i>
                    </button>
                    <button onclick="window.deleteMeetingNote(${note.id})" class="p-1.5 text-slate-300 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-all" title="Удалить">
                        <i data-lucide="x" class="w-3.5 h-3.5"></i>
                    </button>
                </div>
            </div>`;
        }).join('');

        if (window.lucide) lucide.createIcons();

        // Scroll to bottom
        list.scrollTop = list.scrollHeight;
    },

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    },

    escapeAttr(text) {
        return text.replace(/\\/g, '\\\\').replace(/'/g, "\\'").replace(/"/g, '\\"').replace(/\n/g, '\\n');
    },

    // --- Note CRUD ---
    async addNote() {
        if (!currentMeetingId) return;
        const input = document.getElementById('m-note-input');
        const text = input.value.trim();
        if (!text) return;

        const note = await API.addMeetingNote(currentMeetingId, { text, source: 'manual' });
        if (note) {
            input.value = '';
            // Refresh notes only (not entire detail)
            const m = await API.getMeeting(currentMeetingId);
            if (m) {
                currentMeetingData = m;
                this.renderNotes(m.meeting_notes || []);
                this.renderSidebarTasks(m.related_tasks || []);
            }
        }
    },

    async deleteNote(noteId) {
        if (!currentMeetingId) return;
        const ok = await API.deleteMeetingNote(currentMeetingId, noteId);
        if (ok) {
            const m = await API.getMeeting(currentMeetingId);
            if (m) {
                currentMeetingData = m;
                this.renderNotes(m.meeting_notes || []);
            }
        }
    },

    async convertNoteToTask(noteId) {
        if (!currentMeetingId) return;
        const task = await API.convertNoteToTask(currentMeetingId, noteId);
        if (task) {
            const m = await API.getMeeting(currentMeetingId);
            if (m) {
                currentMeetingData = m;
                this.renderNotes(m.meeting_notes || []);
                this.renderSidebarTasks(m.related_tasks || []);
            }
            // Refresh global tasks
            if (window.TaskController) await window.TaskController.loadAll();
        }
    },

    editNote(noteId, currentText) {
        const textEl = document.getElementById(`note-text-${noteId}`);
        if (!textEl) return;
        const noteEl = textEl.closest('[data-note-id]');
        if (!noteEl) return;

        // Replace text with input
        const input = document.createElement('input');
        input.type = 'text';
        input.value = currentText;
        input.className = 'flex-1 px-2 py-1 border border-primary-300 rounded text-sm focus:outline-none focus:border-primary-500 dark:bg-slate-800 dark:border-slate-600 dark:text-white';
        input.onkeydown = (e) => {
            if (e.key === 'Enter') { window.saveEditedNote(noteId, input.value); }
            if (e.key === 'Escape') { window.cancelEditNote(); }
        };

        textEl.replaceWith(input);
        input.focus();
        input.select();
    },

    async saveEditedNote(noteId, newText) {
        if (!currentMeetingId || !newText.trim()) return;
        await API.updateMeetingNote(currentMeetingId, noteId, { text: newText.trim() });
        const m = await API.getMeeting(currentMeetingId);
        if (m) {
            currentMeetingData = m;
            this.renderNotes(m.meeting_notes || []);
        }
    },

    cancelEditNote() {
        // Just re-render notes
        if (currentMeetingData) {
            this.renderNotes(currentMeetingData.meeting_notes || []);
        }
    },

    // --- Meeting lifecycle ---
    async startMeeting() {
        if (!currentMeetingId) return;
        await API.updateMeeting(currentMeetingId, { status: 'in_progress' });
        this.openMeetingDetail(currentMeetingId);
    },

    async endMeeting() {
        if (!currentMeetingId) return;
        // Show summary section
        summaryExpanded = true;
        const body = document.getElementById('m-summary-body');
        if (body) body.classList.remove('hidden');

        await API.updateMeeting(currentMeetingId, { status: 'completed' });
        await this.loadAll();
        this.openMeetingDetail(currentMeetingId);
    },

    async saveTitle() {
        if (!currentMeetingId) return;
        const title = document.getElementById('m-detail-title-input')?.value?.trim();
        if (!title || title === currentMeetingData?.title) return;
        await API.updateMeeting(currentMeetingId, { title });
        await this.loadAll();
    },

    async saveSummary() {
        if (!currentMeetingId) return;
        const summary = document.getElementById('m-detail-summary').value;
        const success = await API.updateMeeting(currentMeetingId, { summary });
        if (success) {
            await this.loadAll();
        }
    },

    toggleSummary() {
        summaryExpanded = !summaryExpanded;
        const body = document.getElementById('m-summary-body');
        const chevron = document.getElementById('m-summary-chevron');
        if (body) body.classList.toggle('hidden', !summaryExpanded);
        if (chevron) chevron.style.transform = summaryExpanded ? '' : 'rotate(180deg)';
    },

    // --- Timer ---
    updateTimer(m) {
        const timerWrap = document.getElementById('m-detail-timer-wrap');
        const timerText = document.getElementById('m-timer-text');
        const timerDot = document.getElementById('m-timer-dot');
        if (meetingTimerInterval) {
            clearInterval(meetingTimerInterval);
            meetingTimerInterval = null;
        }

        if (m.status === 'in_progress' && m.started_at) {
            timerWrap.classList.remove('hidden');
            timerDot.classList.remove('hidden');
            const startTime = new Date(m.started_at).getTime();

            const update = () => {
                const diff = Date.now() - startTime;
                const hrs = Math.floor(diff / 3600000);
                const mins = Math.floor((diff % 3600000) / 60000);
                const secs = Math.floor((diff % 60000) / 1000);
                timerText.innerText = hrs > 0
                    ? `${hrs}:${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`
                    : `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
            };
            update();
            meetingTimerInterval = setInterval(update, 1000);
        } else if (m.status === 'completed' && m.started_at && m.ended_at) {
            timerWrap.classList.remove('hidden');
            timerDot.classList.add('hidden');
            const diff = new Date(m.ended_at).getTime() - new Date(m.started_at).getTime();
            const mins = Math.floor(diff / 60000);
            timerText.innerText = `${mins} мин.`;
        } else {
            timerWrap.classList.add('hidden');
        }
    },

    // Палитра цветов для аватаров
    _avatarColors: [
        { bg: '#dbeafe', text: '#1e40af' },
        { bg: '#fce7f3', text: '#9d174d' },
        { bg: '#d1fae5', text: '#065f46' },
        { bg: '#fef3c7', text: '#92400e' },
        { bg: '#e0e7ff', text: '#3730a3' },
        { bg: '#fae8ff', text: '#86198f' },
        { bg: '#ccfbf1', text: '#134e4a' },
        { bg: '#fee2e2', text: '#991b1b' },
    ],

    _getAvatarColor(name) {
        let hash = 0;
        for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
        return this._avatarColors[Math.abs(hash) % this._avatarColors.length];
    },

    // --- Sidebar ---
    renderSidebar(m) {
        // Date & Time
        const dateStr = m.date
            ? new Date(m.date + 'T00:00:00').toLocaleDateString('ru-RU', { day: 'numeric', month: 'long' })
            : '-';
        document.getElementById('m-side-date').innerText = dateStr;
        document.getElementById('m-side-time').innerText = m.time ? m.time.slice(0, 5) : '-';

        if (m.started_at && m.ended_at) {
            const diff = new Date(m.ended_at).getTime() - new Date(m.started_at).getTime();
            document.getElementById('m-side-duration').innerText = `${Math.floor(diff / 60000)} мин.`;
        } else if (m.duration_minutes) {
            document.getElementById('m-side-duration').innerText = `${m.duration_minutes} мин.`;
        } else {
            document.getElementById('m-side-duration').innerText = '-';
        }

        // Participants (color avatars)
        const partEl = document.getElementById('m-side-participants');
        if (m.participants && m.participants.length > 0) {
            partEl.innerHTML = m.participants.map(p => {
                const colors = this._getAvatarColor(p.last_name);
                const role = p.role || p.department || '';
                return `
                <div class="flex items-center gap-2.5 py-1 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-700/50 -mx-1 px-1 rounded-lg transition-colors" onclick="window.openContactDetail && window.openContactDetail(${p.id})">
                    <div class="w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-bold flex-shrink-0" style="background-color:${colors.bg};color:${colors.text}">
                        ${p.last_name.charAt(0)}
                    </div>
                    <div class="min-w-0">
                        <div class="text-xs font-medium text-slate-700 dark:text-slate-200 truncate">${p.last_name} ${p.first_name || ''}</div>
                        ${role ? `<div class="text-[10px] text-slate-400 dark:text-slate-500 truncate">${role}</div>` : ''}
                    </div>
                </div>`;
            }).join('');
        } else {
            partEl.innerHTML = '<span class="text-xs text-slate-400 italic">Нет участников</span>';
        }

        // Related tasks (with status badges)
        this.renderSidebarTasks(m.related_tasks || []);

        // Agenda
        const agendaBlock = document.getElementById('m-side-agenda-block');
        const agendaEl = document.getElementById('m-side-agenda');
        if (m.agenda) {
            agendaBlock.classList.remove('hidden');
            agendaEl.innerText = m.agenda;
        } else {
            agendaBlock.classList.add('hidden');
        }

        // History
        const historyEl = document.getElementById('m-side-history');
        if (m.history && m.history.length > 0) {
            historyEl.innerHTML = m.history.map(h => `
                <div class="py-1 border-l-2 border-slate-200 dark:border-slate-700 pl-2.5 ml-1">
                    <div class="text-[10px] text-slate-400">${h.created_at}</div>
                    <div class="text-[11px]"><strong class="text-slate-600 dark:text-slate-300">${h.field_name}</strong>: ${h.old_value || 'пусто'} → ${h.new_value || 'пусто'}</div>
                </div>
            `).join('');
        } else {
            historyEl.innerHTML = '<span class="text-slate-400 italic text-[11px]">Нет истории</span>';
        }
    },

    renderSidebarTasks(tasks) {
        const container = document.getElementById('m-side-tasks');
        if (!tasks || tasks.length === 0) {
            container.innerHTML = '<span class="text-xs text-slate-400 italic">Нет задач</span>';
            return;
        }

        const statusColors = {
            'К выполнению': { bg: '#eff6ff', color: '#3b82f6', border: '#bfdbfe' },
            'В работе': { bg: '#fffbeb', color: '#f59e0b', border: '#fde68a' },
            'На проверке': { bg: '#f5f3ff', color: '#8b5cf6', border: '#ddd6fe' },
            'Готово': { bg: '#f0fdf4', color: '#22c55e', border: '#bbf7d0' },
        };

        container.innerHTML = tasks.map(t => {
            const isDone = t.status && t.status.name === 'Готово';
            const sc = statusColors[t.status?.name] || { bg: '#f1f5f9', color: '#94a3b8', border: '#e2e8f0' };
            return `
            <div class="flex items-center gap-2 py-1.5 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-700/50 -mx-1 px-1 rounded-lg transition-colors ${isDone ? 'opacity-50' : ''}" onclick="window.openTaskDetail && window.openTaskDetail(${t.id})">
                <span class="inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-semibold flex-shrink-0 border" style="background-color:${sc.bg};color:${sc.color};border-color:${sc.border}">${t.status?.name || '?'}</span>
                <span class="text-xs truncate text-slate-700 dark:text-slate-300 ${isDone ? 'line-through' : ''}">${t.title}</span>
            </div>`;
        }).join('');
    },

    // --- Speech Recognition (Web Speech API) ---
    toggleSpeech() {
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        if (!SpeechRecognition) {
            alert('Web Speech API не поддерживается в этом браузере. Используйте Chrome или Edge.');
            return;
        }

        const micBtn = document.getElementById('m-mic-btn');

        if (isRecording) {
            // Stop
            if (speechRecognition) speechRecognition.stop();
            isRecording = false;
            micBtn.classList.remove('text-red-500', 'bg-red-50', 'dark:bg-red-900/20', 'animate-pulse');
            micBtn.classList.add('text-slate-400');
            return;
        }

        // Start
        speechRecognition = new SpeechRecognition();
        speechRecognition.lang = 'ru-RU';
        speechRecognition.continuous = true;
        speechRecognition.interimResults = true;

        const noteInput = document.getElementById('m-note-input');
        let finalTranscript = '';

        speechRecognition.onstart = () => {
            isRecording = true;
            micBtn.classList.remove('text-slate-400');
            micBtn.classList.add('text-red-500', 'bg-red-50', 'dark:bg-red-900/20', 'animate-pulse');
        };

        speechRecognition.onresult = (event) => {
            let interim = '';
            for (let i = event.resultIndex; i < event.results.length; i++) {
                const transcript = event.results[i][0].transcript;
                if (event.results[i].isFinal) {
                    finalTranscript += transcript;
                } else {
                    interim = transcript;
                }
            }

            // Show interim in input
            noteInput.value = finalTranscript + interim;

            // If we got a final result, auto-add as note
            if (finalTranscript) {
                noteInput.value = finalTranscript;
                this.addNoteFromSpeech(finalTranscript.trim());
                finalTranscript = '';
                noteInput.value = '';
            }
        };

        speechRecognition.onerror = (event) => {
            console.error('Speech error:', event.error);
            if (event.error === 'not-allowed') {
                alert('Доступ к микрофону заблокирован. Разрешите доступ в настройках браузера.');
            }
            isRecording = false;
            micBtn.classList.remove('text-red-500', 'bg-red-50', 'dark:bg-red-900/20', 'animate-pulse');
            micBtn.classList.add('text-slate-400');
        };

        speechRecognition.onend = () => {
            // Auto-restart if still recording (continuous mode can stop unexpectedly)
            if (isRecording) {
                try { speechRecognition.start(); } catch(e) { /* ignore */ }
            } else {
                micBtn.classList.remove('text-red-500', 'bg-red-50', 'dark:bg-red-900/20', 'animate-pulse');
                micBtn.classList.add('text-slate-400');
            }
        };

        try {
            speechRecognition.start();
        } catch(e) {
            alert('Не удалось запустить распознавание речи');
        }
    },

    async addNoteFromSpeech(text) {
        if (!currentMeetingId || !text) return;
        const note = await API.addMeetingNote(currentMeetingId, { text, source: 'voice' });
        if (note) {
            const m = await API.getMeeting(currentMeetingId);
            if (m) {
                currentMeetingData = m;
                this.renderNotes(m.meeting_notes || []);
            }
        }
    },

    // --- AI Analysis ---
    async analyzeAI() {
        if (!currentMeetingId || !currentMeetingData) return;

        const notes = currentMeetingData.meeting_notes || [];
        if (notes.length === 0) {
            alert('Нет заметок для анализа');
            return;
        }

        // Show modal with loading
        document.getElementById('m-ai-modal').classList.remove('hidden');
        document.getElementById('m-ai-content').innerHTML = `
            <div class="flex items-center justify-center py-8 text-slate-400">
                <i data-lucide="loader-2" class="w-6 h-6 animate-spin mr-2"></i> Анализирую заметки...
            </div>`;
        if (window.lucide) lucide.createIcons();

        try {
            const response = await fetch(`/api/meetings/${currentMeetingId}/analyze`, { method: 'POST' });
            if (!response.ok) {
                const err = await response.json().catch(() => ({}));
                throw new Error(err.error || 'Ошибка анализа');
            }
            const result = await response.json();
            this.renderAIResult(result);
        } catch (err) {
            document.getElementById('m-ai-content').innerHTML = `
                <div class="text-center py-8">
                    <i data-lucide="alert-circle" class="w-8 h-8 text-red-400 mx-auto mb-2"></i>
                    <p class="text-sm text-red-600 dark:text-red-400">${err.message}</p>
                    <p class="text-xs text-slate-400 mt-2">Убедитесь, что llm_gateway запущен</p>
                </div>`;
            if (window.lucide) lucide.createIcons();
        }
    },

    renderAIResult(result) {
        const content = document.getElementById('m-ai-content');

        let html = '';

        // Summary
        if (result.summary) {
            html += `
            <div class="bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-800 rounded-lg p-4">
                <h4 class="text-sm font-semibold text-purple-700 dark:text-purple-300 mb-2 flex items-center gap-2">
                    <i data-lucide="file-text" class="w-4 h-4"></i> Итог
                </h4>
                <p class="text-sm text-slate-700 dark:text-slate-300">${this.escapeHtml(result.summary)}</p>
                <button onclick="window.applySummaryFromAI('${this.escapeAttr(result.summary)}')" class="mt-2 text-xs text-purple-600 hover:text-purple-800 dark:text-purple-400 font-medium">
                    Вставить в итог встречи
                </button>
            </div>`;
        }

        // Tasks
        if (result.tasks && result.tasks.length > 0) {
            html += `
            <div>
                <h4 class="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2 flex items-center gap-2">
                    <i data-lucide="check-square" class="w-4 h-4"></i> Предложенные задачи
                </h4>
                <div class="space-y-2">
                    ${result.tasks.map((t, i) => `
                        <div class="flex items-center justify-between p-2.5 bg-slate-50 dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700">
                            <span class="text-sm text-slate-700 dark:text-slate-300">${this.escapeHtml(t)}</span>
                            <button onclick="window.createTaskFromAI('${this.escapeAttr(t)}')" class="px-2 py-1 text-xs font-medium text-primary-600 hover:text-primary-800 bg-primary-50 dark:bg-primary-900/20 dark:text-primary-400 rounded border border-primary-200 dark:border-primary-800 whitespace-nowrap ml-2">
                                Создать
                            </button>
                        </div>
                    `).join('')}
                </div>
            </div>`;
        }

        // Decisions
        if (result.decisions && result.decisions.length > 0) {
            html += `
            <div>
                <h4 class="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2 flex items-center gap-2">
                    <i data-lucide="gavel" class="w-4 h-4"></i> Ключевые решения
                </h4>
                <ul class="space-y-1 text-sm text-slate-600 dark:text-slate-400">
                    ${result.decisions.map(d => `<li class="flex items-start gap-2"><span class="text-green-500 mt-1">•</span> ${this.escapeHtml(d)}</li>`).join('')}
                </ul>
            </div>`;
        }

        // Open questions
        if (result.questions && result.questions.length > 0) {
            html += `
            <div>
                <h4 class="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2 flex items-center gap-2">
                    <i data-lucide="help-circle" class="w-4 h-4"></i> Открытые вопросы
                </h4>
                <ul class="space-y-1 text-sm text-slate-600 dark:text-slate-400">
                    ${result.questions.map(q => `<li class="flex items-start gap-2"><span class="text-amber-500 mt-1">?</span> ${this.escapeHtml(q)}</li>`).join('')}
                </ul>
            </div>`;
        }

        if (!html) {
            html = '<p class="text-sm text-slate-400 text-center py-4">Нет результатов анализа</p>';
        }

        content.innerHTML = html;
        if (window.lucide) lucide.createIcons();
    },

    applySummaryFromAI(text) {
        const summaryEl = document.getElementById('m-detail-summary');
        if (summaryEl) {
            summaryEl.value = text;
        }
        // Expand summary section
        summaryExpanded = true;
        document.getElementById('m-summary-body')?.classList.remove('hidden');
        document.getElementById('m-ai-modal')?.classList.add('hidden');
    },

    async createTaskFromAI(title) {
        if (!currentMeetingId) return;
        // Add as note first, then convert
        const note = await API.addMeetingNote(currentMeetingId, { text: title, source: 'ai' });
        if (note) {
            await API.convertNoteToTask(currentMeetingId, note.id);
            const m = await API.getMeeting(currentMeetingId);
            if (m) {
                currentMeetingData = m;
                this.renderNotes(m.meeting_notes || []);
                this.renderSidebarTasks(m.related_tasks || []);
            }
            if (window.TaskController) await window.TaskController.loadAll();
        }
    },

    // --- Legacy: Action Items (backward compat) ---
    async addActionItem() {
        if (!currentMeetingId) return;
        const input = document.getElementById('action-item-input');
        const assigneeSelect = document.getElementById('action-item-assignee');
        if (!input) return;
        const text = input.value.trim();
        if (!text) return;

        const data = {
            text: text,
            assignee_id: assigneeSelect?.value ? parseInt(assigneeSelect.value) : null
        };

        const result = await API.addMeetingActionItem(currentMeetingId, data);
        if (result) {
            input.value = '';
            if (assigneeSelect) assigneeSelect.value = '';
            this.openMeetingDetail(currentMeetingId);
        }
    },

    async toggleActionItem(itemId, isDone) {
        if (!currentMeetingId) return;
        const result = await API.updateMeetingActionItem(currentMeetingId, itemId, { is_done: isDone });
        if (result) this.openMeetingDetail(currentMeetingId);
    },

    async deleteActionItem(itemId) {
        if (!currentMeetingId) return;
        if (!confirm('Удалить пункт?')) return;
        const success = await API.deleteMeetingActionItem(currentMeetingId, itemId);
        if (success) this.openMeetingDetail(currentMeetingId);
    },

    async convertToTask(actionItemId) {
        if (!currentMeetingId) return;
        const task = await API.convertActionItemToTask(currentMeetingId, actionItemId);
        if (task) {
            this.openMeetingDetail(currentMeetingId);
            if (window.TaskController) await window.TaskController.loadAll();
        }
    },

    async saveNotes() {
        if (!currentMeetingId) return;
        const notes = document.getElementById('m-detail-notes')?.value;
        if (notes !== undefined) {
            const success = await API.updateMeeting(currentMeetingId, { notes });
            if (success) await this.loadAll();
        }
    }
};
