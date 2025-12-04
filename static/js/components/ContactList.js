function renderTagsHtml(tagsList) {
    if (!tagsList || !tagsList.length) return '';
    return `<div class="flex flex-wrap gap-1 mt-1">` + 
           tagsList.map(t => `<span class="inline-block px-1.5 py-0.5 rounded text-[10px] bg-slate-100 text-slate-600 border border-slate-200">#${t.name}</span>`).join('') + 
           `</div>`;
}

export function renderContacts(contactsData, search = '') {
    const tbody = document.getElementById('contacts-table-body');
    if (!tbody) return;

    const filtered = contactsData.filter(c => {
        const fullName = `${c.last_name} ${c.first_name} ${c.middle_name}`.toLowerCase();
        const tagsString = c.tags ? c.tags.map(t => t.name).join(' ') : '';
        return fullName.includes(search) || (c.department && c.department.toLowerCase().includes(search)) || tagsString.includes(search);
    });

    if (filtered.length === 0) {
        tbody.innerHTML = '<tr><td colspan="5" class="px-6 text-center py-8 text-slate-400">Ничего не найдено</td></tr>';
        return;
    }

    tbody.innerHTML = filtered.map(c => {
        const fullName = [c.last_name, c.first_name, c.middle_name].filter(Boolean).join(' ');
        const initial = c.last_name ? c.last_name.charAt(0).toUpperCase() : '?';
        const typeColor = c.type ? c.type.render_color : '#cbd5e1';
        
        return `
        <tr class="hover:bg-slate-50 transition-colors group" style="border-left: 4px solid ${typeColor};">
            <td class="px-6 py-4">
                <div class="flex items-center">
                    <div class="h-8 w-8 rounded-full bg-slate-200 flex items-center justify-center text-xs font-bold mr-3 text-slate-600">${initial}</div>
                    <div>
                        <div class="text-sm font-medium text-slate-900">${fullName} ${c.link ? `<a href="${c.link}" target="_blank" class="text-primary-600 ml-1"><i data-lucide="external-link" class="w-3 h-3 inline"></i></a>` : ''}</div>
                        <div class="text-[10px] uppercase font-bold text-slate-400 tracking-wider">${c.type ? c.type.name_type : ''}</div>
                    </div>
                </div>
                ${renderTagsHtml(c.tags)}
            </td>
            <td class="px-6 py-4"><div class="text-sm">${c.department || '-'}</div><div class="text-xs text-slate-500">${c.role || ''}</div></td>
            <td class="px-6 py-4 text-sm text-slate-500"><div>${c.email || ''}</div><div>${c.phone || ''}</div></td>
            <td class="px-6 py-4 text-sm text-slate-500 italic max-w-xs truncate">${c.notes || ''}</td>
            <td class="px-6 py-4 text-right">
                <div class="opacity-0 group-hover:opacity-100 transition-opacity">
                    <button onclick="editContact(${c.id})" class="p-1 text-slate-400 hover:text-primary-600"><i data-lucide="edit-2" class="w-4 h-4"></i></button>
                    <button onclick="deleteContact(${c.id})" class="p-1 text-slate-400 hover:text-red-600"><i data-lucide="trash-2" class="w-4 h-4"></i></button>
                </div>
            </td>
        </tr>`;
    }).join('');
    if (window.lucide) lucide.createIcons();
}