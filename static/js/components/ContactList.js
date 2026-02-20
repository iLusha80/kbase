function renderTagsHtml(tagsList) {
    if (!tagsList || !tagsList.length) return '';
    return `<div class="flex flex-wrap gap-1 mt-1">` + 
           tagsList.map(t => `<span class="inline-block px-1.5 py-0.5 rounded text-[10px] bg-slate-100 text-slate-600 border border-slate-200 dark:bg-slate-700 dark:text-slate-300 dark:border-slate-600">#${t.name}</span>`).join('') + 
           `</div>`;
}

export function renderContacts(contactsData, search = '') {
    const tbody = document.getElementById('contacts-table-body');
    if (!tbody) return;

    let filtered = contactsData.filter(c => {
        const fullName = `${c.last_name} ${c.first_name} ${c.middle_name}`.toLowerCase();
        const tagsString = c.tags ? c.tags.map(t => t.name).join(' ') : '';
        return fullName.includes(search) || (c.department && c.department.toLowerCase().includes(search)) || tagsString.includes(search);
    });

    // Сортировка: self первым, потом команда, потом остальные
    filtered.sort((a, b) => {
        if (a.is_self && !b.is_self) return -1;
        if (!a.is_self && b.is_self) return 1;
        if (a.is_team && !b.is_team) return -1;
        if (!a.is_team && b.is_team) return 1;
        return 0;
    });

    if (filtered.length === 0) {
        tbody.innerHTML = '<tr><td colspan="5" class="px-6 text-center py-8 text-slate-400 dark:text-slate-500">Ничего не найдено</td></tr>';
        return;
    }

    tbody.innerHTML = filtered.map(c => {
        const fullName = [c.last_name, c.first_name, c.middle_name].filter(Boolean).join(' ');
        const initial = c.last_name ? c.last_name.charAt(0).toUpperCase() : '?';
        const typeColor = c.type ? c.type.render_color : '#cbd5e1';
        
        // ВАЖНО: Добавили cursor-pointer и onclick на ячейку с именем
        return `
        <tr class="hover:bg-slate-50 transition-colors group dark:hover:bg-slate-800/50" style="border-left: 4px solid ${typeColor};">
            <td class="px-6 py-4 border-b border-slate-100 dark:border-slate-700/50 cursor-pointer" onclick="openContactDetail(${c.id})">
                <div class="flex items-center">
                    <div class="h-8 w-8 rounded-full bg-slate-200 flex items-center justify-center text-xs font-bold mr-3 text-slate-600 dark:bg-slate-700 dark:text-slate-300" style="background-color: ${typeColor}40; color: ${typeColor}">${initial}</div>
                    <div>
                        <div class="text-sm font-medium text-slate-900 group-hover:text-primary-600 transition-colors dark:text-slate-100 dark:group-hover:text-primary-400 flex items-center gap-1.5 flex-wrap">
                            ${fullName}
                            ${c.is_self ? `<span class="px-1.5 py-0.5 text-[10px] font-bold rounded bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-400">Я</span>` : ''}
                            ${c.is_team ? `<span class="px-1.5 py-0.5 text-[10px] font-bold rounded bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-400">Команда</span>` : ''}
                            ${c.link ? `<i data-lucide="external-link" class="w-3 h-3 inline text-slate-400"></i>` : ''}
                        </div>
                        <div class="text-[10px] uppercase font-bold text-slate-400 tracking-wider dark:text-slate-500">${c.type ? c.type.name_type : ''}</div>
                    </div>
                </div>
                ${renderTagsHtml(c.tags)}
            </td>
            <td class="px-6 py-4 border-b border-slate-100 dark:border-slate-700/50">
                <div class="text-sm text-slate-800 dark:text-slate-200">${c.department || '-'}</div>
                <div class="text-xs text-slate-500 dark:text-slate-400">${c.role || ''}</div>
            </td>
            <td class="px-6 py-4 text-sm text-slate-500 border-b border-slate-100 dark:border-slate-700/50 dark:text-slate-400">
                <div>${c.email || ''}</div>
                <div>${c.phone || ''}</div>
            </td>
            <td class="px-6 py-4 text-sm text-slate-500 italic max-w-xs truncate border-b border-slate-100 dark:border-slate-700/50 dark:text-slate-400">
                ${c.notes || ''}
            </td>
            <td class="px-6 py-4 text-right border-b border-slate-100 dark:border-slate-700/50">
                <div class="opacity-0 group-hover:opacity-100 transition-opacity">
                    <button onclick="editContact(${c.id})" class="p-1 text-slate-400 hover:text-primary-600 dark:hover:text-primary-400"><i data-lucide="edit-2" class="w-4 h-4"></i></button>
                    <button onclick="deleteContact(${c.id})" class="p-1 text-slate-400 hover:text-red-600 dark:hover:text-red-400"><i data-lucide="trash-2" class="w-4 h-4"></i></button>
                </div>
            </td>
        </tr>`;
    }).join('');
    if (window.lucide) lucide.createIcons();
}