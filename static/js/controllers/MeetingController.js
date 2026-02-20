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

        // Title (inline editable)
        const titleInput = document.getElementById('m-detail-title-input');
        titleInput.value = m.title || '';

        // Status badge
        const statusBadge = document.getElementById('m-detail-status-badge');
        const statusInfo = STATUS_LABELS[m.status] || STATUS_LABELS['planned'];
        statusBadge.innerText = statusInfo.label;
        statusBadge.style.color = statusInfo.color;
        statusBadge.style.borderColor = statusInfo.color + '40';
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
        document.getElementById('m-detail-date').innerHTML = `<i data-lucide="calendar" class="w-3 h-3"></i> ${dateStr}`;

        const typeLabel = m.type ? m.type.name : 'Без типа';
        document.getElementById('m-detail-type-label').innerHTML = `<i data-lucide="tag" class="w-3 h-3"></i> ${typeLabel}`;

        const projLabel = document.getElementById('m-detail-project-label');
        if (m.project_id) {
            projLabel.innerHTML = `<i data-lucide="briefcase" class="w-3 h-3"></i> <span>${m.project_title}</span>`;
            projLabel.onclick = () => window.openProjectDetail && window.openProjectDetail(m.project_id);
        } else {
            projLabel.innerHTML = `<i data-lucide="briefcase" class="w-3 h-3"></i> <span>Без проекта</span>`;
            projLabel.onclick = null;
        }

        const partCount = m.participants_count || 0;
        document.getElementById('m-detail-participants-count').innerHTML =
            `<i data-lucide="users" class="w-3 h-3"></i> <span>${partCount}</span>`;

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

    // --- Notes rendering (chat-like) ---
    renderNotes(notes) {
        const list = document.getElementById('m-detail-notes-list');
        const empty = document.getElementById('m-notes-empty');

        if (!notes || notes.length === 0) {
            list.innerHTML = '';
            list.appendChild(empty);
            empty.classList.remove('hidden');
            return;
        }

        empty.classList.add('hidden');

        list.innerHTML = notes.map(note => {
            const time = note.created_at ? note.created_at.split(' ')[1] || '' : '';
            const isConverted = !!note.task_id;
            const sourceIcon = note.source === 'voice' ? 'mic' : (note.source === 'ai' ? 'sparkles' : '');

            return `
            <div class="group flex items-start gap-2 py-1.5 px-3 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors ${isConverted ? 'opacity-60' : ''}" data-note-id="${note.id}">
                <div class="flex-1 min-w-0">
                    <div class="flex items-baseline gap-2">
                        ${sourceIcon ? `<i data-lucide="${sourceIcon}" class="w-3 h-3 text-slate-400 flex-shrink-0 relative top-0.5"></i>` : ''}
                        <span id="note-text-${note.id}" class="text-sm text-slate-800 dark:text-slate-200 leading-relaxed ${isConverted ? 'line-through' : ''}">${this.escapeHtml(note.text)}</span>
                    </div>
                    <span class="text-[10px] text-slate-400 ml-0">${time}</span>
                </div>
                <div class="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
                    ${isConverted
                        ? `<span class="text-[10px] text-primary-500 cursor-pointer hover:underline whitespace-nowrap" onclick="window.openTaskDetail && window.openTaskDetail(${note.task_id})">задача #${note.task_id}</span>`
                        : `<button onclick="window.convertNoteToTask(${note.id})" class="p-1 text-slate-400 hover:text-primary-600 transition-colors" title="Создать задачу">
                            <i data-lucide="arrow-right-to-line" class="w-3.5 h-3.5"></i>
                          </button>`
                    }
                    <button onclick="window.editMeetingNote(${note.id}, '${this.escapeAttr(note.text)}')" class="p-1 text-slate-400 hover:text-slate-600 transition-colors" title="Редактировать">
                        <i data-lucide="pencil" class="w-3.5 h-3.5"></i>
                    </button>
                    <button onclick="window.deleteMeetingNote(${note.id})" class="p-1 text-slate-400 hover:text-red-500 transition-colors" title="Удалить">
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
        const timerEl = document.getElementById('m-detail-timer');
        if (meetingTimerInterval) {
            clearInterval(meetingTimerInterval);
            meetingTimerInterval = null;
        }

        if (m.status === 'in_progress' && m.started_at) {
            timerEl.classList.remove('hidden');
            const startTime = new Date(m.started_at).getTime();

            const update = () => {
                const diff = Date.now() - startTime;
                const mins = Math.floor(diff / 60000);
                const secs = Math.floor((diff % 60000) / 1000);
                timerEl.innerText = `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
            };
            update();
            meetingTimerInterval = setInterval(update, 1000);
        } else if (m.status === 'completed' && m.started_at && m.ended_at) {
            timerEl.classList.remove('hidden');
            const diff = new Date(m.ended_at).getTime() - new Date(m.started_at).getTime();
            const mins = Math.floor(diff / 60000);
            timerEl.innerText = `${mins} мин.`;
        } else {
            timerEl.classList.add('hidden');
        }
    },

    // --- Sidebar ---
    renderSidebar(m) {
        // Date & Time
        const dateStr = m.date
            ? new Date(m.date + 'T00:00:00').toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' })
            : '-';
        document.getElementById('m-side-date').innerText = dateStr;
        document.getElementById('m-side-time').innerText = m.time || '-';

        if (m.started_at && m.ended_at) {
            const diff = new Date(m.ended_at).getTime() - new Date(m.started_at).getTime();
            document.getElementById('m-side-duration').innerText = `${Math.floor(diff / 60000)} мин.`;
        } else if (m.duration_minutes) {
            document.getElementById('m-side-duration').innerText = `${m.duration_minutes} мин.`;
        } else {
            document.getElementById('m-side-duration').innerText = '-';
        }

        // Participants
        const partEl = document.getElementById('m-side-participants');
        if (m.participants && m.participants.length > 0) {
            partEl.innerHTML = m.participants.map(p => `
                <div class="flex items-center gap-2 cursor-pointer hover:text-primary-600 transition-colors" onclick="window.openContactDetail && window.openContactDetail(${p.id})">
                    <div class="w-5 h-5 rounded-full bg-primary-100 text-primary-700 flex items-center justify-center text-[9px] font-bold border border-primary-200 dark:bg-primary-900 dark:text-primary-300 dark:border-primary-800">
                        ${p.last_name.charAt(0)}
                    </div>
                    <span class="text-xs">${p.last_name} ${p.first_name || ''}</span>
                </div>
            `).join('');
        } else {
            partEl.innerHTML = '<span class="text-xs text-slate-400 italic">Нет участников</span>';
        }

        // Related tasks
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
                <div class="py-0.5">
                    <span class="text-[10px] text-slate-400">${h.created_at}</span>
                    <div><strong>${h.field_name}</strong>: ${h.old_value || 'пусто'} → ${h.new_value || 'пусто'}</div>
                </div>
            `).join('');
        } else {
            historyEl.innerHTML = '<span class="text-slate-400 italic">Нет истории</span>';
        }
    },

    renderSidebarTasks(tasks) {
        const container = document.getElementById('m-side-tasks');
        if (!tasks || tasks.length === 0) {
            container.innerHTML = '<span class="text-xs text-slate-400 italic">Нет задач</span>';
            return;
        }

        container.innerHTML = tasks.map(t => {
            const isDone = t.status && t.status.name === 'Готово';
            return `
            <div class="flex items-center gap-2 py-1 cursor-pointer hover:text-primary-600 transition-colors ${isDone ? 'opacity-50' : ''}" onclick="window.openTaskDetail && window.openTaskDetail(${t.id})">
                <span class="w-1.5 h-1.5 rounded-full flex-shrink-0" style="background-color: ${t.status?.color || '#94a3b8'}"></span>
                <span class="text-xs truncate ${isDone ? 'line-through' : ''}">${t.title}</span>
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
