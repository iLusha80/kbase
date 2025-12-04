// --- RENDER HELPERS (Badges) ---
function renderTagsHtml(tagsList) {
    if (!tagsList || !tagsList.length) return '';
    return `<div class="flex flex-wrap gap-1 mt-1">` + 
           tagsList.map(t => `<span class="inline-block px-1.5 py-0.5 rounded text-[10px] bg-slate-100 text-slate-600 border border-slate-200 dark:bg-slate-700 dark:text-slate-300 dark:border-slate-600">#${t.name}</span>`).join('') + 
           `</div>`;
}

function renderTasks(tasksData) {
    const container = document.getElementById('tasks-container');
    if (!container) return;
    if (tasksData.length === 0) { 
        container.innerHTML = `<div class="col-span-full text-center py-10 text-slate-400 dark:text-slate-500">Нет задач.</div>`; 
        return; 
    }

    container.innerHTML = tasksData.map(t => {
        const statusColor = t.status ? t.status.color : '#cbd5e1';
        let contactsHtml = '';
        
        // Блок с людьми (Исполнитель / Автор)
        if (t.assignee || t.author) {
            contactsHtml += '<div class="mt-3 pt-3 border-t border-slate-100 flex flex-col gap-1 dark:border-slate-700">';
            
            if (t.assignee) {
                contactsHtml += `<div class="flex items-center text-xs text-slate-600 dark:text-slate-400">
                    <i data-lucide="user" class="w-3 h-3 mr-2 text-primary-600 dark:text-primary-400"></i>
                    ${t.assignee.last_name} ${t.assignee.first_name || ''}
                </div>`;
            }
            
            if (t.author) {
                contactsHtml += `<div class="flex items-center text-xs text-slate-600 dark:text-slate-400">
                    <i data-lucide="crown" class="w-3 h-3 mr-2 text-amber-500"></i>
                    ${t.author.last_name} ${t.author.first_name || ''}
                </div>`;
            }
            
            contactsHtml += '</div>';
        }

        return `
        <div class="bg-white rounded-lg shadow-sm border border-slate-200 p-4 hover:shadow-md transition-shadow relative group dark:bg-slate-800 dark:border-slate-700" style="border-left: 4px solid ${statusColor}">
            <div class="flex justify-between items-start mb-2">
                <span class="inline-block px-2 py-0.5 rounded text-[10px] font-bold uppercase text-white tracking-wider" style="background-color: ${statusColor}">${t.status ? t.status.name : ''}</span>
                <div class="opacity-0 group-hover:opacity-100 transition-opacity flex gap-1">
                    <button onclick="editTask(${t.id})" class="text-slate-400 hover:text-primary-600 dark:hover:text-primary-400"><i data-lucide="edit-2" class="w-3 h-3"></i></button>
                    <button onclick="deleteTask(${t.id})" class="text-slate-400 hover:text-red-600 dark:hover:text-red-400"><i data-lucide="trash-2" class="w-3 h-3"></i></button>
                </div>
            </div>
            <h3 class="font-semibold text-slate-800 text-sm leading-tight mb-1 dark:text-slate-100">${t.title}</h3>
            ${renderTagsHtml(t.tags)} 
            ${t.description ? `<p class="text-xs text-slate-500 line-clamp-2 mt-2 dark:text-slate-400">${t.description}</p>` : ''}
            ${t.due_date ? `<div class="flex items-center text-xs text-slate-500 mt-2 dark:text-slate-400"><i data-lucide="calendar" class="w-3 h-3 mr-1"></i> ${t.due_date}</div>` : ''}
            ${contactsHtml}
        </div>`;
    }).join('');
    if (window.lucide) lucide.createIcons();
}

export { renderTasks };